"use client";

import type { GA4TrafficSource } from "@/lib/google/analytics";

interface GA4TrafficSourcesChartProps {
  sources: GA4TrafficSource[];
}

const MEDIUM_COLORS: Record<string, string> = {
  organic: "var(--color-editorial-green, #27ae60)",
  "(none)": "var(--color-ink, #1a1a1a)",
  referral: "var(--color-editorial-gold, #b8860b)",
  social: "var(--color-editorial-red, #c0392b)",
  email: "var(--color-editorial-amber, #d4a012)",
  cpc: "var(--color-ink-muted, #999)",
};

function getMediumColor(medium: string): string {
  return MEDIUM_COLORS[medium.toLowerCase()] ?? "var(--color-ink-muted, #999)";
}

function getMediumLabel(source: string, medium: string): string {
  if (medium === "(none)") return `${source} / Direct`;
  return `${source} / ${medium}`;
}

export function GA4TrafficSourcesChart({ sources }: GA4TrafficSourcesChartProps) {
  if (sources.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No traffic source data
        </span>
      </div>
    );
  }

  const top10 = sources.slice(0, 10);
  const maxSessions = Math.max(...top10.map((s) => s.sessions), 1);

  return (
    <div className="w-full">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-rule-dark">
            <th className="pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Source / Medium
            </th>
            <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Sessions
            </th>
            <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Users
            </th>
            <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Bounce
            </th>
          </tr>
        </thead>
        <tbody>
          {top10.map((src, i) => {
            const barWidth = (src.sessions / maxSessions) * 100;
            const color = getMediumColor(src.medium);

            return (
              <tr key={i} className="border-b border-rule">
                <td className="py-2">
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-[12px] font-semibold text-ink">
                      {getMediumLabel(src.source, src.medium)}
                    </span>
                    <div className="h-1.5 w-full bg-surface-raised">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-2 text-right font-mono text-[12px] font-bold text-ink">
                  {src.sessions.toLocaleString()}
                </td>
                <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">
                  {src.users.toLocaleString()}
                </td>
                <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">
                  {(src.bounceRate * 100).toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
