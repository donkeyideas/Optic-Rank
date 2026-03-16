"use client";

import { cn } from "@/lib/utils";

export interface BottomBarProps {
  /** Text displayed on the left side */
  leftText?: string;
  /** Text displayed on the right side */
  rightText?: string;
  className?: string;
}

export function BottomBar({
  leftText,
  rightText,
  className,
}: BottomBarProps) {
  return (
    <footer
      className={cn(
        "flex flex-col items-center gap-1 sm:flex-row sm:justify-between border-t-4 border-double border-rule-dark bg-surface-card px-4 sm:px-6 py-2 sm:py-3",
        className,
      )}
    >
      {leftText && (
        <span className="font-sans text-[11px] text-ink-muted">
          {leftText}
        </span>
      )}
      {rightText && (
        <span className="ml-auto font-sans text-[11px] text-ink-muted">
          {rightText}
        </span>
      )}
    </footer>
  );
}
