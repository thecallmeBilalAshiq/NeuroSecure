import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ListChecks,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DetectionDashboardDot,
  DetectionLoopStatus,
  DetectionStatus,
} from "../../face/types";
import { detectionService } from "../../services/detectionService";
import { useSettingsStore } from "../../store/settingsStore";
import Button from "../ui/Button";
import Card from "../ui/Card";
import TabPicker from "./TabPicker";

type Phase = "idle" | "pin" | "starting" | "running" | "error";

interface StatusMeta {
  label: string;
  description: string;
  tone: "ok" | "info" | "warn" | "danger";
  Icon: typeof ShieldCheck;
}

const STATUS_META: Record<DetectionStatus, StatusMeta> = {
  idle: {
    label: "Standby",
    description: "Camera off",
    tone: "info",
    Icon: ShieldOff,
  },
  starting: {
    label: "Initializing",
    description: "Loading AI models…",
    tone: "info",
    Icon: ShieldOff,
  },
  running: {
    label: "Looking for you",
    description: "Move closer to the camera",
    tone: "info",
    Icon: Eye,
  },
  "owner-present": {
    label: "Owner verified",
    description: "Your face is recognized",
    tone: "ok",
    Icon: ShieldCheck,
  },
  "no-face": {
    label: "No face in view",
    description: "Watching for movement…",
    tone: "warn",
    Icon: EyeOff,
  },
  intruder: {
    label: "Unfamiliar face",
    description: "Verifying identity…",
    tone: "warn",
    Icon: ShieldAlert,
  },
  "multiple-faces": {
    label: "Multiple people detected",
    description: "More than one face in view — protecting screen…",
    tone: "warn",
    Icon: ShieldAlert,
  },
  protected: {
    label: "Screen protected",
    description: "Unknown face detected — pages have been blurred",
    tone: "danger",
    Icon: ShieldAlert,
  },
  error: {
    label: "Detection error",
    description: "Something went wrong",
    tone: "danger",
    Icon: AlertTriangle,
  },
};

function detectionDashboardMeta(
  dot: DetectionDashboardDot | undefined
): { label: string; dotClass: string; ringClass: string } {
  switch (dot) {
    case "owner":
      return {
        label: "Owner Detected",
        dotClass: "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.35)] animate-pulse",
        ringClass: "ring-emerald-200/80",
      };
    case "scanning":
      return {
        label: "Scanning…",
        dotClass: "bg-amber-400 animate-pulse",
        ringClass: "ring-amber-200/80",
      };
    case "unknown":
      return {
        label: "Unknown Face",
        dotClass: "bg-red-500",
        ringClass: "ring-red-200/80",
      };
    case "no-face":
    default:
      return {
        label: "No Face",
        dotClass: "bg-slate-400",
        ringClass: "ring-slate-200/60",
      };
  }
}

const TONE_STYLES: Record<
  StatusMeta["tone"],
  { bg: string; text: string; ring: string }
> = {
  ok: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  info: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    ring: "ring-slate-200",
  },
  warn: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  danger: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
  },
};

function PinDots({ value, length }: { value: string; length: number }): JSX.Element {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length }).map((_, i) => (
        <span
          key={i}
          className={[
            "w-2.5 h-2.5 rounded-full transition-colors",
            i < value.length ? "bg-primary" : "bg-slate-200",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function humanizeStartError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("incorrect pin") || lower.includes("decryption")) {
    return "Wrong PIN. Try again.";
  }
  if (msg.includes("NotAllowedError") || lower.includes("permission")) {
    return "Camera permission was denied. Click the camera icon in the address bar, choose 'Always allow', and try again.";
  }
  if (msg.includes("NotFoundError") || msg.includes("OverconstrainedError")) {
    return "No camera was found. Plug in a webcam and try again.";
  }
  if (msg.includes("NotReadableError")) {
    return "The camera is in use by another app (Zoom, Meet, Teams). Close it and try again.";
  }
  if (lower.includes("timed out")) {
    return "Camera took too long to start. Reload the page and try again.";
  }
  return msg;
}

interface LiveProtectionProps {
  variant: "popup" | "options";
}

export function LiveProtection({ variant }: LiveProtectionProps): JSX.Element {
  const isEnrolled = useSettingsStore((s) => s.isEnrolled);
  const isProtectionEnabled = useSettingsStore((s) => s.isProtectionEnabled);
  const setProtection = useSettingsStore((s) => s.setProtection);
  const gracePeriodMs = useSettingsStore((s) => s.gracePeriodMs);
  const setGracePeriodMs = useSettingsStore((s) => s.setGracePeriodMs);
  const tabFilterMode = useSettingsStore((s) => s.tabFilterMode);
  const selectedOrigins = useSettingsStore((s) => s.selectedOrigins);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(true);
  const [tabPickerOpen, setTabPickerOpen] = useState(false);
  const [status, setStatus] = useState<DetectionLoopStatus>(
    detectionService.getStatus()
  );

  useEffect(() => {
    return detectionService.subscribe(setStatus);
  }, []);

  // Keep detectionService grace period in sync with the slider.
  useEffect(() => {
    detectionService.setGracePeriod(gracePeriodMs);
  }, [gracePeriodMs]);

  // Keep the visible preview <video> in sync with the live stream.
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    if (phase === "running" && previewVisible && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
      }
      void el.play().catch(() => undefined);
    } else {
      el.srcObject = null;
    }
  }, [phase, previewVisible, status.status]);

  const stopCamera = useCallback((): void => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // On unmount, stop everything to release the camera.
  useEffect(() => {
    return () => {
      detectionService.stopDetection();
      stopCamera();
    };
  }, [stopCamera]);

  // If protection was previously enabled but isn't running yet (e.g. user
  // reloaded the options page), prompt for PIN to resume.
  useEffect(() => {
    if (variant !== "options") return;
    if (!isEnrolled) return;
    if (phase !== "idle") return;
    if (isProtectionEnabled && status.status === "idle") {
      setPhase("pin");
    }
  }, [variant, isEnrolled, isProtectionEnabled, phase, status.status]);

  const startCamera = useCallback(async (): Promise<HTMLVideoElement> => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      throw new Error(
        "This browser does not expose a camera API. Open NeuroSecure in a regular browser tab and try again."
      );
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 480, height: 360 },
      audio: false,
    });
    streamRef.current = stream;
    if (!videoRef.current) {
      throw new Error("Video element not mounted");
    }
    const video = videoRef.current;
    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      let done = false;
      const onLoaded = (): void => {
        if (done) return;
        done = true;
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        resolve();
      };
      const onError = (): void => {
        if (done) return;
        done = true;
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        reject(new Error("Camera failed to start"));
      };
      video.addEventListener("loadedmetadata", onLoaded);
      video.addEventListener("error", onError);
      setTimeout(() => {
        if (done) return;
        done = true;
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("error", onError);
        reject(new Error("Camera timed out"));
      }, 8000);
    });
    await video.play();
    return video;
  }, []);

  const handleEnable = async (): Promise<void> => {
    if (!isEnrolled) return;
    if (variant === "popup") {
      // Camera + persistent loop must run in the options page (a real tab)
      // because the popup closes whenever it loses focus.
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.tabs?.create
      ) {
        await chrome.tabs.create({
          url: chrome.runtime.getURL("options.html"),
        });
        window.close();
      }
      return;
    }
    setPhase("pin");
    setPinError(null);
    setPhaseError(null);
  };

  const handleDisable = async (): Promise<void> => {
    detectionService.stopDetection();
    stopCamera();
    await setProtection(false);
    setPhase("idle");
    setPin("");
    setPinError(null);
    setPhaseError(null);
  };

  const handleStart = async (): Promise<void> => {
    if (pin.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    setPhase("starting");
    setPhaseError(null);
    setPinError(null);
    try {
      const video = await startCamera();
      await detectionService.startDetection(pin, video, {
        gracePeriodMs,
      });
      await setProtection(true);
      setPin("");
      setPhase("running");
    } catch (err) {
      stopCamera();
      detectionService.stopDetection();
      const raw = err instanceof Error ? err.message : "Failed to start";
      const friendly = humanizeStartError(raw);
      if (raw.toLowerCase().includes("incorrect pin")) {
        setPinError("Wrong PIN. Try again.");
        setPhase("pin");
      } else {
        setPhaseError(friendly);
        setPhase("error");
      }
    }
  };

  const meta = STATUS_META[status.status] ?? STATUS_META.idle;
  const tone = TONE_STYLES[meta.tone];
  const StatusIcon = meta.Icon;
  const isRunning = phase === "running";
  const isStarting = phase === "starting";
  const showVideoCard = isRunning || isStarting;
  const dashMeta = detectionDashboardMeta(status.dashboardDot);
  const matchConfidence =
    status.matchConfidencePercent != null
      ? Math.round(status.matchConfidencePercent)
      : Math.round((status.lastResult?.confidence ?? 0) * 100);
  const graceSeconds = Math.round(gracePeriodMs / 100) / 10;
  const tabModeSummary =
    tabFilterMode === "all"
      ? "All browsing tabs"
      : selectedOrigins.length === 0
      ? "No tabs selected"
      : `${selectedOrigins.length} site${
          selectedOrigins.length === 1 ? "" : "s"
        } selected`;

  // ----- Render -----

  if (!isEnrolled) {
    return (
      <Card padding="md">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#94A3B8,#64748B)" }}
          >
            <ShieldOff size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold">Enroll to protect</div>
            <div className="text-xs text-text-secondary mt-0.5">
              Set up Face ID first, then return here to enable protection.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Always-mounted hidden video that drives the detection loop. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="hidden"
        aria-hidden
      />

      {/* Big status card with toggle */}
      <motion.div
        layout
        className="rounded-card border p-4 transition-colors"
        style={{
          background: isRunning
            ? "linear-gradient(135deg,#ECFDF5 0%,#FFFFFF 100%)"
            : "#FFFFFF",
          borderColor: isRunning ? "#A7F3D0" : "#E2E8F0",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{
              background: isRunning
                ? "linear-gradient(135deg,#10B981,#059669)"
                : "linear-gradient(135deg,#94A3B8,#64748B)",
            }}
          >
            {isRunning ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold leading-tight">
              {isRunning
                ? "Protection Active"
                : phase === "pin"
                ? "Unlock to start"
                : "Protection Paused"}
            </div>
            <div className="text-xs text-text-secondary mt-0.5">
              {isRunning
                ? "Webcam is monitoring this device"
                : phase === "pin"
                ? "Enter your PIN to begin live monitoring"
                : phase === "starting"
                ? "Starting camera & AI model…"
                : "Click below to enable monitoring"}
            </div>
          </div>
          {isRunning ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleDisable()}
              leftIcon={<CameraOff size={14} />}
            >
              Stop
            </Button>
          ) : phase === "pin" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleDisable()}
            >
              Cancel
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => void handleEnable()}
              leftIcon={<Camera size={14} />}
            >
              Enable
            </Button>
          )}
        </div>
      </motion.div>

      {(isRunning || isStarting) && (
        <Card padding="md" className="border border-border">
          <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2.5">
            Live detection
          </div>
          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2",
                dashMeta.dotClass,
                dashMeta.ringClass,
              ].join(" ")}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary">
                {dashMeta.label}
              </div>
              <div className="text-xs text-text-secondary mt-0.5 tabular-nums">
                Match confidence:{" "}
                {status.matchConfidencePercent != null
                  ? `${matchConfidence}%`
                  : "—"}
              </div>
            </div>
          </div>
          {status.legacySingleTemplate && (
            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-2.5 leading-relaxed">
              Your profile uses a single legacy template. Re-enroll Face for
              multi-angle matching (recommended).
            </p>
          )}
        </Card>
      )}

      <AnimatePresence mode="wait">
        {phase === "pin" && (
          <motion.div
            key="pin"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Card padding="md">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-primary" />
                  <div className="text-sm font-semibold">
                    Enter your protection PIN
                  </div>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleStart();
                  }}
                  className="w-full text-center text-2xl tracking-[0.5em] font-bold rounded-input border border-border bg-white py-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="••••••"
                />
                <PinDots value={pin} length={6} />
                {pinError && (
                  <p className="text-xs font-medium text-danger text-center">
                    {pinError}
                  </p>
                )}
                <Button
                  fullWidth
                  onClick={() => void handleStart()}
                  loading={isStarting}
                  disabled={pin.length < 4}
                  leftIcon={<ShieldCheck size={14} />}
                >
                  {isStarting ? "Starting…" : "Start protection"}
                </Button>
                <p className="text-[11px] text-text-muted text-center leading-relaxed">
                  This is the same PIN you set during enrollment. It decrypts
                  your face data on this device only.
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {showVideoCard && (
          <motion.div
            key="monitor"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Card padding="none">
              <div
                className="relative overflow-hidden rounded-t-card"
                style={{ background: "#0F172A", height: 180 }}
              >
                <video
                  ref={previewRef}
                  autoPlay
                  playsInline
                  muted
                  className={[
                    "absolute inset-0 w-full h-full object-cover",
                    previewVisible ? "" : "opacity-0",
                  ].join(" ")}
                  style={{ transform: "scaleX(-1)" }}
                />
                {!previewVisible && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/70">
                    <EyeOff size={28} />
                  </div>
                )}
                {isStarting && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80 bg-slate-900/80">
                    <div className="text-xs font-semibold">
                      Loading AI model & camera…
                    </div>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                      tone.bg,
                      tone.text,
                      tone.ring,
                    ].join(" ")}
                  >
                    {meta.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewVisible((p) => !p)}
                  className="absolute top-2 right-2 rounded-full bg-black/50 hover:bg-black/70 text-white p-1.5 transition"
                  aria-label={previewVisible ? "Hide preview" : "Show preview"}
                >
                  {previewVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                {isRunning && !isStarting && (
                  <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/50 rounded-md px-2 py-1.5">
                    <CheckCircle2
                      size={12}
                      className={
                        status.dashboardDot === "unknown"
                          ? "text-red-300"
                          : status.dashboardDot === "scanning"
                          ? "text-amber-300"
                          : status.dashboardDot === "no-face"
                          ? "text-slate-300"
                          : "text-emerald-300"
                      }
                    />
                    <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className={[
                          "h-full transition-all duration-500",
                          status.dashboardDot === "unknown"
                            ? "bg-red-400"
                            : status.dashboardDot === "scanning"
                            ? "bg-amber-300"
                            : status.dashboardDot === "no-face"
                            ? "bg-slate-400"
                            : "bg-emerald-300",
                        ].join(" ")}
                        style={{
                          width: `${status.matchConfidencePercent != null ? matchConfidence : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-white font-semibold tabular-nums">
                      {status.matchConfidencePercent != null ? `${matchConfidence}%` : "—"}
                    </span>
                  </div>
                )}
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <StatusIcon size={14} className={tone.text} />
                  <div className="text-sm font-semibold">{meta.label}</div>
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {meta.description}
                </div>
                {status.status === "protected" && (
                  <div className="mt-2 rounded-md bg-red-50 border border-red-200 p-2 text-[11px] text-red-700 leading-relaxed">
                    Your tabs have been blurred until your face is recognized
                    again. An alert email is on its way.
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {phase === "error" && phaseError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <Card variant="bordered" padding="md" className="border-red-200 bg-red-50">
              <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="text-danger mt-0.5" />
                  <p className="text-xs text-danger font-medium leading-relaxed">
                    {phaseError}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPhaseError(null);
                    setPhase("pin");
                  }}
                >
                  Try again
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tuning panel: grace period + tabs to monitor */}
      <Card padding="md">
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-primary" />
              <div className="text-sm font-semibold">Activation delay</div>
            </div>
            <span className="text-xs text-text-secondary tabular-nums font-semibold">
              {graceSeconds.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={1000}
            max={10000}
            step={500}
            value={gracePeriodMs}
            onChange={(e) => void setGracePeriodMs(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Activation delay in milliseconds"
          />
          <div className="flex items-center justify-between text-[10px] text-text-muted">
            <span>1.0s · responsive</span>
            <span>10.0s · ignore passers-by</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed -mt-1">
            Blur triggers as soon as an unknown or second face appears; blur
            clears as soon as you alone are verified. This slider is saved for a
            future optional delay setting.
          </p>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks size={14} className="text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">
                  Tabs to monitor
                </div>
                <div className="text-[11px] text-text-secondary truncate">
                  {tabModeSummary}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTabPickerOpen(true)}
            >
              Choose
            </Button>
          </div>
        </div>
      </Card>

      <TabPicker open={tabPickerOpen} onClose={() => setTabPickerOpen(false)} />
    </div>
  );
}

export default LiveProtection;
