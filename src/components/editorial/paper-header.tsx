"use client";

import { cn } from "@/lib/utils";

export interface PaperHeaderProps {
  /** Date line text, e.g. "Saturday, March 15, 2026" */
  dateLine: string;
  /** The main brand title. Use `accentText` to highlight part of it in red. */
  title: string;
  /** The portion of the title to render in editorial red */
  accentText?: string;
  /** Italic tagline below the title */
  tagline?: string;
  className?: string;
}

export function PaperHeader({
  dateLine,
  title,
  accentText,
  tagline,
  className,
}: PaperHeaderProps) {
  /**
   * Renders the title with an optional red accent span.
   * If accentText is provided and found within title, that substring is wrapped
   * in a red-colored span while the rest remains in the default ink color.
   */
  function renderTitle() {
    if (!accentText) {
      return <>{title}</>;
    }

    const idx = title.indexOf(accentText);
    if (idx === -1) {
      return <>{title}</>;
    }

    const before = title.slice(0, idx);
    const after = title.slice(idx + accentText.length);

    return (
      <>
        {before}
        <span className="text-editorial-red">{accentText}</span>
        {after}
      </>
    );
  }

  return (
    <header
      className={cn(
        "border-b-4 border-double border-rule-dark bg-surface-card px-4 sm:px-6 pb-4 sm:pb-5 pt-4 sm:pt-6 text-center",
        className,
      )}
    >
      {/* Date line */}
      <p className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-ink-muted">
        {dateLine}
      </p>

      {/* Title */}
      <h1 className="font-serif text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] font-black leading-none tracking-tight text-ink">
        {renderTitle()}
      </h1>

      {/* Tagline */}
      {tagline && (
        <p className="mt-3 font-serif text-[13px] sm:text-[15px] italic text-ink-muted">
          {tagline}
        </p>
      )}
    </header>
  );
}
