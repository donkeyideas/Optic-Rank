"use client";

import { cn } from "@/lib/utils";
import type { AIInsight } from "@/types";

export interface AIStoryProps {
  /** An AI insight to display as an editorial story */
  insight: AIInsight;
  /** Callback when the action link is clicked */
  onAction?: (insight: AIInsight) => void;
  /** Whether to show the bottom border separator */
  showBorder?: boolean;
  className?: string;
}

/** Maps insight types to editorial labels */
const typeLabels: Record<AIInsight["type"], string> = {
  opportunity: "Opportunity",
  alert: "Alert",
  win: "Win",
  backlinks: "Backlinks",
  prediction: "Prediction",
  content: "Content",
  technical: "Technical",
};

export function AIStory({
  insight,
  onAction,
  showBorder = true,
  className,
}: AIStoryProps) {
  return (
    <article
      className={cn(
        "flex flex-col gap-2 py-4",
        showBorder && "border-b border-rule",
        className,
      )}
    >
      {/* Section label */}
      <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
        {typeLabels[insight.type] ?? insight.type}
      </span>

      {/* Headline */}
      <h3 className="font-serif text-[16px] font-bold leading-snug text-ink">
        {insight.title}
      </h3>

      {/* Body */}
      <p className="font-sans text-[13px] leading-relaxed text-ink-secondary">
        {insight.description}
      </p>

    </article>
  );
}
