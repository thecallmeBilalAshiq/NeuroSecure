import { motion } from "framer-motion";
import { Check, Crown, RefreshCw, Shield, X, Zap } from "lucide-react";
import { useState } from "react";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../hooks/useAuth";

interface UpgradePageProps {
  onClose: () => void;
}

const FREE_FEATURES: Array<{ ok: boolean; text: string }> = [
  { ok: true, text: "1 face registered" },
  { ok: true, text: "Screen blur protection" },
  { ok: true, text: "Email notifications" },
  { ok: false, text: "WhatsApp alerts" },
  { ok: false, text: "Multiple faces" },
  { ok: false, text: "Alert history" },
  { ok: false, text: "Priority support" },
];

const PRO_FEATURES: Array<{ ok: boolean; text: string }> = [
  { ok: true, text: "Up to 5 faces" },
  { ok: true, text: "Screen blur + full lock" },
  { ok: true, text: "Email notifications" },
  { ok: true, text: "WhatsApp alerts" },
  { ok: true, text: "30-day alert history" },
  { ok: true, text: "Priority support" },
];

export function UpgradePage({ onClose }: UpgradePageProps): JSX.Element {
  const { isPro } = useAuth();
  const [annual, setAnnual] = useState(false);
  const price = annual ? "$77/yr" : "$8/mo";
  const subPrice = annual ? "Save 20% • Billed yearly" : "Billed monthly";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4 px-4 py-4"
    >
      <div className="flex flex-col items-center gap-2 text-center pt-2">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-primary"
          style={{ background: "linear-gradient(135deg,#F59E0B,#EA580C)" }}
        >
          <Crown size={26} />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Upgrade to Pro</h1>
        <p className="text-sm text-text-secondary">
          Unlock the full power of NeuroSecure
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setAnnual(false)}
          className={[
            "px-3 py-1.5 rounded-full text-xs font-semibold transition",
            !annual
              ? "bg-primary text-white shadow-primary"
              : "bg-surface text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setAnnual(true)}
          className={[
            "px-3 py-1.5 rounded-full text-xs font-semibold transition",
            annual
              ? "bg-primary text-white shadow-primary"
              : "bg-surface text-text-secondary hover:text-text-primary",
          ].join(" ")}
        >
          Annual <span className="ml-1 opacity-80">−20%</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Free */}
        <Card variant="bordered" padding="md" className="flex flex-col gap-2">
          <div>
            <div className="text-sm font-bold">Free</div>
            <div className="text-base font-bold">$0</div>
            <div className="text-[10px] text-text-muted">forever</div>
          </div>
          <ul className="flex flex-col gap-1 mt-1">
            {FREE_FEATURES.map((f) => (
              <li
                key={f.text}
                className={[
                  "flex items-center gap-1.5 text-[11px]",
                  f.ok ? "text-text-primary" : "text-text-muted",
                ].join(" ")}
              >
                {f.ok ? (
                  <Check size={12} className="text-success shrink-0" />
                ) : (
                  <X size={12} className="text-text-muted shrink-0" />
                )}
                {f.text}
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" disabled className="mt-auto">
            {isPro ? "Free" : "Current plan"}
          </Button>
        </Card>

        {/* Pro */}
        <Card
          variant="bordered"
          padding="md"
          className="flex flex-col gap-2 border-primary !border-2 shadow-primary"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-bold">
              Pro <Zap size={14} className="text-primary" />
            </div>
            <Badge variant="pro" size="sm">
              Most Popular
            </Badge>
          </div>
          <div>
            <div className="text-base font-bold">{price}</div>
            <div className="text-[10px] text-text-muted">{subPrice}</div>
          </div>
          <ul className="flex flex-col gap-1 mt-1">
            {PRO_FEATURES.map((f) => (
              <li
                key={f.text}
                className="flex items-center gap-1.5 text-[11px] text-text-primary"
              >
                <Check size={12} className="text-success shrink-0" />
                {f.text}
              </li>
            ))}
          </ul>
          <Button
            size="sm"
            className="mt-auto"
            onClick={onClose}
            leftIcon={<Crown size={14} />}
          >
            {isPro ? "Manage" : "Upgrade Now"}
          </Button>
        </Card>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col items-center gap-1 text-[11px] text-text-secondary">
          <Shield size={16} className="text-primary" />
          Secure Payment
        </div>
        <div className="flex flex-col items-center gap-1 text-[11px] text-text-secondary">
          <RefreshCw size={16} className="text-primary" />
          Cancel Anytime
        </div>
        <div className="flex flex-col items-center gap-1 text-[11px] text-text-secondary">
          <Zap size={16} className="text-primary" />
          Instant Access
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="text-[11px] text-text-muted hover:text-text-secondary text-center"
      >
        Maybe later
      </button>
    </motion.div>
  );
}

export default UpgradePage;
