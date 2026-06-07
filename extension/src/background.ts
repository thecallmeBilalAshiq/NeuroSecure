export {};

import { faceStorage } from "./face/faceStorage";
import { notificationService } from "./services/notificationService";

const SETTINGS_KEY = "ns_settings_v1";

type MessageType =
  | "START_DETECTION"
  | "STOP_DETECTION"
  | "ACTIVATE_PROTECTION"
  | "DEACTIVATE_PROTECTION"
  | "SEND_ALERT"
  | "GET_STATUS";

interface BgMessage {
  type: MessageType;
  payload?: unknown;
}

interface TabFilterSettings {
  tabFilterMode: "all" | "selected";
  selectedOrigins: string[];
}

interface BgState {
  detectionRunning: boolean;
  protectionActive: boolean;
  lastAlertAt: number;
}

const state: BgState = {
  detectionRunning: false,
  protectionActive: false,
  lastAlertAt: 0,
};

const RATE_LIMIT_MS = 30_000;

async function loadTabFilter(): Promise<TabFilterSettings> {
  try {
    const r = await chrome.storage.local.get(SETTINGS_KEY);
    const raw = r[SETTINGS_KEY] as
      | Partial<TabFilterSettings>
      | undefined
      | null;
    return {
      tabFilterMode: raw?.tabFilterMode === "selected" ? "selected" : "all",
      selectedOrigins: Array.isArray(raw?.selectedOrigins)
        ? raw!.selectedOrigins!.filter(
            (o): o is string => typeof o === "string" && o.length > 0
          )
        : [],
    };
  } catch {
    return { tabFilterMode: "all", selectedOrigins: [] };
  }
}

function getOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

async function broadcastToAllTabs(
  message: { type: "PROTECTION_ON" | "PROTECTION_OFF" }
): Promise<void> {
  try {
    const filter = await loadTabFilter();
    const tabs = await chrome.tabs.query({});
    await Promise.all(
      tabs.map(async (tab) => {
        if (tab.id == null) return;
        const url = tab.url ?? "";
        if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url)) return;
        if (filter.tabFilterMode === "selected") {
          const origin = getOrigin(url);
          if (!origin || !filter.selectedOrigins.includes(origin)) return;
        }
        try {
          await chrome.tabs.sendMessage(tab.id, message);
        } catch {
          /* content script not ready in this tab */
        }
      })
    );
  } catch {
    /* ignore */
  }
}

async function activateProtection(): Promise<void> {
  state.protectionActive = true;
  await chrome.storage.session
    ?.set({ ns_protection_active: true })
    .catch(() => undefined);
  await broadcastToAllTabs({ type: "PROTECTION_ON" });
}

async function deactivateProtection(): Promise<void> {
  state.protectionActive = false;
  await chrome.storage.session
    ?.set({ ns_protection_active: false })
    .catch(() => undefined);
  await broadcastToAllTabs({ type: "PROTECTION_OFF" });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [meta, b64] = dataUrl.split(",");
    if (!b64) return null;
    const mimeMatch = /data:([^;]+);base64/.exec(meta);
    const mime = mimeMatch?.[1] ?? "image/jpeg";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

async function sendAlertOnce(
  snapshotDataUrl: string | null
): Promise<{ ok: boolean; error?: string }> {
  const now = Date.now();
  if (now - state.lastAlertAt < RATE_LIMIT_MS) {
    return { ok: false, error: "Rate limited" };
  }
  state.lastAlertAt = now;

  const photo = snapshotDataUrl ? dataUrlToBlob(snapshotDataUrl) : null;

  try {
    const r = await notificationService.sendAlert(photo);
    if (r.ok) {
      try {
        await chrome.notifications?.create({
          type: "basic",
          iconUrl: chrome.runtime.getURL("icons/icon128.png"),
          title: "NeuroSecure Alert",
          message: "Unknown face detected — your screen has been protected.",
          priority: 2,
        });
      } catch {
        /* notifications may be disabled */
      }
      return { ok: true };
    }
    return { ok: false, error: r.error };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "alert failed",
    };
  }
}

chrome.runtime.onMessage.addListener(
  (message: BgMessage, _sender, sendResponse) => {
    (async (): Promise<void> => {
      switch (message.type) {
        case "START_DETECTION":
          state.detectionRunning = true;
          sendResponse({ ok: true, state });
          break;
        case "STOP_DETECTION":
          state.detectionRunning = false;
          await deactivateProtection();
          sendResponse({ ok: true, state });
          break;
        case "ACTIVATE_PROTECTION":
          await activateProtection();
          sendResponse({ ok: true, state });
          break;
        case "DEACTIVATE_PROTECTION":
          await deactivateProtection();
          sendResponse({ ok: true, state });
          break;
        case "SEND_ALERT": {
          const payload = message.payload as
            | { snapshotDataUrl?: string | null }
            | undefined;
          const r = await sendAlertOnce(payload?.snapshotDataUrl ?? null);
          sendResponse(r);
          break;
        }
        case "GET_STATUS":
          sendResponse({
            ok: true,
            state,
          });
          break;
        default:
          sendResponse({ ok: false, error: "Unknown message type" });
      }
    })().catch((err) => {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : "Background error",
      });
    });
    return true; // async response
  }
);

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    try {
      await chrome.tabs.create({
        url: chrome.runtime.getURL("options.html"),
      });
    } catch {
      /* ignore */
    }
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    const enrolled = await faceStorage.exists();
    if (enrolled) {
      state.detectionRunning = true;
    }
  } catch {
    /* ignore */
  }
});
