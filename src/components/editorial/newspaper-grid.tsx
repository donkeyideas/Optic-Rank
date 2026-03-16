"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface NewspaperGridProps {
  /** Left column content (sidebar, ~300px) */
  left: ReactNode;
  /** Center column content (main, flexible) */
  center: ReactNode;
  /** Right column content (sidebar, ~280px) */
  right: ReactNode;
  className?: string;
}

export function NewspaperGrid({
  left,
  center,
  right,
  className,
}: NewspaperGridProps) {
  return (
    <div
      className={cn(
        "border border-rule bg-surface-card",
        // 3-column newspaper grid on large screens, stacked on mobile
        "grid grid-cols-1 lg:grid-cols-[300px_1fr_280px]",
        className,
      )}
    >
      {/* Left column */}
      <div className="border-b border-rule p-5 lg:border-b-0 lg:border-r">
        {left}
      </div>

      {/* Center column */}
      <div className="border-b border-rule p-5 lg:border-b-0 lg:border-r">
        {center}
      </div>

      {/* Right column */}
      <div className="p-5">
        {right}
      </div>
    </div>
  );
}
