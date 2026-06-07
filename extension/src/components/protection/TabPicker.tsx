import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Globe,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import Button from "../ui/Button";

interface OpenTabSummary {
  origin: string;
  hostname: string;
  count: number;
  exampleTitle: string;
  favicon: string | null;
  example: string;
}

function safeOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

function safeHostname(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
}

async function loadOpenTabs(): Promise<OpenTabSummary[]> {
  if (typeof chrome === "undefined" || !chrome.tabs?.query) return [];
  const tabs = await chrome.tabs.query({});
  const grouped = new Map<string, OpenTabSummary>();
  for (const tab of tabs) {
    const origin = safeOrigin(tab.url);
    if (!origin) continue;
    const existing = grouped.get(origin);
    if (existing) {
      existing.count += 1;
      continue;
    }
    grouped.set(origin, {
      origin,
      hostname: safeHostname(origin),
      count: 1,
      exampleTitle: tab.title?.trim() || safeHostname(origin),
      favicon: tab.favIconUrl ?? null,
      example: tab.url ?? origin,
    });
  }
  return Array.from(grouped.values()).sort((a, b) =>
    a.hostname.localeCompare(b.hostname)
  );
}

interface TabPickerProps {
  open: boolean;
  onClose: () => void;
}

export function TabPicker({ open, onClose }: TabPickerProps): JSX.Element | null {
  const tabFilterMode = useSettingsStore((s) => s.tabFilterMode);
  const selectedOrigins = useSettingsStore((s) => s.selectedOrigins);
  const setTabFilterMode = useSettingsStore((s) => s.setTabFilterMode);
  const setSelectedOrigins = useSettingsStore((s) => s.setSelectedOrigins);

  const [tabs, setTabs] = useState<OpenTabSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [draftMode, setDraftMode] = useState<"all" | "selected">(tabFilterMode);
  const [draftOrigins, setDraftOrigins] = useState<string[]>(selectedOrigins);

  useEffect(() => {
    if (!open) return;
    setDraftMode(tabFilterMode);
    setDraftOrigins(selectedOrigins);
  }, [open, tabFilterMode, selectedOrigins]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void loadOpenTabs().then((list) => {
      if (!cancelled) {
        setTabs(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const refresh = async (): Promise<void> => {
    setLoading(true);
    const list = await loadOpenTabs();
    setTabs(list);
    setLoading(false);
  };

  const filteredTabs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter(
      (t) =>
        t.hostname.toLowerCase().includes(q) ||
        t.exampleTitle.toLowerCase().includes(q)
    );
  }, [tabs, search]);

  const toggleOrigin = (origin: string): void => {
    setDraftOrigins((prev) =>
      prev.includes(origin) ? prev.filter((o) => o !== origin) : [...prev, origin]
    );
  };

  const orphanedOrigins = useMemo(() => {
    const present = new Set(tabs.map((t) => t.origin));
    return draftOrigins.filter((o) => !present.has(o));
  }, [draftOrigins, tabs]);

  const selectAllVisible = (): void => {
    const next = new Set(draftOrigins);
    filteredTabs.forEach((t) => next.add(t.origin));
    setDraftOrigins(Array.from(next));
  };

  const clearAll = (): void => {
    setDraftOrigins([]);
  };

  const handleSave = async (): Promise<void> => {
    await setTabFilterMode(draftMode);
    await setSelectedOrigins(draftOrigins);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[2000] bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        key="sheet"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed inset-0 z-[2001] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Choose tabs to monitor"
      >
        <div
          className="w-full max-w-[460px] max-h-[640px] flex flex-col bg-white rounded-card border border-border shadow-card-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="text-sm font-bold">Tabs to monitor</div>
              <div className="text-[11px] text-text-secondary">
                Pick which origins should blur when an unknown face is detected.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-full hover:bg-surface text-text-muted"
            >
              <X size={16} />
            </button>
          </header>

          <div className="px-4 py-3 border-b border-border flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDraftMode("all")}
                className={[
                  "flex-1 rounded-input border px-3 py-2 text-left transition",
                  draftMode === "all"
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-white text-text-primary hover:bg-surface",
                ].join(" ")}
              >
                <div className="font-semibold text-[12px]">All tabs</div>
                <div className="text-[10px] text-text-secondary mt-0.5">
                  Blur everywhere when triggered
                </div>
              </button>
              <button
                type="button"
                onClick={() => setDraftMode("selected")}
                className={[
                  "flex-1 rounded-input border px-3 py-2 text-left transition",
                  draftMode === "selected"
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-white text-text-primary hover:bg-surface",
                ].join(" ")}
              >
                <div className="font-semibold text-[12px]">Selected only</div>
                <div className="text-[10px] text-text-secondary mt-0.5">
                  {draftOrigins.length === 0
                    ? "Pick origins below"
                    : `${draftOrigins.length} origin${
                        draftOrigins.length === 1 ? "" : "s"
                      } selected`}
                </div>
              </button>
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Filter by hostname or title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={draftMode !== "selected"}
                className="w-full pl-9 pr-3 py-2 rounded-input border border-border bg-white text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading || draftMode !== "selected"}
                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline disabled:opacity-50"
              >
                <RefreshCw
                  size={12}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh tabs
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  disabled={draftMode !== "selected"}
                  className="text-text-secondary hover:text-text-primary disabled:opacity-50"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={draftMode !== "selected" || draftOrigins.length === 0}
                  className="text-text-secondary hover:text-text-primary disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {draftMode === "all" ? (
              <div className="p-6 text-center">
                <Globe size={28} className="mx-auto text-text-muted" />
                <div className="text-sm font-semibold mt-2">
                  Every browsing tab is monitored
                </div>
                <div className="text-[11px] text-text-secondary mt-1">
                  Switch to <strong>Selected only</strong> above to pick
                  individual origins.
                </div>
              </div>
            ) : loading ? (
              <div className="p-6 text-center text-xs text-text-secondary">
                Reading your open tabs…
              </div>
            ) : filteredTabs.length === 0 && orphanedOrigins.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-secondary">
                No matching tabs are open.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredTabs.map((tab) => {
                  const checked = draftOrigins.includes(tab.origin);
                  return (
                    <li key={tab.origin}>
                      <button
                        type="button"
                        onClick={() => toggleOrigin(tab.origin)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface transition"
                      >
                        <div className="w-7 h-7 rounded-md bg-surface flex items-center justify-center overflow-hidden border border-border">
                          {tab.favicon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={tab.favicon}
                              alt=""
                              className="w-5 h-5"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <Globe size={14} className="text-text-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate">
                            {tab.hostname}
                          </div>
                          <div className="text-[11px] text-text-muted truncate">
                            {tab.exampleTitle}
                            {tab.count > 1 ? ` · ${tab.count} tabs` : ""}
                          </div>
                        </div>
                        <span
                          className={[
                            "w-5 h-5 rounded-md flex items-center justify-center transition",
                            checked
                              ? "bg-primary text-white"
                              : "border border-border bg-white",
                          ].join(" ")}
                        >
                          {checked && <Check size={12} strokeWidth={3} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {orphanedOrigins.length > 0 && (
                  <li className="px-4 pt-3 pb-1 text-[10px] text-text-muted uppercase tracking-wide font-semibold">
                    Saved (not currently open)
                  </li>
                )}
                {orphanedOrigins.map((origin) => (
                  <li key={origin}>
                    <button
                      type="button"
                      onClick={() => toggleOrigin(origin)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface transition"
                    >
                      <div className="w-7 h-7 rounded-md bg-surface flex items-center justify-center border border-border">
                        <Globe size={14} className="text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold truncate text-text-secondary">
                          {safeHostname(origin)}
                        </div>
                        <div className="text-[11px] text-text-muted truncate">
                          Closed — re-open this site to verify it.
                        </div>
                      </div>
                      <span className="w-5 h-5 rounded-md flex items-center justify-center bg-primary text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-surface/50">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()}>
              Save
            </Button>
          </footer>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default TabPicker;
