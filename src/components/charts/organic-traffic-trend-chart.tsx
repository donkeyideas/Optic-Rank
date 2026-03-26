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

interface OrganicTrafficTrendChartProps {
  /** Weekly estimated traffic from dashboard_volumes */
  volumes: { date: string; traffic: number }[];
  /** Daily GA4 sessions (30-day time series) */
  ga4Daily: { date: string; sessions: number }[];
  /** Current estimated daily traffic (fallback when no volume history exists) */
  currentEstTraffic?: number;
}

export function OrganicTrafficTrendChart({
  volumes,
  ga4Daily,
  currentEstTraffic,
}: OrganicTrafficTrendChartProps) {
  // Merge both series into a single dataset keyed by date
  const dateMap = new Map<string, { date: string; projected?: number; real?: number }>();

  // If no volume history exists but we have a current estimate, create a
  // projected data point for each GA4 day (flat line) so the chart shows both
  if (volumes.length === 0 && currentEstTraffic && currentEstTraffic > 0) {
    if (ga4Daily.length > 0) {
      // Show the projected estimate as a flat line across GA4's date range
      for (const g of ga4Daily) {
        const d = g.date.slice(0, 10);
        dateMap.set(d, { date: d, projected: currentEstTraffic });
      }
    } else {
      // No GA4 either — show a single data point for today
      const today = new Date().toISOString().slice(0, 10);
      dateMap.set(today, { date: today, projected: currentEstTraffic });
    }
  } else {
    for (const v of volumes) {
      const d = v.date.slice(0, 10);
      const existing = dateMap.get(d) ?? { date: d };
      existing.projected = v.traffic;
      dateMap.set(d, existing);
    }
  }

  for (const g of ga4Daily) {
    const d = g.date.slice(0, 10);
    const existing = dateMap.get(d) ?? { date: d };
    existing.real = g.sessions;
    dateMap.set(d, existing);
  }

  const data = Array.from(dateMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No traffic data yet
        </span>
      </div>
    );
  }

  const hasReal = ga4Daily.length > 0;

  // Format date for axis
  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={220}>
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
              String(name) === "projected" ? "Projected (Est.)" : "Real (GA4)",
            ]) as any}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="line"
            formatter={(value: string) =>
              value === "projected" ? "Projected (Est.)" : "Real (GA4)"
            }
            wrapperStyle={{ fontSize: 10, fontFamily: "IBM Plex Sans, sans-serif" }}
          />

          {/* Projected (estimated) — dashed gold line */}
          <Area
            type="monotone"
            dataKey="projected"
            stroke="var(--color-editorial-gold, #b8860b)"
            fill="var(--color-editorial-gold, #b8860b)"
            fillOpacity={0.05}
            strokeWidth={2}
            strokeDasharray="5 5"
            connectNulls
            name="projected"
          />

          {/* Real (GA4) — solid red line */}
          {hasReal && (
            <Area
              type="monotone"
              dataKey="real"
              stroke="var(--color-editorial-red, #c0392b)"
              fill="var(--color-editorial-red, #c0392b)"
              fillOpacity={0.1}
              strokeWidth={2}
              connectNulls
              name="real"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {!hasReal && (
        <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-widest text-ink-muted">
          Connect GA4 to overlay real traffic data
        </p>
      )}
    </div>
  );
}
