"use client";

import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/hooks/use-table-sort";

/**
 * Reusable sortable table header cell (editorial style).
 *
 * Matches the design system: sharp borders, mono labels, arrow indicators.
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
  children,
}: {
  label: string;
  sortKey: K;
  currentSort: K;
  currentDir: SortDir;
  onSort: (key: K) => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted bg-surface-card cursor-pointer select-none transition-colors hover:text-ink",
        active && "text-ink",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {children}
        {active &&
          (currentDir === "asc" ? (
            <ArrowUp size={10} className="text-ink" />
          ) : (
            <ArrowDown size={10} className="text-ink" />
          ))}
      </span>
    </th>
  );
}
