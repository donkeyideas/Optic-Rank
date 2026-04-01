"use client";

import { useState, useMemo } from "react";

interface MatrixKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
}

interface VolumeDifficultyMatrixProps {
  data: MatrixKeyword[];
}

const DIFF_ROWS = [
  { label: "Easy", min: 0, max: 25 },
  { label: "Medium", min: 25, max: 50 },
  { label: "Hard", min: 50, max: 75 },
  { label: "V. Hard", min: 75, max: 101 },
] as const;

const VOL_COLS = [
  { label: "Low", min: 0, max: 100 },
  { label: "Medium", min: 100, max: 1000 },
  { label: "High", min: 1000, max: 10000 },
  { label: "V. High", min: 10000, max: Infinity },
] as const;

function getBucket(kw: MatrixKeyword): { row: number; col: number } {
  let row = DIFF_ROWS.findIndex((r) => kw.difficulty >= r.min && kw.difficulty < r.max);
  if (row === -1) row = 3;
  let col = VOL_COLS.findIndex((c) => kw.volume >= c.min && kw.volume < c.max);
  if (col === -1) col = 3;
  return { row, col };
}

function isOpportunityZone(row: number, col: number): boolean {
  // High/Very High volume + Easy/Medium difficulty
  return row <= 1 && col >= 2;
}

export function VolumeDifficultyMatrix({ data }: VolumeDifficultyMatrixProps) {
  const [expandedCell, setExpandedCell] = useState<{ row: number; col: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number; x: number; y: number } | null>(null);

  const grid = useMemo(() => {
    const cells: MatrixKeyword[][][] = DIFF_ROWS.map(() => VOL_COLS.map(() => []));
    for (const kw of data) {
      const { row, col } = getBucket(kw);
      cells[row][col].push(kw);
    }
    return cells;
  }, [data]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell.length > max) max = cell.length;
      }
    }
    return max;
  }, [grid]);

  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
        <div className="text-center">
          <span className="block text-[9px] font-bold uppercase tracking-widest text-ink-muted">
            No difficulty data available
          </span>
          <span className="mt-1 block text-[10px] text-ink-muted">
            Keywords need difficulty scores to populate this matrix
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-rule bg-surface-card p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-serif text-lg font-bold text-ink">
          Opportunity Matrix
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Volume × Difficulty
        </span>
      </div>

      <div className="relative">
        {/* Column headers */}
        <div className="mb-1 grid gap-px" style={{ gridTemplateColumns: "64px repeat(4, 1fr)" }}>
          <div />
          {VOL_COLS.map((col) => (
            <div key={col.label} className="text-center">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                {col.label}
              </span>
              <span className="block font-mono text-[8px] text-ink-faint">
                {col.max === Infinity ? `${col.min.toLocaleString()}+` : `${col.min.toLocaleString()}–${col.max.toLocaleString()}`}
              </span>
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DIFF_ROWS.map((diffRow, ri) => (
          <div key={diffRow.label} className="mb-px grid gap-px" style={{ gridTemplateColumns: "64px repeat(4, 1fr)" }}>
            {/* Row label */}
            <div className="flex items-center justify-end pr-2">
              <div className="text-right">
                <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                  {diffRow.label}
                </span>
                <span className="block font-mono text-[8px] text-ink-faint">
                  {diffRow.min}–{diffRow.max > 100 ? "100" : diffRow.max}
                </span>
              </div>
            </div>

            {/* Cells */}
            {VOL_COLS.map((_colDef, ci) => {
              const cellKws = grid[ri][ci];
              const count = cellKws.length;
              const intensity = maxCount > 0 ? count / maxCount : 0;
              const opportunity = isOpportunityZone(ri, ci);
              const isExpanded = expandedCell?.row === ri && expandedCell?.col === ci;

              // Editorial color scheme: red-based with white text
              // Opportunity zones get a distinct lighter treatment
              const cellBg = count > 0
                ? opportunity
                  ? `rgba(192, 57, 43, ${0.15 + 0.5 * intensity})`  // Subtle red for opportunity
                  : `rgba(192, 57, 43, ${0.1 + 0.85 * intensity})`  // Deep red for standard
                : "var(--color-surface-raised, #2a2a2a)";

              return (
                <div
                  key={ci}
                  className={`relative flex min-h-[48px] cursor-pointer items-center justify-center transition-all ${
                    opportunity && count > 0 ? "border-2 border-white/40" : "border border-rule"
                  } ${isExpanded ? "ring-2 ring-white/60" : ""}`}
                  style={{ backgroundColor: cellBg }}
                  onClick={() => {
                    if (count === 0) return;
                    setExpandedCell(isExpanded ? null : { row: ri, col: ci });
                  }}
                  onMouseEnter={(e) => {
                    if (count === 0) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverCell({ row: ri, col: ci, x: rect.left + rect.width / 2, y: rect.top });
                  }}
                  onMouseLeave={() => setHoverCell(null)}
                >
                  <span className={`font-mono text-base font-bold ${count > 0 ? "text-white" : "text-ink-muted"}`}>
                    {count > 0 ? count : "—"}
                  </span>
                  {opportunity && count > 0 && (
                    <span className="absolute -top-0.5 right-0.5 font-mono text-[7px] font-bold uppercase text-white/80">
                      OPP
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Axis labels */}
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">
            ← Difficulty →
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">
            Search Volume →
          </span>
        </div>

        {/* Hover tooltip */}
        {hoverCell && !expandedCell && (
          <div
            className="pointer-events-none fixed z-50 border border-rule bg-surface-card px-3 py-2 shadow-lg"
            style={{ left: hoverCell.x, top: hoverCell.y - 70 }}
          >
            <p className="font-sans text-[11px] font-semibold text-ink">
              {DIFF_ROWS[hoverCell.row].label} difficulty × {VOL_COLS[hoverCell.col].label} volume
            </p>
            <p className="font-mono text-[11px] text-ink">
              {grid[hoverCell.row][hoverCell.col].length} keyword{grid[hoverCell.row][hoverCell.col].length !== 1 ? "s" : ""}
            </p>
            <div className="mt-1 space-y-0.5">
              {grid[hoverCell.row][hoverCell.col].slice(0, 5).map((kw) => (
                <p key={kw.keyword} className="font-mono text-[9px] text-ink-muted">
                  {kw.keyword} ({kw.volume.toLocaleString()} vol, {kw.difficulty} diff)
                </p>
              ))}
              {grid[hoverCell.row][hoverCell.col].length > 5 && (
                <p className="font-mono text-[9px] text-ink-faint">
                  +{grid[hoverCell.row][hoverCell.col].length - 5} more — click to expand
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expanded cell detail */}
      {expandedCell && (
        <div className="mt-3 border-t border-rule pt-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-sans text-[11px] font-semibold text-ink">
              {DIFF_ROWS[expandedCell.row].label} Difficulty × {VOL_COLS[expandedCell.col].label} Volume
              {isOpportunityZone(expandedCell.row, expandedCell.col) && (
                <span className="ml-2 font-mono text-[9px] font-bold uppercase text-editorial-red">
                  Opportunity Zone
                </span>
              )}
            </span>
            <button
              className="font-mono text-[10px] text-ink-muted hover:text-ink"
              onClick={() => setExpandedCell(null)}
            >
              Close ×
            </button>
          </div>
          <div className="max-h-[160px] overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule">
                  <th className="pb-1 text-left font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">Keyword</th>
                  <th className="pb-1 text-right font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">Volume</th>
                  <th className="pb-1 text-right font-mono text-[9px] font-bold uppercase tracking-wider text-ink-muted">Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {grid[expandedCell.row][expandedCell.col].map((kw) => (
                  <tr key={kw.keyword} className="border-b border-rule/50">
                    <td className="py-0.5 font-mono text-[10px] text-ink">{kw.keyword}</td>
                    <td className="py-0.5 text-right font-mono text-[10px] text-ink-muted">{kw.volume.toLocaleString()}</td>
                    <td className="py-0.5 text-right font-mono text-[10px] text-ink-muted">{kw.difficulty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 border border-white/40" style={{ backgroundColor: "rgba(192, 57, 43, 0.4)" }} />
          <span className="font-mono text-[10px] text-ink-muted">Opportunity Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2" style={{ backgroundColor: "rgba(192, 57, 43, 0.6)" }} />
          <span className="font-mono text-[10px] text-ink-muted">Standard</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-ink-muted">Intensity = keyword count</span>
        </div>
      </div>
    </div>
  );
}
