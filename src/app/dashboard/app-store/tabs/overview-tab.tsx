"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Apple,
  Smartphone,
  RefreshCw,
  Trash2,
  Sparkles,
  BarChart3,
  Loader2,
  Users,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AsoRatingTrendChart } from "@/components/charts/aso-rating-trend-chart";
import {
  refreshAppListing,
  analyzeAppListing,
  generateAppKeywords,
} from "@/lib/actions/app-store";
import { discoverCompetitors } from "@/lib/actions/app-store-competitors";
import type { AppStoreListing } from "@/types";
import type { AppStoreSnapshot, AppStoreCompetitor, AppStoreRanking } from "@/lib/dal/app-store";

/** Module-level timestamp — avoids impure Date.now() inside render */
const MODULE_NOW = Date.now();

interface OverviewTabProps {
  listings: AppStoreListing[];
  rankings: AppStoreRanking[];
  snapshots: AppStoreSnapshot[];
  competitors: AppStoreCompetitor[];
  onDelete: (id: string, name: string) => void;
  onStatusMsg: (msg: string) => void;
}

function renderStars(rating: number) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={12}
          className={
            star <= Math.round(rating)
              ? "fill-editorial-gold text-editorial-gold"
              : "text-rule"
          }
        />
      ))}
    </span>
  );
}

export function OverviewTab({
  listings,
  rankings,
  snapshots,
  competitors,
  onDelete,
  onStatusMsg,
}: OverviewTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [asoResults, setAsoResults] = useState<Record<string, { score: number; recs: string[] }>>({});

  function handleRefresh(listingId: string) {
    setActionId(listingId);
    startTransition(async () => {
      const result = await refreshAppListing(listingId);
      if ("error" in result) onStatusMsg(`Error: ${result.error}`);
      else {
        onStatusMsg("App data refreshed from store.");
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleAnalyze(listingId: string) {
    setActionId(listingId);
    startTransition(async () => {
      const result = await analyzeAppListing(listingId);
      if ("error" in result) onStatusMsg(`Error: ${result.error}`);
      else {
        setAsoResults((prev) => ({ ...prev, [listingId]: { score: result.score, recs: result.recommendations } }));
        onStatusMsg(`ASO Score: ${result.score}/100`);
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleGenerateKeywords(listingId: string) {
    setActionId(listingId);
    startTransition(async () => {
      const result = await generateAppKeywords(listingId);
      if ("error" in result) onStatusMsg(`Error: ${result.error}`);
      else {
        onStatusMsg(`Generated ${result.keywords.length} keywords`);
        router.refresh();
      }
      setActionId(null);
    });
  }

  function handleDiscoverCompetitors(listingId: string) {
    setActionId(listingId);
    startTransition(async () => {
      const result = await discoverCompetitors(listingId);
      if ("error" in result) onStatusMsg(`Error: ${result.error}`);
      else {
        onStatusMsg(`Discovered ${result.discovered.length} potential competitors`);
        router.refresh();
      }
      setActionId(null);
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {listings.map((listing) => {
        const listingRankings = rankings.filter((r) => r.listing_id === listing.id);
        const uniqueKeywords = new Set(listingRankings.map((r) => r.keyword));
        const listingSnapshots = snapshots.filter((s) => s.listing_id === listing.id);
        const listingCompetitors = competitors.filter((c) => c.listing_id === listing.id);
        const aso = asoResults[listing.id] ?? (listing.aso_score ? { score: listing.aso_score, recs: [] } : null);

        // Best/worst keyword
        const rankedKeywords = listingRankings.filter((r) => r.position != null).sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
        const bestKeyword = rankedKeywords[0];
        const worstKeyword = rankedKeywords[rankedKeywords.length - 1];

        // Days since last update (clamped to >= 0 to avoid hydration mismatch)
        const daysSinceUpdate = listing.last_updated
          ? Math.max(0, Math.floor((MODULE_NOW - new Date(listing.last_updated).getTime()) / 86400000))
          : null;

        return (
          <div key={listing.id} className="group border border-rule bg-surface-card transition-colors hover:border-rule-dark">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-rule p-4">
              <div className="flex items-center gap-3">
                {listing.icon_url ? (
                  <img src={listing.icon_url} alt={listing.app_name} referrerPolicy="no-referrer" className="h-12 w-12 rounded-lg border border-rule object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center border border-rule bg-surface-raised">
                    {listing.store === "apple" ? <Apple size={22} className="text-ink" /> : <Smartphone size={22} className="text-editorial-green" />}
                  </div>
                )}
                <div>
                  <h3 className="font-serif text-[15px] font-bold text-ink">{listing.app_name}</h3>
                  <span className="text-[11px] text-ink-muted">
                    {listing.developer ? `${listing.developer} · ` : ""}
                    {listing.store === "apple" ? "App Store" : "Google Play"}
                    {listing.current_version ? ` · v${listing.current_version}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" title="Refresh from store" onClick={() => handleRefresh(listing.id)} disabled={actionId === listing.id} className="rounded p-1 text-ink-muted transition-colors hover:text-editorial-green">
                  {actionId === listing.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                </button>
                <button type="button" title="Delete listing" onClick={() => onDelete(listing.id, listing.app_name)} disabled={actionId === listing.id} className="rounded p-1 text-ink-muted transition-colors hover:text-editorial-red">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-4 divide-x divide-rule border-b border-rule">
              <div className="px-3 py-2.5 text-center">
                <span className="block font-mono text-lg font-bold text-ink">
                  {listing.rating != null ? listing.rating.toFixed(1) : "—"}
                </span>
                <div className="flex items-center justify-center gap-1">
                  {listing.rating != null && renderStars(listing.rating)}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Rating</span>
              </div>
              <div className="px-3 py-2.5 text-center">
                <span className="block font-mono text-lg font-bold text-ink">{listing.reviews_count?.toLocaleString() ?? "—"}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Reviews</span>
              </div>
              <div className="px-3 py-2.5 text-center">
                <span className="block font-mono text-lg font-bold text-ink">{listing.downloads_estimate?.toLocaleString() ?? "—"}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Downloads</span>
              </div>
              <div className="px-3 py-2.5 text-center">
                <span className="block font-mono text-lg font-bold text-ink">{uniqueKeywords.size}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">Keywords</span>
              </div>
            </div>

            {/* Rating Trend Sparkline */}
            {listingSnapshots.length > 1 && (
              <div className="border-b border-rule px-4 py-3">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Rating Trend</span>
                <AsoRatingTrendChart
                  data={listingSnapshots.map((s) => ({ date: s.snapshot_date, rating: s.rating }))}
                  height={60}
                  showAxis={false}
                />
              </div>
            )}

            {/* Health Stats */}
            <div className="grid grid-cols-3 gap-2 border-b border-rule px-4 py-3">
              {aso && (
                <div className="flex items-center gap-1.5">
                  <BarChart3 size={12} className={aso.score >= 70 ? "text-editorial-green" : aso.score >= 40 ? "text-editorial-gold" : "text-editorial-red"} />
                  <span className="font-mono text-[11px] font-bold">{aso.score}/100</span>
                  <span className="text-[9px] text-ink-muted">ASO</span>
                </div>
              )}
              {listingCompetitors.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users size={12} className="text-ink-muted" />
                  <span className="font-mono text-[11px] font-bold">{listingCompetitors.length}</span>
                  <span className="text-[9px] text-ink-muted">Competitors</span>
                </div>
              )}
              {daysSinceUpdate != null && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className={daysSinceUpdate > 90 ? "text-editorial-red" : "text-ink-muted"} />
                  <span className="font-mono text-[11px] font-bold">{daysSinceUpdate}d</span>
                  <span className="text-[9px] text-ink-muted">Since Update</span>
                </div>
              )}
            </div>

            {/* Quick Keyword Info */}
            {(bestKeyword || worstKeyword) && (
              <div className="border-b border-rule px-4 py-2.5">
                {bestKeyword && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ink-muted">Best keyword:</span>
                    <span className="font-mono text-[11px]">
                      <span className="text-ink">{bestKeyword.keyword}</span>
                      <span className="ml-1 font-bold text-editorial-green">#{bestKeyword.position}</span>
                    </span>
                  </div>
                )}
                {worstKeyword && worstKeyword.keyword !== bestKeyword?.keyword && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-ink-muted">Weakest keyword:</span>
                    <span className="font-mono text-[11px]">
                      <span className="text-ink">{worstKeyword.keyword}</span>
                      <span className="ml-1 font-bold text-ink-secondary">#{worstKeyword.position}</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 p-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleGenerateKeywords(listing.id)} disabled={actionId === listing.id}>
                {actionId === listing.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Gen Keywords
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleAnalyze(listing.id)} disabled={actionId === listing.id}>
                {actionId === listing.id ? <Loader2 size={12} className="animate-spin" /> : <BarChart3 size={12} />}
                ASO Score
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDiscoverCompetitors(listing.id)} disabled={actionId === listing.id}>
                {actionId === listing.id ? <Loader2 size={12} className="animate-spin" /> : <Users size={12} />}
                Discover
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
