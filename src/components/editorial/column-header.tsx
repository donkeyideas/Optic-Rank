"use client";

import { cn } from "@/lib/utils";

export interface ColumnHeaderProps {
  /** Main section title rendered in Playfair Display */
  title: string;
  /** Small uppercase subtitle above or below the title */
  subtitle?: string;
  className?: string;
}

export function ColumnHeader({
  title,
  subtitle,
  className,
}: ColumnHeaderProps) {
  return (
    <div
      className={cn(
        "border-b border-rule pb-3",
        className,
      )}
    >
      <h2 className="font-serif text-[18px] font-bold leading-tight text-ink">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
