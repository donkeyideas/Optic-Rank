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
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";

interface RankDataPoint {
  date: string;
  position: number | null;
}

interface RankHistoryChartProps {
  data: RankDataPoint[];
  keyword: string;
}

export function RankHistoryChart({ data, keyword }: RankHistoryChartProps) {
  const timezone = useTimezone();

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center border border-dashed border-rule">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No rank history data yet
        </span>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date: formatShortDate(d.date, timezone),
    position: d.position,
  }));

  return (
    <div className="w-full">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        Position History &mdash; {keyword}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={formatted} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
          />
          <YAxis
            reversed
            domain={[1, "auto"]}
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            label={{
              value: "Position",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 10, fill: "var(--color-ink-muted, #999)" },
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
