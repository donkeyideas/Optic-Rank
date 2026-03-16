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
  ReferenceLine,
} from "recharts";

interface PredictionDataPoint {
  keyword: string;
  current: number;
  predicted: number;
  change: number;
}

interface PredictionChartProps {
  data: PredictionDataPoint[];
  title?: string;
}

export function PredictionChart({
  data,
  title = "Predicted Position Changes",
}: PredictionChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center border border-dashed border-rule">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No prediction data yet
        </span>
      </div>
    );
  }

  // Show top 15 keywords sorted by absolute change
  const sorted = [...data]
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 15);

  return (
    <div className="w-full">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart
          data={sorted}
          margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
          layout="vertical"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-rule, #ddd)"
          />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            label={{
              value: "Position Change",
              position: "insideBottom",
              offset: -10,
              style: { fontSize: 10, fill: "var(--color-ink-muted, #999)" },
            }}
          />
          <YAxis
            type="category"
            dataKey="keyword"
            tick={{ fontSize: 10, fontFamily: "IBM Plex Sans, sans-serif" }}
            stroke="var(--color-ink-muted, #999)"
            width={120}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #fff)",
              border: "1px solid var(--color-rule, #ddd)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 12,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: any, name: any) => {
              const v = Number(value) || 0;
              const n = String(name ?? "");
              if (n === "change") {
                const label = v < 0 ? `${v} (improving)` : v > 0 ? `+${v} (declining)` : "stable";
                return [label, "Change"];
              }
              return [v, n];
            }) as any}
          />
          <ReferenceLine x={0} stroke="var(--color-ink-muted, #999)" />
          <Bar dataKey="change" radius={[0, 2, 2, 0]}>
            {sorted.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.change < 0
                    ? "var(--color-editorial-green, #27ae60)"
                    : entry.change > 0
                      ? "var(--color-editorial-red, #c0392b)"
                      : "var(--color-ink-muted, #999)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
