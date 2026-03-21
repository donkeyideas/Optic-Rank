"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SocialMetric } from "@/types";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";

interface EngagementChartProps {
  metrics: SocialMetric[];
}

export function EngagementChart({ metrics }: EngagementChartProps) {
  const timezone = useTimezone();

  if (metrics.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-ink-muted">
        Need at least 2 data points to show engagement chart.
      </div>
    );
  }

  const data = metrics.map((m) => ({
    date: formatShortDate(m.date, timezone),
    engagement: m.engagement_rate ?? 0,
    likes: m.avg_likes ?? 0,
    comments: m.avg_comments ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
          stroke="var(--color-ink-muted, #999)"
        />
        <YAxis
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono" }}
          stroke="var(--color-ink-muted, #999)"
          unit="%"
        />
        <Tooltip
          contentStyle={{
            borderRadius: 0,
            border: "1px solid var(--color-rule, #ddd)",
            fontFamily: "IBM Plex Mono",
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="engagement"
          stroke="var(--color-editorial-green, #27ae60)"
          fill="var(--color-editorial-green, #27ae60)"
          fillOpacity={0.1}
          strokeWidth={2}
          name="Engagement %"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
