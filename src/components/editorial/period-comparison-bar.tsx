"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ComparisonTimeRange, PeriodComparisonMetric } from "@/types";
import type { GenericPeriodComparison } from "@/lib/utils/period-comparison";

interface PeriodComparisonBarProps {
  comparisons: Record<ComparisonTimeRange, GenericPeriodComparison>;
  defaultRange?: ComparisonTimeRange;
}

function DirectionIcon({ direction }: { direction: PeriodComparisonMetric["direction"] }) {
  if (direction === "up") return <TrendingUp className="h-3 w-3" />;
  if (direction === "down") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

function dirColor(direction: PeriodComparisonMetric["direction"]) {
  if (direction === "up") return "text-editorial-green";
  if (direction === "down") return "text-editorial-red";
  return "text-ink-muted";
}

export function PeriodComparisonBar({
  comparisons,
  defaultRange = "30d",
}: PeriodComparisonBarProps) {
  const [range, setRange] = useState<ComparisonTimeRange>(defaultRange);
  const comparison = comparisons[range];

  if (!comparison) return null;

  return (
    <div className="space-y-2">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Period
        </span>
        {(["7d", "30d", "90d"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`border px-3 py-1.5 font-mono text-[11px] font-medium transition-colors ${
              range === r
                ? "border-ink bg-ink text-surface-cream"
                : "border-rule text-ink-secondary hover:bg-surface-card"
            }`}
          >
            {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      {comparison.hasEnoughData ? (
        <div className="border border-rule">
          <div className="grid grid-cols-5 gap-px border-b border-rule bg-surface-inset px-4 py-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Metric
            </span>
            <span className="text-right font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Current
            </span>
            <span className="text-right font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Previous
            </span>
            <span className="text-right font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              Change
            </span>
            <span className="text-right font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
              % Change
            </span>
          </div>
          {comparison.metrics.map((m) => (
            <div
              key={m.label}
              className="grid grid-cols-5 gap-px border-b border-rule bg-surface-card px-4 py-2.5 last:border-b-0"
            >
              <span className="text-sm font-medium text-ink">{m.label}</span>
              <span className="text-right font-mono text-sm text-ink">
                {m.currentValue != null
                  ? m.currentValue.toLocaleString()
                  : "—"}
              </span>
              <span className="text-right font-mono text-sm text-ink-muted">
                {m.previousValue != null
                  ? m.previousValue.toLocaleString()
                  : "—"}
              </span>
              <span
                className={`text-right font-mono text-sm font-semibold ${dirColor(m.direction)}`}
              >
                {m.absoluteDelta != null
                  ? `${m.absoluteDelta > 0 ? "+" : ""}${m.absoluteDelta.toLocaleString()}`
                  : "—"}
              </span>
              <span
                className={`flex items-center justify-end gap-1 font-mono text-sm font-semibold ${dirColor(m.direction)}`}
              >
                <DirectionIcon direction={m.direction} />
                {m.percentageDelta != null
                  ? `${m.percentageDelta > 0 ? "+" : ""}${m.percentageDelta.toFixed(1)}%`
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-rule bg-surface-card px-4 py-3">
          <p className="text-xs text-ink-muted">
            Not enough historical data for period comparison yet. Data
            accumulates automatically via daily syncs.
          </p>
        </div>
      )}
    </div>
  );
}
