"use client";

import { cn } from "@/lib/utils";
import { StatCard } from "./stat-card";
import type { DeltaDirection } from "./delta-indicator";

export interface HeadlineStat {
  label: string;
  value: string | number;
  delta: string | number;
  direction: DeltaDirection;
  badge?: "real" | "est" | null;
}

export interface HeadlineBarProps {
  stats: HeadlineStat[];
  className?: string;
}

export function HeadlineBar({ stats, className }: HeadlineBarProps) {
  return (
    <div
      className={cn(
        "grid border border-rule bg-surface-card",
        "grid-cols-2 md:grid-cols-3",
        stats.length <= 3 && "lg:grid-cols-3",
        stats.length === 4 && "lg:grid-cols-4",
        stats.length >= 5 && "lg:grid-cols-5",
        className,
      )}
    >
      {stats.map((stat, index) => (
        <StatCard
          key={stat.label}
          label={stat.label}
          value={stat.value}
          delta={stat.delta}
          direction={stat.direction}
          badge={stat.badge}
          highlight={index === 0}
          className={cn(
            "border-rule",
            index > 0 && "border-l",
            index % 2 === 0 && index > 0 && "max-md:border-l-0",
          )}
        />
      ))}
    </div>
  );
}
