"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Icon element rendered at the start of the input */
  prefixIcon?: React.ReactNode;
  /** Icon element rendered at the end of the input */
  suffixIcon?: React.ReactNode;
  /** Additional class names for the outer wrapper */
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      prefixIcon,
      suffixIcon,
      wrapperClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId();

    return (
      <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-[10px] font-semibold uppercase tracking-widest",
              "text-ink-secondary",
              error && "text-editorial-red"
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {prefixIcon && (
            <span
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2",
                "text-ink-muted pointer-events-none",
                "[&>svg]:h-4 [&>svg]:w-4"
              )}
              aria-hidden="true"
            >
              {prefixIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(
              "flex h-10 w-full rounded-none",
              "border bg-surface-card px-3 py-2",
              "font-sans text-sm text-ink",
              "placeholder:text-ink-muted",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editorial-red focus-visible:ring-offset-1 focus-visible:ring-offset-surface-cream",
              "disabled:cursor-not-allowed disabled:opacity-50",
              // Default border
              "border-rule",
              // Error state
              error && "border-editorial-red focus-visible:ring-editorial-red",
              // Icon padding
              prefixIcon && "pl-10",
              suffixIcon && "pr-10",
              className
            )}
            {...props}
          />

          {suffixIcon && (
            <span
              className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2",
                "text-ink-muted pointer-events-none",
                "[&>svg]:h-4 [&>svg]:w-4"
              )}
              aria-hidden="true"
            >
              {suffixIcon}
            </span>
          )}
        </div>

        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="text-[11px] text-editorial-red font-medium"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
export type { InputProps };
