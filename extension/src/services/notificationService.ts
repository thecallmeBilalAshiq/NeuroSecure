import { authService } from "./authService";

const BACKEND_URL =
  process.env.PLASMO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const RATE_LIMIT_MS = 30_000;

let lastSentAt = 0;

async function getActiveTabUrl(): Promise<string | null> {
  try {
    if (typeof chrome === "undefined" || !chrome.tabs?.query) return null;
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    return tab?.url ?? null;
  } catch {
    return null;
  }
}

export interface SendAlertResult {
  ok: boolean;
  alertId?: string;
  error?: string;
  rateLimited?: boolean;
}

export const notificationService = {
  async sendAlert(photoBlob?: Blob | null): Promise<SendAlertResult> {
    const now = Date.now();
    if (now - lastSentAt < RATE_LIMIT_MS) {
      return { ok: false, rateLimited: true, error: "Rate limited" };
    }

    const session = await authService.getSession();
    if (!session) {
      return { ok: false, error: "Not authenticated" };
    }

    const tabUrl = await getActiveTabUrl();
    const formData = new FormData();
    if (photoBlob) {
      formData.append("photo", photoBlob, "intruder.jpg");
    }
    if (tabUrl) {
      formData.append("tabUrl", tabUrl);
    }
    formData.append("timestamp", new Date(now).toISOString());

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/notify/alert`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (res.status === 429) {
        return { ok: false, rateLimited: true, error: "Rate limited" };
      }

      const json = (await res.json().catch(() => ({}))) as {
        alertId?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        return { ok: false, error: json.error ?? `HTTP ${res.status}` };
      }
      lastSentAt = now;
      return { ok: true, alertId: json.alertId };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  },
};
