import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  RefreshCw,
  Shield,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import LiveProtection from "../components/protection/LiveProtection";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";
import { notificationService } from "../services/notificationService";
import { useSettingsStore } from "../store/settingsStore";

interface AlertItem {
  id: string;
  triggered_at: string;
  intruder_photo: string | null;
}

interface DashboardPageProps {
  onReEnroll: () => void;
  variant?: "popup" | "options";
}

const BACKEND_URL =
  process.env.PLASMO_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function DashboardPage({
  onReEnroll,
  variant = "options",
}: DashboardPageProps): JSX.Element {
  const { user, session } = useAuth();
  const isEnrolled = useSettingsStore((s) => s.isEnrolled);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadAlerts = async (): Promise<void> => {
    if (!session) return;
    setLoadingAlerts(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/notify/alerts`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { alerts?: AlertItem[] };
      setAlerts(json.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const todayAlerts = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const t = start.getTime();
    return alerts.filter((a) => new Date(a.triggered_at).getTime() >= t).length;
  }, [alerts]);

  const onTestAlert = async (): Promise<void> => {
    setTesting(true);
    setTestResult(null);
    try {
      // Briefly trigger the blur overlay on the active tab so the user can
      // see what protection looks like, then back off after a few seconds.
      try {
        if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
          await chrome.runtime.sendMessage({ type: "ACTIVATE_PROTECTION" });
          setTimeout(() => {
            void chrome.runtime
              .sendMessage({ type: "DEACTIVATE_PROTECTION" })
              .catch(() => undefined);
          }, 5000);
        }
      } catch {
        /* background may not be reachable */
      }
      const r = await notificationService.sendAlert(null);
      if (r.ok) {
        setTestResult("Test alert sent — check your inbox!");
        await loadAlerts();
      } else if (r.rateLimited) {
        setTestResult(
          "Email rate-limited (one alert every 30 seconds), but the blur overlay was triggered on the active tab."
        );
      } else {
        setTestResult(r.error ?? "Failed to send");
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 px-4 py-4"
    >
      {/* Live protection panel: PIN unlock + camera preview + status */}
      <LiveProtection variant={variant} />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        <Card padding="sm">
          <div className="flex flex-col items-start gap-1">
            <Bell size={16} className="text-primary" />
            <div className="text-base font-bold leading-none">
              {todayAlerts}
            </div>
            <div className="text-[10px] text-text-muted">Today</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex flex-col items-start gap-1">
            <UserIcon size={16} className="text-primary" />
            <div className="text-[13px] font-bold leading-none">
              {isEnrolled ? "Enrolled" : "Pending"}
            </div>
            <div className="text-[10px] text-text-muted">Face ID</div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex flex-col items-start gap-1">
            <Zap size={16} className="text-primary" />
            <div className="text-[13px] font-bold leading-none">
              {user?.plan === "PRO" ? "Pro" : "Free"}
            </div>
            <div className="text-[10px] text-text-muted">Current Plan</div>
          </div>
        </Card>
      </div>

      {/* Recent alerts */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold">Recent Alerts</div>
          <button
            type="button"
            onClick={() => void loadAlerts()}
            aria-label="Refresh alerts"
            className="text-text-muted hover:text-text-primary p-1"
          >
            <RefreshCw size={14} className={loadingAlerts ? "animate-spin" : ""} />
          </button>
        </div>
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-text-muted">
              <Activity size={18} />
            </div>
            <div className="text-sm font-semibold">No alerts yet</div>
            <div className="text-[11px] text-text-muted">
              Your screen has been secure
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id} className="py-2.5 flex items-center gap-3">
                {a.intruder_photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.intruder_photo}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover border border-border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted">
                    <Shield size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">
                    Unknown face detected
                  </div>
                  <div className="text-[11px] text-text-muted">
                    {formatTime(a.triggered_at)}
                  </div>
                </div>
                <Badge variant="danger" size="sm">
                  Alert
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="secondary" size="sm" onClick={onReEnroll}>
          Re-enroll Face
        </Button>
        <Button
          variant="secondary"
          size="sm"
          loading={testing}
          onClick={() => void onTestAlert()}
        >
          Test Alert
        </Button>
      </div>

      {testResult && (
        <p className="text-[11px] text-text-secondary text-center leading-relaxed">
          {testResult}
        </p>
      )}
    </motion.div>
  );
}

export default DashboardPage;
