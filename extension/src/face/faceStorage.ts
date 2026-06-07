import type { StoredFaceData } from "./types";

export const STORAGE_KEY = "ns_face_v1";

function getLocalStorage(): chrome.storage.LocalStorageArea {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    throw new Error("chrome.storage.local is not available");
  }
  return chrome.storage.local;
}

export const faceStorage = {
  async save(data: StoredFaceData): Promise<void> {
    await getLocalStorage().set({ [STORAGE_KEY]: data });
  },

  async load(): Promise<StoredFaceData | null> {
    const result = await getLocalStorage().get(STORAGE_KEY);
    const value = result[STORAGE_KEY] as StoredFaceData | undefined;
    if (!value) return null;
    if (value.version !== 1 && value.version !== 2) return null;
    return value;
  },

  async remove(): Promise<void> {
    await getLocalStorage().remove(STORAGE_KEY);
  },

  async exists(): Promise<boolean> {
    const data = await faceStorage.load();
    return data !== null;
  },
};
