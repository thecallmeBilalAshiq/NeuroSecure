import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import Spinner from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline";
export type ButtonSize = "sm" | "md" | "lg";

type MotionButtonProps = HTMLMotionProps<"button">;

export interface ButtonProps extends Omit<MotionButtonProps, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-6 py-3.5",
};

function getVariantClasses(variant: ButtonVariant): string {
  switch (variant) {
    case "primary":
      return "text-white shadow-card";
    case "secondary":
      return "bg-white border border-border text-text-primary hover:bg-surface";
    case "ghost":
      return "bg-transparent text-text-secondary hover:bg-surface hover:text-text-primary";
    case "danger":
      return "bg-danger text-white hover:bg-red-600";
    case "outline":
      return "border border-primary text-primary hover:bg-primary-light";
    default:
      return "";
  }
}

function getVariantStyle(variant: ButtonVariant): React.CSSProperties {
  if (variant === "primary") {
    return {
      background: "linear-gradient(135deg, #6366F1, #4F46E5)",
    };
  }
  return {};
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className,
  type = "button",
  ...rest
}: ButtonProps): JSX.Element {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      type={type}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-btn font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 disabled:opacity-50 disabled:cursor-not-allowed",
        SIZE_CLASSES[size],
        getVariantClasses(variant),
        fullWidth ? "w-full" : "",
        className ?? "",
      ].join(" ")}
      style={getVariantStyle(variant)}
      {...rest}
    >
      {loading ? (
        <Spinner size="sm" color={variant === "primary" || variant === "danger" ? "#ffffff" : "#6366F1"} />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!loading && rightIcon}
    </motion.button>
  );
}

export default Button;
