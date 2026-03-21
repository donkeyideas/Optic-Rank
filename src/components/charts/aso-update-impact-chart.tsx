"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";

interface SnapshotPoint {
  date: string;
  rating: number | null;
  reviews_count: number | null;
}

interface VersionMarker {
  date: string;
  version: string;
}

interface AsoUpdateImpactChartProps {
  snapshots: SnapshotPoint[];
  versions: VersionMarker[];
  height?: number;
}

export function AsoUpdateImpactChart({ snapshots, versions, height = 220 }: AsoUpdateImpactChartProps) {
  const timezone = useTimezone();

  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-rule" style={{ height }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No snapshot data yet — refresh your app to start tracking
        </span>
      </div>
    );
  }

  const formatted = snapshots.map((s) => ({
    date: formatShortDate(s.date, timezone),
    rawDate: s.date,
    rating: s.rating,
    reviews: s.reviews_count,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={formatted} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="ratingAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-editorial-green, #27ae60)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-editorial-green, #27ae60)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
          />
          <YAxis
            yAxisId="rating"
            domain={[0, 5]}
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-editorial-green, #27ae60)"
            axisLine={false}
            tickLine={false}
            orientation="left"
          />
          <YAxis
            yAxisId="reviews"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-editorial-gold, #b8860b)"
            axisLine={false}
            tickLine={false}
            orientation="right"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #fff)",
              border: "1px solid var(--color-rule, #ddd)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 11,
            }}
          />
          <Area
            yAxisId="rating"
            type="monotone"
            dataKey="rating"
            stroke="var(--color-editorial-green, #27ae60)"
            strokeWidth={2}
            fill="url(#ratingAreaGrad)"
            connectNulls
            name="Rating"
          />
          <Line
            yAxisId="reviews"
            type="monotone"
            dataKey="reviews"
            stroke="var(--color-editorial-gold, #b8860b)"
            strokeWidth={1.5}
            strokeDasharray="4 2"
            dot={false}
            connectNulls
            name="Reviews"
          />
          {/* Version release markers */}
          {versions.map((v) => {
            const matchDate = formatted.find((f) => f.rawDate === v.date);
            if (!matchDate) return null;
            return (
              <ReferenceLine
                key={v.version}
                x={matchDate.date}
                yAxisId="rating"
                stroke="var(--color-editorial-red, #c0392b)"
                strokeDasharray="3 3"
                label={{
                  value: `v${v.version}`,
                  position: "top",
                  style: { fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fill: "var(--color-editorial-red, #c0392b)" },
                }}
              />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
