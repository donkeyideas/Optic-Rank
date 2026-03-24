"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

interface TrafficOpportunityEntry {
  keyword: string;
  position: number;
  volume: number;
  estTraffic: number;
}

interface TrafficOpportunityTreemapChartProps {
  data: TrafficOpportunityEntry[];
}

function positionTierColor(pos: number): string {
  if (pos <= 3) return "#8b0000";
  if (pos <= 10) return "#c0392b";
  if (pos <= 20) return "#e74c3c";
  if (pos <= 50) return "#ff6b6b";
  return "#ff9999";
}

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  position: number;
}

function CustomContent({ x, y, width, height, name, position }: TreemapContentProps) {
  if (width < 30 || height < 20) return null;
  return (
    <g>
      <style>{`.tm-label { fill: #ffffff !important; stroke: none !important; }`}</style>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={positionTierColor(position)}
        stroke="#1a1a1a"
        strokeWidth={2}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + 6}
            y={y + 14}
            className="tm-label"
            fontSize={10}
            fontFamily="IBM Plex Sans, sans-serif"
            fontWeight="600"
          >
            {name.length > Math.floor(width / 7) ? name.slice(0, Math.floor(width / 7) - 1) + "…" : name}
          </text>
          <text
            x={x + 6}
            y={y + 28}
            className="tm-label"
            fontSize={9}
            fontFamily="IBM Plex Mono, monospace"
            fontWeight="600"
          >
            #{position}
          </text>
        </>
      )}
    </g>
  );
}

export function TrafficOpportunityTreemapChart({ data }: TrafficOpportunityTreemapChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No traffic data
        </span>
      </div>
    );
  }

  // Take top 20 by volume for the treemap
  const sorted = [...data]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 20);

  const treemapData = sorted.map((d) => ({
    name: d.keyword,
    size: d.volume,
    position: d.position,
    volume: d.volume,
    estTraffic: d.estTraffic,
  }));

  return (
    <div className="border border-rule bg-surface-card p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-serif text-lg font-bold text-ink">
          Traffic Opportunity
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Volume × Position
        </span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <Treemap
          data={treemapData}
          dataKey="size"
          stroke="#1a1a1a"
          content={<CustomContent x={0} y={0} width={0} height={0} name="" position={0} />}
        >
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
            formatter={(value) => {
              return [Number(value).toLocaleString(), "Volume"];
            }}
          />
        </Treemap>
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
          <span className="font-mono text-[10px] text-ink-muted">Size = search volume</span>
        </div>
      </div>
    </div>
  );
}
