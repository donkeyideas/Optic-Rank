"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/shared/toast";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AsoKeywordPositionChart } from "@/components/charts/aso-keyword-position-chart";
import { generateAppKeywords, refreshKeywordRankings } from "@/lib/actions/app-store";
import type { AppStoreListing } from "@/types";
import type { AppStoreRanking, KeywordHistoryPoint } from "@/lib/dal/app-store";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

interface KeywordsTabProps {
  listings: AppStoreListing[];
  rankings: AppStoreRanking[];
  keywordHistory: KeywordHistoryPoint[];
}

export function KeywordsTab({ listings, rankings, keywordHistory }: KeywordsTabProps) {
  const timezone = useTimezone();
  const { toast } = useToast();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState<"all" | "apple" | "google">("all");
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  // Local rankings from generate action (bypasses server prop refresh issues)
  const [localRankings, setLocalRankings] = useState<AppStoreRanking[]>([]);

  // Merge server props with local state — local state acts as immediate fallback
  const allRankings = rankings.length > 0 ? rankings : localRankings;

  // Group rankings by keyword (deduplicate, keep latest)
  const keywordMap = new Map<string, AppStoreRanking & { listing?: AppStoreListing }>();
  for (const r of allRankings) {
    const key = `${r.keyword}:${r.listing_id}`;
    if (!keywordMap.has(key) || new Date(r.checked_at) > new Date(keywordMap.get(key)!.checked_at)) {
      const listing = listings.find((l) => l.id === r.listing_id);
      keywordMap.set(key, { ...r, listing });
    }
  }

  let keywordRows = Array.from(keywordMap.values());

  // Filters
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    keywordRows = keywordRows.filter((r) => r.keyword.toLowerCase().includes(q));
  }
  if (storeFilter !== "all") {
    keywordRows = keywordRows.filter((r) => r.listing?.store === storeFilter);
  }

  // Sort by position (best first)
  keywordRows.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));

  // Cross-platform gap detection
  const crossPlatformKeywords = new Map<string, { apple?: number | null; google?: number | null }>();
  for (const r of keywordRows) {
    if (!crossPlatformKeywords.has(r.keyword)) crossPlatformKeywords.set(r.keyword, {});
    const entry = crossPlatformKeywords.get(r.keyword)!;
    if (r.listing?.store === "apple") entry.apple = r.position;
    if (r.listing?.store === "google") entry.google = r.position;
  }

  function handleGenerateKeywords(listingId: string) {
    setActionId("generate");
    startTransition(async () => {
      try {
        const result = await generateAppKeywords(listingId);
        if ("error" in result) {
          toast(result.error, "error");
        } else {
          toast(`Generated ${result.keywords.length} keywords with ranking data`, "success");
          // Store the rankings returned by the action for immediate display
          if (result.rankings && result.rankings.length > 0) {
            setLocalRankings(result.rankings);
          }
          router.refresh();
        }
      } catch (err) {
        toast(`Failed to generate keywords: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      }
      setActionId(null);
    });
  }

  function handleRefreshRankings(listingId: string) {
    setActionId("refresh");
    startTransition(async () => {
      try {
        const result = await refreshKeywordRankings(listingId);
        if ("error" in result) {
          toast(result.error, "error");
        } else {
          toast(`Updated positions for ${result.updated} keywords`, "success");
          router.refresh();
        }
      } catch (err) {
        toast(`Failed to refresh rankings: ${err instanceof Error ? err.message : "Unknown error"}`, "error");
      }
      setActionId(null);
    });
  }

  if (allRankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search size={48} className="mb-4 text-ink-muted" />
        <h3 className="font-serif text-xl font-bold text-ink">No App Keywords Tracked</h3>
        <p className="mt-2 max-w-md text-sm text-ink-secondary">Generate or add keywords to track your app&apos;s ranking in the app stores.</p>
        <Button
          variant="primary"
          size="md"
          className="mt-6"
          onClick={() => listings[0] && handleGenerateKeywords(listings[0].id)}
          disabled={actionId === "generate"}
        >
          {actionId === "generate" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {actionId === "generate" ? "Generating Keywords..." : "Generate Keywords"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b border-rule pb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full border border-rule bg-surface-card pl-9 pr-3 font-sans text-sm text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
          />
        </div>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value as "all" | "apple" | "google")}
          className="h-9 border border-rule bg-surface-card px-3 font-sans text-sm text-ink focus:border-editorial-red focus:outline-none"
        >
          <option value="all">All Stores</option>
          <option value="apple">Apple</option>
          <option value="google">Google Play</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => listings[0] && handleRefreshRankings(listings[0].id)}
          disabled={actionId === "refresh"}
        >
          {actionId === "refresh" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {actionId === "refresh" ? "Checking..." : "Refresh Positions"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => listings[0] && handleGenerateKeywords(listings[0].id)}
          disabled={actionId === "generate"}
        >
          {actionId === "generate" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Generate More
        </Button>
      </div>

      <ColumnHeader
        title="App Keyword Rankings"
        subtitle={`${keywordRows.length} keywords · ${allRankings.length} checks`}
      />

      {/* Cross-Platform Gap Alert */}
      {Array.from(crossPlatformKeywords.entries())
        .filter(([, v]) => v.apple != null && v.google != null && Math.abs((v.apple ?? 0) - (v.google ?? 0)) > 20)
        .length > 0 && (
        <div className="border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-gold">Cross-Platform Gap Detected</span>
          <div className="mt-2 flex flex-col gap-1">
            {Array.from(crossPlatformKeywords.entries())
              .filter(([, v]) => v.apple != null && v.google != null && Math.abs((v.apple ?? 0) - (v.google ?? 0)) > 20)
              .slice(0, 5)
              .map(([keyword, positions]) => (
                <div key={keyword} className="flex items-center gap-2 text-[11px]">
                  <span className="font-semibold text-ink">{keyword}</span>
                  <span className="text-ink-muted">→</span>
                  <span className="font-mono text-editorial-green">iOS #{positions.apple}</span>
                  <span className="text-ink-muted">vs</span>
                  <span className="font-mono text-editorial-red">Android #{positions.google}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Keywords Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Keyword</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Volume</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>App</TableHead>
            <TableHead>Checked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywordRows.slice(0, 100).map((r) => {
            const isExpanded = expandedKeyword === `${r.keyword}:${r.listing_id}`;
            const history = keywordHistory.filter((h) => h.ranking_id === r.id);

            return (
              <React.Fragment key={`${r.keyword}:${r.listing_id}`}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => setExpandedKeyword(isExpanded ? null : `${r.keyword}:${r.listing_id}`)}
                >
                  <TableCell>
                    {isExpanded ? <ChevronDown size={12} className="text-ink-muted" /> : <ChevronRight size={12} className="text-ink-muted" />}
                  </TableCell>
                  <TableCell className="font-sans text-sm font-semibold text-ink">{r.keyword}</TableCell>
                  <TableCell>
                    {r.position != null ? (
                      <span className={`font-mono text-sm font-bold tabular-nums ${r.position <= 3 ? "text-editorial-red" : r.position <= 10 ? "text-editorial-green" : r.position <= 50 ? "text-editorial-gold" : "text-ink-secondary"}`}>
                        #{r.position}
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-ink-muted" title="Not found in top 250 search results">&gt;250</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-ink-secondary">
                    {r.search_volume?.toLocaleString() ?? "—"}
                  </TableCell>
                  <TableCell>
                    {r.difficulty != null ? (
                      <span className={`font-mono text-sm ${r.difficulty >= 70 ? "text-editorial-red" : r.difficulty >= 40 ? "text-editorial-gold" : "text-editorial-green"}`}>
                        {r.difficulty}
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.listing?.store === "apple" ? "muted" : "success"}>
                      {r.listing?.store === "apple" ? "iOS" : "Android"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-ink-secondary">{r.listing?.app_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-ink-muted">
                    {formatDate(r.checked_at, timezone)}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-surface-raised px-6 py-4">
                      <AsoKeywordPositionChart
                        data={history.map((h) => ({ date: h.checked_at, position: h.position }))}
                        keyword={r.keyword}
                        height={160}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
