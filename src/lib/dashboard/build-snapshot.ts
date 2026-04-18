/**
 * Build dashboard snapshot data from a Supabase client.
 * Used by both the dashboard page (user-scoped client) and the volume
 * creation cron (admin client).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardVolumeSnapshot, AIInsight } from "@/types";

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const CTR_CURVE: Record<number, number> = {
  1: 0.315, 2: 0.158, 3: 0.1, 4: 0.07, 5: 0.053,
  6: 0.038, 7: 0.028, 8: 0.021, 9: 0.017, 10: 0.014,
};

export function formatEstTraffic(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/* ------------------------------------------------------------------
   Return type
   ------------------------------------------------------------------ */

export interface DashboardData {
  headlineStats: {
    label: string;
    value: string | number;
    delta: string;
    direction: "up" | "down" | "neutral";
    badge?: "real" | "est" | null;
  }[];
  ga4: {
    connected: boolean;
    overview: import("@/lib/google/analytics").GA4Overview | null;
    dailyData: import("@/lib/google/analytics").GA4DailyData[];
    trafficSources: import("@/lib/google/analytics").GA4TrafficSource[];
    topPages: import("@/lib/google/analytics").GA4PageData[];
  } | null;
  healthScore: number;
  healthCategories: { name: string; value: number; color: string }[];
  topKeywordsList: {
    id: string;
    keyword: string;
    current_position: number | null;
    previous_position: number | null;
    search_volume: number | null;
    cpc: number | null;
    ai_visibility_count: string | null;
  }[];
  chartKeywords: {
    id: string;
    keyword: string;
    position: number;
    volume: number;
    estTraffic: number;
    difficulty: number | null;
  }[];
  insights: AIInsight[];
  competitorsList: {
    id: string;
    name: string;
    domain: string;
    authority_score: number | null;
  }[];
  socialProfiles: {
    platform: string;
    handle: string;
    followers_count: number;
  }[];
  appListings: {
    id: string;
    app_name: string;
    store: "apple" | "google";
    rating: number | null;
    reviews_count: number | null;
    aso_score: number | null;
    icon_url: string | null;
    downloads_estimate: number | null;
  }[];
  appReviewSentiment: {
    listingId: string;
    positive: number;
    negative: number;
    total: number;
  }[];
  latestBrief: {
    id: string;
    title: string;
    summary: string | null;
    brief_type: string;
    created_at: string;
  } | null;
  croStats: {
    estimatedMonthlyRevenue: number;
    avgPosition: number;
    estimatedTraffic: number;
    highValueGaps: number;
  };
  visibilityStats: {
    totalChecks: number;
    avgScore: number;
    keywordsChecked: number;
  };
  predictionStats: {
    total: number;
    improving: number;
    accuracyRate: number;
  };
  entityStats: {
    total: number;
    byType: Record<string, number>;
    avgRelevance: number;
  };
  rankedPositions: number[];
  projectDomain: string;
  authorityScore: number | null;
  currentEstTraffic: number;
}

/* ------------------------------------------------------------------
   Main builder
   ------------------------------------------------------------------ */

export async function buildDashboardData(
  projectId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  projectMeta?: { domain?: string | null; name?: string | null; authority_score?: number | null },
  ga4Data?: import("@/lib/actions/ga4-import").GA4DashboardData | null
): Promise<DashboardData> {
  // ------------------------------------------------------------------
  // Phase 1: Parallel queries
  // ------------------------------------------------------------------
  const [
    kwRes,
    blRes,
    insightsRes,
    competitorsRes,
    auditRes,
    rankedKwRes,
    trafficKwRes,
    briefRes,
    socialRes,
    appRes,
  ] = await Promise.all([
    // Keywords count + position stats
    supabase
      .from("keywords")
      .select("current_position, previous_position", { count: "exact" })
      .eq("project_id", projectId),
    // Backlinks count
    supabase
      .from("backlinks")
      .select("id", { count: "exact" })
      .eq("project_id", projectId),
    // AI Insights (top 4)
    supabase
      .from("ai_insights")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_dismissed", false)
      .order("priority", { ascending: false })
      .limit(4),
    // Competitors (top 4)
    supabase
      .from("competitors")
      .select("id, name, domain, authority_score")
      .eq("project_id", projectId)
      .limit(4),
    // Latest site audit
    supabase
      .from("site_audits")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Top ranked keywords
    supabase
      .from("keywords")
      .select("id, keyword, current_position, previous_position, search_volume, cpc, ai_visibility_count")
      .eq("project_id", projectId)
      .not("current_position", "is", null)
      .order("current_position", { ascending: true })
      .limit(5),
    // Traffic keywords
    supabase
      .from("keywords")
      .select("id, keyword, current_position, search_volume, difficulty")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .not("current_position", "is", null)
      .not("search_volume", "is", null),
    // Latest AI brief
    supabase
      .from("ai_briefs")
      .select("id, title, summary, brief_type, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Social profiles
    supabase
      .from("social_profiles")
      .select("platform, handle, followers_count")
      .eq("project_id", projectId),
    // App store listings
    supabase
      .from("app_store_listings")
      .select("id, app_name, store, rating, reviews_count, aso_score, icon_url, downloads_estimate")
      .eq("project_id", projectId),
  ]);

  // Unranked fallback
  let topKeywords = rankedKwRes.data;
  if (!topKeywords || topKeywords.length === 0) {
    const { data: unranked } = await supabase
      .from("keywords")
      .select("id, keyword, current_position, previous_position, search_volume, cpc, ai_visibility_count")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(5);
    topKeywords = unranked;
  }

  // App reviews
  const appListingIds = (appRes.data ?? []).map((l: { id: string }) => l.id);
  let appReviews: { listing_id: string; sentiment: string }[] = [];
  if (appListingIds.length > 0) {
    const { data } = await supabase
      .from("app_store_reviews")
      .select("listing_id, sentiment")
      .in("listing_id", appListingIds)
      .limit(200);
    appReviews = data ?? [];
  }

  // ------------------------------------------------------------------
  // Visibility stats (inline from DAL)
  // ------------------------------------------------------------------
  const { data: visKw } = await supabase
    .from("keywords")
    .select("ai_visibility_score")
    .eq("project_id", projectId)
    .not("ai_visibility_score", "is", null);

  const visScores = (visKw ?? [])
    .map((k: { ai_visibility_score: number }) => k.ai_visibility_score)
    .filter((v: number) => v != null);

  const { count: visChecks } = await supabase
    .from("ai_visibility_checks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const visibilityStats = {
    totalChecks: visChecks ?? 0,
    avgScore: visScores.length > 0 ? visScores.reduce((a: number, b: number) => a + b, 0) / visScores.length : 0,
    keywordsChecked: visScores.length,
  };

  // ------------------------------------------------------------------
  // Prediction stats (inline from DAL)
  // ------------------------------------------------------------------
  const { data: predKw } = await supabase
    .from("keywords")
    .select("id")
    .eq("project_id", projectId);
  const predKwIds = (predKw ?? []).map((k: { id: string }) => k.id);

  let predictionStats = { total: 0, improving: 0, accuracyRate: 0 };
  if (predKwIds.length > 0) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("predicted_direction, actual_position")
      .in("keyword_id", predKwIds);
    const predictions = preds ?? [];
    const improving = predictions.filter((p: { predicted_direction: string }) => p.predicted_direction === "improving").length;
    const withActual = predictions.filter((p: { actual_position: number | null }) => p.actual_position != null);
    predictionStats = {
      total: predictions.length,
      improving,
      accuracyRate: withActual.length > 0 ? (withActual.length / predictions.length) * 100 : 0,
    };
  }

  // ------------------------------------------------------------------
  // Entity stats (inline from DAL)
  // ------------------------------------------------------------------
  const { data: entities } = await supabase
    .from("entities")
    .select("entity_type, relevance_score")
    .eq("project_id", projectId);
  const entityList = entities ?? [];
  const byType: Record<string, number> = {};
  let relevanceSum = 0;
  for (const e of entityList) {
    byType[e.entity_type] = (byType[e.entity_type] ?? 0) + 1;
    if (e.relevance_score != null) relevanceSum += e.relevance_score;
  }
  const entityStats = {
    total: entityList.length,
    byType,
    avgRelevance: entityList.length > 0 ? relevanceSum / entityList.length : 0,
  };

  // ------------------------------------------------------------------
  // CRO stats (simplified inline)
  // ------------------------------------------------------------------
  const { data: goals } = await supabase
    .from("conversion_goals")
    .select("*")
    .eq("project_id", projectId);
  const convGoals = goals ?? [];

  const trafficKws = trafficKwRes.data ?? [];
  let estimatedTraffic = 0;
  let estimatedRevenue = 0;
  let highValueGaps = 0;
  const positionsForAvg: number[] = [];

  for (const kw of trafficKws) {
    const pos = kw.current_position as number;
    const vol = kw.search_volume as number;
    const ctr = pos <= 10 ? (CTR_CURVE[pos] ?? 0.01) : 0.005;
    const traffic = Math.round(vol * ctr);
    estimatedTraffic += traffic;
    positionsForAvg.push(pos);

    if (convGoals.length > 0) {
      const avgConvRate = convGoals.reduce((s: number, g: { estimated_conversion_rate: number }) => s + g.estimated_conversion_rate, 0) / convGoals.length;
      const avgValue = convGoals.reduce((s: number, g: { estimated_value: number }) => s + g.estimated_value, 0) / convGoals.length;
      estimatedRevenue += traffic * (avgConvRate / 100) * avgValue;
    }
    if (pos > 5 && vol > 100) highValueGaps++;
  }

  const croStats = {
    estimatedMonthlyRevenue: Math.round(estimatedRevenue),
    avgPosition:
      positionsForAvg.length > 0
        ? Math.round((positionsForAvg.reduce((a, b) => a + b, 0) / positionsForAvg.length) * 10) / 10
        : 0,
    estimatedTraffic,
    highValueGaps,
  };

  // ------------------------------------------------------------------
  // Compute headline stats
  // ------------------------------------------------------------------
  const totalKeywords = kwRes.count ?? 0;
  const totalBacklinks = blRes.count ?? 0;
  const keywords = kwRes.data ?? [];
  const latestAudit = auditRes.data;

  const rankedPositions = keywords
    .filter((k: { current_position: number | null }) => k.current_position !== null)
    .map((k: { current_position: number }) => k.current_position);

  const avgPosition =
    rankedPositions.length > 0
      ? (rankedPositions.reduce((a: number, b: number) => a + b, 0) / rankedPositions.length).toFixed(1)
      : "--";

  const keywordsUp = keywords.filter(
    (k: { previous_position: number | null; current_position: number | null }) =>
      k.previous_position !== null &&
      k.current_position !== null &&
      k.current_position < k.previous_position
  ).length;

  const currentEstTraffic = estimatedTraffic;

  // Authority score
  const auditHealthForAuth = latestAudit?.health_score ?? 0;
  let authorityScore: number | null = projectMeta?.authority_score
    ? Number(projectMeta.authority_score)
    : null;

  if (authorityScore === null) {
    const auditComponent = (auditHealthForAuth / 100) * 40;
    const top10Count = rankedPositions.filter((p: number) => p <= 10).length;
    const kwComponent = totalKeywords > 0
      ? Math.min((top10Count / Math.max(totalKeywords, 1)) * 100, 100) * 0.3
      : 0;
    const blComponent = totalBacklinks > 0
      ? Math.min(Math.log10(totalBacklinks + 1) * 20, 100) * 0.3
      : 0;
    const computed = Math.round(auditComponent + kwComponent + blComponent);
    if (computed > 0) authorityScore = Math.min(computed, 100);
  }

  const headlineStats: DashboardData["headlineStats"] = [
    {
      label: "Authority Score",
      value: authorityScore ?? "--",
      delta: authorityScore ? "Composite estimate" : "No data yet",
      direction: authorityScore ? "up" : "neutral",
    },
    (() => {
      const hasGA4 = ga4Data?.connected && ga4Data.overview && ga4Data.overview.totalSessions > 0;
      const trafficValue = hasGA4 ? ga4Data!.overview!.totalSessions : currentEstTraffic;
      return {
        label: "Organic Traffic",
        value: trafficValue > 0 ? formatEstTraffic(trafficValue) : "--",
        delta: trafficValue > 0
          ? hasGA4
            ? `Real · ${ga4Data!.overview!.totalUsers.toLocaleString()} users (30d)`
            : `Est. from ${trafficKws.length} ranked keywords`
          : "No data yet",
        direction: trafficValue > 0 ? ("up" as const) : ("neutral" as const),
        badge: trafficValue > 0 ? (hasGA4 ? ("real" as const) : ("est" as const)) : null,
      };
    })(),
    {
      label: "Keywords Ranked",
      value: rankedPositions.length.toLocaleString(),
      delta: (() => {
        const top10 = rankedPositions.filter((p: number) => p <= 10).length;
        if (keywordsUp > 0) return `+${keywordsUp} improved`;
        if (top10 > 0) return `${top10} in top 10`;
        if (rankedPositions.length > 0) return `Avg. pos ${avgPosition}`;
        return "No rankings yet";
      })(),
      direction: keywordsUp > 0 ? "up" : "neutral",
    },
    {
      label: "Visibility",
      value: visibilityStats.avgScore > 0 ? `${Math.round(visibilityStats.avgScore)}%` : "--",
      delta: visibilityStats.totalChecks > 0
        ? `${visibilityStats.totalChecks} checks · ${visibilityStats.keywordsChecked} keywords`
        : "Not tracked",
      direction: visibilityStats.avgScore > 0 ? "up" : "neutral",
    },
    {
      label: "Backlinks",
      value: totalBacklinks > 0 ? formatEstTraffic(totalBacklinks) : "--",
      delta: totalBacklinks > 0 ? `${totalBacklinks} total discovered` : "None yet",
      direction: totalBacklinks > 0 ? "up" : "neutral",
    },
  ];

  // Health
  const healthScore = latestAudit?.health_score ?? 0;
  const healthCategories = [
    { name: "SEO", value: latestAudit?.seo_score ?? 0, color: "var(--color-editorial-red)" },
    { name: "Performance", value: latestAudit?.performance_score ?? 0, color: "var(--color-ink)" },
    { name: "Accessibility", value: latestAudit?.accessibility_score ?? 0, color: "var(--color-editorial-gold)" },
  ];

  // Chart keywords
  const chartKeywords = trafficKws.map((kw: { id: string; keyword: string; current_position: number; search_volume: number; difficulty: number | null }) => {
    const pos = kw.current_position;
    const vol = kw.search_volume;
    const ctr = pos <= 10 ? (CTR_CURVE[pos] ?? 0.01) : 0.005;
    return { id: kw.id, keyword: kw.keyword, position: pos, volume: vol, estTraffic: Math.round(vol * ctr), difficulty: kw.difficulty ?? null };
  });

  // App review sentiment
  const appReviewSentiment = (appRes.data ?? []).map((listing: { id: string }) => {
    const listingReviews = appReviews.filter((r) => r.listing_id === listing.id);
    const positive = listingReviews.filter((r) => r.sentiment === "positive").length;
    const negative = listingReviews.filter((r) => r.sentiment === "negative").length;
    return { listingId: listing.id, positive, negative, total: listingReviews.length };
  });

  const projectDomain = (projectMeta?.domain ?? projectMeta?.name ?? "").replace(/^https?:\/\//, "");

  return {
    headlineStats,
    healthScore,
    healthCategories,
    topKeywordsList: (topKeywords ?? []).map((kw: Record<string, unknown>) => ({
      id: kw.id as string,
      keyword: kw.keyword as string,
      current_position: kw.current_position as number | null,
      previous_position: kw.previous_position as number | null,
      search_volume: kw.search_volume as number | null,
      cpc: kw.cpc as number | null,
      ai_visibility_count: kw.ai_visibility_count as string | null,
    })),
    chartKeywords,
    insights: (insightsRes.data ?? []) as AIInsight[],
    competitorsList: (competitorsRes.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      name: c.name as string,
      domain: c.domain as string,
      authority_score: c.authority_score as number | null,
    })),
    socialProfiles: (socialRes.data ?? []).map((p: Record<string, unknown>) => ({
      platform: p.platform as string,
      handle: p.handle as string,
      followers_count: p.followers_count as number,
    })),
    appListings: (appRes.data ?? []).map((l: Record<string, unknown>) => ({
      id: l.id as string,
      app_name: l.app_name as string,
      store: l.store as "apple" | "google",
      rating: l.rating as number | null,
      reviews_count: l.reviews_count as number | null,
      aso_score: l.aso_score as number | null,
      icon_url: (l.icon_url as string) ?? null,
      downloads_estimate: (l.downloads_estimate as number) ?? null,
    })),
    appReviewSentiment,
    latestBrief: briefRes.data ?? null,
    croStats,
    visibilityStats,
    predictionStats,
    entityStats,
    rankedPositions,
    projectDomain,
    authorityScore,
    currentEstTraffic,
    ga4: ga4Data?.connected
      ? {
          connected: true,
          overview: ga4Data.overview,
          dailyData: ga4Data.dailyData,
          trafficSources: ga4Data.trafficSources,
          topPages: ga4Data.topPages,
        }
      : null,
  };
}

/* ------------------------------------------------------------------
   Convert DashboardData → DashboardVolumeSnapshot for storage
   ------------------------------------------------------------------ */

export function toVolumeSnapshot(data: DashboardData): DashboardVolumeSnapshot {
  const topPlatform = data.socialProfiles.length > 0
    ? [...data.socialProfiles].sort((a, b) => b.followers_count - a.followers_count)[0].platform
    : null;

  return {
    headlineStats: data.headlineStats,
    healthScore: data.healthScore,
    healthCategories: data.healthCategories,
    topKeywords: data.topKeywordsList.map((kw) => ({
      keyword: kw.keyword,
      position: kw.current_position,
      previousPosition: kw.previous_position,
      searchVolume: kw.search_volume,
      cpc: kw.cpc,
      aiVisibility: kw.ai_visibility_count,
    })),
    competitors: data.competitorsList.map((c) => ({
      name: c.name,
      domain: c.domain,
      authorityScore: c.authority_score ?? 0,
    })),
    aiInsights: data.insights.map((i) => ({
      type: i.type,
      title: i.title,
      description: i.description,
      priority: i.priority,
    })),
    socialSummary: data.socialProfiles.length > 0
      ? {
          totalFollowers: data.socialProfiles.reduce((s, p) => s + p.followers_count, 0),
          profileCount: data.socialProfiles.length,
          topPlatform,
        }
      : null,
    croStats: data.croStats,
    aiCommandCenter: {
      visibilityAvg: Math.round(data.visibilityStats.avgScore),
      predictionImproving: data.predictionStats.improving,
      entityAvgRelevance: Math.round(data.entityStats.avgRelevance),
      latestBriefDate: data.latestBrief?.created_at ?? null,
    },
    appStoreListings: data.appListings.map((l) => ({
      appName: l.app_name,
      store: l.store,
      rating: l.rating,
      reviewsCount: l.reviews_count,
      asoScore: l.aso_score,
      iconUrl: l.icon_url ?? null,
      downloadsEstimate: l.downloads_estimate ?? null,
    })),
  };
}
