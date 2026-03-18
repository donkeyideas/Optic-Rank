"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useToast } from "@/components/shared/toast";
import {
  GitBranch,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Lightbulb,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AiMarkdown } from "@/components/shared/ai-markdown";
import { AsoUpdateImpactChart } from "@/components/charts/aso-update-impact-chart";
import {
  analyzeUpdateImpact,
  getUpdateRecommendations,
} from "@/lib/actions/app-store-versions";
import type { AppStoreListing } from "@/types";
import type { AppStoreVersion, AppStoreSnapshot } from "@/lib/dal/app-store";

interface UpdateImpactTabProps {
  listings: AppStoreListing[];
  versions: AppStoreVersion[];
  snapshots: AppStoreSnapshot[];
}

export function UpdateImpactTab({ listings, versions, snapshots }: UpdateImpactTabProps) {
  const { toast } = useToast();
  const [selectedListing, setSelectedListing] = useState<string>(listings[0]?.id ?? "");
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [impactAnalysis, setImpactAnalysis] = useState<Record<string, string>>({});
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const listingVersions = versions.filter((v) => v.listing_id === selectedListing);
  const listingSnapshots = snapshots.filter((s) => s.listing_id === selectedListing);
  const autoLoaded = useRef(false);

  // Auto-load recommendations + analyze all versions on mount
  useEffect(() => {
    if (autoLoaded.current || !selectedListing || listings.length === 0) return;
    autoLoaded.current = true;

    const versionIds = versions
      .filter((v) => v.listing_id === selectedListing)
      .map((v) => v.id);

    startTransition(async () => {
      setActionId("auto");

      // Run recommendations + all version analyses in parallel
      const promises: Promise<void>[] = [
        getUpdateRecommendations(selectedListing).then((r) => {
          if ("recommendations" in r) setRecommendations(r.recommendations);
        }),
        ...versionIds.map((vid) =>
          analyzeUpdateImpact(selectedListing, vid).then((r) => {
            if ("analysis" in r)
              setImpactAnalysis((prev) => ({ ...prev, [vid]: r.analysis }));
          })
        ),
      ];

      try {
        await Promise.all(promises);
      } catch {
        // Non-critical
      }
      setActionId(null);
    });
  }, [selectedListing, listings.length, versions]);

  function handleAnalyzeVersion(versionId: string) {
    setActionId(versionId);
    startTransition(async () => {
      const result = await analyzeUpdateImpact(selectedListing, versionId);
      if ("analysis" in result) setImpactAnalysis((prev) => ({ ...prev, [versionId]: result.analysis }));
      setActionId(null);
    });
  }

  function handleRecommendations() {
    setActionId("recs");
    startTransition(async () => {
      const result = await getUpdateRecommendations(selectedListing);
      if ("recommendations" in result) {
        setRecommendations(result.recommendations);
      } else {
        setRecommendations(null);
        toast(result.error, "error");
      }
      setActionId(null);
    });
  }

  if (listings.length === 0) {
    return <EmptyState icon={GitBranch} title="No Apps to Track" description="Add an app listing to start tracking version updates." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Selector */}
      <div className="flex items-center gap-3 border-b border-rule pb-3">
        <select
          value={selectedListing}
          onChange={(e) => setSelectedListing(e.target.value)}
          className="h-9 flex-1 border border-rule bg-surface-card px-3 font-sans text-sm text-ink focus:border-editorial-red focus:outline-none"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>{l.app_name} — v{l.current_version ?? "?"}</option>
          ))}
        </select>
        <Button variant="primary" size="sm" onClick={handleRecommendations} disabled={actionId === "recs"}>
          {actionId === "recs" ? <Loader2 size={12} className="animate-spin" /> : <Lightbulb size={12} />}
          Next Update Ideas
        </Button>
      </div>

      {/* Impact Chart */}
      <div className="border border-rule bg-surface-card p-4">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Rating & Reviews Over Time (with version markers)
        </span>
        <div className="mt-3">
          <AsoUpdateImpactChart
            snapshots={listingSnapshots.map((s) => ({
              date: s.snapshot_date,
              rating: s.rating,
              reviews_count: s.reviews_count,
            }))}
            versions={listingVersions.map((v) => ({
              date: v.detected_at?.split("T")[0] ?? "",
              version: v.version,
            }))}
            height={250}
          />
        </div>
      </div>

      {/* Update Recommendations */}
      {recommendations && (
        <div className="border border-editorial-green/30 bg-editorial-green/5 p-5">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-editorial-green" />
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">
              Recommendations for Next Update
            </span>
          </div>
          <AiMarkdown content={recommendations} className="mt-3 font-sans text-[12px] leading-relaxed" />
        </div>
      )}

      {/* Version Timeline */}
      <ColumnHeader title="Version History" subtitle={`${listingVersions.length} versions tracked`} />

      {listingVersions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <GitBranch size={32} className="text-ink-muted" />
          <span className="text-[12px] text-ink-muted">
            Version history will populate as you refresh your app data.
            <br />
            Each refresh checks for version changes and logs them here.
          </span>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 h-full w-px bg-rule" />

          {listingVersions.map((version, i) => {
            const analysis = impactAnalysis[version.id];

            // Calculate deltas from previous version
            const prevVersion = i < listingVersions.length - 1 ? listingVersions[i + 1] : null;
            const ratingDelta = prevVersion
              ? ((version.rating_at_release ?? 0) - (prevVersion.rating_at_release ?? 0))
              : 0;
            const reviewsDelta = prevVersion
              ? ((version.reviews_at_release ?? 0) - (prevVersion.reviews_at_release ?? 0))
              : 0;

            return (
              <div key={version.id} className="relative mb-4 ml-10">
                {/* Timeline dot */}
                <div className={`absolute -left-[29px] top-3 h-4 w-4 border-2 ${
                  i === 0 ? "border-editorial-red bg-editorial-red" : "border-rule bg-surface-card"
                }`} style={{ borderRadius: "50%" }} />

                <div className="border border-rule bg-surface-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif text-[15px] font-bold text-ink">v{version.version}</h4>
                      <span className="text-[11px] text-ink-muted">
                        {version.detected_at ? new Date(version.detected_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown date"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalyzeVersion(version.id)}
                      disabled={actionId === version.id}
                    >
                      {actionId === version.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                      Analyze Impact
                    </Button>
                  </div>

                  {/* Metrics at release */}
                  <div className="mt-3 flex gap-4">
                    {version.rating_at_release != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-ink-muted">Rating:</span>
                        <span className="font-mono text-sm font-bold text-ink">{version.rating_at_release}</span>
                        {ratingDelta !== 0 && (
                          <span className={`flex items-center font-mono text-[10px] font-bold ${ratingDelta > 0 ? "text-editorial-green" : "text-editorial-red"}`}>
                            {ratingDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {ratingDelta > 0 ? "+" : ""}{ratingDelta.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                    {version.reviews_at_release != null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-ink-muted">Reviews:</span>
                        <span className="font-mono text-sm font-bold text-ink">{version.reviews_at_release.toLocaleString()}</span>
                        {reviewsDelta > 0 && (
                          <span className="font-mono text-[10px] text-editorial-green">+{reviewsDelta}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Release notes */}
                  {version.release_notes && (
                    <div className="mt-3 border-t border-rule pt-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Release Notes</span>
                      <p className="mt-1 font-sans text-[11px] leading-relaxed text-ink-secondary">{version.release_notes}</p>
                    </div>
                  )}

                  {/* AI Impact Analysis */}
                  {analysis && (
                    <div className="mt-3 border-t border-rule pt-2">
                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">AI Impact Analysis</span>
                      <AiMarkdown content={analysis} className="mt-1 font-sans text-[11px] leading-relaxed" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
