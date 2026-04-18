import { supabase } from "./supabase";
import { APP_CONFIG } from "./config";

type ActionName =
  // Keywords
  | "generateKeywordsAI"
  | "enrichProjectKeywords"
  // Competitors
  | "generateCompetitorsAI"
  | "analyzeCompetitorPages"
  | "analyzeCompetitorPPC"
  // Backlinks
  | "discoverBacklinks"
  | "discoverBrokenLinkOpportunities"
  // Predictions
  | "generatePredictions"
  // AI Visibility
  | "runVisibilityCheck"
  // Briefs
  | "generateBrief"
  // Content
  | "scoreContentPages"
  | "detectContentDecay"
  | "detectCannibalization"
  | "suggestInternalLinks"
  | "generateContentBriefs"
  | "detectContentGaps"
  | "generateCalendarEntries"
  // Site Audit
  | "runSiteAudit"
  | "batchAnalyzeUrls"
  // Optimization
  | "runGeoAnalysis"
  // Entities
  | "extractProjectEntities"
  // Insights
  | "generateInsights"
  // Recommendations
  | "generateRecommendations"
  | "dismissRecommendation"
  | "completeRecommendation"
  // App Store
  | "refreshAppListing"
  | "analyzeAppListing"
  | "generateAppKeywords"
  | "refreshKeywordRankings"
  | "generateReviewReply"
  | "calculateAppVisibility"
  | "getVisibilityRecommendations"
  | "discoverAppCompetitors"
  | "analyzeCompetitorGap"
  | "analyzeUpdateImpact"
  | "getUpdateRecommendations"
  | "extractReviewTopics"
  | "bulkGenerateReplies"
  | "analyzeLocalizationOpportunity"
  | "generateTranslation"
  | "bulkTranslate"
  | "scoreMetadata"
  | "generateTitleVariants"
  | "generateSubtitleVariant"
  | "generateDescriptionVariant"
  | "generateKeywordField"
  | "generateFullListingRecommendation"
  | "getCategoryLeaderboard"
  | "findKeywordOpportunities"
  | "analyzeCategoryTrends"
  // Social Intelligence
  | "analyzeSocialProfile"
  | "addSocialCompetitor"
  | "removeSocialCompetitor"
  | "discoverSocialCompetitors"
  | "updateSocialProfile"
  | "saveSocialGoals"
  | "generateSocialContent"
  | "lookupSocialProfile";

/**
 * Get a fresh access token, refreshing if the current one is expired.
 */
async function getFreshToken(): Promise<string> {
  // First try the cached session
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    // Check if token expires within 60 seconds
    const expiresAt = session.expires_at ?? 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt > now + 60) {
      return session.access_token;
    }
  }

  // Token expired or missing — force refresh
  const { data: { session: refreshed }, error } = await supabase.auth.refreshSession();
  if (error || !refreshed?.access_token) {
    throw new Error("Not authenticated. Please sign in again.");
  }
  return refreshed.access_token;
}

/**
 * Fetch with manual redirect handling — preserves Authorization header
 * that React Native strips on cross-origin redirects.
 */
async function fetchWithAuth(
  url: string,
  token: string,
  body: Record<string, unknown>,
  maxRedirects = 3
): Promise<Response> {
  // 5-minute timeout — server actions (AI calls, crawling, content briefs) can take a while
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000);

  try {
    let currentUrl = url;
    for (let i = 0; i <= maxRedirects; i++) {
      const res = await fetch(currentUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        redirect: "manual",
        signal: controller.signal,
      });

      // Follow redirects manually (3xx) — re-attach auth header
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (location) {
          currentUrl = location.startsWith("http")
            ? location
            : new URL(location, currentUrl).toString();
          continue;
        }
      }

      return res;
    }
    throw new Error("Too many redirects");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Call a server action on the web app via the mobile API endpoint.
 * Passes the user's Supabase JWT for authentication.
 */
export async function callServerAction<T = Record<string, unknown>>(
  action: ActionName,
  projectId: string,
  params?: Record<string, unknown>
): Promise<T> {
  const token = await getFreshToken();

  const body = { action, projectId, _token: token, ...params };

  let res: Response;
  try {
    res = await fetchWithAuth(
      `${APP_CONFIG.WEB_APP_URL}/api/mobile`,
      token,
      body
    );
  } catch (err: any) {
    // AbortController timeout or network failure (e.g. app went to background)
    if (err?.name === "AbortError") {
      throw new Error(
        "Request timed out. The analysis may still be running — pull down to refresh in a moment."
      );
    }
    throw new Error(
      "Network request failed. The analysis may still be running on the server — pull down to refresh."
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      !res.ok
        ? res.status === 504
          ? "The server is still processing. Pull down to refresh in a moment."
          : `Server error (${res.status})`
        : "Unexpected response from server"
    );
  }

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  return data as T;
}
