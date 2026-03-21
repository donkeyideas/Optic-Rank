import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/utils/format-date";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { NewspaperGrid } from "@/components/editorial/newspaper-grid";
import { AIStory } from "@/components/editorial/ai-story";
import { HealthScore } from "@/components/editorial/health-score";
import { CompetitorRow } from "@/components/editorial/competitor-row";
import { ColumnHeader } from "@/components/editorial/column-header";
import { SidebarSection } from "@/components/editorial/sidebar-section";
import type { AIInsight } from "@/types";
import { getVisibilityStats } from "@/lib/dal/ai-visibility";
import { getPredictionStats } from "@/lib/dal/predictions";
import { getEntityStats } from "@/lib/dal/entities";
import { OrganicTrafficChart } from "@/components/charts/organic-traffic-chart";
import {
  getConversionGoals,
  getKeywordsWithRevenue,
  getCroStats,
} from "@/lib/dal/optimization";
import {
  getAppStoreListings,
  getAppReviews,
} from "@/lib/dal/app-store";
import { AppStoreDispatch } from "@/components/editorial/app-store-dispatch";
import { getSocialProfiles } from "@/lib/dal/social-intelligence";

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function formatEstTraffic(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/* ------------------------------------------------------------------
   Empty State Components
   ------------------------------------------------------------------ */

function NoOrgState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Welcome to Optic Rank
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
          To get started, create your organization and set up your first project.
          <br />
          Your SEO intelligence dashboard will come to life with real data.
        </p>
      </div>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90"
      >
        Create Organization &amp; Project
      </Link>
    </div>
  );
}

function NoProjectState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          No Active Project
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
          Create your first project to start tracking keywords, backlinks,
          <br />
          and receiving AI-powered SEO insights.
        </p>
      </div>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90"
      >
        Create Your First Project
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------
   Dashboard Page (Server Component)
   ------------------------------------------------------------------ */

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return <NoOrgState />;
  }

  // Get the user's active project
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return <NoProjectState />;
  }

  // ------------------------------------------------------------------
  // Fetch REAL data for the active project
  // ------------------------------------------------------------------

  // Keywords: count + position stats
  const { data: allKeywords, count: keywordsCount } = await supabase
    .from("keywords")
    .select("current_position, previous_position", { count: "exact" })
    .eq("project_id", project.id);

  // Backlinks count
  const { count: backlinksCount } = await supabase
    .from("backlinks")
    .select("id", { count: "exact" })
    .eq("project_id", project.id);

  // AI Insights (non-dismissed, top priority)
  const { data: aiInsights } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("project_id", project.id)
    .eq("is_dismissed", false)
    .order("priority", { ascending: false })
    .limit(4);

  // Competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("*")
    .eq("project_id", project.id)
    .limit(4);

  // Latest site audit
  const { data: latestAudit } = await supabase
    .from("site_audits")
    .select("*")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Top keyword rankings for center column (show ranked first, then unranked)
  const { data: rankedKeywords } = await supabase
    .from("keywords")
    .select("*")
    .eq("project_id", project.id)
    .not("current_position", "is", null)
    .order("current_position", { ascending: true })
    .limit(5);

  // If no ranked keywords, show the first 5 tracked keywords
  let topKeywords = rankedKeywords;
  if (!rankedKeywords || rankedKeywords.length === 0) {
    const { data: unrankedKeywords } = await supabase
      .from("keywords")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(5);
    topKeywords = unrankedKeywords;
  }

  // Keywords with search volume for traffic estimation
  const { data: trafficKeywords } = await supabase
    .from("keywords")
    .select("current_position, search_volume")
    .eq("project_id", project.id)
    .eq("is_active", true)
    .not("current_position", "is", null)
    .not("search_volume", "is", null);

  // Advanced AI module stats + Optimization + App Store listings + Social (fetched in parallel)
  const [visibilityStats, predictionStats, entityStats, conversionGoals, appListings, socialProfiles] = await Promise.all([
    getVisibilityStats(project.id),
    getPredictionStats(project.id),
    getEntityStats(project.id),
    getConversionGoals(project.id),
    getAppStoreListings(project.id),
    getSocialProfiles(project.id),
  ]);

  // Phase 2: CRO revenue + App Store reviews (depend on phase 1 results)
  const appListingIds = appListings.map((l) => l.id);
  const [kwWithRevenue, appReviews] = await Promise.all([
    getKeywordsWithRevenue(project.id, conversionGoals),
    getAppReviews(appListingIds),
  ]);
  const croStats = await getCroStats(project.id, conversionGoals, kwWithRevenue);

  // Latest AI brief
  const { data: latestBrief } = await supabase
    .from("ai_briefs")
    .select("id, title, summary, brief_type, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ------------------------------------------------------------------
  // Compute headline stats from real data
  // ------------------------------------------------------------------

  const totalKeywords = keywordsCount ?? 0;
  const totalBacklinks = backlinksCount ?? 0;
  const keywords = allKeywords ?? [];

  const rankedPositions = keywords
    .filter((k) => k.current_position !== null)
    .map((k) => k.current_position!);

  const avgPosition =
    rankedPositions.length > 0
      ? (
          rankedPositions.reduce((a, b) => a + b, 0) / rankedPositions.length
        ).toFixed(1)
      : "--";

  const keywordsUp = keywords.filter(
    (k) =>
      k.previous_position !== null &&
      k.current_position !== null &&
      k.current_position < k.previous_position
  ).length;

  const keywordsDown = keywords.filter(
    (k) =>
      k.previous_position !== null &&
      k.current_position !== null &&
      k.current_position > k.previous_position
  ).length;

  // ------------------------------------------------------------------
  // Organic Traffic Estimation (CTR curve × search volume)
  // ------------------------------------------------------------------

  const CTR_CURVE: Record<number, number> = {
    1: 0.315, 2: 0.158, 3: 0.1, 4: 0.07, 5: 0.053,
    6: 0.038, 7: 0.028, 8: 0.021, 9: 0.017, 10: 0.014,
  };

  const currentEstTraffic = (trafficKeywords ?? []).reduce((sum, kw) => {
    const pos = kw.current_position as number;
    const vol = kw.search_volume as number;
    const ctr = pos <= 10 ? (CTR_CURVE[pos] ?? 0.01) : 0.005;
    return sum + Math.round(vol * ctr);
  }, 0);

  // Build a 30-day traffic trend from real keyword_ranks history.
  // For each day, sum CTR-weighted search volume across all keywords
  // using the position recorded on that day.
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch keyword IDs with search volume for the active project
  const kwIdsForTraffic = (trafficKeywords ?? []).length > 0
    ? await supabase
        .from("keywords")
        .select("id, search_volume")
        .eq("project_id", project.id)
        .eq("is_active", true)
        .not("search_volume", "is", null)
    : { data: [] };

  const kwVolumeMap = new Map<string, number>();
  for (const kw of kwIdsForTraffic.data ?? []) {
    kwVolumeMap.set(kw.id, kw.search_volume as number);
  }

  let trafficTrendData: { date: string; traffic: number }[] = [];

  if (kwVolumeMap.size > 0) {
    // Fetch rank history for the last 30 days
    const { data: rankHistory } = await supabase
      .from("keyword_ranks")
      .select("keyword_id, position, checked_at")
      .in("keyword_id", Array.from(kwVolumeMap.keys()))
      .gte("checked_at", thirtyDaysAgo.toISOString())
      .order("checked_at", { ascending: true });

    if (rankHistory && rankHistory.length > 0) {
      // Group by date, use last position per keyword per day
      const dailyPositions = new Map<string, Map<string, number>>();
      for (const r of rankHistory) {
        const day = new Date(r.checked_at).toISOString().slice(0, 10);
        if (!dailyPositions.has(day)) dailyPositions.set(day, new Map());
        dailyPositions.get(day)!.set(r.keyword_id, r.position);
      }

      // Build trend: for each of the last 30 days, compute traffic
      const lastKnownPositions = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);

        // Update positions for this day (carry forward from previous day if no data)
        const dayData = dailyPositions.get(dateStr);
        if (dayData) {
          for (const [kwId, pos] of dayData) lastKnownPositions.set(kwId, pos);
        }

        // Sum estimated traffic for all keywords with known positions
        let dayTraffic = 0;
        for (const [kwId, pos] of lastKnownPositions) {
          const vol = kwVolumeMap.get(kwId);
          if (!vol) continue;
          const ctr = pos <= 10 ? (CTR_CURVE[pos] ?? 0.01) : 0.005;
          dayTraffic += Math.round(vol * ctr);
        }

        trafficTrendData.push({ date: dateStr, traffic: dayTraffic });
      }
    }
  }

  // Fallback: if no rank history, show today's estimate as a flat line
  if (trafficTrendData.length === 0) {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      trafficTrendData.push({
        date: d.toISOString().slice(0, 10),
        traffic: currentEstTraffic,
      });
    }
  }

  const projectDomain = (project.domain ?? project.name ?? "").replace(/^https?:\/\//, "");

  // ------------------------------------------------------------------
  // Authority Score — use DB value or compute fallback from available data
  // ------------------------------------------------------------------

  const auditHealthForAuth = latestAudit?.health_score ?? 0;
  let authorityScore: number | null = project.authority_score
    ? Number(project.authority_score)
    : null;

  if (authorityScore === null) {
    const auditComponent = (auditHealthForAuth / 100) * 40; // 40% weight
    const top10Count = rankedPositions.filter((p) => p <= 10).length;
    const kwComponent = totalKeywords > 0
      ? Math.min((top10Count / Math.max(totalKeywords, 1)) * 100, 100) * 0.3 // 30% weight
      : 0;
    const blComponent = totalBacklinks > 0
      ? Math.min(Math.log10(totalBacklinks + 1) * 20, 100) * 0.3 // 30% weight
      : 0;
    const computed = Math.round(auditComponent + kwComponent + blComponent);
    if (computed > 0) authorityScore = Math.min(computed, 100);
  }

  const headlineStats = [
    {
      label: "Authority Score",
      value: authorityScore ?? "--",
      delta: authorityScore ? "Composite estimate" : "No data yet",
      direction: authorityScore ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Organic Traffic",
      value: currentEstTraffic > 0 ? formatEstTraffic(currentEstTraffic) : "--",
      delta: currentEstTraffic > 0
        ? `Est. from ${(trafficKeywords ?? []).length} ranked keywords`
        : "No data yet",
      direction: currentEstTraffic > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Keywords Ranked",
      value: rankedPositions.length.toLocaleString(),
      delta: (() => {
        const top10 = rankedPositions.filter((p) => p <= 10).length;
        if (keywordsUp > 0) return `+${keywordsUp} improved`;
        if (top10 > 0) return `${top10} in top 10`;
        if (rankedPositions.length > 0) return `Avg. pos ${avgPosition}`;
        return "No rankings yet";
      })(),
      direction: keywordsUp > 0 ? ("up" as const) : (rankedPositions.length > 0 ? ("neutral" as const) : ("neutral" as const)),
    },
    {
      label: "AI Visibility",
      value: visibilityStats.avgScore > 0 ? `${Math.round(visibilityStats.avgScore)}%` : "--",
      delta: visibilityStats.totalChecks > 0
        ? `${visibilityStats.totalChecks} checks · ${visibilityStats.keywordsChecked} keywords`
        : "Not tracked",
      direction: visibilityStats.avgScore > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Backlinks",
      value: totalBacklinks > 0 ? formatEstTraffic(totalBacklinks) : "--",
      delta: totalBacklinks > 0 ? `${totalBacklinks} total discovered` : "None yet",
      direction: totalBacklinks > 0 ? ("up" as const) : ("neutral" as const),
    },
  ];

  // ------------------------------------------------------------------
  // Health categories from latest audit
  // ------------------------------------------------------------------

  const healthScore = latestAudit?.health_score ?? 0;
  const healthCategories = [
    {
      name: "SEO",
      value: latestAudit?.seo_score ?? 0,
      color: "var(--color-editorial-red)",
    },
    {
      name: "Performance",
      value: latestAudit?.performance_score ?? 0,
      color: "var(--color-ink)",
    },
    {
      name: "Accessibility",
      value: latestAudit?.accessibility_score ?? 0,
      color: "var(--color-editorial-gold)",
    },
  ];

  // ------------------------------------------------------------------
  // App Store summary stats
  // ------------------------------------------------------------------

  const appReviewSentiment = appListings.map((listing) => {
    const listingReviews = appReviews.filter((r) => r.listing_id === listing.id);
    const positive = listingReviews.filter((r) => r.sentiment === "positive").length;
    const negative = listingReviews.filter((r) => r.sentiment === "negative").length;
    return { listingId: listing.id, positive, negative, total: listingReviews.length };
  });

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const insights: AIInsight[] = aiInsights ?? [];
  const competitorsList = competitors ?? [];
  const topKeywordsList = topKeywords ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Headline Stats Bar */}
      <HeadlineBar stats={headlineStats} />

      {/* 3-Column Newspaper Grid */}
      <NewspaperGrid
        left={
          <div>
            <ColumnHeader
              title="AI Intelligence Brief"
              subtitle="Today's Top Findings"
            />
            {insights.length > 0 ? (
              insights.map((insight, i) => (
                <AIStory
                  key={insight.id}
                  insight={insight}
                  showBorder={i < insights.length - 1}
                />
              ))
            ) : (
              <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                    No AI insights yet
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    Insights will appear as data is collected.
                  </span>
                </div>
              </div>
            )}

            {/* Social Intelligence — editorial story */}
            {(() => {
              if (socialProfiles.length === 0) return null;

              const fmtCount = (n: number) =>
                n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
                : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
                : n.toLocaleString();

              const totalFollowers = socialProfiles.reduce((s, p) => s + p.followers_count, 0);
              const topProfile = [...socialProfiles].sort((a, b) => b.followers_count - a.followers_count)[0];
              const platformNames: Record<string, string> = {
                instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube",
                twitter: "X (Twitter)", linkedin: "LinkedIn",
              };

              return (
                <article className="flex flex-col gap-2 border-t border-rule py-4">
                  <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                    Social Intelligence
                  </span>
                  <h3 className="font-serif text-[16px] font-bold leading-snug text-ink">
                    {fmtCount(totalFollowers)} Combined Reach Across {socialProfiles.length} Profile{socialProfiles.length !== 1 ? "s" : ""}
                  </h3>
                  <p className="font-sans text-[13px] leading-relaxed text-ink-secondary">
                    Your largest audience is on {platformNames[topProfile.platform] ?? topProfile.platform} with @{topProfile.handle} at {fmtCount(topProfile.followers_count)} followers.
                    {socialProfiles.length > 1 && ` You are active on ${socialProfiles.map((p) => platformNames[p.platform] ?? p.platform).join(", ")}.`}
                  </p>
                </article>
              );
            })()}
          </div>
        }
        center={
          <div className="flex flex-col gap-6">
            {/* AI Brief — On-Demand Headline */}
            {latestBrief && (
              <Link
                href="/dashboard/advanced-ai"
                className="group border-b-2 border-rule-dark pb-4"
              >
                <h2 className="font-serif text-2xl font-bold leading-snug text-ink group-hover:text-editorial-red transition-colors">
                  {latestBrief.title}
                </h2>
                {latestBrief.summary && (
                  <p className="mt-2 font-serif text-[14px] italic leading-relaxed text-ink-secondary">
                    {latestBrief.summary.length > 200
                      ? `${latestBrief.summary.slice(0, 200)}…`
                      : latestBrief.summary}
                  </p>
                )}
                <span className="mt-2 inline-block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted group-hover:text-editorial-red transition-colors">
                  Read Full Brief &rarr;
                </span>
              </Link>
            )}

            {/* Organic Traffic Trend */}
            <div>
              <ColumnHeader
                title="Organic Traffic Trend"
                subtitle={`30-Day Performance — ${projectDomain.toUpperCase()}`}
              />
              {currentEstTraffic > 0 ? (
                <OrganicTrafficChart
                  data={trafficTrendData}
                  domain={projectDomain}
                />
              ) : (
                <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                      Add keywords with search volume to see traffic estimates
                    </span>
                    <Link
                      href="/dashboard/keywords"
                      className="text-[11px] font-semibold uppercase tracking-[0.15em] text-editorial-red hover:opacity-70"
                    >
                      Add Keywords
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Keyword Rankings Table */}
            <div>
              <ColumnHeader
                title="Top Keyword Rankings"
                subtitle="Tracked Keywords by Position"
              />
              {topKeywordsList.length > 0 ? (
                <div className="overflow-x-auto"><table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b-2 border-rule-dark px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Keyword
                      </th>
                      <th className="border-b-2 border-rule-dark px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Pos.
                      </th>
                      <th className="border-b-2 border-rule-dark px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Volume
                      </th>
                      <th className="border-b-2 border-rule-dark px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        CPC
                      </th>
                      <th className="border-b-2 border-rule-dark px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Change
                      </th>
                      <th className="border-b-2 border-rule-dark px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        AI
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topKeywordsList.map((kw) => {
                      const hasRank = kw.current_position !== null;
                      const change =
                        kw.previous_position !== null && hasRank
                          ? kw.previous_position - kw.current_position
                          : 0;

                      return (
                        <tr key={kw.id} className="hover:bg-surface-raised">
                          <td className="border-b border-rule-light px-2.5 py-2.5 text-[13px] font-semibold text-ink">
                            {kw.keyword}
                          </td>
                          <td className="border-b border-rule-light px-2.5 py-2.5">
                            <span
                              className={`font-mono text-sm font-semibold ${
                                !hasRank
                                  ? "text-ink-muted"
                                  : kw.current_position === 1
                                    ? "text-editorial-red"
                                    : "text-ink"
                              }`}
                            >
                              {hasRank ? kw.current_position : "—"}
                            </span>
                          </td>
                          <td className="border-b border-rule-light px-2.5 py-2.5 font-mono text-xs text-ink-secondary">
                            {kw.search_volume?.toLocaleString() ?? "--"}
                          </td>
                          <td className="border-b border-rule-light px-2.5 py-2.5 font-mono text-xs text-ink-secondary">
                            {kw.cpc != null ? `$${Number(kw.cpc).toFixed(2)}` : "--"}
                          </td>
                          <td
                            className={`border-b border-rule-light px-2.5 py-2.5 text-[13px] font-semibold ${
                              !hasRank
                                ? "text-ink-muted"
                                : change > 0
                                  ? "text-editorial-green"
                                  : change < 0
                                    ? "text-editorial-red"
                                    : "text-ink-muted"
                            }`}
                          >
                            {!hasRank
                              ? "Pending"
                              : change > 0
                                ? `+${change}`
                                : change < 0
                                  ? String(change)
                                  : "--"}
                          </td>
                          <td className="border-b border-rule-light px-2.5 py-2.5 font-mono text-xs text-ink-secondary">
                            {kw.ai_visibility_count ?? "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
              ) : (
                <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                      No keywords tracked yet
                    </span>
                    <Link
                      href="/dashboard/keywords"
                      className="text-[11px] font-semibold uppercase tracking-[0.15em] text-editorial-red hover:opacity-70"
                    >
                      Add Keywords
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* App Store Dispatch */}
            <div>
              <ColumnHeader
                title="App Store Dispatch"
                subtitle="ASO Intelligence & Rankings"
              />
              {appListings.length > 0 ? (
                <AppStoreDispatch
                  listings={appListings}
                  reviewSentiment={appReviewSentiment}
                />
              ) : (
                <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                      No apps tracked yet
                    </span>
                    <Link
                      href="/dashboard/app-store"
                      className="text-[11px] font-semibold uppercase tracking-[0.15em] text-editorial-red hover:opacity-70"
                    >
                      Track Your First App
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        }
        right={
          <div className="flex flex-col gap-6">
            {/* Health Score */}
            <SidebarSection title="Marketing Health" subtitle="Overall Assessment">
              {latestAudit ? (
                <HealthScore
                  score={healthScore}
                  categories={healthCategories}
                />
              ) : (
                <div className="flex h-32 items-center justify-center border border-dashed border-rule bg-surface-raised">
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                      No audit data yet
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Run a site audit to see health scores.
                    </span>
                  </div>
                </div>
              )}
            </SidebarSection>

            {/* Competitor Watch */}
            <SidebarSection
              title="Competitor Watch"
              subtitle="Domain Authority Rankings"
            >
              {competitorsList.length > 0 ? (
                competitorsList.map((c, i) => (
                  <CompetitorRow
                    key={c.id}
                    rank={i + 1}
                    name={c.name}
                    domain={c.domain}
                    domainAuthority={c.authority_score ?? 0}
                  />
                ))
              ) : (
                <div className="flex h-24 items-center justify-center border border-dashed border-rule bg-surface-raised">
                  <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                    No competitors tracked yet.
                  </span>
                </div>
              )}
            </SidebarSection>

            {/* AI Command Center */}
            <SidebarSection
              title="AI Command Center"
              subtitle="Advanced Intelligence"
            >
              <div className="flex flex-col gap-2">
                {/* LLM Visibility */}
                <Link
                  href="/dashboard/advanced-ai"
                  className="group flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5 transition-colors hover:bg-surface-raised"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-editorial-red/10">
                      <span className="text-[10px] font-bold text-editorial-red">AI</span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                        LLM Visibility
                      </span>
                      <span className="block text-[9px] text-ink-muted">
                        {visibilityStats.totalChecks > 0
                          ? `${visibilityStats.keywordsChecked} keywords tracked`
                          : "Track brand in AI responses"}
                      </span>
                    </div>
                  </div>
                  {visibilityStats.avgScore > 0 ? (
                    <span className="font-mono text-sm font-bold text-editorial-green">
                      {Math.round(visibilityStats.avgScore)}%
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted group-hover:text-editorial-red">
                      Start &rarr;
                    </span>
                  )}
                </Link>

                {/* Predictions */}
                <Link
                  href="/dashboard/advanced-ai"
                  className="group flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5 transition-colors hover:bg-surface-raised"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-editorial-gold/15">
                      <span className="text-[10px] font-bold text-editorial-gold">ML</span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                        Rank Predictions
                      </span>
                      <span className="block text-[9px] text-ink-muted">
                        {predictionStats.total > 0
                          ? `${predictionStats.total} predictions (${Math.round(predictionStats.accuracyRate ?? 0)}% accuracy)`
                          : "ML-powered rank forecasts"}
                      </span>
                    </div>
                  </div>
                  {predictionStats.improving > 0 ? (
                    <span className="font-mono text-xs font-bold text-editorial-green">
                      +{predictionStats.improving}
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted group-hover:text-editorial-red">
                      Start &rarr;
                    </span>
                  )}
                </Link>

                {/* Entity SEO */}
                <Link
                  href="/dashboard/advanced-ai"
                  className="group flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5 transition-colors hover:bg-surface-raised"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink/10">
                      <span className="text-[10px] font-bold text-ink">KG</span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                        Entity SEO
                      </span>
                      <span className="block text-[9px] text-ink-muted">
                        {entityStats.total > 0
                          ? `${entityStats.total} entities · ${Object.keys(entityStats.byType).length} types`
                          : "Knowledge Graph optimization"}
                      </span>
                    </div>
                  </div>
                  {entityStats.avgRelevance > 0 ? (
                    <span className="font-mono text-xs font-bold text-ink">
                      {Math.round(entityStats.avgRelevance)}%
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted group-hover:text-editorial-red">
                      Start &rarr;
                    </span>
                  )}
                </Link>

                {/* AI Briefs */}
                <Link
                  href="/dashboard/advanced-ai"
                  className="group flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5 transition-colors hover:bg-surface-raised"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-editorial-green/10">
                      <span className="text-[10px] font-bold text-editorial-green">BR</span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                        AI Briefs
                      </span>
                      <span className="block text-[9px] text-ink-muted">
                        {latestBrief
                          ? `Latest: ${formatShortDate(latestBrief.created_at, profile.timezone ?? "UTC")}`
                          : "Generate intelligence reports"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-muted group-hover:text-editorial-red">
                    {latestBrief ? "View" : "Start"} &rarr;
                  </span>
                </Link>
              </div>

            </SidebarSection>

          </div>
        }
      />

      {/* Optimization Hub — CRO */}
      <div className="border-t-2 border-rule-dark pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-ink">
              Optimization Hub
            </h2>
            <p className="text-[10px] font-sans text-ink-muted uppercase tracking-[0.1em]">
              Conversion Rate Optimization &middot; Revenue Attribution
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Est. Revenue */}
          <Link
            href="/dashboard/search-ai"
            className="group border border-rule bg-surface-card px-4 py-3 transition-colors hover:bg-surface-raised"
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Est. Revenue
            </span>
            <span className="mt-1 block font-mono text-2xl font-bold text-editorial-green">
              {croStats.estimatedMonthlyRevenue > 0
                ? `$${Math.round(croStats.estimatedMonthlyRevenue).toLocaleString()}`
                : "—"}
            </span>
            <span className="mt-0.5 block text-[10px] text-ink-muted">
              {croStats.estimatedMonthlyRevenue > 0 ? "Monthly estimate" : "Set conversion goals"}
            </span>
          </Link>

          {/* Avg. Position */}
          <Link
            href="/dashboard/search-ai"
            className="group border border-rule bg-surface-card px-4 py-3 transition-colors hover:bg-surface-raised"
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Avg. Position
            </span>
            <span className="mt-1 block font-mono text-2xl font-bold text-ink">
              {croStats.avgPosition > 0 ? croStats.avgPosition : "—"}
            </span>
            <span className="mt-0.5 block text-[10px] text-ink-muted">
              {croStats.avgPosition > 0
                ? croStats.avgPosition <= 10
                  ? "Page 1 average"
                  : "Across tracked keywords"
                : "No ranked keywords"}
            </span>
          </Link>

          {/* Est. Traffic */}
          <Link
            href="/dashboard/search-ai"
            className="group border border-rule bg-surface-card px-4 py-3 transition-colors hover:bg-surface-raised"
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Est. Traffic
            </span>
            <span className="mt-1 block font-mono text-2xl font-bold text-editorial-green">
              {croStats.estimatedTraffic > 0
                ? croStats.estimatedTraffic.toLocaleString()
                : "—"}
            </span>
            <span className="mt-0.5 block text-[10px] text-ink-muted">
              {croStats.estimatedTraffic > 0
                ? "Monthly organic visits"
                : "No traffic data yet"}
            </span>
          </Link>

          {/* Revenue Gaps */}
          <Link
            href="/dashboard/search-ai"
            className="group border border-rule bg-surface-card px-4 py-3 transition-colors hover:bg-surface-raised"
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Revenue Gaps
            </span>
            <span className="mt-1 block font-mono text-2xl font-bold text-editorial-amber">
              {croStats.highValueGaps > 0 ? croStats.highValueGaps : "—"}
            </span>
            <span className="mt-0.5 block text-[10px] text-ink-muted">
              {croStats.highValueGaps > 0
                ? "High-value opportunities"
                : "No gaps detected"}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
