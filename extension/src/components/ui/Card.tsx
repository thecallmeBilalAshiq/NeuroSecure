import type { HTMLAttributes, ReactNode } from "react";

export type CardVariant = "default" | "elevated" | "bordered";
export type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

const PADDING: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

function variantClass(variant: CardVariant): string {
  switch (variant) {
    case "elevated":
      return "bg-white border border-border shadow-card-lg";
    case "bordered":
      return "bg-white border-2 border-border";
    case "default":
    default:
      return "bg-white border border-border shadow-card";
  }
}

export function Card({
  variant = "default",
  padding = "lg",
  header,
  footer,
  children,
  className,
  ...rest
}: CardProps): JSX.Element {
  return (
    <div
      className={[
        "rounded-card",
        variantClass(variant),
        className ?? "",
      ].join(" ")}
      {...rest}
    >
      {header && (
        <div className="border-b border-border px-5 py-3 text-sm font-semibold text-text-primary">
          {header}
        </div>
      )}
      <div className={PADDING[padding]}>{children}</div>
      {footer && (
        <div className="border-t border-border px-5 py-3 text-xs text-text-secondary">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
