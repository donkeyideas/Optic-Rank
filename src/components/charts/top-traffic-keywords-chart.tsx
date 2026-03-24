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
} from "recharts";

interface TopTrafficKeyword {
  keyword: string;
  position: number;
  volume: number;
  estTraffic: number;
}

interface TopTrafficKeywordsChartProps {
  data: TopTrafficKeyword[];
}

function positionColor(pos: number): string {
  if (pos <= 3) return "#8b0000";
  if (pos <= 10) return "#c0392b";
  if (pos <= 20) return "#e74c3c";
  if (pos <= 50) return "#ff6b6b";
  return "#ff9999";
}

export function TopTrafficKeywordsChart({ data }: TopTrafficKeywordsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No traffic data
        </span>
      </div>
    );
  }

  // Sort by est traffic desc, take top 10
  const sorted = [...data]
    .sort((a, b) => b.estTraffic - a.estTraffic)
    .slice(0, 10);

  const totalTraffic = sorted.reduce((sum, d) => sum + d.estTraffic, 0);

  const chartData = sorted.map((d) => ({
    keyword: d.keyword.length > 22 ? d.keyword.slice(0, 20) + "…" : d.keyword,
    fullKeyword: d.keyword,
    estTraffic: d.estTraffic,
    position: d.position,
    volume: d.volume,
    pct: totalTraffic > 0 ? Math.round((d.estTraffic / totalTraffic) * 100) : 0,
    color: positionColor(d.position),
  }));

  return (
    <div className="border border-rule bg-surface-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-serif text-lg font-bold text-ink">
            Top Traffic Keywords
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Est. monthly visits
          </span>
        </div>
        <span className="font-mono text-sm text-ink-secondary">
          Total <span className="font-bold text-ink">{totalTraffic.toLocaleString()}</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 28)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-rule, #ddd)"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="keyword"
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", fill: "var(--color-ink, #e8e8e8)" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-card, #1a1a1a)",
              border: "1px solid var(--color-rule, #333)",
              borderRadius: 0,
              fontFamily: "IBM Plex Sans, sans-serif",
              fontSize: 11,
              color: "#ffffff",
            }}
            itemStyle={{ color: "#ffffff" }}
            labelStyle={{ color: "#ffffff" }}
            formatter={(_value, _name, props) => {
              const item = props.payload;
              return [
                `~${item.estTraffic.toLocaleString()} visits (${item.pct}%) · Pos #${item.position} · Vol ${item.volume.toLocaleString()}`,
                item.fullKeyword,
              ];
            }}
          />
          <Bar dataKey="estTraffic" radius={[0, 2, 2, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-mono text-ink-muted">
        <span>Color = position tier</span>
        <span>·</span>
        <span>Traffic = volume × CTR at position</span>
      </div>
    </div>
  );
}
