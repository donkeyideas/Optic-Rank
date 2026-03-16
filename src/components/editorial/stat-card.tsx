"use client";

import { cn } from "@/lib/utils";
import { DeltaIndicator, type DeltaDirection } from "./delta-indicator";

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string | number;
  direction?: DeltaDirection;
  /** Highlight the value in editorial red */
  highlight?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  delta,
  direction = "neutral",
  highlight = false,
  className,
}: StatCardProps) {
  return (
    <div className={cn("flex flex-col gap-1 px-3 py-3 sm:px-4 lg:px-5 lg:py-4", className)}>
      {/* Overline label */}
      <span className="editorial-overline">{label}</span>

      {/* Value */}
      <span
        className={cn(
          "font-serif text-[24px] sm:text-[28px] lg:text-[36px] font-bold leading-none tracking-tight",
          highlight ? "text-editorial-red" : "text-ink",
        )}
      >
        {value}
      </span>

      {/* Delta */}
      {delta !== undefined && (
        <DeltaIndicator value={delta} direction={direction} size="sm" />
      )}
    </div>
  );
}
