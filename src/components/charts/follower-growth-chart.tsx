"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SocialMetric } from "@/types";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";

interface FollowerGrowthChartProps {
  metrics: SocialMetric[];
  label?: string;
}

export function FollowerGrowthChart({ metrics, label }: FollowerGrowthChartProps) {
  const timezone = useTimezone();

  if (metrics.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-ink-muted">
        Need at least 2 data points to show growth chart.
      </div>
    );
  }

  const data = metrics.map((m) => ({
    date: formatShortDate(m.date, timezone),
    followers: m.followers ?? 0,
    engagement: m.engagement_rate ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
          stroke="var(--color-ink-muted, #999)"
        />
        <YAxis
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
          stroke="var(--color-ink-muted, #999)"
        />
        <Tooltip
          contentStyle={{
            borderRadius: 0,
            border: "1px solid var(--color-rule, #ddd)",
            fontFamily: "IBM Plex Mono",
            fontSize: 11,
          }}
        />
        <Line
          type="monotone"
          dataKey="followers"
          stroke="var(--color-editorial-red, #c0392b)"
          strokeWidth={2}
          dot={false}
          name={label ?? "Followers"}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
