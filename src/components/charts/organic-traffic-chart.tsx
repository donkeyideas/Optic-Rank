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

interface TrafficDataPoint {
  date: string;
  traffic: number;
}

interface OrganicTrafficChartProps {
  data: TrafficDataPoint[];
  domain: string;
}

function formatTraffic(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function OrganicTrafficChart({ data, domain }: OrganicTrafficChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No traffic data yet
        </span>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    traffic: d.traffic,
  }));

  const currentTraffic = data[data.length - 1]?.traffic ?? 0;
  const previousTraffic = data[0]?.traffic ?? 0;
  const changePercent =
    previousTraffic > 0
      ? (((currentTraffic - previousTraffic) / previousTraffic) * 100).toFixed(1)
      : "0";
  const isPositive = currentTraffic >= previousTraffic;

  return (
    <div className="border border-rule bg-surface-card p-4">
      {/* Traffic summary */}
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-2xl font-bold text-ink">
            {formatTraffic(currentTraffic)}
          </span>
          <span
            className={`font-mono text-xs font-semibold ${
              isPositive ? "text-editorial-green" : "text-editorial-red"
            }`}
          >
            {isPositive ? "+" : ""}
            {changePercent}% vs prior
          </span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-ink-muted">
          Est. monthly traffic
        </span>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-editorial-red, #c0392b)" stopOpacity={0.15} />
              <stop offset="95%" stopColor="var(--color-editorial-red, #c0392b)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-rule, #ddd)"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={formatTraffic}
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #fff)",
              border: "1px solid var(--color-rule, #ddd)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 12,
            }}
            formatter={(value) => [formatTraffic(Number(value)), "Est. Traffic"]}
          />
          <Area
            type="monotone"
            dataKey="traffic"
            stroke="var(--color-editorial-red, #c0392b)"
            strokeWidth={2}
            fill="url(#trafficGradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-editorial-green, #27ae60)",
              stroke: "var(--color-surface-card, #fff)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-1 flex justify-between text-[9px] text-ink-muted">
        <span>Estimated organic traffic over time</span>
        <span>{domain.toUpperCase()}</span>
      </div>
    </div>
  );
}
