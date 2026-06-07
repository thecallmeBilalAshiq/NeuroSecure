import { getFaceDescriptor } from "./faceDetection";

/**
 * face-api.js descriptors are L2-normalized 128-dim vectors.
 * Tuned thresholds: strong owner match, "probably owner" band, unknown beyond.
 */
export const FACE_DESCRIPTOR_DIM = 128;
/** High-confidence same-person match. */
export const OWNER_DISTANCE_STRICT = 0.5;
/** At or below this distance (inclusive) we still treat the face as the owner. */
export const OWNER_DISTANCE_MAX = 0.65;
/** Above this distance → unknown / intruder for protection logic. */
export const UNKNOWN_DISTANCE_MIN = 0.65;

/** @deprecated use OWNER_DISTANCE_MAX for new code */
export const SIMILARITY_THRESHOLD = OWNER_DISTANCE_MAX;

export async function generateEmbedding(
  video: HTMLVideoElement
): Promise<number[] | null> {
  const descriptor = await getFaceDescriptor(video);
  if (!descriptor) return null;
  return Array.from(descriptor);
}

export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error("Cannot average an empty list of embeddings");
  }
  const dim = embeddings[0].length;
  const sum = new Array<number>(dim).fill(0);
  for (const emb of embeddings) {
    if (emb.length !== dim) {
      throw new Error("All embeddings must share the same dimensionality");
    }
    for (let i = 0; i < dim; i++) {
      sum[i] += emb[i];
    }
  }
  return sum.map((v) => v / embeddings.length);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vector length mismatch");
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vector length mismatch");
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function isOwner(stored: number[], live: number[]): boolean {
  const distance = euclideanDistance(stored, live);
  return distance <= OWNER_DISTANCE_MAX;
}

/** UI / dashboard: 0–100 from euclidean distance (unknown scale at 0.65). */
export function matchConfidencePercent(distance: number): number {
  return Math.max(
    0,
    Math.min(100, (1 - distance / UNKNOWN_DISTANCE_MIN) * 100)
  );
}

/** 0–1 for legacy `DetectionResult.confidence` consumers. */
export function distanceToConfidence(distance: number): number {
  return matchConfidencePercent(distance) / 100;
}

export function bestGalleryDistance(live: number[], gallery: number[][]): number {
  if (gallery.length === 0) {
    throw new Error("Gallery must contain at least one embedding");
  }
  let best = Number.POSITIVE_INFINITY;
  for (const ref of gallery) {
    const d = euclideanDistance(ref, live);
    if (d < best) best = d;
  }
  return best;
}

/** Unpack `count` contiguous 128-d vectors from a decrypted float flat array. */
export function unpackEmbeddingGallery(
  flat: number[],
  count: number,
  dim = FACE_DESCRIPTOR_DIM
): number[][] {
  if (count < 1) {
    throw new Error("topEmbeddingCount must be at least 1");
  }
  const need = count * dim;
  if (flat.length < need) {
    throw new Error("Decrypted embedding length does not match stored count");
  }
  const out: number[][] = [];
  for (let i = 0; i < count; i++) {
    out.push(flat.slice(i * dim, (i + 1) * dim));
  }
  return out;
}
