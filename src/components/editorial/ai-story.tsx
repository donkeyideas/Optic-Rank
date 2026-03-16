"use client";

import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
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

      {/* Action link */}
      {insight.action_label && (
        <button
          type="button"
          onClick={() => onAction?.(insight)}
          className={cn(
            "mt-1 inline-flex items-center gap-1 self-start",
            "font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-editorial-red",
            "transition-opacity hover:opacity-70",
          )}
        >
          {insight.action_label}
          <ArrowRight size={11} strokeWidth={2.5} />
        </button>
      )}
    </article>
  );
}
