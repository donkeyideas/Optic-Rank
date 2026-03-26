/**
 * Generic period-over-period comparison utility.
 * Works with any data type that has a date accessor.
 */

import type {
  ComparisonTimeRange,
  PeriodComparisonMetric,
} from "@/types";

const RANGE_DAYS: Record<ComparisonTimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export interface MetricDef<T> {
  label: string;
  getValue: (item: T) => number | null;
  aggregation: "latest" | "average" | "sum";
  /** When true, a positive delta means "worse" (e.g., position where lower = better) */
  invertDirection?: boolean;
}

export interface GenericPeriodComparison {
  timeRange: ComparisonTimeRange;
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
  metrics: PeriodComparisonMetric[];
  hasEnoughData: boolean;
}

/**
 * Compute period-over-period comparison for any data type.
 * For a 30d range: compares last 30 days vs the 30 days before that.
 */
export function computeGenericComparison<T>(
  items: T[],
  range: ComparisonTimeRange,
  metricDefs: MetricDef<T>[],
  getDate: (item: T) => string // returns YYYY-MM-DD
): GenericPeriodComparison {
  const days = RANGE_DAYS[range];
  const now = new Date();

  const currentEnd = new Date(now);
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);

  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - days + 1);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const currentItems = items.filter((item) => {
    const date = getDate(item);
    return date >= fmt(currentStart) && date <= fmt(currentEnd);
  });
  const previousItems = items.filter((item) => {
    const date = getDate(item);
    return date >= fmt(previousStart) && date <= fmt(previousEnd);
  });

  const hasEnoughData = currentItems.length >= 1 && previousItems.length >= 1;

  function aggregate(arr: T[], def: MetricDef<T>): number | null {
    const vals = arr.map(def.getValue).filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    switch (def.aggregation) {
      case "latest":
        return vals[vals.length - 1];
      case "average":
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      case "sum":
        return vals.reduce((a, b) => a + b, 0);
    }
  }

  const metrics: PeriodComparisonMetric[] = metricDefs.map((def) => {
    const current = aggregate(currentItems, def);
    const previous = aggregate(previousItems, def);
    const absoluteDelta =
      current != null && previous != null ? current - previous : null;
    const percentageDelta =
      current != null && previous != null && previous !== 0
        ? ((current - previous) / Math.abs(previous)) * 100
        : null;

    let direction: "up" | "down" | "flat" = "flat";
    if (absoluteDelta != null && absoluteDelta !== 0) {
      const isPositive = absoluteDelta > 0;
      direction = def.invertDirection
        ? isPositive
          ? "down"
          : "up"
        : isPositive
          ? "up"
          : "down";
    }

    return {
      label: def.label,
      currentValue: current != null ? Math.round(current * 100) / 100 : null,
      previousValue: previous != null ? Math.round(previous * 100) / 100 : null,
      absoluteDelta:
        absoluteDelta != null ? Math.round(absoluteDelta * 100) / 100 : null,
      percentageDelta:
        percentageDelta != null
          ? Math.round(percentageDelta * 100) / 100
          : null,
      direction,
    };
  });

  return {
    timeRange: range,
    currentStart: fmt(currentStart),
    currentEnd: fmt(currentEnd),
    previousStart: fmt(previousStart),
    previousEnd: fmt(previousEnd),
    metrics,
    hasEnoughData,
  };
}

/**
 * Pre-compute comparisons for all three time ranges.
 */
export function computeAllComparisons<T>(
  items: T[],
  metricDefs: MetricDef<T>[],
  getDate: (item: T) => string
): Record<ComparisonTimeRange, GenericPeriodComparison> {
  return {
    "7d": computeGenericComparison(items, "7d", metricDefs, getDate),
    "30d": computeGenericComparison(items, "30d", metricDefs, getDate),
    "90d": computeGenericComparison(items, "90d", metricDefs, getDate),
  };
}
