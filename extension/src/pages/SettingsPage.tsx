import { motion } from "framer-motion";
import {
  AtSign,
  Bell,
  Crown,
  ListChecks,
  LogOut,
  RefreshCw,
  ScanFace,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import TabPicker from "../components/protection/TabPicker";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Toggle from "../components/ui/Toggle";
import { useAuth } from "../hooks/useAuth";
import { enrollmentService } from "../services/enrollmentService";
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "../store/settingsStore";

interface SettingsPageProps {
  onReEnroll: () => void;
  onUpgrade: () => void;
}

const BACKEND_URL =
  process.env.PLASMO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

function getInitials(email: string): string {
  if (!email) return "NS";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2
    ? parts[0][0] + parts[1][0]
    : local.slice(0, 2);
  return letters.toUpperCase();
}

export function SettingsPage({
  onReEnroll,
  onUpgrade,
}: SettingsPageProps): JSX.Element {
  const { user, session, logout } = useAuth();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const isEnrolled = useSettingsStore((s) => s.isEnrolled);
  const enrolledAt = useSettingsStore((s) => s.enrolledAt);
  const setEnrolled = useSettingsStore((s) => s.setEnrolled);
  const blurOnDetection = useSettingsStore((s) => s.blurOnDetection);
  const setBlurOnDetection = useSettingsStore((s) => s.setBlurOnDetection);
  const alwaysOnProtection = useSettingsStore((s) => s.alwaysOnProtection);
  const setAlwaysOnProtection = useSettingsStore((s) => s.setAlwaysOnProtection);
  const gracePeriodMs = useSettingsStore((s) => s.gracePeriodMs);
  const setGracePeriodMs = useSettingsStore((s) => s.setGracePeriodMs);
  const tabFilterMode = useSettingsStore((s) => s.tabFilterMode);
  const selectedOrigins = useSettingsStore((s) => s.selectedOrigins);

  const [whatsapp, setWhatsapp] = useState(user?.whatsapp_number ?? "");
  const [savingWa, setSavingWa] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [tabPickerOpen, setTabPickerOpen] = useState(false);

  const graceSeconds = Math.round(gracePeriodMs / 100) / 10;
  const tabModeSummary =
    tabFilterMode === "all"
      ? "All browsing tabs"
      : selectedOrigins.length === 0
      ? "No tabs selected"
      : `${selectedOrigins.length} site${
          selectedOrigins.length === 1 ? "" : "s"
        } selected`;

  useEffect(() => {
    setWhatsapp(user?.whatsapp_number ?? "");
  }, [user?.whatsapp_number]);

  const isPro = user?.plan === "PRO";

  const onSaveWhatsapp = async (): Promise<void> => {
    if (!session) return;
    setSavingWa(true);
    setWaError(null);
    setWaSaved(false);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/user/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          whatsapp_number: whatsapp.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(j.message ?? `HTTP ${res.status}`);
      }
      await refreshProfile();
      setWaSaved(true);
    } catch (err) {
      setWaError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingWa(false);
    }
  };

  const onDeleteFaceData = async (): Promise<void> => {
    setDeleting(true);
    try {
      await enrollmentService.deleteEnrollment();
      setEnrolled(false, null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 px-4 py-4"
    >
      {/* Account */}
      <Card padding="md">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: "linear-gradient(135deg,#6366F1,#4F46E5)" }}
          >
            {getInitials(user?.email ?? "")}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{user?.email ?? "—"}</div>
            <div className="flex items-center gap-1.5 mt-1">
              {isPro ? (
                <Badge variant="pro" icon={<Crown size={10} />}>
                  Pro
                </Badge>
              ) : (
                <Badge variant="free">Free</Badge>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-3 w-full text-left text-xs font-semibold text-primary hover:underline"
        >
          {isPro ? "Manage Subscription →" : "Upgrade to Pro →"}
        </button>
      </Card>

      {/* Face Data */}
      <Card padding="md">
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Face Data
        </div>
        <ul className="flex flex-col divide-y divide-border">
          <li className="py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
              <ScanFace size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Face Enrollment</div>
              <div className="text-[11px] text-text-muted">
                {isEnrolled && enrolledAt
                  ? `Enrolled on ${new Date(enrolledAt).toLocaleDateString()}`
                  : "Not enrolled"}
              </div>
            </div>
            <button
              type="button"
              onClick={onReEnroll}
              className="text-xs font-semibold text-primary hover:underline px-2 py-1"
            >
              <span className="inline-flex items-center gap-1">
                <RefreshCw size={12} />
                Re-enroll
              </span>
            </button>
          </li>

          <li className="py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-danger flex items-center justify-center">
              <Trash2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Delete Face Data</div>
              <div className="text-[11px] text-text-muted">
                Remove biometric data from this device
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              loading={deleting}
              onClick={() => void onDeleteFaceData()}
              disabled={!isEnrolled}
              className="text-danger hover:!bg-red-50"
            >
              Delete
            </Button>
          </li>
        </ul>
        <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
          Your face data is encrypted with AES-GCM and stored only on this
          device.
        </p>
      </Card>

      {/* Notifications */}
      <Card padding="md">
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Notifications
        </div>
        <div className="flex flex-col gap-3">
          <Toggle
            checked
            onChange={() => undefined}
            disabled
            label={
              <span className="inline-flex items-center gap-1.5">
                <Bell size={14} />
                Email Alerts
              </span>
            }
            description={
              user?.email
                ? `Alerts sent to ${user.email}`
                : "Alerts sent to your registered email"
            }
          />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <AtSign size={14} />
                WhatsApp Alerts
                {!isPro && <Badge variant="pro">Pro</Badge>}
              </span>
            </div>
            <Input
              placeholder="+1 555 000 0000"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              disabled={!isPro || savingWa}
              hint={
                !isPro
                  ? "Available on the Pro plan"
                  : waSaved
                  ? "Saved"
                  : undefined
              }
              error={waError ?? null}
            />
            <Button
              size="sm"
              variant="secondary"
              loading={savingWa}
              disabled={!isPro}
              onClick={() => void onSaveWhatsapp()}
            >
              Save number
            </Button>
          </div>
        </div>
      </Card>

      {/* Protection */}
      <Card padding="md">
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          Protection
        </div>
        <div className="flex flex-col gap-3">
          <Toggle
            checked={alwaysOnProtection}
            onChange={(v) => void setAlwaysOnProtection(v)}
            label="Always-on Protection"
            description="Auto-enable detection at startup"
          />
          <Toggle
            checked={blurOnDetection}
            onChange={(v) => void setBlurOnDetection(v)}
            label="Blur on Detection"
            description="Blur instead of full lock when an unknown face is detected"
          />

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="font-semibold">Activation Delay</span>
                <span className="text-xs text-text-muted">
                  Reserved — blur activates immediately today
                </span>
              </div>
              <Badge variant="neutral">{graceSeconds.toFixed(1)}s</Badge>
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
              <span>1.0s</span>
              <span>10.0s</span>
            </div>
          </div>

          <div className="h-px bg-border my-1" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <ListChecks size={14} className="text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight">
                  Tabs to Monitor
                </div>
                <div className="text-[11px] text-text-muted truncate">
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

      {/* Danger zone */}
      <Card padding="md">
        <div className="text-xs font-semibold text-danger uppercase tracking-wide mb-3 flex items-center gap-1">
          <ShieldAlert size={12} />
          Danger Zone
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="md"
            leftIcon={<LogOut size={14} />}
            onClick={() => void logout()}
            className="!border-red-200 !text-danger hover:!bg-red-50"
          >
            Sign Out
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => void logout()}
            className="!text-danger hover:!bg-red-50"
          >
            Delete Account
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

export default SettingsPage;
