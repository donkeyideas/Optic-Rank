"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";
import { getPageSpeedData } from "@/lib/api/pagespeed";
import {
  classifyPerformanceReviews,
  getPerformanceBreakdown,
  CATEGORY_LABELS,
} from "@/lib/app-store/performance";
import type { CoreWebVitals } from "@/lib/api/pagespeed";

export interface PerformanceAuditResult {
  topIssues: string;
  rootCauses: string;
  priorityFixes: string;
  actionPlan: string;
}

/* ------------------------------------------------------------------
   PageSpeed: Run a Lighthouse test on an app's web presence
   ------------------------------------------------------------------ */

export async function runPageSpeedTest(
  listingId: string
): Promise<{ error: string } | { success: true; cwv: CoreWebVitals }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_url")
    .eq("id", listingId)
    .single();

  if (!listing?.app_url) {
    return { error: "No store URL set for this app. Add a URL in the listing settings." };
  }

  const result = await getPageSpeedData(listing.app_url, "mobile");
  if (!result.data) {
    return { error: result.error ?? "PageSpeed test failed." };
  }

  const cwv = result.data;

  // Upsert into app_store_cwv
  await supabase.from("app_store_cwv").insert({
    listing_id: listingId,
    strategy: "mobile",
    url_tested: listing.app_url,
    performance_score: cwv.performance_score,
    accessibility_score: cwv.accessibility_score,
    lcp_ms: cwv.lcp_ms,
    fcp_ms: cwv.fcp_ms,
    cls: cwv.cls,
    inp_ms: cwv.inp_ms,
    ttfb_ms: cwv.ttfb_ms,
    speed_index: cwv.speed_index,
    total_blocking_time: cwv.total_blocking_time,
    field_lcp_ms: cwv.field_page?.lcp_ms ?? cwv.field_origin?.lcp_ms ?? null,
    field_cls: cwv.field_page?.cls ?? cwv.field_origin?.cls ?? null,
    field_inp_ms: cwv.field_page?.inp_ms ?? cwv.field_origin?.inp_ms ?? null,
    field_fcp_ms: cwv.field_page?.fcp_ms ?? cwv.field_origin?.fcp_ms ?? null,
    field_ttfb_ms: cwv.field_page?.ttfb_ms ?? cwv.field_origin?.ttfb_ms ?? null,
    field_category: cwv.field_page?.overall_category ?? cwv.field_origin?.overall_category ?? null,
  });

  revalidatePath("/dashboard/app-store");
  return { success: true, cwv };
}

/* ------------------------------------------------------------------
   PageSpeed Batch: Test all listings in a project
   ------------------------------------------------------------------ */

export async function runPageSpeedTestBatch(
  projectId: string
): Promise<{ error: string } | { success: true; tested: number; failed: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listings } = await supabase
    .from("app_store_listings")
    .select("id, app_url")
    .eq("project_id", projectId)
    .not("app_url", "is", null);

  if (!listings?.length) return { success: true, tested: 0, failed: 0 };

  let tested = 0;
  let failed = 0;

  for (const listing of listings) {
    if (!listing.app_url) continue;
    try {
      const result = await runPageSpeedTest(listing.id);
      if ("success" in result) tested++;
      else failed++;
    } catch {
      failed++;
    }
    // Rate limit: 2s between calls
    if (listings.indexOf(listing) < listings.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, tested, failed };
}

/* ------------------------------------------------------------------
   Android Vitals: Fetch from Google Play Console
   ------------------------------------------------------------------ */

export async function fetchAndStorePlayVitals(
  projectId: string
): Promise<{ error: string } | { success: true; fetched: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Check if Google Play is connected for this project
  const { data: gpToken } = await supabase
    .from("google_play_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .single();

  if (!gpToken) return { success: true, fetched: 0 };

  // Get valid access token (refresh if needed)
  let accessToken = gpToken.access_token;
  const expiresAt = new Date(gpToken.expires_at);
  if (expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    try {
      const { refreshAccessToken } = await import("@/lib/google/oauth");
      const refreshed = await refreshAccessToken(gpToken.refresh_token);
      accessToken = refreshed.access_token;
    } catch {
      return { error: "Google Play token refresh failed." };
    }
  }

  // Fetch Google Play listings
  const { data: project } = await supabase
    .from("projects")
    .select("google_play_package_name")
    .eq("id", projectId)
    .single();

  if (!project?.google_play_package_name) return { success: true, fetched: 0 };

  // Get all Google Play listings for this project
  const { data: gpListings } = await supabase
    .from("app_store_listings")
    .select("id, app_id")
    .eq("project_id", projectId)
    .eq("store", "google");

  if (!gpListings?.length) return { success: true, fetched: 0 };

  let fetched = 0;
  const { fetchPlayMetrics } = await import("@/lib/google/play-console");

  for (const listing of gpListings) {
    try {
      const metrics = await fetchPlayMetrics(accessToken, listing.app_id);
      await supabase.from("app_store_vitals").upsert(
        {
          listing_id: listing.id,
          crash_rate: metrics.crashRate,
          anr_rate: metrics.anrRate,
          user_perceived_crash_rate: metrics.userPerceivedCrashRate,
          user_perceived_anr_rate: metrics.userPerceivedAnrRate,
          excessive_wakeup_rate: metrics.excessiveWakeupRate,
          stuck_wakelock_rate: metrics.stuckWakelockRate,
          snapshot_date: new Date().toISOString().split("T")[0],
        },
        { onConflict: "listing_id,snapshot_date" }
      );
      fetched++;
    } catch {
      // Non-critical: continue with next listing
    }
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, fetched };
}

/* ------------------------------------------------------------------
   AI Performance Audit (review-based analysis)
   ------------------------------------------------------------------ */

export async function runPerformanceAudit(
  listingId: string
): Promise<{ error: string } | { success: true; audit: PerformanceAuditResult }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, store, category, current_version, rating, reviews_count")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const { data: reviews } = await supabase
    .from("app_store_reviews")
    .select("id, listing_id, store, review_id, author, rating, title, text, sentiment, topics, ai_reply, reply_sent, review_date, created_at")
    .eq("listing_id", listingId)
    .order("review_date", { ascending: false })
    .limit(200);

  const { data: topics } = await supabase
    .from("app_store_review_topics")
    .select("topic, category, mention_count")
    .eq("listing_id", listingId)
    .eq("category", "bug");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewList = (reviews ?? []) as any;
  const perfReviews = classifyPerformanceReviews(reviewList);
  const breakdown = getPerformanceBreakdown(perfReviews);

  const catSummary = breakdown
    .filter((b) => b.count > 0)
    .map((b) => `- ${b.label}: ${b.count} reviews`)
    .join("\n");

  const sampleReviews = perfReviews
    .slice(0, 20)
    .map((r) => `[${r.rating}★ | ${r.perfCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}] ${r.title ?? ""} — ${r.text ?? ""}`)
    .join("\n---\n");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bugTopicsList = (topics ?? [])
    .map((t: any) => `${t.topic} (${t.mention_count} mentions)`)
    .join(", ");

  const totalReviews = reviewList.length;
  const hasReviews = totalReviews > 0;
  const hasPerfReviews = perfReviews.length > 0;

  const prompt = `You are a senior mobile app performance engineer. ${hasPerfReviews ? "Analyze this app's performance issues from user reviews" : hasReviews ? "This app has reviews but no performance complaints detected — provide proactive performance recommendations" : "This app has no reviews yet — provide a proactive performance audit based on the app metadata"} and provide a structured audit.

APP: ${listing.app_name ?? "Unknown"}
STORE: ${listing.store ?? "unknown"}
CATEGORY: ${listing.category ?? "unknown"}
VERSION: ${listing.current_version ?? "unknown"}
RATING: ${listing.rating ?? "N/A"}/5 (${listing.reviews_count ?? 0} reviews)
${hasPerfReviews ? `
PERFORMANCE ISSUE BREAKDOWN:
${catSummary}
Total: ${perfReviews.length} performance-related reviews out of ${totalReviews} total (${Math.round((perfReviews.length / totalReviews) * 100)}%)

BUG TOPICS IDENTIFIED: ${bugTopicsList || "None extracted yet"}

SAMPLE PERFORMANCE REVIEWS:
${sampleReviews.slice(0, 4000)}` : hasReviews ? `
REVIEW SUMMARY: ${totalReviews} reviews found but none mention performance issues.
BUG TOPICS: ${bugTopicsList || "None"}` : `
NOTE: No reviews available yet. Base your audit on general ${listing.store === "google" ? "Android" : listing.store === "apple" ? "iOS" : "mobile"} app performance best practices for the "${listing.category ?? "general"}" category.`}

Provide your analysis in this JSON format:
{
  "topIssues": "Markdown list of the top 3-5 ${hasPerfReviews ? "performance issues from reviews, each with severity (Critical/High/Medium) and affected user %" : "performance risks and areas to monitor for this type of app"}",
  "rootCauses": "Markdown analysis of ${hasPerfReviews ? "likely root causes based on the review patterns. Be technical and specific." : "common performance pitfalls for this app category and store. Be technical and specific."}",
  "priorityFixes": "Markdown numbered list of 5-7 actionable ${hasPerfReviews ? "fixes" : "preventive measures"} ordered by impact. Include specific technical recommendations.",
  "actionPlan": "Markdown 30-day action plan broken into Week 1, Week 2, Week 3-4 with specific tasks."
}`;

  const result = await aiChat(prompt, {
    temperature: 0.5,
    maxTokens: 2000,
    jsonMode: true,
    context: { feature: "app-store-performance", sub_type: "audit" },
  });

  if (!result?.text) return { error: "AI analysis failed. Please try again." };

  try {
    const parsed = JSON.parse(result.text);
    return {
      success: true,
      audit: {
        topIssues: parsed.topIssues ?? "Unable to parse.",
        rootCauses: parsed.rootCauses ?? "Unable to parse.",
        priorityFixes: parsed.priorityFixes ?? "Unable to parse.",
        actionPlan: parsed.actionPlan ?? "Unable to parse.",
      },
    };
  } catch {
    return {
      success: true,
      audit: {
        topIssues: result.text,
        rootCauses: "",
        priorityFixes: "",
        actionPlan: "",
      },
    };
  }
}
