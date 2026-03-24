"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
} from "recharts";

interface RankVolumeEntry {
  keyword: string;
  position: number;
  volume: number;
}

interface RankVolumeScatterChartProps {
  data: RankVolumeEntry[];
}

function positionColor(pos: number): string {
  if (pos <= 3) return "#8b0000";
  if (pos <= 10) return "#c0392b";
  if (pos <= 20) return "#e74c3c";
  if (pos <= 50) return "#ff6b6b";
  return "#ff9999";
}

export function RankVolumeScatterChart({ data }: RankVolumeScatterChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No keyword data
        </span>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    x: d.position,
    y: d.volume,
    keyword: d.keyword,
    color: positionColor(d.position),
  }));

  const maxVol = Math.max(...data.map((d) => d.volume));

  return (
    <div className="border border-rule bg-surface-card p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-serif text-lg font-bold text-ink">
          Rank vs Volume
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Sweet Spot = Top-left
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 20, left: -5, bottom: 10 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-rule, #ddd)"
          />
          <XAxis
            type="number"
            dataKey="x"
            name="Position"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fill: "var(--color-ink, #e8e8e8)" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
            axisLine={false}
            reversed
            label={{ value: "Position →", position: "insideBottomRight", offset: -5, fontSize: 9, fill: "var(--color-ink-muted, #999)" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Volume"
            tick={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fill: "var(--color-ink, #e8e8e8)" }}
            stroke="var(--color-ink-muted, #999)"
            tickLine={false}
            axisLine={false}
            label={{ value: "Volume", angle: -90, position: "insideLeft", offset: 15, fontSize: 9, fill: "var(--color-ink-muted, #999)" }}
          />
          <ZAxis
            type="number"
            dataKey="y"
            range={[40, 400]}
            domain={[0, maxVol]}
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
            formatter={(_value, name) => {
              if (name === "Position") return [_value, "Position"];
              if (name === "Volume") return [Number(_value).toLocaleString(), "Volume"];
              return [_value, name];
            }}
            labelFormatter={(_label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload?.keyword ?? "";
              }
              return "";
            }}
          />
          <Scatter data={chartData} fill="#c0392b">
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.75} />
            ))}
          </Scatter>
        </ScatterChart>
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
          <span className="font-mono text-[10px] text-ink-muted">Bubble size = volume</span>
        </div>
      </div>
    </div>
  );
}
