"use client";

import { useState } from "react";
import { Globe, Search } from "lucide-react";

interface PageInfo {
  url: string;
  title: string | null;
  seoScore: number | null;
}

interface PageSelectorProps {
  pages: PageInfo[];
  selected: string;
  onSelect: (url: string) => void;
}

function getScoreColor(score: number | null): string {
  if (score == null) return "bg-ink-muted/30";
  if (score >= 80) return "bg-editorial-green";
  if (score >= 50) return "bg-editorial-gold";
  return "bg-editorial-red";
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
    return path.length > 40 ? path.slice(0, 37) + "..." : path;
  } catch {
    return url.length > 40 ? url.slice(0, 37) + "..." : url;
  }
}

export function PageSelector({ pages, selected, onSelect }: PageSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = search
    ? pages.filter((p) => p.url.toLowerCase().includes(search.toLowerCase()) || (p.title ?? "").toLowerCase().includes(search.toLowerCase()))
    : pages;

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      {pages.length > 5 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="w-full border border-rule bg-surface-card py-2 pl-9 pr-3 text-[12px] text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
          />
        </div>
      )}

      {/* Page list */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Page
        </span>

        {filtered.slice(0, 20).map((page) => {
          const isSelected = page.url === selected;
          return (
            <button
              key={page.url}
              type="button"
              onClick={() => onSelect(page.url)}
              className={`flex shrink-0 items-center gap-2 border px-3 py-2 text-left transition-colors ${
                isSelected
                  ? "border-editorial-red bg-editorial-red/5"
                  : "border-rule bg-surface-card hover:border-rule-dark"
              }`}
            >
              <div className="flex h-6 w-6 items-center justify-center border border-rule bg-surface-raised">
                <Globe size={12} className="text-ink-muted" />
              </div>
              <div className="flex flex-col">
                <span className="text-[12px] font-bold leading-tight text-ink">
                  {truncateUrl(page.url)}
                </span>
                {page.title && (
                  <span className="max-w-[180px] truncate text-[10px] text-ink-muted">
                    {page.title}
                  </span>
                )}
              </div>
              <span className={`ml-1 h-2 w-2 shrink-0 rounded-full ${getScoreColor(page.seoScore)}`} />
            </button>
          );
        })}

        {filtered.length === 0 && (
          <span className="text-[11px] text-ink-muted">No pages match your search</span>
        )}
      </div>
    </div>
  );
}
