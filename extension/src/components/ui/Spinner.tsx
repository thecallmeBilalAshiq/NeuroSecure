import type { CSSProperties } from "react";

export type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

const SIZE_PX: Record<SpinnerSize, number> = {
  sm: 14,
  md: 20,
  lg: 32,
};

export function Spinner({
  size = "md",
  color = "#6366F1",
  className,
}: SpinnerProps): JSX.Element {
  const px = SIZE_PX[size];
  const style: CSSProperties = {
    width: px,
    height: px,
    border: `${Math.max(2, Math.floor(px / 8))}px solid ${color}33`,
    borderTopColor: color,
    borderRadius: "50%",
    display: "inline-block",
    animation: "ns-spin 0.8s linear infinite",
  };
  return (
    <span
      role="status"
      aria-label="Loading"
      className={className}
      style={style}
    >
      <style>{`@keyframes ns-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

export default Spinner;
