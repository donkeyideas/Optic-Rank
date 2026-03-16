"use client";

import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export type DeltaDirection = "up" | "down" | "neutral";

export interface DeltaIndicatorProps {
  value: string | number;
  direction: DeltaDirection;
  className?: string;
  /** Show the arrow icon alongside the value */
  showIcon?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const iconSizeMap = {
  sm: 10,
  md: 12,
  lg: 14,
} as const;

const textSizeMap = {
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-[13px]",
} as const;

export function DeltaIndicator({
  value,
  direction,
  className,
  showIcon = true,
  size = "md",
}: DeltaIndicatorProps) {
  const colorClass =
    direction === "up"
      ? "text-editorial-green"
      : direction === "down"
        ? "text-editorial-red"
        : "text-ink-muted";

  const IconComponent =
    direction === "up"
      ? ArrowUp
      : direction === "down"
        ? ArrowDown
        : Minus;

  const iconSize = iconSizeMap[size];
  const textSize = textSizeMap[size];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-sans font-semibold",
        colorClass,
        textSize,
        className,
      )}
    >
      {showIcon && (
        <IconComponent
          size={iconSize}
          strokeWidth={2.5}
          className="shrink-0"
        />
      )}
      <span>{value}</span>
    </span>
  );
}
