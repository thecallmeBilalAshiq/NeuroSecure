import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  error?: string | null;
  success?: boolean;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    leftIcon,
    rightIcon,
    error,
    success,
    hint,
    className,
    id,
    disabled,
    ...rest
  },
  ref
) {
  const reactId = useId();
  const inputId = id ?? `ns-input-${reactId}`;

  const borderClass = error
    ? "border-danger focus-within:border-danger focus-within:ring-danger/20"
    : success
    ? "border-success focus-within:border-success focus-within:ring-success/20"
    : "border-border focus-within:border-primary focus-within:ring-primary/20";

  return (
    <div className={["flex flex-col gap-1.5", className ?? ""].join(" ")}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-text-secondary uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <div
        className={[
          "flex items-center gap-2 rounded-input border bg-white px-3 transition focus-within:ring-4",
          disabled ? "opacity-60" : "",
          borderClass,
        ].join(" ")}
      >
        {leftIcon && (
          <span className="text-text-muted shrink-0" aria-hidden>
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="flex-1 bg-transparent py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none disabled:cursor-not-allowed"
          {...rest}
        />
        {rightIcon && (
          <span className="text-text-muted shrink-0">{rightIcon}</span>
        )}
      </div>
      {error ? (
        <p
          id={`${inputId}-error`}
          className="text-xs font-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
