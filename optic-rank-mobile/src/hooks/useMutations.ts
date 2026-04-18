import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { callServerAction } from "../lib/api";

// ---------------------------------------------------------------------------
// Keywords — CRUD
// ---------------------------------------------------------------------------

export function useAddKeywords(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keywords: string[]) => {
      if (!projectId) throw new Error("No project");
      const rows = keywords.map((kw) => ({
        project_id: projectId,
        keyword: kw.trim(),
        search_engine: "google",
        device: "desktop",
        location: "United States",
        is_active: true,
      }));
      const { error } = await supabase.from("keywords").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keywords"] });
      qc.invalidateQueries({ queryKey: ["keywordStats"] });
    },
  });
}

export function useDeleteKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keywords"] });
      qc.invalidateQueries({ queryKey: ["keywordStats"] });
    },
  });
}

// Keywords — AI Generate
export function useGenerateKeywordsAI(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; keywords: string[]; source: string }>(
        "generateKeywordsAI",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keywords"] });
      qc.invalidateQueries({ queryKey: ["keywordStats"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Backlinks — CRUD
// ---------------------------------------------------------------------------

export function useDisavowBacklink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("backlinks")
        .update({ is_toxic: true, status: "lost" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlinks"] });
      qc.invalidateQueries({ queryKey: ["backlinkStats"] });
    },
  });
}

// Backlinks — Discover (AI)
export function useDiscoverBacklinks(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; discovered: number; crawled: number }>(
        "discoverBacklinks",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlinks"] });
      qc.invalidateQueries({ queryKey: ["backlinkStats"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Site Audit — Run (AI)
// ---------------------------------------------------------------------------

export function useRunAudit(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>("runSiteAudit", projectId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["latestAudit"] });
      qc.invalidateQueries({ queryKey: ["auditIssues"] });
      qc.invalidateQueries({ queryKey: ["auditPages"] });
      qc.invalidateQueries({ queryKey: ["auditHistory"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Optimization — GEO Analysis
// ---------------------------------------------------------------------------

export function useRunGeoAnalysis(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; scored: number }>(
        "runGeoAnalysis",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["geoStats"] });
      qc.invalidateQueries({ queryKey: ["geoScoresByPage"] });
    },
  });
}

// ---------------------------------------------------------------------------
// AI Visibility — Run Check (AI)
// ---------------------------------------------------------------------------

export function useRunVisibilityCheck(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keywordIds?: string[]) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; checksRun: number }>(
        "runVisibilityCheck",
        projectId,
        keywordIds ? { keywordIds } : undefined
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visibilityStats"] });
      qc.invalidateQueries({ queryKey: ["visibilityByKeyword"] });
      qc.invalidateQueries({ queryKey: ["keywords"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Predictions — Generate (AI)
// ---------------------------------------------------------------------------

export function useGeneratePredictions(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (horizonDays?: number) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; predicted: number }>(
        "generatePredictions",
        projectId,
        horizonDays ? { horizonDays } : undefined
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["predictions"] });
      qc.invalidateQueries({ queryKey: ["predictionStats"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Entities — Extract (AI)
// ---------------------------------------------------------------------------

export function useExtractEntities(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; extracted: number }>(
        "extractProjectEntities",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entities"] });
      qc.invalidateQueries({ queryKey: ["entityStats"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Competitors — CRUD
// ---------------------------------------------------------------------------

export function useAddCompetitor(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, domain }: { name: string; domain: string }) => {
      if (!projectId) throw new Error("No project");
      const { error } = await supabase.from("competitors").insert({
        project_id: projectId,
        name: name.trim(),
        domain: domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, ""),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
    },
  });
}

export function useDeleteCompetitor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("competitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
    },
  });
}

// Competitors — AI Discover
export function useGenerateCompetitorsAI(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; added: number; source: string }>(
        "generateCompetitorsAI",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Content — CRUD
// ---------------------------------------------------------------------------

export function useAddContentPage(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ url, title }: { url: string; title?: string }) => {
      if (!projectId) throw new Error("No project");
      const { error } = await supabase.from("content_pages").insert({
        project_id: projectId,
        url: url.trim(),
        title: title?.trim() || null,
        status: "published",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentPages"] });
    },
  });
}

// Content — Score Pages
export function useScoreContentPages(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; scored: number }>(
        "scoreContentPages",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentPages"] });
    },
  });
}

// Content — Generate Calendar Entries
export function useGenerateCalendarEntries(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; generated: number }>(
        "generateCalendarEntries",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentPages"] });
      qc.invalidateQueries({ queryKey: ["contentBriefs"] });
    },
  });
}

// Content — AI Actions
export function useDetectContentDecay(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; atRisk: number }>(
        "detectContentDecay",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentPages"] });
    },
  });
}

export function useDetectCannibalization(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; groups: number }>(
        "detectCannibalization",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentPages"] });
    },
  });
}

export function useSuggestInternalLinks(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; suggestions: number }>(
        "suggestInternalLinks",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentPages"] });
    },
  });
}

export function useGenerateContentBriefs(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; generated: number }>(
        "generateContentBriefs",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentBriefs"] });
      qc.invalidateQueries({ queryKey: ["contentPages"] });
    },
  });
}

// ---------------------------------------------------------------------------
// AI Briefs — Generate (AI)
// ---------------------------------------------------------------------------

export function useGenerateBrief(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (briefType?: "daily" | "weekly" | "monthly" | "on_demand") => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; briefId: string }>(
        "generateBrief",
        projectId,
        briefType ? { briefType } : undefined
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefs"] });
      qc.invalidateQueries({ queryKey: ["latestBrief"] });
    },
  });
}

// ---------------------------------------------------------------------------
// AI Insights — Generate (AI)
// ---------------------------------------------------------------------------

export function useGenerateInsights(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; generated: number }>(
        "generateInsights",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insights"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Social Profiles — CRUD
// ---------------------------------------------------------------------------

export function useAddSocialProfile(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ platform, handle }: { platform: string; handle: string }) => {
      if (!projectId) throw new Error("No project");
      const { error } = await supabase.from("social_profiles").insert({
        project_id: projectId,
        platform,
        handle: handle.trim().replace(/^@/, ""),
        followers_count: 0,
        following_count: 0,
        posts_count: 0,
        is_verified: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialProfiles"] });
    },
  });
}

// ---------------------------------------------------------------------------
// App Store — CRUD
// ---------------------------------------------------------------------------

export function useAddAppListing(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      store,
      appId,
      appName,
    }: {
      store: "apple" | "google";
      appId: string;
      appName: string;
    }) => {
      if (!projectId) throw new Error("No project");
      const { error } = await supabase.from("app_store_listings").insert({
        project_id: projectId,
        store,
        app_id: appId.trim(),
        app_name: appName.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreListings"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export function useGenerateRecommendations(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; generated: number }>(
        "generateRecommendations",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

export function useDismissRecommendation(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recommendationId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "dismissRecommendation",
        projectId,
        { recommendationId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

export function useCompleteRecommendation(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recommendationId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "completeRecommendation",
        projectId,
        { recommendationId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

// ---------------------------------------------------------------------------
// App Store — Advanced Actions
// ---------------------------------------------------------------------------

export function useRefreshAppListing(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "refreshAppListing",
        projectId,
        { listingId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreListings"] });
      qc.invalidateQueries({ queryKey: ["appStoreSnapshots"] });
    },
  });
}

export function useAnalyzeAppListing(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; score: number; recommendations: string[] }>(
        "analyzeAppListing",
        projectId,
        { listingId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreListings"] });
    },
  });
}

export function useGenerateAppKeywords(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; keywords: string[] }>(
        "generateAppKeywords",
        projectId,
        { listingId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreRankings"] });
    },
  });
}

export function useRefreshKeywordRankings(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; updated: number }>(
        "refreshKeywordRankings",
        projectId,
        { listingId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreRankings"] });
    },
  });
}

export function useCalculateAppVisibility(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; result: Record<string, unknown> }>(
        "calculateAppVisibility",
        projectId,
        { listingId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreListings"] });
      qc.invalidateQueries({ queryKey: ["appStoreSnapshots"] });
    },
  });
}

export function useGetVisibilityRecommendations(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; recommendations: Record<string, unknown>[] }>(
        "getVisibilityRecommendations",
        projectId,
        { listingId }
      );
    },
  });
}

export function useDiscoverAppCompetitors(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; discovered: Record<string, unknown>[] }>(
        "discoverAppCompetitors",
        projectId,
        { listingId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreCompetitors"] });
    },
  });
}

export function useAnalyzeCompetitorGap(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; analysis: string }>(
        "analyzeCompetitorGap",
        projectId,
        { listingId }
      );
    },
  });
}

export function useAnalyzeUpdateImpact(projectId: string | undefined) {
  return useMutation({
    mutationFn: async ({ listingId, versionId }: { listingId: string; versionId: string }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; analysis: string }>(
        "analyzeUpdateImpact",
        projectId,
        { listingId, versionId }
      );
    },
  });
}

export function useGetUpdateRecommendations(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; recommendations: string }>(
        "getUpdateRecommendations",
        projectId,
        { listingId }
      );
    },
  });
}

export function useExtractReviewTopics(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; topicsCount: number }>(
        "extractReviewTopics",
        projectId,
        { listingId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreReviewTopics"] });
    },
  });
}

export function useAnalyzeLocalizationOpportunity(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; markets: Record<string, unknown>[] }>(
        "analyzeLocalizationOpportunity",
        projectId,
        { listingId }
      );
    },
  });
}

export function useGenerateTranslation(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, countryCode }: { listingId: string; countryCode: string }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "generateTranslation",
        projectId,
        { listingId, countryCode }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreLocalizations"] });
    },
  });
}

export function useBulkTranslate(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, countryCodes }: { listingId: string; countryCodes: string[] }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; translated: number }>(
        "bulkTranslate",
        projectId,
        { listingId, countryCodes }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreLocalizations"] });
    },
  });
}

export function useScoreMetadata(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (params: {
      store: "apple" | "google";
      title: string;
      subtitle: string;
      description: string;
      keywordsField: string;
      promotionalText?: string;
    }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; score: number; recommendations: string[] }>(
        "scoreMetadata",
        projectId,
        params
      );
    },
  });
}

export function useGenerateTitleVariants(projectId: string | undefined) {
  return useMutation({
    mutationFn: async ({ listingId, targetKeywords }: { listingId: string; targetKeywords?: string[] }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; variants: Array<{ title: string; score: number; reason: string }> }>(
        "generateTitleVariants",
        projectId,
        { listingId, targetKeywords }
      );
    },
  });
}

export function useGenerateSubtitleVariant(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; subtitle: string }>(
        "generateSubtitleVariant",
        projectId,
        { listingId }
      );
    },
  });
}

export function useGenerateDescriptionVariant(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; description: string }>(
        "generateDescriptionVariant",
        projectId,
        { listingId }
      );
    },
  });
}

export function useGenerateKeywordField(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; keywords: string }>(
        "generateKeywordField",
        projectId,
        { listingId }
      );
    },
  });
}

export function useGenerateFullListingRecommendation(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; recommendation: Record<string, unknown> }>(
        "generateFullListingRecommendation",
        projectId,
        { listingId }
      );
    },
  });
}

export function useGetCategoryLeaderboard(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; apps: Record<string, unknown>[] }>(
        "getCategoryLeaderboard",
        projectId,
        { listingId }
      );
    },
  });
}

export function useFindKeywordOpportunities(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; opportunities: Record<string, unknown>[] }>(
        "findKeywordOpportunities",
        projectId,
        { listingId }
      );
    },
  });
}

export function useAnalyzeCategoryTrends(projectId: string | undefined) {
  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; analysis: string }>(
        "analyzeCategoryTrends",
        projectId,
        { listingId }
      );
    },
  });
}

export function useGenerateReviewReply(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; reply: string }>(
        "generateReviewReply",
        projectId,
        { reviewId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appStoreReviews"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Social Intelligence — Advanced Actions
// ---------------------------------------------------------------------------

export function useRunSocialAnalysis(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      analysisType,
    }: {
      profileId: string;
      analysisType: string;
    }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; result: Record<string, unknown> }>(
        "analyzeSocialProfile",
        projectId,
        { profileId, analysisType }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialAnalyses"] });
    },
  });
}

export function useAddSocialCompetitor(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      platform,
      handle,
    }: {
      profileId: string;
      platform: string;
      handle: string;
    }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "addSocialCompetitor",
        projectId,
        { profileId, platform, handle }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialCompetitors"] });
    },
  });
}

export function useRemoveSocialCompetitor(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (competitorId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "removeSocialCompetitor",
        projectId,
        { competitorId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialCompetitors"] });
    },
  });
}

export function useDiscoverSocialCompetitors(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; added: number }>(
        "discoverSocialCompetitors",
        projectId,
        { profileId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialCompetitors"] });
    },
  });
}

export function useUpdateSocialProfile(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      ...data
    }: {
      profileId: string;
      display_name?: string;
      bio?: string;
      niche?: string;
      country?: string;
      followers_count?: number;
      following_count?: number;
      posts_count?: number;
      engagement_rate?: number;
    }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "updateSocialProfile",
        projectId,
        { profileId, ...data }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialProfiles"] });
      qc.invalidateQueries({ queryKey: ["socialMetricsHistory"] });
    },
  });
}

export function useSaveSocialGoals(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      profileId,
      goals,
    }: {
      profileId: string;
      goals: Record<string, unknown>[];
    }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true }>(
        "saveSocialGoals",
        projectId,
        { profileId, goals }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["socialGoals"] });
    },
  });
}

export function useGenerateSocialContent(projectId: string | undefined) {
  return useMutation({
    mutationFn: async ({
      profileId,
      contentType,
      topic,
      tone,
      count,
    }: {
      profileId: string;
      contentType: string;
      topic?: string;
      tone?: string;
      count?: number;
    }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; content: Record<string, unknown> }>(
        "generateSocialContent",
        projectId,
        { profileId, contentType, topic: topic || "", tone: tone || "professional", count: count || 5 }
      );
    },
  });
}

export function useLookupSocialProfile(projectId: string | undefined) {
  return useMutation({
    mutationFn: async ({ platform, handle }: { platform: string; handle: string }) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; data: Record<string, unknown> }>(
        "lookupSocialProfile",
        projectId,
        { platform, handle }
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Competitors — Site Explorer & PPC Intel
// ---------------------------------------------------------------------------

export function useAnalyzeCompetitorPages(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (competitorId: string) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; pages: Record<string, unknown>[] }>(
        "analyzeCompetitorPages",
        projectId,
        { competitorId }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
    },
  });
}

export function useAnalyzeCompetitorPPC(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; data: Record<string, unknown> }>(
        "analyzeCompetitorPPC",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Content — Content Gaps
// ---------------------------------------------------------------------------

export function useDetectContentGaps(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; gaps: number }>(
        "detectContentGaps",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contentPages"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Backlinks — Broken Link Building
// ---------------------------------------------------------------------------

export function useDiscoverBrokenLinkOpportunities(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; opportunities: number }>(
        "discoverBrokenLinkOpportunities",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlinks"] });
      qc.invalidateQueries({ queryKey: ["backlinkStats"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Site Audit — Batch URL Analysis
// ---------------------------------------------------------------------------

export function useBatchAnalyzeUrls(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (urls: string[]) => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; analyzed: number; results: Record<string, unknown>[] }>(
        "batchAnalyzeUrls",
        projectId,
        { urls }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["latestAudit"] });
      qc.invalidateQueries({ queryKey: ["auditIssues"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Keywords — Enrich
// ---------------------------------------------------------------------------

export function useEnrichKeywords(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      return callServerAction<{ success: true; enriched: number }>(
        "enrichProjectKeywords",
        projectId
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keywords"] });
      qc.invalidateQueries({ queryKey: ["keywordStats"] });
    },
  });
}
