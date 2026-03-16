"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type TaskPriority = "HIGH" | "MED" | "LOW";

export interface TaskRowProps {
  /** Task description */
  text: string;
  /** Whether the task is completed */
  done?: boolean;
  /** Priority level */
  priority?: TaskPriority;
  /** Callback when the checkbox is toggled */
  onToggle?: () => void;
  className?: string;
}

const priorityStyles: Record<TaskPriority, string> = {
  HIGH: "bg-editorial-red text-surface-cream",
  MED: "bg-editorial-gold text-surface-cream",
  LOW: "bg-ink-faint text-ink-secondary",
};

export function TaskRow({
  text,
  done = false,
  priority,
  onToggle,
  className,
}: TaskRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-rule-light py-2.5",
        className,
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm border transition-colors",
          done
            ? "border-editorial-green bg-editorial-green"
            : "border-rule hover:border-ink-muted",
        )}
        aria-label={done ? "Mark as incomplete" : "Mark as complete"}
      >
        {done && <Check size={12} strokeWidth={3} className="text-white" />}
      </button>

      {/* Task text */}
      <span
        className={cn(
          "flex-1 font-sans text-[13px] leading-snug",
          done
            ? "text-ink-muted line-through"
            : "text-ink",
        )}
      >
        {text}
      </span>

      {/* Priority badge */}
      {priority && (
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wide",
            priorityStyles[priority],
          )}
        >
          {priority}
        </span>
      )}
    </div>
  );
}
