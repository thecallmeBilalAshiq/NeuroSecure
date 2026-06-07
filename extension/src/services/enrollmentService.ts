import { encryptEmbedding } from "../face/encryption";
import {
  getFaceDescriptorWithScore,
  initializeFaceDetection,
  isFacePresent,
} from "../face/faceDetection";
import { generateEmbedding } from "../face/embeddingEngine";
import { faceStorage } from "../face/faceStorage";
import type {
  AngleLabel,
  EnrollmentState,
  StoredFaceData,
} from "../face/types";

const ANGLES: AngleLabel[] = ["straight", "left", "right"];
const FRAMES_PER_ANGLE = 5;
const FRAME_INTERVAL_MS = 500;
const GRACE_PERIOD_MS = 1500;
const TOP_EMBEDDINGS = 5;

export type ProgressCallback = (state: EnrollmentState) => void;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const enrollmentService = {
  async isEnrolled(): Promise<boolean> {
    return faceStorage.exists();
  },

  async deleteEnrollment(): Promise<void> {
    await faceStorage.remove();
  },

  async enroll(
    video: HTMLVideoElement,
    pin: string,
    onProgress: ProgressCallback
  ): Promise<void> {
    if (pin.length < 4) {
      throw new Error("PIN must be at least 4 characters");
    }

    const totalFrames = ANGLES.length * FRAMES_PER_ANGLE;
    let collected = 0;

    const emit = (partial: Partial<EnrollmentState>): void => {
      onProgress({
        status: "capturing",
        currentAngle: ANGLES[0],
        framesCollected: collected,
        totalFrames,
        error: null,
        isComplete: false,
        ...partial,
      });
    };

    emit({ status: "loading-models" });
    await initializeFaceDetection();

    /** Every captured frame with SSD detection score (higher = sharper / more confident). */
    const scoredSamples: { embedding: number[]; score: number }[] = [];

    for (const angle of ANGLES) {
      emit({
        status: "preparing",
        currentAngle: angle,
        framesCollected: collected,
      });
      await sleep(GRACE_PERIOD_MS);

      let attemptsForAngle = 0;
      let collectedThisAngle = 0;

      while (collectedThisAngle < FRAMES_PER_ANGLE) {
        attemptsForAngle += 1;
        if (attemptsForAngle > FRAMES_PER_ANGLE * 6) {
          throw new Error(
            `Could not capture enough frames for ${angle}. Make sure your face is visible.`
          );
        }

        const present = await isFacePresent(video);
        if (!present) {
          emit({
            status: "capturing",
            currentAngle: angle,
            framesCollected: collected,
          });
          await sleep(FRAME_INTERVAL_MS);
          continue;
        }

        const withScore = await getFaceDescriptorWithScore(video);
        if (withScore) {
          scoredSamples.push({
            embedding: Array.from(withScore.descriptor),
            score: withScore.score,
          });
          collected += 1;
          collectedThisAngle += 1;
        } else {
          const embedding = await generateEmbedding(video);
          if (embedding) {
            scoredSamples.push({ embedding, score: 0 });
            collected += 1;
            collectedThisAngle += 1;
          }
        }

        emit({
          status: "capturing",
          currentAngle: angle,
          framesCollected: collected,
        });

        await sleep(FRAME_INTERVAL_MS);
      }
    }

    if (scoredSamples.length === 0) {
      throw new Error("No face captured during enrollment");
    }

    emit({
      status: "encrypting",
      currentAngle: ANGLES[ANGLES.length - 1],
      framesCollected: collected,
    });

    scoredSamples.sort((a, b) => b.score - a.score);
    const top = scoredSamples
      .slice(0, TOP_EMBEDDINGS)
      .map((s) => s.embedding);
    const packedFlat = top.flat();
    const { encryptedData, iv, salt } = await encryptEmbedding(packedFlat, pin);

    emit({ status: "saving", framesCollected: collected });

    const stored: StoredFaceData = {
      encryptedEmbedding: encryptedData,
      iv,
      salt,
      enrolledAt: Date.now(),
      version: 2,
      topEmbeddingCount: top.length,
    };
    await faceStorage.save(stored);

    onProgress({
      status: "complete",
      currentAngle: ANGLES[ANGLES.length - 1],
      framesCollected: collected,
      totalFrames,
      error: null,
      isComplete: true,
    });
  },
};
