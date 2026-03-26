"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { GA4DailyData } from "@/lib/google/analytics";

interface GA4TrafficTrendChartProps {
  data: GA4DailyData[];
}

export function GA4TrafficTrendChart({ data }: GA4TrafficTrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-ink-muted">
        Need at least 2 data points to show traffic trend.
      </div>
    );
  }

  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatNumber = (n: number) => {
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
          stroke="var(--color-ink-muted, #999)"
        />
        <YAxis
          tickFormatter={formatNumber}
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
          stroke="var(--color-ink-muted, #999)"
        />
        <Tooltip
          contentStyle={{
            borderRadius: 0,
            border: "1px solid var(--color-rule, #ddd)",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 11,
          }}
          labelFormatter={(label) => formatDate(String(label))}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((value: any, name: any) => [
            formatNumber(Number(value) || 0),
            String(name) === "sessions" ? "Sessions" : "Users",
          ]) as any}
        />
        <Legend
          verticalAlign="top"
          height={24}
          iconType="line"
          formatter={(value: string) =>
            value === "sessions" ? "Sessions" : "Users"
          }
          wrapperStyle={{ fontSize: 10, fontFamily: "IBM Plex Sans, sans-serif" }}
        />
        <Area
          type="monotone"
          dataKey="sessions"
          stroke="var(--color-editorial-red, #c0392b)"
          fill="var(--color-editorial-red, #c0392b)"
          fillOpacity={0.1}
          strokeWidth={2}
          name="sessions"
        />
        <Area
          type="monotone"
          dataKey="users"
          stroke="var(--color-editorial-gold, #b8860b)"
          fill="var(--color-editorial-gold, #b8860b)"
          fillOpacity={0.05}
          strokeWidth={1.5}
          name="users"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
