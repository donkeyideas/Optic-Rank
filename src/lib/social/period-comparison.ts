/**
 * Period-over-period comparison and growth velocity computation.
 * Pure utility — no server/client dependency.
 */

import type {
  SocialMetric,
  SocialTimeRange,
  PeriodComparison,
  PeriodComparisonMetric,
} from "@/types";

const RANGE_DAYS: Record<SocialTimeRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Compute period-over-period comparison.
 * For a 30d range: compares last 30 days vs the 30 days before that.
 */
export function computePeriodComparison(
  metrics: SocialMetric[],
  range: SocialTimeRange
): PeriodComparison {
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

  const currentMetrics = metrics.filter(
    (m) => m.date >= fmt(currentStart) && m.date <= fmt(currentEnd)
  );
  const previousMetrics = metrics.filter(
    (m) => m.date >= fmt(previousStart) && m.date <= fmt(previousEnd)
  );

  const hasEnoughData = currentMetrics.length >= 1 && previousMetrics.length >= 1;

  function avgMetric(
    arr: SocialMetric[],
    key: keyof SocialMetric
  ): number | null {
    const vals = arr
      .map((m) => m[key])
      .filter((v): v is number => typeof v === "number");
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function latestMetric(
    arr: SocialMetric[],
    key: keyof SocialMetric
  ): number | null {
    if (arr.length === 0) return null;
    const val = arr[arr.length - 1][key];
    return typeof val === "number" ? val : null;
  }

  function buildComparison(
    label: string,
    current: number | null,
    previous: number | null
  ): PeriodComparisonMetric {
    const absoluteDelta =
      current != null && previous != null ? current - previous : null;
    const percentageDelta =
      current != null && previous != null && previous !== 0
        ? ((current - previous) / Math.abs(previous)) * 100
        : null;
    return {
      label,
      currentValue: current != null ? Math.round(current * 100) / 100 : null,
      previousValue: previous != null ? Math.round(previous * 100) / 100 : null,
      absoluteDelta:
        absoluteDelta != null ? Math.round(absoluteDelta * 100) / 100 : null,
      percentageDelta:
        percentageDelta != null
          ? Math.round(percentageDelta * 100) / 100
          : null,
      direction:
        absoluteDelta == null
          ? "flat"
          : absoluteDelta > 0
            ? "up"
            : absoluteDelta < 0
              ? "down"
              : "flat",
    };
  }

  const comparisonMetrics: PeriodComparisonMetric[] = [
    buildComparison(
      "Followers",
      latestMetric(currentMetrics, "followers"),
      latestMetric(previousMetrics, "followers")
    ),
    buildComparison(
      "Engagement Rate",
      avgMetric(currentMetrics, "engagement_rate"),
      avgMetric(previousMetrics, "engagement_rate")
    ),
    buildComparison(
      "Posts",
      latestMetric(currentMetrics, "posts_count"),
      latestMetric(previousMetrics, "posts_count")
    ),
    buildComparison(
      "Avg Likes",
      avgMetric(currentMetrics, "avg_likes"),
      avgMetric(previousMetrics, "avg_likes")
    ),
    buildComparison(
      "Avg Views",
      avgMetric(currentMetrics, "avg_views"),
      avgMetric(previousMetrics, "avg_views")
    ),
  ];

  return {
    timeRange: range,
    currentPeriodStart: fmt(currentStart),
    currentPeriodEnd: fmt(currentEnd),
    previousPeriodStart: fmt(previousStart),
    previousPeriodEnd: fmt(previousEnd),
    metrics: comparisonMetrics,
    hasEnoughData,
  };
}

export interface GrowthVelocity {
  dailyAvgFollowerGrowth: number | null;
  weeklyAvgFollowerGrowth: number | null;
  dailyAvgEngagementChange: number | null;
  weeklyAvgEngagementChange: number | null;
}

/**
 * Compute growth velocity (daily and weekly averages) from metric history.
 */
export function computeGrowthVelocity(metrics: SocialMetric[]): GrowthVelocity {
  if (metrics.length < 2) {
    return {
      dailyAvgFollowerGrowth: null,
      weeklyAvgFollowerGrowth: null,
      dailyAvgEngagementChange: null,
      weeklyAvgEngagementChange: null,
    };
  }

  const followerChanges: number[] = [];
  const engagementChanges: number[] = [];

  for (let i = 1; i < metrics.length; i++) {
    const prev = metrics[i - 1];
    const curr = metrics[i];
    if (curr.followers != null && prev.followers != null) {
      followerChanges.push(curr.followers - prev.followers);
    }
    if (curr.engagement_rate != null && prev.engagement_rate != null) {
      engagementChanges.push(curr.engagement_rate - prev.engagement_rate);
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const dailyFollower = avg(followerChanges);
  const dailyEngagement = avg(engagementChanges);

  return {
    dailyAvgFollowerGrowth:
      dailyFollower != null ? Math.round(dailyFollower * 10) / 10 : null,
    weeklyAvgFollowerGrowth:
      dailyFollower != null ? Math.round(dailyFollower * 7 * 10) / 10 : null,
    dailyAvgEngagementChange:
      dailyEngagement != null
        ? Math.round(dailyEngagement * 100) / 100
        : null,
    weeklyAvgEngagementChange:
      dailyEngagement != null
        ? Math.round(dailyEngagement * 7 * 100) / 100
        : null,
  };
}
