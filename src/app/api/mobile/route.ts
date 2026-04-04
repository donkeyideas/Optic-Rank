import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mobileTokenStorage } from "@/lib/supabase/mobile-context";

// Site audits and other actions can take a while — extend timeout
export const maxDuration = 60;

// Server actions — these use createClient() which will detect the mobile token via AsyncLocalStorage
import { generateKeywordsAI, importKeywordsCSV, enrichProjectKeywords } from "@/lib/actions/keywords";
import { generateCompetitorsAI, analyzeCompetitorPages, analyzeCompetitorPPC } from "@/lib/actions/competitors";
import { discoverBacklinks, discoverBrokenLinkOpportunities } from "@/lib/actions/backlinks";
import { generatePredictions } from "@/lib/actions/predictions";
import { runVisibilityCheck } from "@/lib/actions/ai-visibility";
import { generateBrief } from "@/lib/actions/briefs";
import {
  scoreContentPages,
  detectContentDecay,
  detectCannibalization,
  suggestInternalLinks,
  generateContentBriefs,
  detectContentGaps,
  generateCalendarEntries,
} from "@/lib/actions/content";
import { runSiteAudit, batchAnalyzeUrls } from "@/lib/actions/site-audit";
import { runGeoAnalysis } from "@/lib/actions/optimization";
import { extractProjectEntities } from "@/lib/actions/entities";
import { generateInsightsForProject } from "@/lib/actions/insights";
import { generateRecommendations, dismissRecommendation, completeRecommendation } from "@/lib/actions/recommendations";
// App Store actions
import { refreshAppListing, analyzeAppListing, generateAppKeywords, refreshKeywordRankings, generateReviewReply } from "@/lib/actions/app-store";
import { calculateAppVisibility, getVisibilityRecommendations } from "@/lib/actions/app-store-visibility";
import { discoverCompetitors as discoverAppCompetitors, analyzeCompetitorGap } from "@/lib/actions/app-store-competitors";
import { analyzeUpdateImpact, getUpdateRecommendations } from "@/lib/actions/app-store-versions";
import { extractReviewTopics, bulkGenerateReplies } from "@/lib/actions/app-store-reviews-intel";
import { analyzeLocalizationOpportunity, generateTranslation, bulkTranslate } from "@/lib/actions/app-store-localization";
import { scoreMetadata, generateTitleVariants, generateSubtitleVariant, generateDescriptionVariant, generateKeywordField, generateFullListingRecommendation } from "@/lib/actions/app-store-optimizer";
import { getCategoryLeaderboard, findKeywordOpportunities, analyzeCategoryTrends } from "@/lib/actions/app-store-intel";
// Social Intelligence actions
import { analyzeSocialProfile, addSocialCompetitor, removeSocialCompetitor, discoverSocialCompetitors, updateSocialProfile, saveSocialGoals, generateSocialContent, lookupSocialProfile } from "@/lib/actions/social-intelligence";
import type { SocialAnalysisType } from "@/types";

type ActionResult =
  | { error: string }
  | { [key: string]: unknown };

/**
 * Universal mobile API endpoint.
 *
 * POST /api/mobile
 * Headers: Authorization: Bearer <supabase-jwt>
 * Body: { action: string, projectId: string, ...params }
 */
export async function POST(request: NextRequest) {
  // 1. Parse body first (needed for fallback token)
  let body: { action: string; projectId: string; _token?: string; [key: string]: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Extract Bearer token — from header first, fallback to body._token
  //    (React Native fetch can strip Authorization header on redirects)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : body._token;

  if (!token) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  // 3. Verify user
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { action, projectId } = body;
  if (!action || !projectId) {
    return NextResponse.json(
      { error: "action and projectId are required" },
      { status: 400 }
    );
  }

  // 4. Dispatch action — run within mobileTokenStorage context
  // so that server actions' createClient() uses the JWT instead of cookies
  try {
    const result: ActionResult = await mobileTokenStorage.run(
      token,
      async () => {
        switch (action) {
          case "generateKeywordsAI":
            return generateKeywordsAI(projectId);

          case "generateCompetitorsAI":
            return generateCompetitorsAI(projectId);

          case "discoverBacklinks":
            return discoverBacklinks(projectId);

          case "generatePredictions":
            return generatePredictions(
              projectId,
              typeof body.horizonDays === "number" ? body.horizonDays : 7
            );

          case "runVisibilityCheck":
            return runVisibilityCheck(
              projectId,
              Array.isArray(body.keywordIds) ? body.keywordIds : undefined
            );

          case "generateBrief":
            return generateBrief(
              projectId,
              (body.briefType as "daily" | "weekly" | "monthly" | "on_demand") ??
                "on_demand"
            );

          case "scoreContentPages":
            return scoreContentPages(projectId);

          case "detectContentDecay":
            return detectContentDecay(projectId);

          case "detectCannibalization":
            return detectCannibalization(projectId);

          case "suggestInternalLinks":
            return suggestInternalLinks(projectId);

          case "generateContentBriefs":
            return generateContentBriefs(projectId);

          case "generateCalendarEntries":
            return generateCalendarEntries(projectId);

          case "runSiteAudit":
            return runSiteAudit(projectId);

          case "runGeoAnalysis":
            return runGeoAnalysis(projectId);

          case "extractProjectEntities":
            return extractProjectEntities(projectId);

          case "generateInsights":
            return generateInsightsForProject(projectId);

          // ----- Recommendations -----
          case "generateRecommendations":
            return generateRecommendations(projectId);
          case "dismissRecommendation":
            return dismissRecommendation(body.recommendationId as string);
          case "completeRecommendation":
            return completeRecommendation(body.recommendationId as string);

          // ----- App Store -----
          case "refreshAppListing":
            return refreshAppListing(body.listingId as string);
          case "analyzeAppListing":
            return analyzeAppListing(body.listingId as string);
          case "generateAppKeywords":
            return generateAppKeywords(body.listingId as string);
          case "refreshKeywordRankings":
            return refreshKeywordRankings(body.listingId as string);
          case "generateReviewReply":
            return generateReviewReply(body.reviewId as string);
          case "calculateAppVisibility":
            return calculateAppVisibility(body.listingId as string);
          case "getVisibilityRecommendations":
            return getVisibilityRecommendations(body.listingId as string);
          case "discoverAppCompetitors":
            return discoverAppCompetitors(body.listingId as string);
          case "analyzeCompetitorGap":
            return analyzeCompetitorGap(body.listingId as string);
          case "analyzeUpdateImpact":
            return analyzeUpdateImpact(body.listingId as string, body.versionId as string);
          case "getUpdateRecommendations":
            return getUpdateRecommendations(body.listingId as string);
          case "extractReviewTopics":
            return extractReviewTopics(body.listingId as string);
          case "bulkGenerateReplies":
            return bulkGenerateReplies(body.listingId as string, body.reviewIds as string[]);
          case "analyzeLocalizationOpportunity":
            return analyzeLocalizationOpportunity(body.listingId as string);
          case "generateTranslation":
            return generateTranslation(body.listingId as string, body.countryCode as string);
          case "bulkTranslate":
            return bulkTranslate(body.listingId as string, body.countryCodes as string[]);
          case "analyzeCompetitorPages":
            return analyzeCompetitorPages(projectId, body.competitorId as string);
          case "analyzeCompetitorPPC":
            return analyzeCompetitorPPC(projectId);
          case "detectContentGaps":
            return detectContentGaps(projectId);
          case "discoverBrokenLinkOpportunities":
            return discoverBrokenLinkOpportunities(projectId);
          case "batchAnalyzeUrls":
            return batchAnalyzeUrls(projectId, body.urls as string[]);

          case "scoreMetadata":
            return scoreMetadata(
              body.store as "apple" | "google",
              body.title as string,
              body.subtitle as string,
              body.description as string,
              body.keywordsField as string,
              body.promotionalText as string | undefined
            );
          case "generateTitleVariants":
            return generateTitleVariants(body.listingId as string, body.targetKeywords as string[] | undefined);
          case "generateSubtitleVariant":
            return generateSubtitleVariant(body.listingId as string);
          case "generateDescriptionVariant":
            return generateDescriptionVariant(body.listingId as string);
          case "generateKeywordField":
            return generateKeywordField(body.listingId as string);
          case "generateFullListingRecommendation":
            return generateFullListingRecommendation(body.listingId as string);
          case "getCategoryLeaderboard":
            return getCategoryLeaderboard(body.listingId as string);
          case "findKeywordOpportunities":
            return findKeywordOpportunities(body.listingId as string);
          case "analyzeCategoryTrends":
            return analyzeCategoryTrends(body.listingId as string);

          // ----- Social Intelligence -----
          case "analyzeSocialProfile":
            return analyzeSocialProfile(body.profileId as string, body.analysisType as SocialAnalysisType);
          case "addSocialCompetitor": {
            const fd = new FormData();
            fd.append("platform", body.platform as string);
            fd.append("handle", body.handle as string);
            return addSocialCompetitor(body.profileId as string, fd);
          }
          case "removeSocialCompetitor":
            return removeSocialCompetitor(body.competitorId as string);
          case "discoverSocialCompetitors":
            return discoverSocialCompetitors(body.profileId as string);
          case "updateSocialProfile": {
            const fd2 = new FormData();
            if (body.display_name) fd2.append("display_name", body.display_name as string);
            if (body.bio) fd2.append("bio", body.bio as string);
            if (body.niche) fd2.append("niche", body.niche as string);
            if (body.country) fd2.append("country", body.country as string);
            if (body.followers_count) fd2.append("followers_count", String(body.followers_count));
            if (body.following_count) fd2.append("following_count", String(body.following_count));
            if (body.posts_count) fd2.append("posts_count", String(body.posts_count));
            if (body.engagement_rate) fd2.append("engagement_rate", String(body.engagement_rate));
            return updateSocialProfile(body.profileId as string, fd2);
          }
          case "saveSocialGoals":
            return saveSocialGoals(body.profileId as string, body.goals as any);
          case "generateSocialContent":
            return generateSocialContent(
              body.profileId as string,
              {
                contentType: body.contentType as string,
                topic: (body.topic as string) || "",
                tone: (body.tone as string) || "professional",
                count: typeof body.count === "number" ? body.count : 5,
              }
            );
          case "lookupSocialProfile":
            return lookupSocialProfile(body.platform as string, body.handle as string);
          case "enrichProjectKeywords":
            return enrichProjectKeywords(projectId);

          default:
            return { error: `Unknown action: ${action}` };
        }
      }
    );

    if ("error" in result) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`[Mobile API] ${action} failed:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
