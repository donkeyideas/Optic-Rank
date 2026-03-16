"use client";

import { cn } from "@/lib/utils";

export interface CompetitorRowProps {
  /** Display rank (1, 2, 3, ...) */
  rank: number;
  /** Competitor name */
  name: string;
  /** Domain URL */
  domain: string;
  /** Domain Authority score */
  domainAuthority: number;
  className?: string;
}

export function CompetitorRow({
  rank,
  name,
  domain,
  domainAuthority,
  className,
}: CompetitorRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-rule-light py-3",
        className,
      )}
    >
      {/* Rank number */}
      <span className="w-6 shrink-0 text-right font-mono text-[12px] text-ink-muted">
        {rank}
      </span>

      {/* Name + domain */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-sans text-[14px] font-bold text-ink">
          {name}
        </span>
        <span className="truncate font-mono text-[11px] text-ink-muted">
          {domain}
        </span>
      </div>

      {/* DA score */}
      <span className="shrink-0 font-serif text-[20px] font-bold leading-none text-ink">
        {domainAuthority}
      </span>
    </div>
  );
}
