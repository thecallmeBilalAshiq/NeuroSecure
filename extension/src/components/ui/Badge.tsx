import type { ReactNode } from "react";

export type BadgeVariant =
  | "free"
  | "pro"
  | "success"
  | "warning"
  | "danger"
  | "neutral";
export type BadgeSize = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

function variantClasses(variant: BadgeVariant): string {
  switch (variant) {
    case "pro":
      return "bg-primary-light text-primary-dark border border-primary/20";
    case "success":
      return "bg-emerald-50 text-success border border-emerald-200";
    case "warning":
      return "bg-amber-50 text-warning border border-amber-200";
    case "danger":
      return "bg-red-50 text-danger border border-red-200";
    case "neutral":
      return "bg-slate-100 text-text-secondary border border-border";
    case "free":
    default:
      return "bg-slate-100 text-text-secondary border border-border";
  }
}

const SIZE: Record<BadgeSize, string> = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-xs px-2.5 py-1",
};

export function Badge({
  variant = "free",
  size = "sm",
  icon,
  children,
  className,
}: BadgeProps): JSX.Element {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-semibold tracking-wide",
        variantClasses(variant),
        SIZE[size],
        className ?? "",
      ].join(" ")}
    >
      {icon}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
