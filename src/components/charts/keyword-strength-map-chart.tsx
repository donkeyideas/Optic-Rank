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

interface KeywordStrengthEntry {
  keyword: string;
  position: number;
  volume: number;
}

interface KeywordStrengthMapChartProps {
  data: KeywordStrengthEntry[];
}

function positionColor(pos: number): string {
  if (pos <= 3) return "#8b0000";
  if (pos <= 10) return "#c0392b";
  if (pos <= 20) return "#e74c3c";
  if (pos <= 50) return "#ff6b6b";
  return "#ff9999";
}

function opacityFromVolume(vol: number, maxVol: number): number {
  if (maxVol === 0) return 0.6;
  return 0.4 + 0.6 * (vol / maxVol);
}

export function KeywordStrengthMapChart({ data }: KeywordStrengthMapChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No keyword data
        </span>
      </div>
    );
  }

  // Sort by position (best first), take top 12
  const sorted = [...data]
    .sort((a, b) => a.position - b.position)
    .slice(0, 12);

  const maxVol = Math.max(...sorted.map((d) => d.volume));

  // Invert position so longer bars = better rank
  const maxPos = Math.max(...sorted.map((d) => d.position));
  const chartData = sorted.map((d) => ({
    keyword: d.keyword.length > 20 ? d.keyword.slice(0, 18) + "…" : d.keyword,
    fullKeyword: d.keyword,
    strength: maxPos - d.position + 1,
    position: d.position,
    volume: d.volume,
    opacity: opacityFromVolume(d.volume, maxVol),
    color: positionColor(d.position),
  }));

  return (
    <div className="border border-rule bg-surface-card p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-serif text-lg font-bold text-ink">
          Keyword Strength Map
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Position + Volume
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
            hide
          />
          <YAxis
            type="category"
            dataKey="keyword"
            tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", fill: "var(--color-ink, #e8e8e8)" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
            axisLine={false}
            width={130}
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
              return [`Pos #${item.position} · Vol ${item.volume.toLocaleString()}`, item.fullKeyword];
            }}
          />
          <Bar dataKey="strength" radius={[0, 2, 2, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={entry.opacity} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "#8b0000" }} />
          <span className="font-mono text-[10px] text-ink-muted">Top 3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "#c0392b" }} />
          <span className="font-mono text-[10px] text-ink-muted">4-10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "#e74c3c" }} />
          <span className="font-mono text-[10px] text-ink-muted">11-20</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "#ff6b6b" }} />
          <span className="font-mono text-[10px] text-ink-muted">21-50</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-ink-muted">Bar opacity = search volume</span>
        </div>
      </div>
    </div>
  );
}
