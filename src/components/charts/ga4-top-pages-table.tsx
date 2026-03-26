"use client";

import { useState } from "react";
import type { GA4PageData } from "@/lib/google/analytics";

interface GA4TopPagesTableProps {
  pages: GA4PageData[];
}

type SortKey = "pageviews" | "users" | "avgTimeOnPage" | "bounceRate";

export function GA4TopPagesTable({ pages }: GA4TopPagesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("pageviews");
  const [sortAsc, setSortAsc] = useState(false);

  if (pages.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center border border-dashed border-rule bg-surface-raised">
        <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
          No page data
        </span>
      </div>
    );
  }

  const sorted = [...pages]
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      return sortAsc ? aVal - bVal : bVal - aVal;
    })
    .slice(0, 20);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " \u2191" : " \u2193";
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-rule-dark">
            <th className="pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Page
            </th>
            <th
              className="cursor-pointer pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
              onClick={() => handleSort("pageviews")}
            >
              Views{sortIndicator("pageviews")}
            </th>
            <th
              className="cursor-pointer pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
              onClick={() => handleSort("users")}
            >
              Users{sortIndicator("users")}
            </th>
            <th
              className="cursor-pointer pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
              onClick={() => handleSort("avgTimeOnPage")}
            >
              Avg Time{sortIndicator("avgTimeOnPage")}
            </th>
            <th
              className="cursor-pointer pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-ink"
              onClick={() => handleSort("bounceRate")}
            >
              Bounce{sortIndicator("bounceRate")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((page, i) => (
            <tr key={i} className="border-b border-rule">
              <td className="max-w-[250px] truncate py-2" title={page.path}>
                <span className="font-mono text-[11px] text-ink">
                  {page.path}
                </span>
                {page.title && page.title !== page.path && (
                  <span className="ml-1 text-[10px] text-ink-muted">
                    {page.title.length > 40
                      ? `${page.title.slice(0, 40)}...`
                      : page.title}
                  </span>
                )}
              </td>
              <td className="py-2 text-right font-mono text-[12px] font-bold text-ink">
                {page.pageviews.toLocaleString()}
              </td>
              <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">
                {page.users.toLocaleString()}
              </td>
              <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">
                {formatTime(page.avgTimeOnPage)}
              </td>
              <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">
                {(page.bounceRate * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
