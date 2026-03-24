"use client";

import { useState, type ReactNode } from "react";

interface ChartSlide {
  label: string;
  chart: ReactNode;
}

interface KeywordChartCarouselProps {
  slides: ChartSlide[];
}

export function KeywordChartCarousel({ slides }: KeywordChartCarouselProps) {
  const [index, setIndex] = useState(0);

  if (slides.length === 0) return null;

  const current = slides[index];

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <div>
      {/* Navigation header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="flex h-7 w-7 items-center justify-center border border-rule bg-surface-raised text-ink-secondary transition-colors hover:bg-surface-card hover:text-ink"
            aria-label="Previous chart"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.5 2.5L4 6L7.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
          <span className="font-mono text-[11px] font-semibold tracking-wide text-ink-secondary">
            {current.label}
          </span>
          <button
            onClick={next}
            className="flex h-7 w-7 items-center justify-center border border-rule bg-surface-raised text-ink-secondary transition-colors hover:bg-surface-card hover:text-ink"
            aria-label="Next chart"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
            </svg>
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setIndex(i)}
              className={`h-1.5 transition-all ${
                i === index
                  ? "w-4 bg-editorial-red"
                  : "w-1.5 bg-ink-muted/30 hover:bg-ink-muted/50"
              }`}
              aria-label={`Show ${s.label}`}
            />
          ))}
        </div>
      </div>

      {/* Active chart */}
      {current.chart}
    </div>
  );
}
