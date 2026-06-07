export type AngleLabel = "straight" | "left" | "right";

export interface FaceEmbedding {
  vector: number[];
  capturedAt: number;
  angleLabel: AngleLabel;
}

/**
 * v1 — single averaged embedding (legacy).
 * v2 — up to five best-quality embeddings packed in one ciphertext.
 */
export interface StoredFaceData {
  encryptedEmbedding: string;
  iv: string;
  salt: string;
  enrolledAt: number;
  version: 1 | 2;
  /** v2 only: how many 128-dim vectors are packed (1–5). */
  topEmbeddingCount?: number;
}

export type EnrollmentStatus =
  | "idle"
  | "loading-models"
  | "preparing"
  | "capturing"
  | "encrypting"
  | "saving"
  | "complete"
  | "error";

export interface EnrollmentState {
  status: EnrollmentStatus;
  currentAngle: AngleLabel;
  framesCollected: number;
  totalFrames: number;
  error: string | null;
  isComplete: boolean;
}

export interface DetectionResult {
  isOwner: boolean;
  confidence: number;
  timestamp: number;
}

export type DetectionStatus =
  | "idle"
  | "starting"
  | "running"
  | "owner-present"
  | "no-face"
  | "intruder"
  | "multiple-faces"
  | "protected"
  | "error";

/** Real-time dashboard indicator (last processed frame). */
export type DetectionDashboardDot = "owner" | "scanning" | "unknown" | "no-face";

export interface DetectionLoopStatus {
  status: DetectionStatus;
  lastResult: DetectionResult | null;
  lastFaceSeenAt: number | null;
  error: string | null;
  /** Popup / options dashboard: which dot to show. */
  dashboardDot?: DetectionDashboardDot;
  /** Match confidence 0–100 from distance (0.65 scale); null if no face. */
  matchConfidencePercent?: number | null;
  /** True when enrolled with v1 single template (re-enroll for best accuracy). */
  legacySingleTemplate?: boolean;
}
