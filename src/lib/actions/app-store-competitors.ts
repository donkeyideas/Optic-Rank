"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/ai-provider";
import { fetchAppData, fetchSimilarApps, fetchAppBySearch } from "@/lib/app-store/fetcher";

/**
 * Add a competitor app to track alongside your listing.
 */
export async function addCompetitorApp(
  listingId: string,
  competitorAppId: string,
  store: "apple" | "google"
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Fetch real data from the store
  const storeData = await fetchAppData(store, competitorAppId.trim());

  const { error } = await supabase.from("app_store_competitors").insert({
    listing_id: listingId,
    competitor_app_id: competitorAppId.trim(),
    competitor_store: store,
    competitor_name: storeData?.app_name ?? competitorAppId,
    competitor_icon_url: storeData?.icon_url ?? null,
    competitor_rating: storeData?.rating ?? null,
    competitor_reviews_count: storeData?.reviews_count ?? null,
    competitor_downloads: storeData?.downloads_estimate ?? null,
    competitor_version: storeData?.current_version ?? null,
    competitor_description: storeData?.description ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "This competitor is already being tracked." };
    return { error: error.message };
  }

  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * Remove a competitor app.
 */
export async function removeCompetitorApp(
  competitorId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("app_store_competitors").delete().eq("id", competitorId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * Refresh all competitor data for a listing.
 */
export async function refreshCompetitors(
  listingId: string
): Promise<{ error: string } | { success: true; updated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: competitors } = await supabase
    .from("app_store_competitors")
    .select("id, competitor_app_id, competitor_store")
    .eq("listing_id", listingId);

  if (!competitors?.length) return { error: "No competitors to refresh." };

  let updated = 0;
  for (const comp of competitors) {
    const storeData = await fetchAppData(
      comp.competitor_store as "apple" | "google",
      comp.competitor_app_id as string
    );
    if (storeData) {
      await supabase.from("app_store_competitors").update({
        competitor_name: storeData.app_name,
        competitor_icon_url: storeData.icon_url,
        competitor_rating: storeData.rating,
        competitor_reviews_count: storeData.reviews_count,
        competitor_downloads: storeData.downloads_estimate,
        competitor_version: storeData.current_version,
        competitor_description: storeData.description,
        last_fetched: new Date().toISOString(),
      }).eq("id", comp.id);
      updated++;
    }
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, updated };
}

/**
 * Auto-discover competitor apps by searching tracked keywords in the store.
 * This finds real competitors — apps that rank for the same keywords.
 * Falls back to category/name search only if no keywords are tracked.
 */
export async function discoverCompetitors(
  listingId: string
): Promise<{ error: string } | { success: true; discovered: Array<{ app_id: string; app_name: string; icon_url: string | null; rating: number | null; store: string }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("store, app_id, app_name, category, description")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const store = listing.store as "apple" | "google";

  // 1. Keyword-based discovery: search by tracked keywords to find real competitors
  const { data: rankings } = await supabase
    .from("app_store_rankings")
    .select("keyword")
    .eq("listing_id", listingId);

  const trackedKeywords = [...new Set((rankings ?? []).map((r) => r.keyword as string))];

  // Score how often each app appears across keyword searches
  const appScores = new Map<string, { app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null; count: number }>();

  if (trackedKeywords.length > 0) {
    // Search up to 6 keywords to avoid rate limits
    const keywordsToSearch = trackedKeywords.slice(0, 6);

    for (const keyword of keywordsToSearch) {
      const results = await fetchAppBySearch(store, keyword, 15);
      for (const app of results) {
        if (app.app_id === listing.app_id) continue;
        const existing = appScores.get(app.app_id);
        if (existing) {
          existing.count += 1;
        } else {
          appScores.set(app.app_id, { ...app, count: 1 });
        }
      }
      // Small delay between searches to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  // 2. Fallback: if no keywords or keyword search found nothing, search by app name/description terms
  if (appScores.size === 0) {
    // Extract core terms from app name for a better search
    const appNameTerms = (listing.app_name as string).toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["app", "the", "for", "and", "pro", "free", "lite"].includes(w));

    const searchQueries = [
      // Full app name
      listing.app_name as string,
      // Core terms as a search query (e.g. "debate platform" from "ArguFight Debate Platform")
      appNameTerms.slice(-2).join(" "),
    ].filter(Boolean);

    for (const query of searchQueries) {
      const results = await fetchAppBySearch(store, query, 15);
      for (const app of results) {
        if (app.app_id === listing.app_id) continue;
        if (!appScores.has(app.app_id)) {
          appScores.set(app.app_id, { ...app, count: 1 });
        }
      }
      if (appScores.size > 0) break;
    }
  }

  // Sort by frequency (apps appearing for more keywords = more relevant competitor)
  const similar = Array.from(appScores.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((app) => ({ app_id: app.app_id, app_name: app.app_name, developer: app.developer, icon_url: app.icon_url, rating: app.rating, store }));

  // Filter out already-tracked competitors and self
  const { data: existing } = await supabase
    .from("app_store_competitors")
    .select("competitor_app_id")
    .eq("listing_id", listingId);
  const trackedIds = new Set((existing ?? []).map((e) => e.competitor_app_id));

  const discovered = similar.filter((app) => !trackedIds.has(app.app_id) && app.app_id !== listing.app_id);

  // Insert discovered competitors with full data from store APIs
  if (discovered.length > 0) {
    const rows = await Promise.all(
      discovered.map(async (app) => {
        const store = (app.store ?? listing.store) as "apple" | "google";
        const storeData = await fetchAppData(store, app.app_id);
        return {
          listing_id: listingId,
          competitor_app_id: app.app_id,
          competitor_store: store,
          competitor_name: storeData?.app_name ?? app.app_name,
          competitor_icon_url: storeData?.icon_url ?? app.icon_url ?? null,
          competitor_rating: storeData?.rating ?? (app.rating != null ? Number(app.rating) : null),
          competitor_reviews_count: storeData?.reviews_count ?? null,
          competitor_downloads: storeData?.downloads_estimate ?? null,
          competitor_version: storeData?.current_version ?? null,
          competitor_description: storeData?.description ?? null,
        };
      })
    );

    await supabase
      .from("app_store_competitors")
      .upsert(rows, { onConflict: "listing_id,competitor_store,competitor_app_id", ignoreDuplicates: true });
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, discovered };
}

/**
 * Search for competitor apps by name.
 */
export async function searchCompetitorApps(
  store: "apple" | "google",
  query: string
): Promise<{ error: string } | { success: true; results: Array<{ app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const results = await fetchAppBySearch(store, query, 10);
  return { success: true, results };
}

/**
 * Analyze keyword gap between your app and competitors.
 */
export async function analyzeCompetitorGap(
  listingId: string
): Promise<{ error: string } | { success: true; analysis: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const [listingRes, competitorsRes, rankingsRes] = await Promise.all([
    supabase.from("app_store_listings").select("app_name, category, description").eq("id", listingId).single(),
    supabase.from("app_store_competitors").select("competitor_name, competitor_description").eq("listing_id", listingId),
    supabase.from("app_store_rankings").select("keyword, position").eq("listing_id", listingId),
  ]);

  const listing = listingRes.data;
  const competitors = competitorsRes.data ?? [];
  const rankings = rankingsRes.data ?? [];

  if (!listing) return { error: "Listing not found." };

  if (competitors.length === 0) {
    return { error: "No competitors tracked yet. Add competitors first using 'Add Competitor' or 'Auto-Discover', then run gap analysis." };
  }

  const keywordSection = rankings.length > 0
    ? `Your Keywords (${rankings.length}): ${rankings.slice(0, 20).map((r) => `${r.keyword} (#${r.position ?? "?"})`).join(", ")}`
    : "Your Keywords: None tracked yet";

  const prompt = `You are an ASO strategist. Analyze the competitive landscape:

YOUR APP: "${listing.app_name}"
Category: ${listing.category ?? "Unknown"}
${keywordSection}

COMPETITORS (${competitors.length}):
${competitors.map((c) => `- ${c.competitor_name}: ${(c.competitor_description as string)?.slice(0, 150) ?? "No description"}`).join("\n")}

IMPORTANT: Only analyze based on the actual competitor and keyword data provided above. Do NOT fabricate competitor names, keyword rankings, or market positions not present in this data.

Provide:
1. Keywords your competitors likely rank for that you're missing (5-8 keywords based on competitor descriptions)
2. Your competitive advantages based on keyword coverage
3. 3 specific actions to improve your competitive position

Return as a structured analysis (not JSON).`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 800,
    context: { feature: "aso_competitor_gap", metadata: { listingId } },
  });
  return { success: true, analysis: result?.text ?? "Unable to generate analysis. Please try again." };
}
