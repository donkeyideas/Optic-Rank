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

interface PositionDataPoint {
  date: string;
  position: number | null;
}

interface AsoKeywordPositionChartProps {
  data: PositionDataPoint[];
  keyword: string;
  height?: number;
}

export function AsoKeywordPositionChart({ data, keyword, height = 180 }: AsoKeywordPositionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-rule" style={{ height }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No position history for &ldquo;{keyword}&rdquo;
        </span>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    position: d.position,
  }));

  return (
    <div className="w-full">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        Position History &mdash; {keyword}
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
          />
          <YAxis
            reversed
            domain={[1, "auto"]}
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #fff)",
              border: "1px solid var(--color-rule, #ddd)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 11,
            }}
            formatter={(value) => [`#${value}`, "Position"]}
          />
          <Line
            type="monotone"
            dataKey="position"
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
