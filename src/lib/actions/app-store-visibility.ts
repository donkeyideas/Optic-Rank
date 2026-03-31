"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/ai-provider";
import {
  calculateVisibility,
  type VisibilityResult,
} from "@/lib/app-store/visibility";

/**
 * Calculate organic visibility on demand for a listing.
 * Returns the full breakdown so the UI can show top contributors.
 */
export async function calculateAppVisibility(
  listingId: string
): Promise<{ error: string } | { success: true; result: VisibilityResult }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: rankings } = await supabase
    .from("app_store_rankings")
    .select("keyword, position, search_volume")
    .eq("listing_id", listingId);

  if (!rankings || rankings.length === 0) {
    return { error: "No keywords tracked. Generate keywords first." };
  }

  const result = calculateVisibility(
    rankings.map((r) => ({
      keyword: r.keyword,
      position: r.position,
      search_volume: r.search_volume,
    }))
  );

  // Update listing cache
  await supabase
    .from("app_store_listings")
    .update({ visibility_score: result.score })
    .eq("id", listingId);

  revalidatePath("/dashboard/app-store");
  return { success: true, result };
}

export interface VisibilityRecommendation {
  metric: string;
  current: string;
  target: string;
  priority: "high" | "medium" | "low";
  actions: string[];
}

/**
 * Generate AI-powered visibility improvement recommendations
 * based on actual keyword ranking data.
 */
export async function getVisibilityRecommendations(
  listingId: string
): Promise<{ error: string } | { success: true; recommendations: VisibilityRecommendation[] }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Fetch listing + rankings
  const [{ data: listing }, { data: rankings }] = await Promise.all([
    supabase
      .from("app_store_listings")
      .select("app_name, store, category, visibility_score, aso_score, description, title")
      .eq("id", listingId)
      .single(),
    supabase
      .from("app_store_rankings")
      .select("keyword, position, search_volume, difficulty")
      .eq("listing_id", listingId),
  ]);

  if (!listing) return { error: "Listing not found." };
  if (!rankings || rankings.length === 0) return { error: "No keywords tracked." };

  // Deduplicate by keyword (best position)
  const best = new Map<string, typeof rankings[0]>();
  for (const r of rankings) {
    const existing = best.get(r.keyword);
    if (!existing || (r.position != null && (existing.position == null || r.position < existing.position))) {
      best.set(r.keyword, r);
    }
  }
  const deduped = Array.from(best.values());

  // Compute stats for the prompt
  const ranked = deduped.filter((r) => r.position != null && r.position > 0);
  const unranked = deduped.filter((r) => r.position == null || r.position <= 0);
  const top3 = ranked.filter((r) => r.position! <= 3);
  const top10 = ranked.filter((r) => r.position! <= 10);
  const top25 = ranked.filter((r) => r.position! <= 25);
  const avgPos = ranked.length > 0
    ? (ranked.reduce((s, r) => s + (r.position ?? 0), 0) / ranked.length).toFixed(1)
    : "N/A";
  const totalVol = deduped.reduce((s, r) => s + (r.search_volume ?? 0), 0);
  const capturedVol = deduped.reduce((s, r) => {
    if (r.position == null || r.position <= 0) return s;
    const w = r.position <= 3 ? 0.85 : r.position <= 10 ? 0.35 : r.position <= 25 ? 0.15 : 0.05;
    return s + w * (r.search_volume ?? 0);
  }, 0);

  // High-value opportunities (high volume, poor ranking)
  const opportunities = deduped
    .filter((r) => (r.search_volume ?? 0) > 100 && (r.position == null || r.position > 10))
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 5);

  // Near-miss keywords (positions 4-10, close to top 3)
  const nearMiss = ranked
    .filter((r) => r.position! >= 4 && r.position! <= 10)
    .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .slice(0, 5);

  const prompt = `You are a senior ASO (App Store Optimization) strategist. Analyze this app's organic visibility data and provide specific, actionable recommendations to improve each metric.

## App Info
- Name: "${listing.app_name}"
- Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
- Category: ${listing.category ?? "Unknown"}
- Current Visibility Score: ${listing.visibility_score ?? "Not calculated"}/100
- ASO Score: ${listing.aso_score ?? "Not available"}/100

## Keyword Data (${deduped.length} unique keywords)
- Ranked in top 50: ${ranked.length}/${deduped.length}
- Top 3: ${top3.length} | Top 10: ${top10.length} | Top 25: ${top25.length} | Unranked: ${unranked.length}
- Average position: #${avgPos}
- Total search volume: ${totalVol.toLocaleString()}
- Estimated captured volume: ${Math.round(capturedVol).toLocaleString()} (${totalVol > 0 ? Math.round((capturedVol / totalVol) * 100) : 0}%)

## High-Value Opportunities (high volume, not in top 10)
${opportunities.map((o) => `- "${o.keyword}" — vol: ${(o.search_volume ?? 0).toLocaleString()}, pos: ${o.position ?? "unranked"}, difficulty: ${o.difficulty ?? "unknown"}`).join("\n") || "None identified"}

## Near-Miss Keywords (positions 4-10, close to top 3)
${nearMiss.map((n) => `- "${n.keyword}" — vol: ${(n.search_volume ?? 0).toLocaleString()}, pos: #${n.position}`).join("\n") || "None identified"}

## Top Ranked Keywords
${top10.sort((a, b) => (a.position ?? 99) - (b.position ?? 99)).slice(0, 5).map((k) => `- "${k.keyword}" — #${k.position}, vol: ${(k.search_volume ?? 0).toLocaleString()}`).join("\n") || "None in top 10"}

Provide exactly 6 recommendations as a JSON array. Each recommendation must address one of these metrics and explain HOW to improve it with specific steps:

1. **Organization Visibility Score** — how to raise the overall score
2. **Keywords Ranked** — how to get more keywords ranking
3. **Average Position** — how to improve average ranking position
4. **Search Volume** — how to target higher-volume keywords
5. **Volume Captured** — how to capture more of the available search traffic
6. **Quick Wins** — the fastest actions to improve visibility this week

Each item must have:
- "metric": the metric name (e.g., "Visibility Score", "Keywords Ranked", "Average Position", "Search Volume", "Volume Captured", "Quick Wins")
- "current": current value as a string
- "target": realistic 30-day target
- "priority": "high", "medium", or "low"
- "actions": array of 3-4 specific, actionable steps (reference actual keyword names from the data above)

Return ONLY a JSON array, no markdown.`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 2000,
    timeout: 45000,
    jsonMode: true,
    context: {
      feature: "aso_visibility",
      sub_type: "recommendations",
      metadata: { listingId, app_name: listing.app_name },
    },
  });

  if (!result?.text) return { error: "AI provider unavailable. Please try again." };

  try {
    const text = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(text);
    // Handle both raw array and wrapped object (e.g. { "recommendations": [...] })
    const arr = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? (Array.isArray(parsed.recommendations) ? parsed.recommendations : Object.values(parsed).find(Array.isArray))
        : null;
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("Not an array");
    return { success: true, recommendations: arr as VisibilityRecommendation[] };
  } catch {
    return { error: "Failed to parse AI response. Please try again." };
  }
}
