import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false,
  run_at: "document_idle",
};

const OVERLAY_ID = "neurosecure-overlay-root";

function injectOverlay(): void {
  if (document.getElementById(OVERLAY_ID)) return;

  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.setAttribute("aria-live", "assertive");
  root.style.cssText = [
    "position: fixed",
    "inset: 0",
    "top: 0",
    "left: 0",
    "width: 100vw",
    "height: 100vh",
    "z-index: 2147483647",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "backdrop-filter: blur(20px)",
    "-webkit-backdrop-filter: blur(20px)",
    "background: rgba(255,255,255,0.85)",
    "color: #0F172A",
    "font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    "opacity: 0",
    "transition: opacity 0.3s ease-in",
  ].join(";");

  const style = document.createElement("style");
  style.textContent = `
    @keyframes ns-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99,102,241,0.45); }
      50% { transform: scale(1.04); box-shadow: 0 0 0 16px rgba(99,102,241,0); }
    }
  `;
  root.appendChild(style);

  const card = document.createElement("div");
  card.style.cssText = [
    "max-width: 420px",
    "width: calc(100% - 48px)",
    "padding: 32px",
    "background: #FFFFFF",
    "border: 1px solid #E2E8F0",
    "border-radius: 24px",
    "box-shadow: 0 24px 48px rgba(15,23,42,0.18)",
    "display: flex",
    "flex-direction: column",
    "align-items: center",
    "gap: 16px",
    "text-align: center",
  ].join(";");

  const shield = document.createElement("div");
  shield.style.cssText = [
    "width: 84px",
    "height: 84px",
    "border-radius: 24px",
    "display: flex",
    "align-items: center",
    "justify-content: center",
    "background: linear-gradient(135deg, #6366F1, #4F46E5)",
    "color: white",
    "animation: ns-pulse 2s ease-in-out infinite",
  ].join(";");
  shield.innerHTML = `
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M9 12l2 2 4-4"/>
    </svg>
  `;
  card.appendChild(shield);

  const title = document.createElement("div");
  title.textContent = "Screen Protected";
  title.style.cssText = "font-size: 22px; font-weight: 700; letter-spacing: -0.01em;";
  card.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.textContent =
    "Unknown face detected. Verifying identity…";
  subtitle.style.cssText =
    "font-size: 14px; color: #64748B; line-height: 1.55; max-width: 320px;";
  card.appendChild(subtitle);

  const branding = document.createElement("div");
  branding.style.cssText =
    "margin-top: 8px; font-size: 11px; color: #94A3B8; letter-spacing: 0.04em; text-transform: uppercase; font-weight: 600;";
  branding.textContent = "NeuroSecure · Privacy Protection";
  card.appendChild(branding);

  root.appendChild(card);

  const blocker = (e: Event): void => {
    e.stopPropagation();
  };
  root.addEventListener("click", blocker, true);
  root.addEventListener("keydown", blocker, true);

  document.documentElement.appendChild(root);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.style.opacity = "1";
    });
  });
}

function removeOverlay(): void {
  const el = document.getElementById(OVERLAY_ID);
  if (!el) return;
  el.style.transition = "opacity 0.6s ease-out";
  el.style.opacity = "0";
  window.setTimeout(() => {
    el.parentNode?.removeChild(el);
  }, 600);
}

chrome.runtime.onMessage.addListener((message: { type?: string }, _s, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    sendResponse({ ok: false });
    return false;
  }
  switch (message.type) {
    case "PROTECTION_ON":
    case "ACTIVATE_PROTECTION":
      injectOverlay();
      sendResponse({ ok: true });
      break;
    case "PROTECTION_OFF":
    case "DEACTIVATE_PROTECTION":
      removeOverlay();
      sendResponse({ ok: true });
      break;
    default:
      sendResponse({ ok: false });
  }
  return false;
});

interface TabFilterSettings {
  tabFilterMode?: "all" | "selected";
  selectedOrigins?: string[];
}

function tabIsAllowedByFilter(filter: TabFilterSettings): boolean {
  if (!filter || filter.tabFilterMode !== "selected") return true;
  const allowed = filter.selectedOrigins ?? [];
  if (allowed.length === 0) return false;
  try {
    return allowed.includes(window.location.origin);
  } catch {
    return false;
  }
}

(async (): Promise<void> => {
  try {
    const session = await chrome.storage?.session?.get("ns_protection_active");
    if (session?.ns_protection_active !== true) return;

    const local = await chrome.storage?.local?.get("ns_settings_v1");
    const filter = (local?.ns_settings_v1 as TabFilterSettings) ?? {};
    if (tabIsAllowedByFilter(filter)) {
      injectOverlay();
    }
  } catch {
    /* ignore */
  }
})();
