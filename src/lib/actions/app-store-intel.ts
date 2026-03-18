"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";
import { fetchCategoryTopApps } from "@/lib/app-store/fetcher";

/**
 * Fetch top apps in the same category.
 */
export async function getCategoryLeaderboard(
  listingId: string
): Promise<{ error: string } | { success: true; apps: Array<{ app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null; downloads_estimate: number | null }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("store, category")
    .eq("id", listingId)
    .single();

  if (!listing?.category) return { error: "Listing has no category set." };

  const apps = await fetchCategoryTopApps(
    listing.store as "apple" | "google",
    listing.category as string,
    15
  );

  return { success: true, apps };
}

/**
 * Find keyword opportunities (low competition + high relevance).
 */
export async function findKeywordOpportunities(
  listingId: string
): Promise<{ error: string } | { success: true; opportunities: Array<{ keyword: string; estimated_volume: string; competition: string; opportunity_score: number; reason: string }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const [listingRes, rankingsRes] = await Promise.all([
    supabase.from("app_store_listings").select("app_name, store, category, description").eq("id", listingId).single(),
    supabase.from("app_store_rankings").select("keyword, position").eq("listing_id", listingId),
  ]);

  const listing = listingRes.data;
  if (!listing) return { error: "Listing not found." };

  const existingKeywords = (rankingsRes.data ?? []).map((r) => r.keyword);

  const descText = (listing.description as string)?.slice(0, 500);
  if (!descText && !listing.category) {
    return { error: "Not enough app data to find keyword opportunities. Make sure the app has a description and category set." };
  }

  const prompt = `You are an ASO keyword research expert. Find keyword opportunities for this app:

App: "${listing.app_name}"
Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
Category: ${listing.category ?? "Unknown"}
Description: ${descText ?? "N/A"}
Already Tracking: ${existingKeywords.slice(0, 15).join(", ") || "none"}

IMPORTANT: Only suggest keywords that are relevant to the app's actual description and category above. Do NOT suggest keywords for unrelated app categories.

Find 10 keyword opportunities that are:
- NOT already being tracked
- Relevant to the app's features/category
- Mix of low-competition long-tail and moderate-competition short-tail
- Include seasonal/trending terms if applicable

Return ONLY a JSON array:
[{"keyword": "...", "estimated_volume": "high/medium/low", "competition": "high/medium/low", "opportunity_score": 85, "reason": "Low competition, highly relevant"}, ...]`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 800 });

  let opportunities: Array<{ keyword: string; estimated_volume: string; competition: string; opportunity_score: number; reason: string }> = [];
  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      if (match) opportunities = JSON.parse(match[0]);
    } catch { /* parse error */ }
  }

  if (opportunities.length === 0) {
    const cat = (listing.category as string ?? "app").toLowerCase();
    opportunities = [
      { keyword: `best ${cat} 2026`, estimated_volume: "medium", competition: "low", opportunity_score: 80, reason: "Year-specific, low competition" },
      { keyword: `${cat} for beginners`, estimated_volume: "medium", competition: "low", opportunity_score: 75, reason: "Long-tail, intent-rich" },
      { keyword: `free ${cat} app`, estimated_volume: "high", competition: "medium", opportunity_score: 70, reason: "High volume + free modifier" },
    ];
  }

  return { success: true, opportunities };
}

/**
 * Analyze category trends and seasonal patterns.
 */
export async function analyzeCategoryTrends(
  listingId: string
): Promise<{ error: string } | { success: true; analysis: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, store, category")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };
  if (!listing.category) return { error: "No category set for this app. Refresh the app data from the store first." };

  const prompt = `Analyze the current market trends for the "${listing.category}" category on ${listing.store === "apple" ? "Apple App Store" : "Google Play"}.

Include:
1. Current category competitiveness (1-10 scale)
2. Trending features users want in this category
3. Seasonal patterns (which months see higher downloads)
4. Emerging sub-niches or opportunities
5. What successful apps in this category are doing differently in 2026

IMPORTANT: Be specific to the "${listing.category}" category. If you are unsure about specific data points, say so rather than fabricating statistics.

Keep it concise (3-4 paragraphs). Focus on actionable insights for "${listing.app_name}".`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 600 });
  return { success: true, analysis: result?.text ?? "Unable to generate analysis." };
}
