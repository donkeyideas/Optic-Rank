"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";

/* ------------------------------------------------------------------
   Sentiment Distribution Bar Chart (1-5 star breakdown)
   ------------------------------------------------------------------ */

interface RatingDistribution {
  rating: number;
  count: number;
}

interface AsoRatingDistributionChartProps {
  data: RatingDistribution[];
  height?: number;
}

export function AsoRatingDistributionChart({ data, height = 150 }: AsoRatingDistributionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-rule" style={{ height }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">No rating data</span>
      </div>
    );
  }

  const colors: Record<number, string> = {
    5: "var(--color-editorial-green, #27ae60)",
    4: "#7dcea0",
    3: "var(--color-editorial-gold, #b8860b)",
    2: "#e67e22",
    1: "var(--color-editorial-red, #c0392b)",
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
        <XAxis
          dataKey="rating"
          tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
          stroke="var(--color-ink-muted, #999)"
          tickFormatter={(v) => `${v}★`}
        />
        <YAxis
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
          formatter={(value) => [value, "Reviews"]}
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.rating} fill={colors[entry.rating] ?? "#999"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------
   Sentiment Pie Chart (positive/neutral/negative)
   ------------------------------------------------------------------ */

interface SentimentData {
  name: string;
  value: number;
  color: string;
}

interface AsoSentimentPieChartProps {
  positive: number;
  neutral: number;
  negative: number;
  height?: number;
}

export function AsoSentimentPieChart({ positive, neutral, negative, height = 150 }: AsoSentimentPieChartProps) {
  const total = positive + neutral + negative;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center border border-dashed border-rule" style={{ height }}>
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">No sentiment data</span>
      </div>
    );
  }

  const data: SentimentData[] = [
    { name: "Positive", value: positive, color: "var(--color-editorial-green, #27ae60)" },
    { name: "Neutral", value: neutral, color: "var(--color-editorial-gold, #b8860b)" },
    { name: "Negative", value: negative, color: "var(--color-editorial-red, #c0392b)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={height} height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={height * 0.25}
            outerRadius={height * 0.4}
            dataKey="value"
            stroke="var(--color-surface-card, #fff)"
            strokeWidth={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #fff)",
              border: "1px solid var(--color-rule, #ddd)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5" style={{ backgroundColor: d.color }} />
            <span className="font-mono text-[11px] text-ink-secondary">
              {d.name}: {d.value} ({Math.round((d.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
