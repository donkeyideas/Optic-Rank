"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const progressTrackVariants = cva(
  "relative h-2.5 w-full overflow-hidden rounded-none bg-surface-inset border border-rule",
  {
    variants: {
      size: {
        sm: "h-1.5",
        md: "h-2.5",
        lg: "h-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const progressBarVariants = cva(
  "h-full transition-all duration-500 ease-out",
  {
    variants: {
      color: {
        red: "bg-editorial-red",
        green: "bg-editorial-green",
        gold: "bg-editorial-gold",
        dark: "bg-ink",
        blue: "bg-editorial-blue",
      },
    },
    defaultVariants: {
      color: "red",
    },
  }
);

type ProgressColor = NonNullable<
  VariantProps<typeof progressBarVariants>["color"]
>;

interface ProgressProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof progressTrackVariants> {
  /** Progress value between 0 and 100 */
  value?: number;
  /** Maximum value (defaults to 100) */
  max?: number;
  /** Bar color variant */
  color?: ProgressColor;
  /** Whether to display the numeric value text */
  showValue?: boolean;
  /** Custom format function for the displayed value */
  formatValue?: (value: number, max: number) => string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      size,
      color,
      showValue = false,
      formatValue,
      ...props
    },
    ref
  ) => {
    const clampedValue = Math.min(Math.max(value, 0), max);
    const percentage = (clampedValue / max) * 100;

    const displayValue = formatValue
      ? formatValue(clampedValue, max)
      : `${Math.round(percentage)}%`;

    return (
      <div
        ref={ref}
        className={cn("flex items-center gap-3", className)}
        {...props}
      >
        <div
          className={progressTrackVariants({ size })}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          <div
            className={progressBarVariants({ color })}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {showValue && (
          <span
            className={cn(
              "shrink-0 font-mono text-xs font-semibold tabular-nums",
              "text-ink-secondary"
            )}
          >
            {displayValue}
          </span>
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress, progressTrackVariants, progressBarVariants };
export type { ProgressProps };
