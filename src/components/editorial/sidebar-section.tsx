"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SidebarSectionProps {
  /** Section title in Playfair Display */
  title: string;
  /** Small uppercase subtitle */
  subtitle?: string;
  /** The content rendered inside the section */
  children: ReactNode;
  className?: string;
}

export function SidebarSection({
  title,
  subtitle,
  children,
  className,
}: SidebarSectionProps) {
  return (
    <section
      className={cn(
        "border-b border-rule pb-4",
        className,
      )}
    >
      {/* Section header */}
      <div className="mb-3">
        <h3 className="font-serif text-[16px] font-bold leading-tight text-ink">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-muted">
            {subtitle}
          </p>
        )}
      </div>

      {/* Content slot */}
      {children}
    </section>
  );
}
