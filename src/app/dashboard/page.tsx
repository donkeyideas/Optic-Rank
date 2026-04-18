import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatShortDate } from "@/lib/utils/format-date";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { NewspaperGrid } from "@/components/editorial/newspaper-grid";
import { AIStory } from "@/components/editorial/ai-story";
import { HealthScore } from "@/components/editorial/health-score";
import { CompetitorRow } from "@/components/editorial/competitor-row";
import { ColumnHeader } from "@/components/editorial/column-header";
import { SidebarSection } from "@/components/editorial/sidebar-section";
import { VolumeNavigator } from "@/components/editorial/volume-navigator";

import { KeywordChartCarousel } from "@/components/charts/keyword-chart-carousel";
import { KeywordStrengthMapChart } from "@/components/charts/keyword-strength-map-chart";
import { TrafficOpportunityTreemapChart } from "@/components/charts/traffic-opportunity-treemap-chart";
import { RankVolumeScatterChart } from "@/components/charts/rank-volume-scatter-chart";
import { TopTrafficKeywordsChart } from "@/components/charts/top-traffic-keywords-chart";
import { AppStoreDispatch } from "@/components/editorial/app-store-dispatch";
import { OnboardingChecklist } from "@/components/shared/onboarding-checklist";
import { WhatsNextCard } from "@/components/shared/whats-next-card";
import { OrganicTrafficTrendChart } from "@/components/charts/organic-traffic-trend-chart";
import { KeywordPositionHeatmap } from "@/components/charts/keyword-position-heatmap";
import { VolumeDifficultyMatrix } from "@/components/charts/volume-difficulty-matrix";
import { buildDashboardData, formatEstTraffic } from "@/lib/dashboard/build-snapshot";
import { getKeywordRanksBatch } from "@/lib/dal/keywords";
import { getVolume, getVolumeNav } from "@/lib/dal/volumes";


/* ------------------------------------------------------------------
   Dashboard Page (Server Component)
   ------------------------------------------------------------------ */

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vol?: string }>;
}) {
  const params = await searchParams;
  const requestedVolume = params.vol ? parseInt(params.vol, 10) : null;

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

  // Onboarding: check if user has completed setup
  if (!profile.onboarding_completed) {
    const hasOrg = !!profile.organization_id;
    let hasProject = false;
    let hasKeywords = false;
    let hasAudit = false;

    if (hasOrg) {
      // First get project IDs (keywords & site_audits use project_id, not organization_id)
      const { data: orgProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", profile.organization_id!);

      const projectIds = (orgProjects ?? []).map((p) => p.id);
      hasProject = projectIds.length > 0;

      if (hasProject) {
        const [kwRes, auditRes] = await Promise.all([
          supabase
            .from("keywords")
            .select("id", { count: "exact", head: true })
            .in("project_id", projectIds),
          supabase
            .from("site_audits")
            .select("id", { count: "exact", head: true })
            .in("project_id", projectIds),
        ]);
        hasKeywords = (kwRes.count ?? 0) > 0;
        hasAudit = (auditRes.count ?? 0) > 0;
      }
    }

    // If all steps are already done, complete onboarding server-side immediately
    // instead of relying on the client-side 2-second timer which can fail silently
    if (hasOrg && hasProject && hasKeywords && hasAudit) {
      const adminClient = createAdminClient();
      await adminClient
        .from("profiles")
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      redirect("/dashboard");
    }

    const steps = [
      {
        label: "Create Your Organization",
        description: "Set up your workspace and start a 14-day free trial with full access to all features.",
        done: hasOrg,
        href: "/dashboard/settings",
      },
      {
        label: "Add Your First Project",
        description: "Add your website domain or app to begin tracking rankings, traffic, and performance.",
        done: hasProject,
        href: "/dashboard/settings?tab=projects",
      },
      {
        label: "Track Your Keywords",
        description: "Add keywords you want to rank for. We'll monitor positions and provide AI insights daily.",
        done: hasKeywords,
        href: "/dashboard/keywords",
      },
      {
        label: "Run a Site Audit",
        description: "Get your first health score — SEO, performance, and accessibility all analyzed in seconds.",
        done: hasAudit,
        href: "/dashboard/site-audit",
      },
    ];

    return <OnboardingChecklist steps={steps} userName={profile.full_name} />;
  }

  if (!profile.organization_id) {
    redirect("/dashboard/settings");
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
    redirect("/dashboard/settings?tab=projects");
  }

  // Get volume navigation info
  const volumeNav = await getVolumeNav(project.id);

  // ------------------------------------------------------------------
  // Volume View: render from stored snapshot
  // ------------------------------------------------------------------
  if (requestedVolume && !isNaN(requestedVolume)) {
    const volume = await getVolume(project.id, requestedVolume);
    if (volume) {
      const snap = volume.snapshot;

      // Map snapshot app listings to the shape AppStoreDispatch expects
      const archiveAppListings = snap.appStoreListings.map((l, i) => ({
        id: `archive-${i}`,
        app_name: l.appName,
        store: l.store as "apple" | "google",
        rating: l.rating,
        reviews_count: l.reviewsCount,
        downloads_estimate: l.downloadsEstimate ?? null,
        aso_score: l.asoScore,
        icon_url: l.iconUrl ?? null,
      }));

      return (
        <div className="flex flex-col gap-6">
          <VolumeNavigator
            currentVolume={volume.volume_number}
            minVolume={volumeNav.min}
            maxVolume={volumeNav.max}
            weekStart={volume.week_start}
            weekEnd={volume.week_end}
          />

          <HeadlineBar stats={snap.headlineStats} />

          <NewspaperGrid
            left={
              <div>
                <ColumnHeader title="AI Intelligence Brief" subtitle="Weekly Findings" />
                {snap.aiInsights.length > 0 ? (
                  snap.aiInsights.map((insight, i) => (
                    <div key={i} className={`py-3 ${i < snap.aiInsights.length - 1 ? "border-b border-rule" : ""}`}>
                      <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                        {insight.type}
                      </span>
                      <h4 className="mt-1 font-serif text-[15px] font-bold leading-snug text-ink">
                        {insight.title}
                      </h4>
                      <p className="mt-1 font-sans text-[13px] leading-relaxed text-ink-secondary">
                        {insight.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                    <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                      No AI insights this week
                    </span>
                  </div>
                )}

                {/* Social Intelligence — editorial story */}
                {snap.socialSummary && snap.socialSummary.totalFollowers > 0 && (
                  <article className="flex flex-col gap-2 border-t border-rule py-4">
                    <span className="font-sans text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                      Social Intelligence
                    </span>
                    <h3 className="font-serif text-[16px] font-bold leading-snug text-ink">
                      {formatEstTraffic(snap.socialSummary.totalFollowers)} Combined Reach Across {snap.socialSummary.profileCount} Profile{snap.socialSummary.profileCount !== 1 ? "s" : ""}
                    </h3>
                  </article>
                )}
              </div>
            }
            center={
              <div className="flex flex-col gap-6">
                {/* Performance Analytics — archived notice */}
                <div>
                  <ColumnHeader
                    title="Performance Analytics"
                    subtitle={`Archived — Vol. ${volume.volume_number}`}
                  />
                  <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                      <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                        Charts not available for archived editions
                      </span>
                      <span className="text-[11px] text-ink-muted">
                        View the current edition for live analytics
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Keyword Rankings */}
                <div>
                  <ColumnHeader title="Top Keyword Rankings" subtitle="Tracked Keywords by Position" />
                  {snap.topKeywords.length > 0 ? (
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
                        {snap.topKeywords.map((kw, i) => {
                          const change = kw.previousPosition != null && kw.position != null
                            ? kw.previousPosition - kw.position : 0;
                          return (
                            <tr key={i} className="hover:bg-surface-raised">
                              <td className="border-b border-rule-light px-2.5 py-2.5 text-[13px] font-semibold text-ink">{kw.keyword}</td>
                              <td className="border-b border-rule-light px-2.5 py-2.5">
                                <span
                                  className={`font-mono text-sm font-semibold ${
                                    kw.position == null
                                      ? "text-ink-muted"
                                      : kw.position === 1
                                        ? "text-editorial-red"
                                        : "text-ink"
                                  }`}
                                >
                                  {kw.position ?? "—"}
                                </span>
                              </td>
                              <td className="border-b border-rule-light px-2.5 py-2.5 font-mono text-xs text-ink-secondary">{kw.searchVolume?.toLocaleString() ?? "--"}</td>
                              <td className="border-b border-rule-light px-2.5 py-2.5 font-mono text-xs text-ink-secondary">{kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : "--"}</td>
                              <td
                                className={`border-b border-rule-light px-2.5 py-2.5 text-[13px] font-semibold ${
                                  change > 0
                                    ? "text-editorial-green"
                                    : change < 0
                                      ? "text-editorial-red"
                                      : "text-ink-muted"
                                }`}
                              >
                                {change > 0 ? `+${change}` : change < 0 ? String(change) : "--"}
                              </td>
                              <td className="border-b border-rule-light px-2.5 py-2.5 font-mono text-xs text-ink-secondary">{kw.aiVisibility ?? "--"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table></div>
                  ) : (
                    <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                      <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                        No keywords tracked this week
                      </span>
                    </div>
                  )}
                </div>

                {/* App Store Dispatch */}
                <div>
                  <ColumnHeader
                    title="App Store Dispatch"
                    subtitle="ASO Intelligence & Rankings"
                  />
                  {archiveAppListings.length > 0 ? (
                    <AppStoreDispatch
                      listings={archiveAppListings}
                      reviewSentiment={[]}
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center border border-dashed border-rule bg-surface-raised">
                      <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                        No apps tracked this week
                      </span>
                    </div>
                  )}
                </div>
              </div>
            }
            right={
              <div className="flex flex-col gap-6">
                {/* Health Score */}
                <SidebarSection title="Marketing Health" subtitle="Overall Assessment">
                  {snap.healthScore > 0 ? (
                    <HealthScore score={snap.healthScore} categories={snap.healthCategories} />
                  ) : (
                    <div className="flex h-32 items-center justify-center border border-dashed border-rule bg-surface-raised">
                      <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                        No audit data this week
                      </span>
                    </div>
                  )}
                </SidebarSection>

                {/* Competitor Watch */}
                <SidebarSection title="Competitor Watch" subtitle="Domain Authority Rankings">
                  {snap.competitors.length > 0 ? (
                    snap.competitors.map((c, i) => (
                      <CompetitorRow key={i} rank={i + 1} name={c.name} domain={c.domain} domainAuthority={c.authorityScore} />
                    ))
                  ) : (
                    <div className="flex h-24 items-center justify-center border border-dashed border-rule bg-surface-raised">
                      <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                        No competitors tracked.
                      </span>
                    </div>
                  )}
                </SidebarSection>

                {/* AI Command Center */}
                <SidebarSection title="AI Command Center" subtitle="Advanced Intelligence">
                  <div className="flex flex-col gap-2">
                    {/* LLM Visibility */}
                    <div className="flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-editorial-red/10">
                          <span className="text-[10px] font-bold text-editorial-red">AI</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                            LLM Visibility
                          </span>
                        </div>
                      </div>
                      {snap.aiCommandCenter.visibilityAvg > 0 ? (
                        <span className="font-mono text-sm font-bold text-editorial-green">
                          {snap.aiCommandCenter.visibilityAvg}%
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-ink-muted">—</span>
                      )}
                    </div>

                    {/* Predictions */}
                    <div className="flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-editorial-gold/15">
                          <span className="text-[10px] font-bold text-editorial-gold">ML</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                            Rank Predictions
                          </span>
                        </div>
                      </div>
                      {snap.aiCommandCenter.predictionImproving > 0 ? (
                        <span className="font-mono text-xs font-bold text-editorial-green">
                          +{snap.aiCommandCenter.predictionImproving}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-ink-muted">—</span>
                      )}
                    </div>

                    {/* Entity SEO */}
                    <div className="flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink/10">
                          <span className="text-[10px] font-bold text-ink">KG</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                            Entity SEO
                          </span>
                        </div>
                      </div>
                      {snap.aiCommandCenter.entityAvgRelevance > 0 ? (
                        <span className="font-mono text-xs font-bold text-ink">
                          {snap.aiCommandCenter.entityAvgRelevance}%
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-ink-muted">—</span>
                      )}
                    </div>

                    {/* AI Briefs */}
                    <div className="flex items-center justify-between border border-rule bg-surface-card px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-editorial-green/10">
                          <span className="text-[10px] font-bold text-editorial-green">BR</span>
                        </div>
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                            AI Briefs
                          </span>
                          {snap.aiCommandCenter.latestBriefDate && (
                            <span className="block text-[9px] text-ink-muted">
                              Latest: {snap.aiCommandCenter.latestBriefDate}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-xs text-ink-muted">
                        {snap.aiCommandCenter.latestBriefDate ? "Archived" : "—"}
                      </span>
                    </div>
                  </div>
                </SidebarSection>
              </div>
            }
          />

          {/* Optimization Hub — CRO (full-width, same as live) */}
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
              <div className="border border-rule bg-surface-card px-4 py-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Est. Revenue
                </span>
                <span className="mt-1 block font-mono text-2xl font-bold text-editorial-green">
                  {snap.croStats.estimatedMonthlyRevenue > 0
                    ? `$${Math.round(snap.croStats.estimatedMonthlyRevenue).toLocaleString()}`
                    : "—"}
                </span>
                <span className="mt-0.5 block text-[10px] text-ink-muted">
                  {snap.croStats.estimatedMonthlyRevenue > 0 ? "Monthly estimate" : "No revenue data"}
                </span>
              </div>

              {/* Avg. Position */}
              <div className="border border-rule bg-surface-card px-4 py-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Avg. Position
                </span>
                <span className="mt-1 block font-mono text-2xl font-bold text-ink">
                  {snap.croStats.avgPosition > 0 ? snap.croStats.avgPosition : "—"}
                </span>
                <span className="mt-0.5 block text-[10px] text-ink-muted">
                  {snap.croStats.avgPosition > 0
                    ? snap.croStats.avgPosition <= 10
                      ? "Page 1 average"
                      : "Across tracked keywords"
                    : "No ranked keywords"}
                </span>
              </div>

              {/* Est. Traffic */}
              <div className="border border-rule bg-surface-card px-4 py-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Est. Traffic
                </span>
                <span className="mt-1 block font-mono text-2xl font-bold text-editorial-green">
                  {snap.croStats.estimatedTraffic > 0
                    ? snap.croStats.estimatedTraffic.toLocaleString()
                    : "—"}
                </span>
                <span className="mt-0.5 block text-[10px] text-ink-muted">
                  {snap.croStats.estimatedTraffic > 0
                    ? "Monthly organic visits"
                    : "No traffic data"}
                </span>
              </div>

              {/* Revenue Gaps */}
              <div className="border border-rule bg-surface-card px-4 py-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Revenue Gaps
                </span>
                <span className="mt-1 block font-mono text-2xl font-bold text-editorial-amber">
                  {snap.croStats.highValueGaps > 0 ? snap.croStats.highValueGaps : "—"}
                </span>
                <span className="mt-0.5 block text-[10px] text-ink-muted">
                  {snap.croStats.highValueGaps > 0
                    ? "High-value opportunities"
                    : "No gaps detected"}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    // Volume not found, fall through to live render
  }

  // ------------------------------------------------------------------
  // Live View: fetch real-time data
  // ------------------------------------------------------------------

  // Fetch GA4 real traffic data (silently fails if not connected)
  let ga4Data: import("@/lib/actions/ga4-import").GA4DashboardData | null = null;
  try {
    const { fetchGA4DashboardData } = await import("@/lib/actions/ga4-import");
    ga4Data = await fetchGA4DashboardData(project.id);
  } catch {
    // GA4 not connected or fetch failed — continue with estimates
  }

  // Fetch volume history for Organic Traffic Trend chart
  const { data: volumeHistory } = await supabase
    .from("dashboard_volumes")
    .select("week_start, organic_traffic")
    .eq("project_id", project.id)
    .order("week_start", { ascending: true });

  const data = await buildDashboardData(
    project.id,
    supabase,
    {
      domain: project.domain,
      name: project.name,
      authority_score: project.authority_score,
    },
    ga4Data
  );

  const {
    headlineStats,
    healthScore,
    healthCategories,
    topKeywordsList,
    chartKeywords,
    insights,
    competitorsList,
    socialProfiles,
    appListings,
    appReviewSentiment,
    latestBrief,
    croStats,
    visibilityStats,
    predictionStats,
    entityStats,
    rankedPositions,
    projectDomain,
    ga4,
  } = data;

  // Fetch rank history for heatmap (top 20 keywords)
  const heatmapKwIds = chartKeywords.slice(0, 20).map((kw) => kw.id);
  const rankHistoryMap = heatmapKwIds.length > 0
    ? await getKeywordRanksBatch(heatmapKwIds, 30)
    : new Map<string, { date: string; position: number }[]>();

  const heatmapData = chartKeywords.slice(0, 20).map((kw) => ({
    keyword: kw.keyword,
    keywordId: kw.id,
    ranks: rankHistoryMap.get(kw.id) ?? [],
  }));

  const matrixData = chartKeywords
    .filter((kw) => kw.difficulty !== null)
    .map((kw) => ({
      keyword: kw.keyword,
      volume: kw.volume,
      difficulty: kw.difficulty!,
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* What's Next guidance card (shown after onboarding, dismissible) */}
      {profile.onboarding_completed && !profile.whats_next_dismissed && (
        <WhatsNextCard />
      )}

      {/* Volume Navigator */}
      <VolumeNavigator
        currentVolume={null}
        minVolume={volumeNav.min}
        maxVolume={volumeNav.max}
      />

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

            {/* Performance Analytics Carousel */}
            {chartKeywords.length > 0 ? (
              <div>
                <ColumnHeader
                  title="Performance Analytics"
                  subtitle={`${rankedPositions.length} Ranked Keywords — ${projectDomain.toUpperCase()}`}
                />
                <KeywordChartCarousel
                  slides={[
                    { label: "Strength Map", chart: <KeywordStrengthMapChart data={chartKeywords} /> },
                    { label: "Traffic Opportunity", chart: <TrafficOpportunityTreemapChart data={chartKeywords} /> },
                    { label: "Rank vs Volume", chart: <RankVolumeScatterChart data={chartKeywords} /> },
                    { label: "Top Traffic", chart: <TopTrafficKeywordsChart data={chartKeywords} /> },
                    { label: "Position Heatmap", chart: <KeywordPositionHeatmap data={heatmapData} /> },
                    { label: "Opportunity Matrix", chart: <VolumeDifficultyMatrix data={matrixData} /> },
                    { label: "Traffic Trend", chart: (
                      <OrganicTrafficTrendChart
                        volumes={(volumeHistory ?? []).map((v) => ({
                          date: v.week_start,
                          traffic: v.organic_traffic ?? 0,
                        }))}
                        ga4Daily={(ga4?.dailyData ?? []).map((d) => ({
                          date: d.date,
                          sessions: d.sessions,
                        }))}
                        currentEstTraffic={data.currentEstTraffic}
                      />
                    )},
                  ]}
                />
              </div>
            ) : (
              <div>
                <ColumnHeader
                  title="Performance Analytics"
                  subtitle={`${projectDomain.toUpperCase()}`}
                />
                <div className="flex h-[220px] items-center justify-center border border-dashed border-rule bg-surface-raised">
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <span className="text-xs font-medium uppercase tracking-widest text-ink-muted">
                      Track keywords to see analytics
                    </span>
                    <Link
                      href="/dashboard/keywords"
                      className="text-[11px] font-semibold uppercase tracking-[0.15em] text-editorial-red hover:opacity-70"
                    >
                      Add Keywords
                    </Link>
                  </div>
                </div>
              </div>
            )}

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
                          ? kw.previous_position - kw.current_position!
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
              {healthScore > 0 ? (
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
