import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Shield,
  ShieldCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { initializeFaceDetection, isFacePresent } from "../face/faceDetection";
import type { AngleLabel, EnrollmentState } from "../face/types";
import { enrollmentService } from "../services/enrollmentService";
import { useSettingsStore } from "../store/settingsStore";

interface EnrollmentPageProps {
  onComplete: () => void;
}

type Step = "pin" | "capture" | "done";

const ANGLE_COPY: Record<
  AngleLabel,
  { emoji: string; title: string; desc: string }
> = {
  straight: {
    emoji: "😊",
    title: "Look straight",
    desc: "Center your face in the oval",
  },
  left: {
    emoji: "⬅️",
    title: "Turn slightly left",
    desc: "Keep your eyes on the camera",
  },
  right: {
    emoji: "➡️",
    title: "Turn slightly right",
    desc: "Hold for a couple of seconds",
  },
};

function PinDots({
  value,
  length,
}: {
  value: string;
  length: number;
}): JSX.Element {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <span
          key={i}
          className={[
            "w-3 h-3 rounded-full transition-colors",
            i < value.length ? "bg-primary" : "bg-slate-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

export function EnrollmentPage({ onComplete }: EnrollmentPageProps): JSX.Element {
  const setEnrolled = useSettingsStore((s) => s.setEnrolled);

  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceVisible, setFaceVisible] = useState(false);
  const [enrollState, setEnrollState] = useState<EnrollmentState>({
    status: "idle",
    currentAngle: "straight",
    framesCollected: 0,
    totalFrames: 15,
    error: null,
    isComplete: false,
  });
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(async (): Promise<HTMLVideoElement> => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        "This browser does not expose a camera API. Open NeuroSecure in a regular browser tab and try again."
      );
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 360 },
        audio: false,
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const detail = err instanceof Error ? err.message : String(err);
      if (name === "NotAllowedError" || name === "SecurityError") {
        throw new Error(
          "Camera access was blocked. Click the camera icon in the address bar, choose \"Always allow\", then click Continue again."
        );
      }
      if (name === "NotFoundError" || name === "OverconstrainedError") {
        throw new Error(
          "No camera was found on this device. Plug in a webcam and try again."
        );
      }
      if (name === "NotReadableError") {
        throw new Error(
          "The camera is already in use by another app. Close other video apps (Zoom, Meet, Teams) and try again."
        );
      }
      throw new Error(`Could not start the camera: ${detail}`);
    }
    streamRef.current = stream;
    if (!videoRef.current) {
      throw new Error("Video element not mounted");
    }
    const video = videoRef.current;
    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      const onLoaded = (): void => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        resolve();
      };
      const onError = (): void => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        reject(new Error("Camera failed to start"));
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
    });
    await video.play();
    setCameraReady(true);
    return video;
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Live face presence indicator
  useEffect(() => {
    if (step !== "capture" || !cameraReady) return;
    let cancelled = false;
    const id = setInterval(async () => {
      if (cancelled || !videoRef.current) return;
      try {
        const present = await isFacePresent(videoRef.current);
        if (!cancelled) setFaceVisible(present);
      } catch {
        /* ignore */
      }
    }, 700);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [step, cameraReady]);

  const handleStartCapture = async (): Promise<void> => {
    setError(null);
    setPinError(null);
    if (pin.length < 6) {
      setPinError("PIN must be 6 digits");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("PINs do not match");
      return;
    }
    setStep("capture");
    try {
      await initializeFaceDetection();
      const video = await startCamera();

      await enrollmentService.enroll(video, pin, (s) => setEnrollState(s));
      stopCamera();
      setEnrolled(true, Date.now());
      setStep("done");
    } catch (err) {
      stopCamera();
      const msg = err instanceof Error ? err.message : "Enrollment failed";
      setError(msg);
      setEnrollState((s) => ({ ...s, status: "error", error: msg }));
    }
  };

  const angle = enrollState.currentAngle;
  const copy = ANGLE_COPY[angle];
  const progress = useMemo(
    () =>
      Math.min(
        100,
        Math.round((enrollState.framesCollected / enrollState.totalFrames) * 100)
      ),
    [enrollState.framesCollected, enrollState.totalFrames]
  );

  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      <AnimatePresence mode="wait">
        {step === "pin" && (
          <motion.section
            key="pin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col items-center gap-3 pt-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-primary"
                style={{ background: "linear-gradient(135deg,#6366F1,#4F46E5)" }}
              >
                <ShieldCheck size={26} />
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold">Secure Your Face Data</h1>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  Your PIN encrypts your face data locally.
                  <br />
                  We never see it.
                </p>
              </div>
            </div>

            <Card padding="lg">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Choose a 6-digit PIN
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="w-full text-center text-2xl tracking-[0.5em] font-bold rounded-input border border-border bg-white py-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                    placeholder="••••••"
                  />
                  <div className="mt-2">
                    <PinDots value={pin} length={6} />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    Confirm PIN
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) =>
                      setConfirmPin(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    className="w-full text-center text-2xl tracking-[0.5em] font-bold rounded-input border border-border bg-white py-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                    placeholder="••••••"
                  />
                  <div className="mt-2">
                    <PinDots value={confirmPin} length={6} />
                  </div>
                </div>

                {pinError && (
                  <p className="text-xs font-medium text-danger">{pinError}</p>
                )}

                <Button
                  fullWidth
                  onClick={handleStartCapture}
                  rightIcon={<ArrowRight size={16} />}
                  disabled={pin.length !== 6 || confirmPin.length !== 6}
                >
                  Continue
                </Button>
              </div>
            </Card>

            <p className="text-[11px] text-text-muted text-center leading-relaxed">
              Your PIN is never sent to our servers. If you forget it,
              you'll need to re-enroll your face.
            </p>
          </motion.section>
        )}

        {step === "capture" && (
          <motion.section
            key="capture"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-4"
          >
            <header className="text-center">
              <h1 className="text-xl font-bold">Capture Your Face</h1>
              <p className="text-sm text-text-secondary mt-1">
                We'll capture {enrollState.totalFrames} frames from 3 angles.
              </p>
            </header>

            <div
              className={[
                "relative overflow-hidden rounded-card border-2 transition-colors",
                faceVisible ? "border-success" : "border-border",
              ].join(" ")}
              style={{ background: "#0F172A", height: 240 }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={[
                    "w-40 h-52 rounded-[50%] border-2 transition-colors",
                    faceVisible
                      ? "border-success/80"
                      : "border-white/40",
                  ].join(" ")}
                  style={{ boxShadow: "0 0 0 9999px rgba(15,23,42,0.35)" }}
                />
              </div>
              <div className="absolute top-2 left-2">
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    faceVisible
                      ? "bg-success/20 text-emerald-100"
                      : "bg-white/20 text-white",
                  ].join(" ")}
                >
                  {faceVisible ? "Face detected" : "Searching for face…"}
                </span>
              </div>
            </div>

            <Card padding="md">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{copy.emoji}</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{copy.title}</div>
                  <div className="text-xs text-text-secondary">
                    {copy.desc}
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-center gap-2">
                {(["straight", "left", "right"] as AngleLabel[]).map((a) => {
                  const angleIndex = ["straight", "left", "right"].indexOf(a);
                  const currentIndex = ["straight", "left", "right"].indexOf(
                    angle
                  );
                  const done = angleIndex < currentIndex;
                  const active = angleIndex === currentIndex;
                  return (
                    <span
                      key={a}
                      className={[
                        "h-2 w-8 rounded-full transition-colors",
                        done
                          ? "bg-success"
                          : active
                          ? "bg-primary"
                          : "bg-slate-200",
                      ].join(" ")}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-secondary">
                <span>
                  {enrollState.framesCollected}/{enrollState.totalFrames} frames
                </span>
                <span className="capitalize">
                  {enrollState.status === "loading-models"
                    ? "Loading AI model"
                    : enrollState.status === "preparing"
                    ? "Get ready…"
                    : enrollState.status === "encrypting"
                    ? "Encrypting"
                    : enrollState.status === "saving"
                    ? "Saving"
                    : enrollState.status === "complete"
                    ? "Done!"
                    : "Capturing"}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                  style={{
                    background: "linear-gradient(135deg,#6366F1,#4F46E5)",
                  }}
                />
              </div>
            </div>

            {error && (
              <Card variant="bordered" padding="md" className="border-red-200 bg-red-50">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-danger font-medium">{error}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setError(null);
                      setStep("pin");
                    }}
                  >
                    Try again
                  </Button>
                </div>
              </Card>
            )}
          </motion.section>
        )}

        {step === "done" && (
          <motion.section
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                style={{ background: "linear-gradient(135deg,#10B981,#059669)" }}
              >
                <Check size={32} strokeWidth={3} />
              </div>
            </motion.div>
            <div className="text-center">
              <h2 className="text-xl font-bold">Enrollment Complete!</h2>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Your face is now registered.
                <br />
                NeuroSecure will protect your screen.
              </p>
            </div>
            <Button
              fullWidth
              onClick={onComplete}
              leftIcon={<Shield size={16} />}
            >
              Start Protecting
            </Button>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EnrollmentPage;
