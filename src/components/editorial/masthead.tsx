"use client";

import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export interface MastheadProps {
  /** The text displayed in the masthead bar. Defaults to "The Marketing Intelligence Report" */
  text?: string;
  className?: string;
  showLogout?: boolean;
  /** Optional left-side slot (e.g., trial indicator) */
  leftSlot?: React.ReactNode;
  /** Actions rendered on the left side of the masthead (after leftSlot) */
  leftActions?: React.ReactNode;
  /** Actions rendered on the right side of the masthead (before theme toggle / sign-out) */
  actions?: React.ReactNode;
}

export function Masthead({
  text = "The Marketing Intelligence Report",
  className,
  showLogout = false,
  leftSlot,
  leftActions,
  actions,
}: MastheadProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 items-center bg-ink px-3 sm:px-4 py-2",
        className,
      )}
    >
      {/* Left column */}
      <div className="flex items-center gap-3">
        {leftSlot}
        {leftActions}
      </div>

      {/* Center column */}
      <span
        className="hidden sm:block text-center font-sans text-[11px] font-medium uppercase tracking-[3px] text-surface-cream"
      >
        {text}
      </span>

      {/* Right column */}
      <div className="flex items-center justify-end gap-3">
        {actions}
        <ThemeToggle className="h-7 w-7 border-surface-cream/20 bg-transparent text-surface-cream/70 hover:bg-surface-cream/10 hover:text-surface-cream" />
        {showLogout && (
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-surface-cream/70 transition-colors hover:text-surface-cream"
            >
              <LogOut size={12} strokeWidth={2} />
              Sign Out
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
