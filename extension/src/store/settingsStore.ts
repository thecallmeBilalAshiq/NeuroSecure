import { create } from "zustand";
import { faceStorage } from "../face/faceStorage";

const SETTINGS_KEY = "ns_settings_v1";

export type TabFilterMode = "all" | "selected";

export interface PersistedSettings {
  isProtectionEnabled: boolean;
  blurOnDetection: boolean;
  alwaysOnProtection: boolean;
  tabFilterMode: TabFilterMode;
  selectedOrigins: string[];
  gracePeriodMs: number;
}

interface SettingsState extends PersistedSettings {
  isEnrolled: boolean;
  enrolledAt: number | null;
  detectionStatus: string;
  hydrate: () => Promise<void>;
  toggleProtection: () => Promise<void>;
  setProtection: (enabled: boolean) => Promise<void>;
  setBlurOnDetection: (enabled: boolean) => Promise<void>;
  setAlwaysOnProtection: (enabled: boolean) => Promise<void>;
  setTabFilterMode: (mode: TabFilterMode) => Promise<void>;
  setSelectedOrigins: (origins: string[]) => Promise<void>;
  addSelectedOrigin: (origin: string) => Promise<void>;
  removeSelectedOrigin: (origin: string) => Promise<void>;
  setGracePeriodMs: (ms: number) => Promise<void>;
  setEnrolled: (enrolled: boolean, enrolledAt: number | null) => void;
  setDetectionStatus: (status: string) => void;
}

const DEFAULTS: PersistedSettings = {
  isProtectionEnabled: false,
  blurOnDetection: true,
  alwaysOnProtection: false,
  tabFilterMode: "all",
  selectedOrigins: [],
  gracePeriodMs: 4000,
};

async function loadPersisted(): Promise<PersistedSettings> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return DEFAULTS;
  const r = await chrome.storage.local.get(SETTINGS_KEY);
  const value = r[SETTINGS_KEY] as Partial<PersistedSettings> | undefined;
  if (!value) return DEFAULTS;
  return {
    ...DEFAULTS,
    ...value,
    selectedOrigins: Array.isArray(value.selectedOrigins)
      ? value.selectedOrigins.filter(
          (o): o is string => typeof o === "string" && o.length > 0
        )
      : DEFAULTS.selectedOrigins,
    gracePeriodMs:
      typeof value.gracePeriodMs === "number" &&
      Number.isFinite(value.gracePeriodMs)
        ? Math.max(1000, Math.min(15000, value.gracePeriodMs))
        : DEFAULTS.gracePeriodMs,
  };
}

async function savePersisted(value: PersistedSettings): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  await chrome.storage.local.set({ [SETTINGS_KEY]: value });
}

function snapshotPersisted(get: () => SettingsState): PersistedSettings {
  const s = get();
  return {
    isProtectionEnabled: s.isProtectionEnabled,
    blurOnDetection: s.blurOnDetection,
    alwaysOnProtection: s.alwaysOnProtection,
    tabFilterMode: s.tabFilterMode,
    selectedOrigins: s.selectedOrigins,
    gracePeriodMs: s.gracePeriodMs,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  isEnrolled: false,
  enrolledAt: null,
  detectionStatus: "idle",

  async hydrate() {
    const persisted = await loadPersisted();
    const stored = await faceStorage.load();
    set({
      ...persisted,
      isEnrolled: stored !== null,
      enrolledAt: stored?.enrolledAt ?? null,
    });
  },

  async toggleProtection() {
    const next = !get().isProtectionEnabled;
    await get().setProtection(next);
  },

  async setProtection(enabled) {
    set({ isProtectionEnabled: enabled });
    await savePersisted(snapshotPersisted(get));
  },

  async setBlurOnDetection(enabled) {
    set({ blurOnDetection: enabled });
    await savePersisted(snapshotPersisted(get));
  },

  async setAlwaysOnProtection(enabled) {
    set({ alwaysOnProtection: enabled });
    await savePersisted(snapshotPersisted(get));
  },

  async setTabFilterMode(mode) {
    set({ tabFilterMode: mode });
    await savePersisted(snapshotPersisted(get));
  },

  async setSelectedOrigins(origins) {
    const dedup = Array.from(new Set(origins.filter(Boolean)));
    set({ selectedOrigins: dedup });
    await savePersisted(snapshotPersisted(get));
  },

  async addSelectedOrigin(origin) {
    if (!origin) return;
    const current = get().selectedOrigins;
    if (current.includes(origin)) return;
    const next = [...current, origin];
    set({ selectedOrigins: next });
    await savePersisted(snapshotPersisted(get));
  },

  async removeSelectedOrigin(origin) {
    const current = get().selectedOrigins;
    if (!current.includes(origin)) return;
    const next = current.filter((o) => o !== origin);
    set({ selectedOrigins: next });
    await savePersisted(snapshotPersisted(get));
  },

  async setGracePeriodMs(ms) {
    const clamped = Math.max(1000, Math.min(15000, Math.round(ms)));
    set({ gracePeriodMs: clamped });
    await savePersisted(snapshotPersisted(get));
  },

  setEnrolled(enrolled, enrolledAt) {
    set({ isEnrolled: enrolled, enrolledAt });
  },

  setDetectionStatus(status) {
    set({ detectionStatus: status });
  },
}));
