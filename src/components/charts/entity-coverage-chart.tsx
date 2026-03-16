"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CoverageDataPoint {
  page: string;
  entities: number;
  coverage: number;
}

interface EntityCoverageChartProps {
  data: CoverageDataPoint[];
  title?: string;
}

export function EntityCoverageChart({
  data,
  title = "Entity Coverage by Page",
}: EntityCoverageChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center border border-dashed border-rule">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No coverage data yet
        </span>
      </div>
    );
  }

  const sorted = [...data]
    .sort((a, b) => b.entities - a.entities)
    .slice(0, 10)
    .map((d) => ({
      ...d,
      page: d.page.length > 25 ? d.page.slice(0, 25) + "..." : d.page,
    }));

  return (
    <div className="w-full">
      <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={sorted}
          margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-rule, #ddd)"
          />
          <XAxis
            dataKey="page"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Sans, sans-serif" }}
            stroke="var(--color-ink-muted, #999)"
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
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
              return [
                n === "entities" ? `${v} entities` : `${(v * 100).toFixed(0)}%`,
                n === "entities" ? "Entities" : "Coverage",
              ];
            }) as any}
          />
          <Bar
            dataKey="entities"
            fill="var(--color-editorial-red, #c0392b)"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
