"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  TrendingUp,
  TrendingDown,
  Search,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Loader2,
  RefreshCw,
  Trophy,
  Target,
  BarChart3,
  Sparkles,
  Zap,
  CheckCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableHeader } from "@/components/editorial/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { AsoVisibilityTrendChart } from "@/components/charts/aso-visibility-trend-chart";
import { useActionProgress } from "@/components/shared/action-progress";
import { calculateAppVisibility, getVisibilityRecommendations, type VisibilityRecommendation } from "@/lib/actions/app-store-visibility";
import type { AppStoreListing } from "@/types";
import type { AppStoreRanking, VisibilityHistoryPoint } from "@/lib/dal/app-store";
import type { VisibilityBreakdown } from "@/lib/app-store/visibility";
import { getPositionWeight } from "@/lib/app-store/visibility";

type VisSortKey = "keyword" | "position" | "search_volume" | "weight" | "contribution_pct";

interface VisibilityTabProps {
  listings: AppStoreListing[];
  rankings: AppStoreRanking[];
  visibilityHistory: VisibilityHistoryPoint[];
  onStatusMsg: (msg: string) => void;
}

// Tier classification for keywords
function getPositionTier(position: number | null): { label: string; color: string; tier: string } {
  if (position == null || position < 1) return { label: "Not Ranked", tier: "unranked", color: "text-ink-muted" };
  if (position <= 3) return { label: "Top 3", tier: "top3", color: "text-editorial-green" };
  if (position <= 10) return { label: "Top 10", tier: "top10", color: "text-editorial-gold" };
  if (position <= 25) return { label: "Top 25", tier: "top25", color: "text-ink-secondary" };
  if (position <= 50) return { label: "Top 50", tier: "top50", color: "text-ink-muted" };
  return { label: ">50", tier: "low", color: "text-editorial-red" };
}

function getScoreColor(score: number): string {
  if (score >= 70) return "text-editorial-green";
  if (score >= 40) return "text-editorial-gold";
  return "text-editorial-red";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Strong";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Weak";
  return "Critical";
}

function getScoreBg(score: number): string {
  if (score >= 70) return "bg-editorial-green/10 border-editorial-green/30";
  if (score >= 40) return "bg-editorial-gold/10 border-editorial-gold/30";
  return "bg-editorial-red/10 border-editorial-red/30";
}

export function VisibilityTab({
  listings,
  rankings,
  visibilityHistory,
  onStatusMsg,
}: VisibilityTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const { runAction, isRunning: isActionRunning } = useActionProgress();
  const [selectedListing, setSelectedListing] = useState<string>(listings[0]?.id ?? "");
  const [breakdowns, setBreakdowns] = useState<Record<string, VisibilityBreakdown[]>>({});
  const [recommendations, setRecommendations] = useState<Record<string, VisibilityRecommendation[]>>({});
  const [recsLoading, setRecsLoading] = useState(false);
  const { sortKey: visSortKey, sortDir: visSortDir, toggleSort: toggleVisSort, sort: visSort } = useTableSort<VisSortKey>("contribution_pct", "desc");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Compute per-listing data
  const listingData = useMemo(() => {
    return listings.map((listing) => {
      const listingRankings = rankings.filter((r) => r.listing_id === listing.id);
      const listingVisHistory = visibilityHistory.filter((v) => v.listing_id === listing.id);

      // Deduplicate by keyword — keep best position per keyword
      const bestByKeyword = new Map<string, AppStoreRanking>();
      for (const r of listingRankings) {
        const existing = bestByKeyword.get(r.keyword);
        if (!existing || (r.position != null && (existing.position == null || r.position < existing.position))) {
          bestByKeyword.set(r.keyword, r);
        }
      }
      const deduped = Array.from(bestByKeyword.values());

      const keywordCount = deduped.length;
      const rankedKeywords = deduped.filter((r) => r.position != null && r.position > 0);

      // Tier distribution (from deduplicated keywords)
      const tiers = { top3: 0, top10: 0, top25: 0, top50: 0, low: 0, unranked: 0 };
      for (const r of deduped) {
        const tier = getPositionTier(r.position).tier;
        tiers[tier as keyof typeof tiers]++;
      }

      // Average position (ranked keywords only)
      const avgPosition = rankedKeywords.length > 0
        ? Math.round(rankedKeywords.reduce((s, r) => s + (r.position ?? 0), 0) / rankedKeywords.length * 10) / 10
        : null;

      // Weighted search volume (from deduplicated)
      const totalVolume = deduped.reduce((s, r) => s + (r.search_volume ?? 0), 0);
      const capturedVolume = deduped.reduce((s, r) => {
        const weight = getPositionWeight(r.position);
        return s + weight * (r.search_volume ?? 0);
      }, 0);

      // Visibility change (compare first and last in history)
      let visibilityChange: number | null = null;
      if (listingVisHistory.length >= 2) {
        const sorted = [...listingVisHistory].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
        const first = sorted[0].visibility_score;
        const last = sorted[sorted.length - 1].visibility_score;
        if (first != null && last != null) {
          visibilityChange = last - first;
        }
      }

      return {
        listing,
        rankings: listingRankings,
        deduped,
        visHistory: listingVisHistory,
        keywordCount,
        rankedCount: rankedKeywords.length,
        tiers,
        avgPosition,
        totalVolume,
        capturedVolume,
        visibilityChange,
      };
    });
  }, [listings, rankings, visibilityHistory]);

  const selectedData = listingData.find((d) => d.listing.id === selectedListing) ?? listingData[0];

  // Org-level aggregate
  const orgVisibility = listings.length > 0 && listings.some((l) => l.visibility_score != null)
    ? Math.round(listings.reduce((s, l) => s + (l.visibility_score ?? 0), 0) / listings.filter((l) => l.visibility_score != null).length)
    : null;

  function handleCalculate(listingId: string) {
    runAction(
      {
        title: "Calculating Visibility Score",
        description: "Computing organic visibility score for this app...",
        steps: ["Collecting keyword rankings", "Weighting by search volume", "Computing score"],
        estimatedDuration: 10,
      },
      async () => {
        const result = await calculateAppVisibility(listingId);
        if ("error" in result) return result;
        setBreakdowns((prev) => ({ ...prev, [listingId]: result.result.breakdown }));
        onStatusMsg(`Visibility Score: ${result.result.score}/100 (${result.result.ranked_count} ranked keywords)`);
        router.refresh();
        return { message: `Visibility score: ${result.result.score}/100` };
      }
    );
  }

  function handleCalculateAll() {
    runAction(
      {
        title: "Calculating Visibility Scores",
        description: `Calculating organic visibility for all ${listings.length} app${listings.length !== 1 ? "s" : ""}...`,
        steps: ["Collecting keyword data", "Weighting positions by search volume", "Computing visibility scores", "Saving results"],
        estimatedDuration: 15,
      },
      async () => {
        let count = 0;
        for (const listing of listings) {
          const result = await calculateAppVisibility(listing.id);
          if (!("error" in result)) {
            setBreakdowns((prev) => ({ ...prev, [listing.id]: result.result.breakdown }));
            count++;
          }
        }
        onStatusMsg(`Calculated visibility for ${count} app${count !== 1 ? "s" : ""}.`);
        router.refresh();
        return { message: `Calculated visibility for ${count} app${count !== 1 ? "s" : ""}` };
      }
    );
  }

  function handleGetRecommendations(listingId: string) {
    runAction(
      {
        title: "Generating AI Recommendations",
        description: "AI is analyzing your keyword data and generating optimization recommendations...",
        steps: ["Analyzing keyword positions", "Evaluating search volume distribution", "Identifying optimization opportunities", "Generating recommendations"],
        estimatedDuration: 20,
      },
      async () => {
        const result = await getVisibilityRecommendations(listingId);
        if ("error" in result) return result;
        setRecommendations((prev) => ({ ...prev, [listingId]: result.recommendations }));
        return { message: `Generated ${result.recommendations.length} recommendations` };
      }
    );
  }

  // Build keyword table for selected listing (filtering only — sorting handled by hook)
  const filteredKeywordRows = useMemo(() => {
    if (!selectedData) return [];

    // Use breakdown if available (more accurate), otherwise build from rankings
    const bd = breakdowns[selectedData.listing.id];
    if (bd && bd.length > 0) {
      const rows = bd.map((b) => ({
        keyword: b.keyword,
        position: b.position,
        search_volume: b.search_volume,
        weight: b.weight,
        contribution: b.contribution,
        contribution_pct: b.contribution_pct,
        tier: getPositionTier(b.position),
      }));

      return filterTier === "all" ? rows : rows.filter((r) => r.tier.tier === filterTier);
    }

    // Fallback: build from deduplicated rankings data
    const rows = selectedData.deduped
      .filter((r) => (r.search_volume ?? 0) > 0)
      .map((r) => {
        const weight = getPositionWeight(r.position);
        const volume = r.search_volume ?? 0;
        return {
          keyword: r.keyword,
          position: r.position,
          search_volume: volume,
          weight,
          contribution: weight * volume,
          contribution_pct: 0,
          tier: getPositionTier(r.position),
        };
      });

    const totalContribution = rows.reduce((s, r) => s + r.contribution, 0);
    for (const r of rows) {
      r.contribution_pct = totalContribution > 0 ? (r.contribution / totalContribution) * 100 : 0;
    }

    return filterTier === "all" ? rows : rows.filter((r) => r.tier.tier === filterTier);
  }, [selectedData, breakdowns, filterTier]);

  const keywordRows = useMemo(
    () => visSort(filteredKeywordRows, (r, key) => {
      switch (key) {
        case "keyword": return r.keyword;
        case "position": return r.position;
        case "search_volume": return r.search_volume;
        case "weight": return r.weight;
        case "contribution_pct": return r.contribution_pct;
        default: return null;
      }
    }),
    [filteredKeywordRows, visSort]
  );

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Eye size={32} className="text-ink-muted" />
        <p className="font-serif text-lg text-ink">No App Listings</p>
        <p className="text-sm text-ink-secondary">Add an app listing and track keywords to measure organic visibility.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ─── Org-Level Overview ─── */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Org Visibility Score */}
        <div className={`border p-4 ${orgVisibility != null ? getScoreBg(orgVisibility) : "border-rule bg-surface-card"}`}>
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Organization Visibility
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`font-mono text-3xl font-bold ${orgVisibility != null ? getScoreColor(orgVisibility) : "text-ink-muted"}`}>
              {orgVisibility ?? "—"}
            </span>
            {orgVisibility != null && (
              <span className="text-sm text-ink-secondary">/100 · {getScoreLabel(orgVisibility)}</span>
            )}
          </div>
          <p className="mt-1 text-[10px] text-ink-muted">
            Avg across {listings.filter((l) => l.visibility_score != null).length} app{listings.filter((l) => l.visibility_score != null).length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Total Keywords */}
        <div className="border border-rule bg-surface-card p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Total Keywords
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-ink">
              {listingData.reduce((s, d) => s + d.keywordCount, 0)}
            </span>
            <span className="text-sm text-ink-secondary">tracked</span>
          </div>
          <p className="mt-1 text-[10px] text-ink-muted">
            {listingData.reduce((s, d) => s + d.rankedCount, 0)} ranked in top 50
          </p>
        </div>

        {/* Total Search Volume */}
        <div className="border border-rule bg-surface-card p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Total Search Volume
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-ink">
              {listingData.reduce((s, d) => s + d.totalVolume, 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-ink-muted">
            {listingData.reduce((s, d) => s + Math.round(d.capturedVolume), 0).toLocaleString()} captured (weighted)
          </p>
        </div>

        {/* Calculate All CTA */}
        <div className="flex flex-col items-center justify-center border border-dashed border-rule bg-surface-card p-4">
          <Button
            variant="primary"
            size="sm"
            onClick={handleCalculateAll}
            disabled={actionId !== null || isActionRunning}
          >
            {actionId === "all" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Calculate All Apps
          </Button>
          <p className="mt-2 text-center text-[10px] text-ink-muted">
            Recalculate visibility for all {listings.length} app{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ─── Per-App Score Cards ─── */}
      <div>
        <h3 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Visibility by App
        </h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {listingData.map(({ listing, keywordCount, rankedCount, tiers, avgPosition, visibilityChange, visHistory }) => {
            const score = listing.visibility_score;
            const isSelected = listing.id === selectedListing;

            return (
              <button
                key={listing.id}
                type="button"
                onClick={() => setSelectedListing(listing.id)}
                className={`border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-editorial-red bg-editorial-red/5"
                    : "border-rule bg-surface-card hover:border-rule-dark"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {listing.icon_url ? (
                      <img src={listing.icon_url} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-lg border border-rule object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center border border-rule bg-surface-raised">
                        <Eye size={14} className="text-ink-muted" />
                      </div>
                    )}
                    <div>
                      <span className="block text-[13px] font-bold text-ink">{listing.app_name}</span>
                      <span className="text-[10px] text-ink-muted">
                        {listing.store === "apple" ? "App Store" : "Google Play"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`block font-mono text-xl font-bold ${score != null ? getScoreColor(score) : "text-ink-muted"}`}>
                      {score ?? "—"}
                    </span>
                    {visibilityChange != null && (
                      <span className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${
                        visibilityChange > 0 ? "text-editorial-green" : visibilityChange < 0 ? "text-editorial-red" : "text-ink-muted"
                      }`}>
                        {visibilityChange > 0 ? <ArrowUp size={10} /> : visibilityChange < 0 ? <ArrowDown size={10} /> : <Minus size={10} />}
                        {Math.abs(visibilityChange)} pts
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini tier bar */}
                <div className="mt-3 flex h-2 overflow-hidden">
                  {tiers.top3 > 0 && (
                    <div className="bg-editorial-green" style={{ width: `${(tiers.top3 / keywordCount) * 100}%` }} title={`Top 3: ${tiers.top3}`} />
                  )}
                  {tiers.top10 > 0 && (
                    <div className="bg-editorial-gold" style={{ width: `${(tiers.top10 / keywordCount) * 100}%` }} title={`Top 10: ${tiers.top10}`} />
                  )}
                  {tiers.top25 > 0 && (
                    <div className="bg-ink-secondary/40" style={{ width: `${(tiers.top25 / keywordCount) * 100}%` }} title={`Top 25: ${tiers.top25}`} />
                  )}
                  {tiers.top50 > 0 && (
                    <div className="bg-ink-muted/30" style={{ width: `${(tiers.top50 / keywordCount) * 100}%` }} title={`Top 50: ${tiers.top50}`} />
                  )}
                  {(tiers.low + tiers.unranked) > 0 && (
                    <div className="bg-editorial-red/20" style={{ width: `${((tiers.low + tiers.unranked) / keywordCount) * 100}%` }} title={`Low/Unranked: ${tiers.low + tiers.unranked}`} />
                  )}
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-ink-muted">
                  <span>{keywordCount} kw · {rankedCount} ranked</span>
                  {avgPosition != null && <span>Avg #{avgPosition}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Selected App Detail ─── */}
      {selectedData && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div className="flex items-center gap-3">
              {selectedData.listing.icon_url ? (
                <img src={selectedData.listing.icon_url} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-lg border border-rule object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center border border-rule bg-surface-raised">
                  <Eye size={18} className="text-ink-muted" />
                </div>
              )}
              <div>
                <h2 className="font-serif text-lg font-bold text-ink">{selectedData.listing.app_name}</h2>
                <span className="text-[11px] text-ink-muted">
                  Detailed visibility analysis · {selectedData.keywordCount} keywords tracked
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleCalculate(selectedData.listing.id)}
              disabled={actionId !== null || isActionRunning}
            >
              {actionId === selectedData.listing.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              {selectedData.listing.visibility_score != null ? "Recalculate" : "Calculate Score"}
            </Button>
          </div>

          {/* Stats Row */}
          <div className="grid gap-3 md:grid-cols-5">
            <div className="border border-rule bg-surface-card p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Score</span>
              <div className={`font-mono text-2xl font-bold ${selectedData.listing.visibility_score != null ? getScoreColor(selectedData.listing.visibility_score) : "text-ink-muted"}`}>
                {selectedData.listing.visibility_score ?? "—"}<span className="text-sm text-ink-muted">/100</span>
              </div>
            </div>
            <div className="border border-rule bg-surface-card p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keywords Ranked</span>
              <div className="font-mono text-2xl font-bold text-ink">
                {selectedData.rankedCount}<span className="text-sm text-ink-muted">/{selectedData.keywordCount}</span>
              </div>
            </div>
            <div className="border border-rule bg-surface-card p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Avg Position</span>
              <div className="font-mono text-2xl font-bold text-ink">
                {selectedData.avgPosition != null ? `#${selectedData.avgPosition}` : "—"}
              </div>
            </div>
            <div className="border border-rule bg-surface-card p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Search Volume</span>
              <div className="font-mono text-2xl font-bold text-ink">
                {selectedData.totalVolume.toLocaleString()}
              </div>
            </div>
            <div className="border border-rule bg-surface-card p-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Vol. Captured</span>
              <div className="font-mono text-2xl font-bold text-editorial-green">
                {Math.round(selectedData.capturedVolume).toLocaleString()}
              </div>
              <span className="text-[10px] text-ink-muted">
                {selectedData.totalVolume > 0 ? `${Math.round((selectedData.capturedVolume / selectedData.totalVolume) * 100)}%` : "0%"} of total
              </span>
            </div>
          </div>

          {/* Tier Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-rule bg-surface-card p-4">
              <h4 className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Ranking Distribution
              </h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Top 3", key: "top3" as const, icon: Trophy, color: "bg-editorial-green", textColor: "text-editorial-green" },
                  { label: "Top 10", key: "top10" as const, icon: Target, color: "bg-editorial-gold", textColor: "text-editorial-gold" },
                  { label: "Top 25", key: "top25" as const, icon: BarChart3, color: "bg-ink-secondary/40", textColor: "text-ink-secondary" },
                  { label: "Top 50", key: "top50" as const, icon: Search, color: "bg-ink-muted/30", textColor: "text-ink-muted" },
                  { label: "Not Ranked", key: "unranked" as const, icon: AlertTriangle, color: "bg-editorial-red/20", textColor: "text-editorial-red" },
                ].map(({ label, key, icon: Icon, color, textColor }) => {
                  const count = key === "unranked"
                    ? selectedData.tiers.unranked + selectedData.tiers.low
                    : selectedData.tiers[key];
                  const pct = selectedData.keywordCount > 0 ? (count / selectedData.keywordCount) * 100 : 0;

                  return (
                    <div key={key} className="flex items-center gap-3">
                      <Icon size={12} className={textColor} />
                      <span className="w-20 text-[11px] text-ink">{label}</span>
                      <div className="flex-1 h-2 bg-surface-raised">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono text-[11px] font-bold text-ink">{count}</span>
                      <span className="w-12 text-right font-mono text-[10px] text-ink-muted">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visibility Trend */}
            <div className="border border-rule bg-surface-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Visibility Trend (90 days)
                </h4>
                {selectedData.visibilityChange != null && (
                  <span className={`flex items-center gap-0.5 text-[11px] font-bold ${
                    selectedData.visibilityChange > 0 ? "text-editorial-green" : selectedData.visibilityChange < 0 ? "text-editorial-red" : "text-ink-muted"
                  }`}>
                    {selectedData.visibilityChange > 0 ? <TrendingUp size={12} /> : selectedData.visibilityChange < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                    {selectedData.visibilityChange > 0 ? "+" : ""}{selectedData.visibilityChange} pts
                  </span>
                )}
              </div>
              <AsoVisibilityTrendChart
                data={selectedData.visHistory.map((v) => ({
                  date: v.snapshot_date,
                  visibility_score: v.visibility_score,
                }))}
                height={160}
                showAxis
              />
            </div>
          </div>

          {/* ─── Keyword Breakdown Table ─── */}
          <div className="border border-rule bg-surface-card">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                Keyword Contribution Breakdown
              </h4>
              <div className="flex items-center gap-2">
                {/* Filter */}
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="h-7 border border-rule bg-surface-card px-2 text-[10px] text-ink focus:border-editorial-red focus:outline-none"
                >
                  <option value="all">All Tiers</option>
                  <option value="top3">Top 3</option>
                  <option value="top10">Top 10</option>
                  <option value="top25">Top 25</option>
                  <option value="unranked">Not Ranked</option>
                </select>
              </div>
            </div>

            {keywordRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Sparkles size={24} className="mb-2 text-ink-muted" />
                <p className="text-sm text-ink-secondary">
                  {selectedData.keywordCount === 0
                    ? "No keywords tracked yet. Generate keywords from the Overview tab."
                    : "Click \"Calculate Score\" to see keyword contributions."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-rule bg-surface-raised">
                      <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">#</th>
                      <SortableHeader label="Keyword" sortKey="keyword" currentSort={visSortKey} currentDir={visSortDir} onSort={toggleVisSort} className="px-4 py-2" />
                      <SortableHeader label="Position" sortKey="position" currentSort={visSortKey} currentDir={visSortDir} onSort={toggleVisSort} className="px-4 py-2 text-right" />
                      <SortableHeader label="Search Vol" sortKey="search_volume" currentSort={visSortKey} currentDir={visSortDir} onSort={toggleVisSort} className="px-4 py-2 text-right" />
                      <SortableHeader label="Weight" sortKey="weight" currentSort={visSortKey} currentDir={visSortDir} onSort={toggleVisSort} className="px-4 py-2 text-right" />
                      <SortableHeader label="Contribution" sortKey="contribution_pct" currentSort={visSortKey} currentDir={visSortDir} onSort={toggleVisSort} className="px-4 py-2" />
                      <SortableHeader label="% Share" sortKey="contribution_pct" currentSort={visSortKey} currentDir={visSortDir} onSort={toggleVisSort} className="px-4 py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {keywordRows.map((row, idx) => (
                      <tr key={`${row.keyword}-${idx}`} className="border-b border-rule/50 transition-colors hover:bg-surface-raised">
                        <td className="px-4 py-2 font-mono text-ink-muted">{idx + 1}</td>
                        <td className="px-4 py-2 font-medium text-ink">{row.keyword}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={`font-mono font-bold ${row.tier.color}`}>
                            {row.position != null ? `#${row.position}` : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-ink-secondary">
                          {row.search_volume.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-ink-secondary">
                          {(row.weight * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 bg-surface-raised">
                              <div
                                className="h-full bg-editorial-red"
                                style={{ width: `${Math.min(100, row.contribution_pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-bold text-ink">
                          {row.contribution_pct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-rule px-4 py-2 text-[10px] text-ink-muted">
                  Showing {keywordRows.length} keyword{keywordRows.length !== 1 ? "s" : ""}
                  {filterTier !== "all" ? ` (filtered: ${filterTier})` : ""}
                </div>
              </div>
            )}
          </div>

          {/* ─── How to Improve ─── */}
          {(() => {
            const d = selectedData;
            const score = d.listing.visibility_score ?? 0;
            const capturePct = d.totalVolume > 0 ? Math.round((d.capturedVolume / d.totalVolume) * 100) : 0;

            // Find near-miss keywords (positions 4-10 with volume)
            const nearMiss = d.deduped
              .filter((r) => r.position != null && r.position >= 4 && r.position <= 10 && (r.search_volume ?? 0) > 0)
              .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
              .slice(0, 3);

            // Find high-value unranked (high volume, not ranking)
            const highValueUnranked = d.deduped
              .filter((r) => (r.position == null || r.position > 50) && (r.search_volume ?? 0) > 0)
              .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
              .slice(0, 3);

            // Find "almost there" keywords (positions 11-25 with decent volume)
            const almostThere = d.deduped
              .filter((r) => r.position != null && r.position >= 11 && r.position <= 25 && (r.search_volume ?? 0) > 500)
              .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
              .slice(0, 3);

            // Determine targets
            const targetScore = Math.min(100, score + (score < 20 ? 15 : score < 50 ? 10 : 5));
            const targetRanked = Math.min(d.keywordCount, d.rankedCount + Math.max(3, Math.round(d.keywordCount * 0.1)));
            const targetAvgPos = d.avgPosition != null ? Math.max(1, Math.round(d.avgPosition * 0.8)) : null;
            const targetCapture = Math.min(100, capturePct + 10);

            // Build 6 recommendation cards algorithmically
            type RecCard = {
              metric: string;
              icon: typeof Eye;
              priority: "high" | "medium" | "low";
              current: string;
              target: string;
              actions: string[];
            };

            const cards: RecCard[] = [
              {
                metric: "Visibility Score",
                icon: Eye,
                priority: score < 20 ? "high" : score < 50 ? "medium" : "low",
                current: `${score}/100`,
                target: `${targetScore}/100`,
                actions: [
                  score < 20
                    ? "Your visibility is critical. Focus on getting at least 5 keywords into the top 10 by including them in your app title and subtitle."
                    : score < 50
                      ? "Improve rankings on your highest-volume keywords. Moving a keyword from #15 to #5 can 3x its visibility contribution."
                      : "Maintain current positions and expand to new keyword categories to keep growing.",
                  nearMiss.length > 0
                    ? `Push near-miss keywords to top 3: ${nearMiss.map((k) => `"${k.keyword}" (#${k.position})`).join(", ")}`
                    : "Generate more keywords from the Overview tab to find new ranking opportunities.",
                  "Update your app description with natural keyword usage. Each keyword should appear 2-3 times.",
                ],
              },
              {
                metric: "Keywords Ranked",
                icon: Search,
                priority: d.rankedCount / d.keywordCount < 0.5 ? "high" : d.rankedCount / d.keywordCount < 0.8 ? "medium" : "low",
                current: `${d.rankedCount}/${d.keywordCount}`,
                target: `${targetRanked}/${d.keywordCount}`,
                actions: [
                  highValueUnranked.length > 0
                    ? `High-volume keywords not ranking: ${highValueUnranked.map((k) => `"${k.keyword}" (${(k.search_volume ?? 0).toLocaleString()} vol)`).join(", ")}. Add these to your title or subtitle.`
                    : `${d.tiers.unranked + d.tiers.low} keywords are not ranking. Add them to your app's keyword field or weave them into your description.`,
                  d.listing.store === "apple"
                    ? "Use all 100 characters of the Apple keyword field. Separate keywords with commas, no spaces."
                    : "Google Play indexes your full description. Use target keywords naturally throughout, especially in the first 2 lines.",
                  "Track competitor apps to discover what keywords they rank for that you don't.",
                ],
              },
              {
                metric: "Average Position",
                icon: TrendingUp,
                priority: (d.avgPosition ?? 99) > 30 ? "high" : (d.avgPosition ?? 99) > 15 ? "medium" : "low",
                current: d.avgPosition != null ? `#${d.avgPosition}` : "N/A",
                target: targetAvgPos != null ? `#${targetAvgPos}` : "N/A",
                actions: [
                  almostThere.length > 0
                    ? `Keywords close to page 1: ${almostThere.map((k) => `"${k.keyword}" (#${k.position}, ${(k.search_volume ?? 0).toLocaleString()} vol)`).join(", ")}. These need a small push.`
                    : "Focus your title optimization on your top 3-5 highest volume keywords to move them up.",
                  "Increase your app's download velocity — more installs from search signals relevance to the store algorithm.",
                  "Respond to all reviews (positive and negative). Engagement signals improve rankings.",
                  "Release updates regularly with keyword-rich release notes. Fresh apps rank better.",
                ],
              },
              {
                metric: "Search Volume",
                icon: BarChart3,
                priority: d.totalVolume < 50000 ? "medium" : "low",
                current: d.totalVolume.toLocaleString(),
                target: `${Math.round(d.totalVolume * 1.3).toLocaleString()}+`,
                actions: [
                  "Research competitor keywords using the Competitors tab — they may rank for high-volume terms you're missing.",
                  d.keywordCount < 20
                    ? `Only tracking ${d.keywordCount} keywords. Use "Gen Keywords" on the Overview tab to discover more opportunities.`
                    : "Expand into related keyword categories. If you track 'nba scores', also target 'basketball highlights', 'nba stats', etc.",
                  "Look for trending and seasonal keywords in your category that have high search volume but low competition.",
                ],
              },
              {
                metric: "Volume Captured",
                icon: Target,
                priority: capturePct < 10 ? "high" : capturePct < 30 ? "medium" : "low",
                current: `${capturePct}% (${Math.round(d.capturedVolume).toLocaleString()})`,
                target: `${targetCapture}%`,
                actions: [
                  capturePct < 10
                    ? "You're capturing less than 10% of available search traffic. This means most users searching for your keywords never see your app."
                    : `Currently capturing ${capturePct}% of ${d.totalVolume.toLocaleString()} total monthly searches.`,
                  nearMiss.length > 0
                    ? `Biggest opportunity: moving ${nearMiss.map((k) => `"${k.keyword}"`).join(", ")} to top 3 would significantly increase captured volume.`
                    : "Improve your conversion rate (screenshots, icon, ratings) — higher conversion improves rankings which captures more volume.",
                  "A/B test your app icon and first 3 screenshots. Better conversion rate → more installs → better rankings → more visibility.",
                ],
              },
              {
                metric: "Quick Wins",
                icon: Zap,
                priority: "high",
                current: "—",
                target: "This week",
                actions: [
                  nearMiss.length > 0
                    ? `Quick win: "${nearMiss[0].keyword}" is at #${nearMiss[0].position} — adding it to your subtitle could push it to top 3.`
                    : "Update your app subtitle/short description to include your highest-volume unranked keyword.",
                  "Reply to your 5 most recent reviews to boost engagement signals.",
                  "Update your screenshots to highlight features related to your top keywords.",
                  d.listing.store === "apple"
                    ? "Rearrange your Apple keyword field — put highest-priority keywords first."
                    : "Add your top keywords to the first sentence of your Google Play description.",
                ],
              },
            ];

            const aiRecs = recommendations[d.listing.id];

            return (
              <div className="border border-rule bg-surface-card">
                <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                  <div>
                    <h4 className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      How to Improve
                    </h4>
                    <p className="mt-0.5 text-[10px] text-ink-secondary">
                      {aiRecs ? "AI-powered recommendations" : "Data-driven recommendations"} based on your keyword data
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGetRecommendations(d.listing.id)}
                    disabled={recsLoading || actionId !== null || isActionRunning}
                  >
                    {recsLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {aiRecs ? "Refresh AI Analysis" : "Enhance with AI"}
                  </Button>
                </div>

                <div className="divide-y divide-rule">
                  {(aiRecs ?? cards).map((rec, idx) => {
                    const priorityColors = {
                      high: "border-editorial-red/40 bg-editorial-red/5",
                      medium: "border-editorial-gold/40 bg-editorial-gold/5",
                      low: "border-editorial-green/40 bg-editorial-green/5",
                    };
                    const priorityText = {
                      high: "text-editorial-red",
                      medium: "text-editorial-gold",
                      low: "text-editorial-green",
                    };
                    const metricIcons: Record<string, typeof Eye> = {
                      "Visibility Score": Eye,
                      "Keywords Ranked": Search,
                      "Average Position": TrendingUp,
                      "Search Volume": BarChart3,
                      "Volume Captured": Target,
                      "Quick Wins": Zap,
                    };
                    const Icon: typeof Eye = "icon" in rec && rec.icon ? (rec.icon as typeof Eye) : (metricIcons[rec.metric] ?? Sparkles);

                    return (
                      <div key={idx} className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border ${priorityColors[rec.priority]}`}>
                            <Icon size={16} className={priorityText[rec.priority]} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-bold text-ink">{rec.metric}</span>
                              <span className={`border px-1.5 py-0.5 text-[9px] font-bold uppercase ${priorityColors[rec.priority]} ${priorityText[rec.priority]}`}>
                                {rec.priority}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                              <span className="text-[11px] text-ink-muted">Current:</span>
                              <span className="font-mono text-[11px] font-bold text-ink">{rec.current}</span>
                              <ChevronRight size={12} className="text-ink-muted" />
                              <span className="text-[11px] text-ink-muted">Target:</span>
                              <span className="font-mono text-[11px] font-bold text-editorial-green">{rec.target}</span>
                            </div>
                            <div className="mt-2 flex flex-col gap-1.5">
                              {rec.actions.map((action, actionIdx) => (
                                <div key={actionIdx} className="flex items-start gap-2">
                                  <CheckCircle size={12} className="mt-0.5 shrink-0 text-ink-muted" />
                                  <span className="text-[11px] text-ink-secondary">{action}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
