"use client";

import { cn } from "@/lib/utils";

export interface HealthCategory {
  name: string;
  value: number;
  color: string;
}

export interface HealthScoreProps {
  /** The overall health score (0-100) */
  score: number;
  /** Category breakdown bars */
  categories: HealthCategory[];
  className?: string;
}

export function HealthScore({
  score,
  categories,
  className,
}: HealthScoreProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Large score display */}
      <div className="mb-4 text-center">
        <span className="font-serif text-[56px] font-bold leading-none text-ink">
          {score}
        </span>
        <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          Out of 100
        </p>
      </div>

      {/* Category bars */}
      <div className="flex flex-col gap-3">
        {categories.map((category) => (
          <div key={category.name} className="flex flex-col gap-1">
            {/* Label + value */}
            <div className="flex items-center justify-between">
              <span className="font-sans text-[12px] font-medium text-ink-secondary">
                {category.name}
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                {category.value}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-surface-inset">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(Math.max(category.value, 0), 100)}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
