import { decryptEmbedding } from "../face/encryption";
import {
  bestGalleryDistance,
  distanceToConfidence,
  FACE_DESCRIPTOR_DIM,
  matchConfidencePercent,
  OWNER_DISTANCE_MAX,
  unpackEmbeddingGallery,
  UNKNOWN_DISTANCE_MIN,
} from "../face/embeddingEngine";
import {
  detectFaces,
  initializeFaceDetection,
  type DetectionWithDescriptor,
} from "../face/faceDetection";
import { faceStorage } from "../face/faceStorage";
import type {
  DetectionDashboardDot,
  DetectionLoopStatus,
  DetectionResult,
  DetectionStatus,
} from "../face/types";

export const DEFAULT_GRACE_PERIOD_MS = 4000;
/** Face scan interval — keeps CPU reasonable while reacting quickly. */
export const DETECTION_INTERVAL_MS = 400;

type Listener = (status: DetectionLoopStatus) => void;

interface InternalState {
  running: boolean;
  ownerGallery: number[][] | null;
  legacySingleTemplate: boolean;
  video: HTMLVideoElement | null;
  intervalId: ReturnType<typeof setInterval> | null;
  lastFaceSeenAt: number | null;
  ownerLastSeenAt: number | null;
  protectionActive: boolean;
  status: DetectionStatus;
  lastResult: DetectionResult | null;
  gracePeriodMs: number;
  error: string | null;
  listeners: Set<Listener>;
  dashboardDot: DetectionDashboardDot;
  matchConfidencePercent: number | null;
}

const state: InternalState = {
  running: false,
  ownerGallery: null,
  legacySingleTemplate: false,
  video: null,
  intervalId: null,
  lastFaceSeenAt: null,
  ownerLastSeenAt: null,
  protectionActive: false,
  status: "idle",
  lastResult: null,
  gracePeriodMs: DEFAULT_GRACE_PERIOD_MS,
  error: null,
  listeners: new Set(),
  dashboardDot: "no-face",
  matchConfidencePercent: null,
};

function emit(): void {
  const snapshot: DetectionLoopStatus = {
    status: state.status,
    lastResult: state.lastResult,
    lastFaceSeenAt: state.lastFaceSeenAt,
    error: state.error,
    dashboardDot: state.dashboardDot,
    matchConfidencePercent: state.matchConfidencePercent,
    legacySingleTemplate: state.legacySingleTemplate,
  };
  state.listeners.forEach((l) => {
    try {
      l(snapshot);
    } catch {
      /* swallow listener errors */
    }
  });
}

function captureIntruderSnapshot(): Blob | null {
  if (!state.video) return null;
  const v = state.video;
  if (v.videoWidth === 0 || v.videoHeight === 0) return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(v.videoWidth, 480);
    canvas.height = Math.round((canvas.width / v.videoWidth) * v.videoHeight);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
    const byteString = atob(dataUrl.split(",")[1] ?? "");
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
    return new Blob([bytes], { type: "image/jpeg" });
  } catch {
    return null;
  }
}

async function activateProtection(): Promise<void> {
  if (state.protectionActive) return;
  state.protectionActive = true;
  state.status = "protected";
  emit();

  const snapshot = captureIntruderSnapshot();
  let snapshotDataUrl: string | null = null;
  if (snapshot) {
    try {
      snapshotDataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = (): void => res(String(reader.result ?? ""));
        reader.onerror = (): void => rej(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(snapshot);
      });
    } catch {
      snapshotDataUrl = null;
    }
  }

  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: "ACTIVATE_PROTECTION" });
      await chrome.runtime.sendMessage({
        type: "SEND_ALERT",
        payload: { snapshotDataUrl },
      });
    }
  } catch {
    /* background may not be reachable */
  }
}

async function deactivateProtection(): Promise<void> {
  if (!state.protectionActive) return;
  state.protectionActive = false;
  state.status = "owner-present";
  emit();
  try {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: "DEACTIVATE_PROTECTION" });
    }
  } catch {
    /* background may not be reachable */
  }
}

function bestDistanceAcrossFaces(
  gallery: number[][],
  detections: DetectionWithDescriptor[]
): number {
  let best = Number.POSITIVE_INFINITY;
  for (const det of detections) {
    const live = Array.from(det.descriptor);
    const d = bestGalleryDistance(live, gallery);
    if (d < best) best = d;
  }
  return best;
}

function deriveUiStatus(
  detectionsLength: number,
  multipleFaces: boolean,
  bestDistance: number
): DetectionStatus {
  if (state.protectionActive) return "protected";
  if (detectionsLength === 0) return "no-face";
  if (multipleFaces) return "multiple-faces";
  if (bestDistance > UNKNOWN_DISTANCE_MIN) return "intruder";
  return "owner-present";
}

function deriveDashboardDot(
  detectionsLength: number,
  multipleFaces: boolean,
  bestDistance: number
): DetectionDashboardDot {
  if (detectionsLength === 0) return "no-face";
  if (multipleFaces || bestDistance > UNKNOWN_DISTANCE_MIN) return "unknown";
  if (bestDistance <= OWNER_DISTANCE_MAX) return "owner";
  return "unknown";
}

async function tick(): Promise<void> {
  if (!state.running || !state.video || !state.ownerGallery) return;

  try {
    const gallery = state.ownerGallery;
    const detections = await detectFaces(state.video);
    const now = Date.now();

    if (detections.length === 0) {
      state.matchConfidencePercent = null;
      state.dashboardDot = "no-face";
      state.lastResult = {
        isOwner: false,
        confidence: 0,
        timestamp: now,
      };
      // No face → never arm blur from empty frames only.
      if (state.protectionActive) {
        state.status = "protected";
      } else {
        state.status = "no-face";
      }
      emit();
      return;
    }

    state.lastFaceSeenAt = now;
    const multipleFaces = detections.length > 1;
    const bestDistance = bestDistanceAcrossFaces(gallery, detections);
    const matchPct = matchConfidencePercent(bestDistance);
    state.matchConfidencePercent = matchPct;

    const soloMatch =
      !multipleFaces && bestDistance <= OWNER_DISTANCE_MAX;
    const threatImmediate =
      multipleFaces || bestDistance > UNKNOWN_DISTANCE_MIN;

    if (soloMatch) {
      state.ownerLastSeenAt = now;
      if (state.protectionActive) {
        await deactivateProtection();
      }
    }

    // Unknown single face OR multiple faces → blur as soon as this frame resolves.
    if (threatImmediate && !soloMatch && !state.protectionActive) {
      await activateProtection();
    }

    state.dashboardDot = deriveDashboardDot(
      detections.length,
      multipleFaces,
      bestDistance
    );

    state.lastResult = {
      isOwner: soloMatch,
      confidence: distanceToConfidence(bestDistance),
      timestamp: now,
    };

    state.status = deriveUiStatus(
      detections.length,
      multipleFaces,
      bestDistance
    );

    emit();
  } catch (err) {
    state.status = "error";
    state.error = err instanceof Error ? err.message : "Detection error";
    emit();
  }
}

export const detectionService = {
  subscribe(listener: Listener): () => void {
    state.listeners.add(listener);
    listener({
      status: state.status,
      lastResult: state.lastResult,
      lastFaceSeenAt: state.lastFaceSeenAt,
      error: state.error,
      dashboardDot: state.dashboardDot,
      matchConfidencePercent: state.matchConfidencePercent,
      legacySingleTemplate: state.legacySingleTemplate,
    });
    return () => state.listeners.delete(listener);
  },

  getStatus(): DetectionLoopStatus {
    return {
      status: state.status,
      lastResult: state.lastResult,
      lastFaceSeenAt: state.lastFaceSeenAt,
      error: state.error,
      dashboardDot: state.dashboardDot,
      matchConfidencePercent: state.matchConfidencePercent,
      legacySingleTemplate: state.legacySingleTemplate,
    };
  },

  async startDetection(
    pin: string,
    video: HTMLVideoElement,
    options?: { gracePeriodMs?: number }
  ): Promise<void> {
    if (state.running) return;
    state.status = "starting";
    state.error = null;
    state.dashboardDot = "scanning";
    state.matchConfidencePercent = null;
    emit();

    const stored = await faceStorage.load();
    if (!stored) {
      state.status = "error";
      state.error = "No enrolled face found";
      emit();
      throw new Error(state.error);
    }

    let gallery: number[][];
    let legacySingle = false;
    try {
      const flat = await decryptEmbedding(
        stored.encryptedEmbedding,
        stored.iv,
        stored.salt,
        pin
      );
      if (stored.version === 2) {
        const inferred =
          stored.topEmbeddingCount && stored.topEmbeddingCount > 0
            ? stored.topEmbeddingCount
            : Math.floor(flat.length / FACE_DESCRIPTOR_DIM);
        if (inferred >= 1 && flat.length >= inferred * FACE_DESCRIPTOR_DIM) {
          gallery = unpackEmbeddingGallery(flat, inferred);
          legacySingle = inferred === 1;
        } else {
          gallery = [flat];
          legacySingle = true;
        }
      } else {
        gallery = [flat];
        legacySingle = true;
      }
    } catch (err) {
      state.status = "error";
      state.error = err instanceof Error ? err.message : "Decryption failed";
      emit();
      throw err;
    }

    await initializeFaceDetection();

    const grace = options?.gracePeriodMs;
    state.gracePeriodMs =
      typeof grace === "number" && Number.isFinite(grace)
        ? Math.max(1000, Math.min(15000, grace))
        : DEFAULT_GRACE_PERIOD_MS;

    state.ownerGallery = gallery;
    state.legacySingleTemplate = legacySingle;
    state.video = video;
    state.running = true;
    state.lastFaceSeenAt = Date.now();
    state.ownerLastSeenAt = Date.now();
    state.status = "running";
    emit();

    void tick();
    state.intervalId = setInterval(() => {
      void tick();
    }, DETECTION_INTERVAL_MS);
  },

  /** Kept for API compatibility — blur timing is immediate (grace not used). */
  setGracePeriod(ms: number): void {
    if (!Number.isFinite(ms)) return;
    state.gracePeriodMs = Math.max(1000, Math.min(15000, ms));
  },

  stopDetection(): void {
    state.running = false;
    if (state.intervalId !== null) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.video = null;
    state.ownerGallery = null;
    state.legacySingleTemplate = false;
    state.lastFaceSeenAt = null;
    state.ownerLastSeenAt = null;
    state.status = "idle";
    state.lastResult = null;
    state.error = null;
    state.protectionActive = false;
    state.dashboardDot = "no-face";
    state.matchConfidencePercent = null;
    emit();
  },
};
