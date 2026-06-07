import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { w: 32, h: 18, knob: 14 },
  md: { w: 44, h: 24, knob: 20 },
  lg: { w: 56, h: 32, knob: 28 },
} as const;

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
}: ToggleProps): JSX.Element {
  const { w, h, knob } = SIZES[size];
  const offset = checked ? w - knob - 2 : 2;

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        "relative inline-flex shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      style={{
        width: w,
        height: h,
        background: checked
          ? "linear-gradient(135deg, #6366F1, #4F46E5)"
          : "#E2E8F0",
      }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="block rounded-full bg-white shadow"
        style={{
          width: knob,
          height: knob,
          marginLeft: offset,
        }}
      />
    </button>
  );

  if (!label && !description) return button;

  return (
    <label
      className={[
        "flex items-center gap-3 select-none",
        disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      <div className="flex flex-col gap-0.5 flex-1">
        {label && (
          <span className="text-sm font-semibold text-text-primary">
            {label}
          </span>
        )}
        {description && (
          <span className="text-xs text-text-secondary">{description}</span>
        )}
      </div>
      {button}
    </label>
  );
}

export default Toggle;
