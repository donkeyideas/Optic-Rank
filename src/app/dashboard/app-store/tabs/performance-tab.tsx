"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Activity,
  Zap,
  AlertTriangle,
  Bug,
  Link as LinkIcon,
  Settings,
  Gauge,
  Wifi,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ColumnHeader } from "@/components/editorial/column-header";
import { StatCard } from "@/components/editorial/stat-card";
import { AppSelectorStrip } from "@/components/app-store/app-selector-strip";
import { AiMarkdown } from "@/components/shared/ai-markdown";
import { Button } from "@/components/ui/button";
import { AsoCwvTrendChart } from "@/components/charts/aso-cwv-trend-chart";
import {
  getCwvRating,
  getVitalsRating,
  formatCwvValue,
  CWV_THRESHOLDS,
} from "@/lib/app-store/cwv-thresholds";
import {
  classifyPerformanceReviews,
  computePerformanceScore,
  getPerformanceBreakdown,
  CATEGORY_LABELS,
  type PerfCategory,
} from "@/lib/app-store/performance";
import { runPageSpeedTest, runPerformanceAudit } from "@/lib/actions/app-store-performance";
import type { PerformanceAuditResult } from "@/lib/actions/app-store-performance";
import type { AppStoreListing } from "@/types";
import type {
  AppReview,
  ReviewTopic,
  AppStoreSnapshot,
  AppStoreCwv,
  AppStoreVitals,
} from "@/lib/dal/app-store";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface PerformanceTabProps {
  listings: AppStoreListing[];
  reviews: AppReview[];
  topics: ReviewTopic[];
  snapshots: AppStoreSnapshot[];
  cwvData: AppStoreCwv[];
  vitalsData: AppStoreVitals[];
  projectId: string;
  googlePlayConnected: boolean;
}

/* ------------------------------------------------------------------
   Category chart colors
   ------------------------------------------------------------------ */

const CAT_COLORS: Record<PerfCategory, string> = {
  crashes: "var(--color-editorial-red, #c0392b)",
  speed: "var(--color-editorial-gold, #b8860b)",
  battery: "#e67e22",
  ui_bugs: "#8e44ad",
};

/* ------------------------------------------------------------------
   Keyword highlighter for review text
   ------------------------------------------------------------------ */

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length) return <>{text}</>;
  const pattern = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        keywords.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-editorial-red/15 px-0.5 font-semibold text-editorial-red">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function PerformanceTab({
  listings,
  reviews,
  topics,
  snapshots,
  cwvData,
  vitalsData,
  projectId: _projectId,
  googlePlayConnected,
}: PerformanceTabProps) {
  const [selected, setSelected] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<PerformanceAuditResult | null>(null);
  const [isAuditing, startAuditTransition] = useTransition();
  const [catFilter, setCatFilter] = useState<PerfCategory | "all">("all");

  // Filter data by selected listing
  const filteredReviews = selected === "all" ? reviews : reviews.filter((r) => r.listing_id === selected);
  const filteredTopics = selected === "all" ? topics : topics.filter((t) => t.listing_id === selected);
  const filteredSnapshots = selected === "all" ? snapshots : snapshots.filter((s) => s.listing_id === selected);
  const filteredCwv = selected === "all" ? cwvData : cwvData.filter((c) => c.listing_id === selected);
  const filteredVitals = selected === "all" ? vitalsData : vitalsData.filter((v) => v.listing_id === selected);

  // Get latest CWV per listing for stat cards
  const latestCwv = useMemo(() => {
    const map = new Map<string, AppStoreCwv>();
    for (const c of cwvData) {
      const existing = map.get(c.listing_id);
      if (!existing || c.tested_at > existing.tested_at) {
        map.set(c.listing_id, c);
      }
    }
    return map;
  }, [cwvData]);

  // The CWV to display (selected listing or aggregate)
  const displayCwv = useMemo((): AppStoreCwv | null => {
    if (selected !== "all") return latestCwv.get(selected) ?? null;
    const all = Array.from(latestCwv.values());
    if (all.length === 0) return null;
    const avg = (key: keyof AppStoreCwv) => {
      const vals = all.map((c) => c[key] as number | null).filter((v): v is number => v != null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    return {
      id: "aggregate",
      listing_id: "all",
      strategy: "mobile",
      url_tested: "",
      performance_score: avg("performance_score") != null ? Math.round(avg("performance_score")!) : null,
      accessibility_score: avg("accessibility_score") != null ? Math.round(avg("accessibility_score")!) : null,
      lcp_ms: avg("lcp_ms"),
      fcp_ms: avg("fcp_ms"),
      cls: avg("cls"),
      inp_ms: avg("inp_ms"),
      ttfb_ms: avg("ttfb_ms"),
      speed_index: avg("speed_index"),
      total_blocking_time: avg("total_blocking_time"),
      field_lcp_ms: avg("field_lcp_ms"),
      field_cls: avg("field_cls"),
      field_inp_ms: avg("field_inp_ms"),
      field_fcp_ms: avg("field_fcp_ms"),
      field_ttfb_ms: avg("field_ttfb_ms"),
      field_category: null,
      tested_at: all[0]?.tested_at ?? "",
    };
  }, [selected, latestCwv]);

  // Latest vitals for selected listing
  const latestVitals = useMemo(() => {
    const relevant = [...filteredVitals].sort((a, b) => b.snapshot_date.localeCompare(a.snapshot_date));
    return relevant[0] ?? null;
  }, [filteredVitals]);

  // Review intelligence computations
  const perfReviews = useMemo(() => classifyPerformanceReviews(filteredReviews), [filteredReviews]);
  const perfScore = useMemo(
    () => computePerformanceScore(filteredReviews, perfReviews, filteredTopics, filteredSnapshots),
    [filteredReviews, perfReviews, filteredTopics, filteredSnapshots]
  );
  const breakdown = useMemo(() => getPerformanceBreakdown(perfReviews), [perfReviews]);

  const hasGoogleListings = listings.some((l) => l.store === "google");
  const selectedListing = selected !== "all" ? listings.find((l) => l.id === selected) : null;

  function handleRunTest(listingId: string) {
    setTestingId(listingId);
    startTransition(async () => {
      await runPageSpeedTest(listingId);
      setTestingId(null);
    });
  }

  function handleRunAudit() {
    const targetId = selected !== "all" ? selected : listings[0]?.id;
    if (!targetId) return;
    startAuditTransition(async () => {
      const result = await runPerformanceAudit(targetId);
      if ("success" in result) setAuditResult(result.audit);
    });
  }

  // Filtered perf reviews by category
  const displayReviews = catFilter === "all"
    ? perfReviews
    : perfReviews.filter((r) => r.perfCategories.includes(catFilter));

  return (
    <div className="flex flex-col gap-8">
      <AppSelectorStrip listings={listings} selected={selected} onSelect={setSelected} showAll />

      {/* ────────────────────────────────────────────────────────
          SECTION 1: Mobile Web Performance (PageSpeed)
          ──────────────────────────────────────────────────────── */}
      <section>
        <ColumnHeader
          title="Mobile Web Performance"
          subtitle="Real Lighthouse metrics via PageSpeed Insights"
        />

        {displayCwv && displayCwv.performance_score != null ? (
          <div className="mt-4 flex flex-col gap-4">
            {/* Primary CWV metrics */}
            <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-5">
              <StatCard
                label="Performance"
                value={displayCwv.performance_score ?? "—"}
                delta="/100"
                direction={
                  (displayCwv.performance_score ?? 0) >= 90 ? "up" : (displayCwv.performance_score ?? 0) >= 50 ? "neutral" : "down"
                }
                highlight
                className="bg-surface-card"
              />
              {(["lcp_ms", "fcp_ms", "cls", "inp_ms"] as const).map((key) => {
                const val = displayCwv[key];
                if (val == null) return <StatCard key={key} label={CWV_THRESHOLDS[key]?.label ?? key} value="—" className="bg-surface-card" />;
                const rating = getCwvRating(key, val);
                const fieldKey = `field_${key}` as keyof AppStoreCwv;
                const hasField = displayCwv[fieldKey] != null;
                return (
                  <StatCard
                    key={key}
                    label={CWV_THRESHOLDS[key]?.label ?? key}
                    value={formatCwvValue(key, val)}
                    delta={rating === "good" ? "Good" : rating === "needs-work" ? "Needs Work" : "Poor"}
                    direction={rating === "good" ? "up" : rating === "needs-work" ? "neutral" : "down"}
                    badge={hasField ? "real" : "est"}
                    className="bg-surface-card"
                  />
                );
              })}
            </div>

            {/* Secondary metrics row */}
            <div className="grid grid-cols-3 gap-px border border-rule bg-rule">
              {(["ttfb_ms", "speed_index", "total_blocking_time"] as const).map((key) => {
                const val = displayCwv[key];
                if (val == null) return <StatCard key={key} label={CWV_THRESHOLDS[key]?.label ?? key} value="—" className="bg-surface-card" />;
                const rating = getCwvRating(key, val);
                return (
                  <StatCard
                    key={key}
                    label={CWV_THRESHOLDS[key]?.label ?? key}
                    value={formatCwvValue(key, val)}
                    direction={rating === "good" ? "up" : rating === "needs-work" ? "neutral" : "down"}
                    className="bg-surface-card"
                  />
                );
              })}
            </div>

            {/* CrUX field data indicator */}
            {displayCwv.field_category && (
              <div className="flex items-center gap-2 border border-rule bg-surface-card px-4 py-2">
                <Wifi size={12} className="text-editorial-green" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                  CrUX Real User Data:
                </span>
                <span className={`font-mono text-xs font-bold ${
                  displayCwv.field_category === "FAST" ? "text-editorial-green" :
                  displayCwv.field_category === "AVERAGE" ? "text-editorial-gold" :
                  "text-editorial-red"
                }`}>
                  {displayCwv.field_category}
                </span>
              </div>
            )}

            {/* Trend chart */}
            {filteredCwv.length >= 2 && (
              <div className="border border-rule bg-surface-card p-4">
                <h3 className="mb-3 text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                  Performance Trend
                </h3>
                <AsoCwvTrendChart data={filteredCwv} />
              </div>
            )}

            {/* Test buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {selected !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRunTest(selected)}
                >
                  <Gauge size={14} />
                  {isPending && testingId === selected ? "Testing…" : "Re-test Now"}
                </Button>
              ) : (
                listings.filter((l) => l.app_url).map((l) => (
                  <Button
                    key={l.id}
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRunTest(l.id)}
                  >
                    <Gauge size={14} />
                    {isPending && testingId === l.id ? "Testing…" : `Test ${l.app_name}`}
                  </Button>
                ))
              )}
              {displayCwv.tested_at && (
                <span className="text-[10px] text-ink-muted">
                  Last tested: {new Date(displayCwv.tested_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="mt-4 flex flex-col items-center gap-4 border border-dashed border-rule bg-surface-card px-6 py-12 text-center">
            <Gauge size={32} className="text-ink-muted" />
            <div>
              <h3 className="font-serif text-lg font-bold text-ink">No Performance Data Yet</h3>
              <p className="mt-1 text-sm text-ink-secondary">
                {listings.some((l) => l.app_url)
                  ? "Run your first PageSpeed test to see real Lighthouse performance metrics."
                  : "Add a store URL to your app listings to enable PageSpeed testing."}
              </p>
            </div>
            {listings.some((l) => l.app_url) ? (
              <div className="flex flex-wrap gap-2">
                {listings.filter((l) => l.app_url).map((l) => (
                  <Button
                    key={l.id}
                    variant="primary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRunTest(l.id)}
                  >
                    <Gauge size={14} />
                    {isPending && testingId === l.id ? "Testing…" : `Test ${l.app_name}`}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <LinkIcon size={12} />
                Add a store URL in your listing to get started
              </div>
            )}
          </div>
        )}
      </section>

      {/* ────────────────────────────────────────────────────────
          SECTION 2: Android Vitals (Google Play Connected)
          ──────────────────────────────────────────────────────── */}
      {hasGoogleListings && (
        <section>
          <ColumnHeader
            title="Android Vitals"
            subtitle="Real device metrics from Google Play Console"
          />

          {googlePlayConnected && latestVitals ? (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
                {([
                  { key: "crash_rate" as const, label: "Crash Rate", threshold: "crash_rate" as const },
                  { key: "anr_rate" as const, label: "ANR Rate", threshold: "anr_rate" as const },
                  { key: "excessive_wakeup_rate" as const, label: "Wakeup Rate", threshold: null },
                  { key: "stuck_wakelock_rate" as const, label: "Wakelock Rate", threshold: null },
                ]).map(({ key, label, threshold }) => {
                  const val = latestVitals[key];
                  const rating = threshold && val != null ? getVitalsRating(threshold, val) : null;
                  return (
                    <StatCard
                      key={key}
                      label={label}
                      value={val != null ? `${val.toFixed(2)}%` : "—"}
                      direction={
                        rating === "good" ? "up" : rating === "poor" ? "down" : "neutral"
                      }
                      className="bg-surface-card"
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-ink-muted">
                Data from: {latestVitals.snapshot_date}
                {latestVitals.user_perceived_crash_rate != null && (
                  <> · User-perceived crash rate: {latestVitals.user_perceived_crash_rate.toFixed(2)}%</>
                )}
              </p>
            </div>
          ) : !googlePlayConnected ? (
            <div className="mt-4 flex items-center gap-4 border border-dashed border-rule bg-surface-card px-6 py-8">
              <Settings size={24} className="shrink-0 text-ink-muted" />
              <div className="flex-1">
                <h3 className="font-serif text-base font-bold text-ink">Connect Google Play Console</h3>
                <p className="mt-1 text-sm text-ink-secondary">
                  Get real crash rates, ANR rates, and device performance metrics for apps you own on Google Play.
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/dashboard/settings?tab=integrations">
                  <Settings size={14} /> Connect
                </a>
              </Button>
            </div>
          ) : (
            <div className="mt-4 border border-dashed border-rule bg-surface-card px-6 py-6 text-center">
              <p className="text-sm text-ink-muted">
                No Android Vitals data yet. Run &quot;Generate All&quot; to fetch metrics from Google Play.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          SECTION 3: Review Intelligence
          ──────────────────────────────────────────────────────── */}
      <section>
        <ColumnHeader
          title="Review Intelligence"
          subtitle="Performance signals from user reviews"
        />

        {filteredReviews.length > 0 ? (
          <div className="mt-4 flex flex-col gap-6">
            {/* Score + stats */}
            <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
              <StatCard
                label="Review Health"
                value={perfScore.score}
                delta="/100"
                direction={perfScore.score >= 70 ? "up" : perfScore.score >= 40 ? "neutral" : "down"}
                highlight
                className="bg-surface-card"
              />
              <StatCard
                label="Perf Issues"
                value={`${Math.round(perfScore.perfReviewRatio * 100)}%`}
                delta={`${perfReviews.length} of ${filteredReviews.length}`}
                direction={perfScore.perfReviewRatio <= 0.1 ? "up" : perfScore.perfReviewRatio <= 0.25 ? "neutral" : "down"}
                className="bg-surface-card"
              />
              <StatCard
                label="Bug Topics"
                value={filteredTopics.filter((t) => t.category === "bug").length}
                delta="categories"
                direction="neutral"
                className="bg-surface-card"
              />
              <StatCard
                label="Rating Trend"
                value={perfScore.ratingTrend >= 0 ? `+${perfScore.ratingTrend.toFixed(2)}` : perfScore.ratingTrend.toFixed(2)}
                direction={perfScore.ratingTrend >= 0 ? "up" : "down"}
                className="bg-surface-card"
              />
            </div>

            {/* Category breakdown */}
            {perfReviews.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={breakdown.filter((b) => b.count > 0)}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        strokeWidth={1}
                        stroke="var(--color-surface-card, #fff)"
                      >
                        {breakdown.filter((b) => b.count > 0).map((entry) => (
                          <Cell key={entry.category} fill={CAT_COLORS[entry.category]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-surface-card, #fff)",
                          border: "1px solid var(--color-rule, #ddd)",
                          borderRadius: 0,
                          fontSize: 11,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {breakdown.map((b) => (
                    <button
                      key={b.category}
                      onClick={() => setCatFilter(catFilter === b.category ? "all" : b.category)}
                      className={`flex flex-col gap-1 border px-3 py-2 text-left transition-colors ${
                        catFilter === b.category
                          ? "border-ink bg-ink/5"
                          : "border-rule bg-surface-card hover:border-ink/30"
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                        {b.label}
                      </span>
                      <span className="font-mono text-lg font-bold text-ink">{b.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Review feed */}
            {displayReviews.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                    {catFilter === "all" ? "All Performance Reviews" : CATEGORY_LABELS[catFilter]}
                  </h3>
                  <span className="text-[9px] text-ink-muted">
                    ({displayReviews.length} review{displayReviews.length !== 1 ? "s" : ""})
                  </span>
                  {catFilter !== "all" && (
                    <button
                      onClick={() => setCatFilter("all")}
                      className="text-[9px] font-bold uppercase text-editorial-red hover:underline"
                    >
                      Show All
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {displayReviews.slice(0, 30).map((review) => (
                    <div key={review.id} className="border border-rule bg-surface-card px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-ink">
                            {"★".repeat(review.rating)}
                            <span className="text-ink-muted">{"★".repeat(5 - review.rating)}</span>
                          </span>
                          <div className="flex gap-1">
                            {review.perfCategories.map((cat) => (
                              <span
                                key={cat}
                                className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                                style={{ backgroundColor: `${CAT_COLORS[cat]}20`, color: CAT_COLORS[cat] }}
                              >
                                {CATEGORY_LABELS[cat]}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] text-ink-muted">
                          {review.review_date ? new Date(review.review_date).toLocaleDateString() : ""}
                        </span>
                      </div>
                      {review.title && (
                        <p className="mt-1 text-xs font-semibold text-ink">
                          <HighlightedText text={review.title} keywords={review.matchedKeywords} />
                        </p>
                      )}
                      {review.text && (
                        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
                          <HighlightedText text={review.text} keywords={review.matchedKeywords} />
                        </p>
                      )}
                    </div>
                  ))}
                  {displayReviews.length > 30 && (
                    <p className="py-2 text-center text-[10px] text-ink-muted">
                      Showing 30 of {displayReviews.length} reviews
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Audit */}
            <div className="border border-rule bg-surface-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-ink">AI Performance Audit</h3>
                <Button
                  variant={auditResult ? "outline" : "primary"}
                  size="sm"
                  disabled={isAuditing}
                  onClick={handleRunAudit}
                >
                  <Zap size={14} />
                  {isAuditing ? "Analyzing…" : auditResult ? "Re-run Audit" : "Run Audit"}
                </Button>
              </div>

              {auditResult ? (
                <div className="mt-4 flex flex-col gap-4">
                  {([
                    { key: "topIssues", label: "Top Issues", icon: AlertTriangle },
                    { key: "rootCauses", label: "Root Cause Analysis", icon: Bug },
                    { key: "priorityFixes", label: "Priority Fixes", icon: Zap },
                    { key: "actionPlan", label: "30-Day Action Plan", icon: Activity },
                  ] as const).map(({ key, label, icon: Icon }) => {
                    const content = auditResult[key];
                    if (!content) return null;
                    return (
                      <div key={key} className="border-t border-rule pt-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Icon size={14} className="text-editorial-red" />
                          <h4 className="text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                            {label}
                          </h4>
                        </div>
                        <div className="prose-editorial text-sm">
                          <AiMarkdown content={content} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !isAuditing ? (
                <p className="mt-3 text-sm text-ink-muted">
                  Run an AI audit to get root cause analysis, priority fixes, and a 30-day action plan based on your review data.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-4 border border-dashed border-rule bg-surface-card px-6 py-8 text-center">
            <p className="text-sm text-ink-muted">
              No reviews found for {selectedListing ? selectedListing.app_name : "your apps"}.
              Review intelligence will appear once reviews are collected.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
