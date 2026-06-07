import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Crown, Home, Settings, Shield } from "lucide-react";

export type NavTab = "dashboard" | "protection" | "settings" | "upgrade";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
}

interface TabDef {
  id: NavTab;
  label: string;
  Icon: LucideIcon;
}

const TABS: TabDef[] = [
  { id: "dashboard", label: "Home", Icon: Home },
  { id: "protection", label: "Shield", Icon: Shield },
  { id: "settings", label: "Settings", Icon: Settings },
  { id: "upgrade", label: "Upgrade", Icon: Crown },
];

export function BottomNav({ active, onChange }: BottomNavProps): JSX.Element {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-border bg-white/95 backdrop-blur"
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            className={[
              "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition",
              isActive ? "text-primary" : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
          >
            {isActive && (
              <motion.span
                layoutId="ns-bottom-nav-indicator"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
                className="absolute top-0 h-0.5 w-8 rounded-full"
                style={{ background: "linear-gradient(135deg,#6366F1,#4F46E5)" }}
              />
            )}
            <Icon size={18} strokeWidth={isActive ? 2.4 : 1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
