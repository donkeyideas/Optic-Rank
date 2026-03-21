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
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";

interface RatingDataPoint {
  date: string;
  rating: number | null;
  reviews_count?: number | null;
}

interface AsoRatingTrendChartProps {
  data: RatingDataPoint[];
  height?: number;
  showAxis?: boolean;
}

export function AsoRatingTrendChart({ data, height = 120, showAxis = true }: AsoRatingTrendChartProps) {
  const timezone = useTimezone();

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-rule" style={{ height }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No trend data yet
        </span>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date: formatShortDate(d.date, timezone),
    rating: d.rating,
    reviews: d.reviews_count,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: showAxis ? 5 : -20, bottom: 5 }}>
        <defs>
          <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-editorial-green, #27ae60)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-editorial-green, #27ae60)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxis && (
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
        )}
        <XAxis
          dataKey="date"
          tick={showAxis ? { fontSize: 9, fontFamily: "IBM Plex Mono, monospace" } : false}
          stroke="var(--color-ink-muted, #999)"
          axisLine={showAxis}
          tickLine={false}
        />
        {showAxis && (
          <YAxis
            domain={[0, 5]}
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            axisLine={false}
            tickLine={false}
          />
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-surface-card, #fff)",
            border: "1px solid var(--color-rule, #ddd)",
            borderRadius: 0,
            fontFamily: "IBM Plex Sans, sans-serif",
            fontSize: 11,
          }}
          formatter={(value) => [typeof value === "number" ? value.toFixed(2) : "—", "Rating"]}
        />
        <Area
          type="monotone"
          dataKey="rating"
          stroke="var(--color-editorial-green, #27ae60)"
          strokeWidth={2}
          fill="url(#ratingGradient)"
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
