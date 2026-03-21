"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";

interface VisibilityDataPoint {
  date: string;
  score: number;
  provider?: string;
}

interface VisibilityTrendChartProps {
  data: VisibilityDataPoint[];
  title?: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
  gemini: "#4285f4",
  perplexity: "#6366f1",
  deepseek: "#0ea5e9",
};

export function VisibilityTrendChart({
  data,
  title = "Visibility Score Trend",
}: VisibilityTrendChartProps) {
  const timezone = useTimezone();

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center border border-dashed border-rule">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No visibility data yet
        </span>
      </div>
    );
  }

  // Group by date and compute average score
  const byDate = new Map<string, number[]>();
  for (const d of data) {
    const dateKey = formatShortDate(d.date, timezone);
    const existing = byDate.get(dateKey) ?? [];
    existing.push(d.score);
    byDate.set(dateKey, existing);
  }

  const formatted = Array.from(byDate.entries()).map(([date, scores]) => ({
    date,
    score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  }));

  return (
    <div className="w-full">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={formatted}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-rule, #ddd)"
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            label={{
              value: "Score",
              angle: -90,
              position: "insideLeft",
              style: {
                fontSize: 10,
                fill: "var(--color-ink-muted, #999)",
              },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #fff)",
              border: "1px solid var(--color-rule, #ddd)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 12,
            }}
            formatter={(value) => [`${value}/100`, "Score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-editorial-red, #c0392b)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--color-editorial-red, #c0392b)" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export { PROVIDER_COLORS };
