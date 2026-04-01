"use client";

import { Fragment, useState } from "react";

export interface PositionHeatmapEntry {
  keyword: string;
  keywordId: string;
  ranks: { date: string; position: number | null }[];
}

interface KeywordPositionHeatmapProps {
  data: PositionHeatmapEntry[];
}

function positionColor(pos: number | null): string {
  if (pos === null || pos > 50) return "var(--color-ink-faint, #555)";
  if (pos <= 3) return "var(--color-editorial-green, #27ae60)";
  if (pos <= 10) return "var(--color-editorial-gold, #b8860b)";
  if (pos <= 20) return "var(--color-editorial-red, #c0392b)";
  return "rgba(192, 57, 43, 0.4)";
}

function positionLabel(pos: number | null): string {
  if (pos === null) return "—";
  return `#${pos}`;
}

export function KeywordPositionHeatmap({ data }: KeywordPositionHeatmapProps) {
  const [hover, setHover] = useState<{ keyword: string; date: string; position: number | null; x: number; y: number } | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
          No historical rank data
        </span>
      </div>
    );
  }

  // Sort by best average position, take top 15
  const sorted = [...data]
    .map((d) => {
      const validRanks = d.ranks.filter((r) => r.position !== null).map((r) => r.position!);
      const avgPos = validRanks.length > 0 ? validRanks.reduce((a, b) => a + b, 0) / validRanks.length : 999;
      return { ...d, avgPos };
    })
    .sort((a, b) => a.avgPos - b.avgPos)
    .slice(0, 15);

  // Collect all unique dates across all keywords, sorted
  const allDates = Array.from(
    new Set(sorted.flatMap((d) => d.ranks.map((r) => r.date)))
  ).sort();

  // Build lookup maps for quick access
  const rankLookup = new Map<string, Map<string, number | null>>();
  for (const kw of sorted) {
    const dateMap = new Map<string, number | null>();
    for (const r of kw.ranks) {
      dateMap.set(r.date, r.position);
    }
    rankLookup.set(kw.keywordId, dateMap);
  }

  return (
    <div className="border border-rule bg-surface-card p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-serif text-lg font-bold text-ink">
          Position Over Time
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Top 15 Keywords × 30 Days
        </span>
      </div>

      <div className="relative overflow-x-auto">
        {/* Grid */}
        <div
          className="inline-grid gap-px"
          style={{
            gridTemplateColumns: `140px repeat(${allDates.length}, 24px)`,
            gridTemplateRows: `28px repeat(${sorted.length}, 22px)`,
          }}
        >
          {/* Header row — empty corner */}
          <div />
          {/* Date headers */}
          {allDates.map((date) => (
            <div
              key={date}
              className="flex items-end justify-center overflow-hidden"
            >
              <span
                className="origin-bottom-left font-mono text-[8px] text-ink-muted"
                style={{ transform: "rotate(-45deg)", whiteSpace: "nowrap" }}
              >
                {date.slice(5)}
              </span>
            </div>
          ))}

          {/* Data rows */}
          {sorted.map((kw) => {
            const dateMap = rankLookup.get(kw.keywordId)!;
            return (
              <Fragment key={kw.keywordId}>
                {/* Keyword label */}
                <div
                  className="flex items-center pr-2"
                >
                  <span className="truncate font-mono text-[10px] text-ink" title={kw.keyword}>
                    {kw.keyword.length > 18 ? kw.keyword.slice(0, 16) + "…" : kw.keyword}
                  </span>
                </div>
                {/* Cells */}
                {allDates.map((date) => {
                  const pos = dateMap.get(date) ?? null;
                  return (
                    <div
                      key={`${kw.keywordId}-${date}`}
                      className="flex cursor-default items-center justify-center"
                      style={{ backgroundColor: positionColor(pos) }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHover({
                          keyword: kw.keyword,
                          date,
                          position: pos,
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                    >
                      <span className="font-mono text-[7px] font-bold text-white/80">
                        {pos !== null && pos <= 50 ? pos : ""}
                      </span>
                    </div>
                  );
                })}
              </Fragment>
            );
          })}
        </div>

        {/* Tooltip */}
        {hover && (
          <div
            className="pointer-events-none fixed z-50 border border-rule bg-surface-card px-3 py-2 shadow-lg"
            style={{ left: hover.x, top: hover.y - 60 }}
          >
            <p className="font-sans text-[11px] font-semibold text-ink">{hover.keyword}</p>
            <p className="font-mono text-[10px] text-ink-muted">{hover.date}</p>
            <p className="font-mono text-[11px] text-ink">
              Position: {positionLabel(hover.position)}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "var(--color-editorial-green, #27ae60)" }} />
          <span className="font-mono text-[10px] text-ink-muted">Top 3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "var(--color-editorial-gold, #b8860b)" }} />
          <span className="font-mono text-[10px] text-ink-muted">4–10</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "var(--color-editorial-red, #c0392b)" }} />
          <span className="font-mono text-[10px] text-ink-muted">11–20</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "rgba(192, 57, 43, 0.4)" }} />
          <span className="font-mono text-[10px] text-ink-muted">21–50</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "var(--color-ink-faint, #555)" }} />
          <span className="font-mono text-[10px] text-ink-muted">No data</span>
        </div>
      </div>
    </div>
  );
}
