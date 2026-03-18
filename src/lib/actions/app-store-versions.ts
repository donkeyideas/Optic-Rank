"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";

/**
 * Track a version change for a listing.
 * Called during refreshAppListing when version changes.
 */
export async function trackVersionChange(
  listingId: string,
  newVersion: string,
  releaseNotes?: string
): Promise<void> {
  const supabase = createAdminClient();

  // Get current metrics for snapshot
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("rating, reviews_count, downloads_estimate")
    .eq("id", listingId)
    .single();

  await supabase.from("app_store_versions").upsert({
    listing_id: listingId,
    version: newVersion,
    release_date: new Date().toISOString(),
    release_notes: releaseNotes ?? null,
    rating_at_release: listing?.rating ?? null,
    reviews_at_release: listing?.reviews_count ?? null,
    downloads_at_release: listing?.downloads_estimate ?? null,
  }, { onConflict: "listing_id,version" });
}

/**
 * Record a daily snapshot of listing metrics.
 * Called during refresh or on a cron schedule.
 */
export async function recordSnapshot(
  listingId: string
): Promise<void> {
  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("rating, reviews_count, downloads_estimate, aso_score")
    .eq("id", listingId)
    .single();

  if (!listing) return;

  await supabase.from("app_store_snapshots").upsert({
    listing_id: listingId,
    rating: listing.rating,
    reviews_count: listing.reviews_count,
    downloads_estimate: listing.downloads_estimate,
    aso_score: listing.aso_score,
    snapshot_date: new Date().toISOString().split("T")[0],
  }, { onConflict: "listing_id,snapshot_date" });
}

/**
 * Analyze the impact of a specific version update.
 */
export async function analyzeUpdateImpact(
  listingId: string,
  versionId: string
): Promise<{ error: string } | { success: true; analysis: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const [versionRes, versionsRes, snapshotsRes, reviewsRes, listingRes] = await Promise.all([
    supabase.from("app_store_versions").select("*").eq("id", versionId).single(),
    supabase.from("app_store_versions").select("*").eq("listing_id", listingId).order("detected_at", { ascending: false }).limit(5),
    supabase.from("app_store_snapshots").select("*").eq("listing_id", listingId).order("snapshot_date", { ascending: false }).limit(30),
    supabase.from("app_store_reviews").select("rating, sentiment, review_date").eq("listing_id", listingId).order("review_date", { ascending: false }).limit(50),
    supabase.from("app_store_listings").select("app_name, category, store").eq("id", listingId).single(),
  ]);

  const version = versionRes.data;
  if (!version) return { error: "Version not found." };

  const appListing = listingRes.data;
  const versions = versionsRes.data ?? [];
  const snapshots = snapshotsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  // Find previous version for comparison
  const versionIdx = versions.findIndex((v) => v.id === versionId);
  const prevVersion = versionIdx < versions.length - 1 ? versions[versionIdx + 1] : null;

  const ratingChange = prevVersion
    ? ((version.rating_at_release as number) ?? 0) - ((prevVersion.rating_at_release as number) ?? 0)
    : 0;

  // Sentiment breakdown of reviews after this version
  const versionDate = version.detected_at as string;
  const recentReviews = reviews.filter((r) => (r.review_date as string) >= versionDate);
  const positiveCount = recentReviews.filter((r) => r.sentiment === "positive").length;
  const negativeCount = recentReviews.filter((r) => r.sentiment === "negative").length;

  const snapshotLines = snapshots.length > 0
    ? snapshots.slice(0, 10).map((s) => `${s.snapshot_date}: ${s.rating}★, ${s.reviews_count} reviews`).join("\n")
    : "No snapshot data available yet.";

  const prompt = `Analyze the impact of this app update for "${appListing?.app_name ?? "this app"}" (${appListing?.category ?? "Unknown category"}, ${appListing?.store === "apple" ? "iOS" : "Android"}):

Version: ${version.version}
Release Notes: "${version.release_notes ?? "No release notes"}"
Rating Change: ${ratingChange >= 0 ? "+" : ""}${ratingChange.toFixed(2)} stars
New Reviews Since Update: ${recentReviews.length} (${positiveCount} positive, ${negativeCount} negative)
Previous Version: ${prevVersion?.version ?? "N/A (first tracked version)"}

Recent snapshots (last 30 days):
${snapshotLines}

IMPORTANT: Only analyze data that is actually present above. If there are no reviews, snapshots, or a previous version to compare against, say so clearly. Do NOT fabricate trends or issues that aren't evidenced by the data.

Provide:
1. Summary of update impact (1-2 sentences)
2. Rating trend analysis (based on actual snapshot data)
3. User sentiment shift (based on actual review counts)
4. What to monitor going forward

Keep it concise (3-4 paragraphs).`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 500 });

  return { success: true, analysis: result?.text ?? `Version ${version.version}: Rating ${ratingChange >= 0 ? "+" : ""}${ratingChange.toFixed(2)}, ${recentReviews.length} new reviews.` };
}

/**
 * Get AI recommendations for the next update based on review intelligence.
 */
export async function getUpdateRecommendations(
  listingId: string
): Promise<{ error: string } | { success: true; recommendations: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const [listingRes, topicsRes, reviewsRes] = await Promise.all([
    supabase.from("app_store_listings").select("app_name, current_version, description, category, store, rating, reviews_count").eq("id", listingId).single(),
    supabase.from("app_store_review_topics").select("topic, category, mention_count, sentiment_avg").eq("listing_id", listingId).order("mention_count", { ascending: false }).limit(15),
    supabase.from("app_store_reviews").select("rating, text, sentiment").eq("listing_id", listingId).order("review_date", { ascending: false }).limit(20),
  ]);

  const listing = listingRes.data;
  if (!listing) return { error: "Listing not found." };

  const topics = topicsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const hasReviewData = reviews.length > 0 || topics.length > 0;

  const topicLines = topics.length > 0
    ? topics.map((t) => `- ${t.topic} (${t.category}, ${t.mention_count} mentions, avg sentiment: ${t.sentiment_avg})`).join("\n")
    : "No extracted topics yet.";

  const reviewLines = reviews.length > 0
    ? reviews.slice(0, 10).map((r) => `[${r.rating}★] ${(r.text as string)?.slice(0, 100)}`).join("\n")
    : "No reviews available yet.";

  const prompt = hasReviewData
    ? `Based on real user feedback, recommend what "${listing.app_name}" (v${listing.current_version ?? "?"}) should focus on in the next update.

App Info:
- Category: ${listing.category ?? "Unknown"}
- Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
- Current Rating: ${listing.rating ?? "N/A"}
- Total Reviews: ${listing.reviews_count ?? 0}
- Description: "${(listing.description as string)?.slice(0, 300) ?? "N/A"}"

Top Review Topics:
${topicLines}

Recent Review Excerpts:
${reviewLines}

IMPORTANT: Only reference issues and themes that actually appear in the review data above. Do NOT fabricate or assume problems that aren't mentioned in the reviews. Base every recommendation on specific evidence from the data provided.

Provide:
1. Top 3 priorities for the next update (with reasoning tied to specific review feedback)
2. Quick wins that would improve ratings (based on actual complaints)
3. Feature requests to consider (only if mentioned in reviews)

Format as a structured, actionable list.`
    : `You are an ASO (App Store Optimization) expert. Provide strategic recommendations for the next update of this app based on its metadata and category best practices.

App Info:
- Name: "${listing.app_name}"
- Version: ${listing.current_version ?? "Unknown"}
- Category: ${listing.category ?? "Unknown"}
- Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
- Current Rating: ${listing.rating ?? "New app (no rating yet)"}
- Total Reviews: ${listing.reviews_count ?? 0}
- Description: "${(listing.description as string)?.slice(0, 300) ?? "N/A"}"

This app has no user reviews yet. Based ONLY on the app's description, category, and store, provide:

1. **Launch & Growth Priorities** — 3 strategic priorities for a new/early-stage app in the "${listing.category ?? "Unknown"}" category to gain traction
2. **ASO Quick Wins** — Actionable metadata optimizations (title, subtitle, description, keywords, screenshots) based on ${listing.store === "apple" ? "Apple App Store" : "Google Play"} best practices for this category
3. **Early Review Strategy** — How to earn initial positive reviews and ratings

IMPORTANT: Base recommendations ONLY on the app description and category provided above. Do NOT invent features, complaints, or issues that are not evident from the description. Be specific to this app's actual purpose.

Format as a structured, actionable list.`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 600 });
  return { success: true, recommendations: result?.text ?? "Unable to generate recommendations." };
}
