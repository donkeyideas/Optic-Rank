"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/ai-provider";
import { fetchAppData, fetchGooglePlayReviews, batchCheckKeywordRankings } from "@/lib/app-store/fetcher";
import { trackVersionChange, recordSnapshot } from "@/lib/actions/app-store-versions";

/**
 * Add a new app store listing to a project.
 * Auto-fetches real data from the store after inserting.
 */
export async function addAppListing(
  projectId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const store = formData.get("store") as string;
  const appId = formData.get("app_id") as string;
  const appName = formData.get("app_name") as string;
  const appUrl = formData.get("app_url") as string;
  const category = formData.get("category") as string;

  if (!appName?.trim()) return { error: "App name is required." };
  if (!appId?.trim()) return { error: "App/Bundle ID is required." };
  if (!["apple", "google"].includes(store)) return { error: "Invalid store." };

  const supabase = createAdminClient();

  // Fetch real data from the store
  const storeData = await fetchAppData(store as "apple" | "google", appId.trim());

  const { data: inserted, error } = await supabase.from("app_store_listings").insert({
    project_id: projectId,
    store,
    app_id: appId.trim(),
    app_name: storeData?.app_name ?? appName.trim(),
    app_url: storeData?.app_url ?? (appUrl?.trim() || null),
    category: storeData?.category ?? (category?.trim() || null),
    developer: storeData?.developer ?? null,
    icon_url: storeData?.icon_url ?? null,
    rating: storeData?.rating ?? null,
    reviews_count: storeData?.reviews_count ?? null,
    downloads_estimate: storeData?.downloads_estimate ?? null,
    current_version: storeData?.current_version ?? null,
    description: storeData?.description ?? null,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") return { error: "This app is already being tracked." };
    return { error: error.message };
  }

  // Auto-fetch reviews for Google Play (Apple doesn't have a free reviews API)
  if (store === "google" && inserted?.id) {
    try {
      const reviews = await fetchGooglePlayReviews(appId.trim(), 20);
      for (const r of reviews) {
        const sentiment = r.rating >= 4 ? "positive" : r.rating <= 2 ? "negative" : "neutral";
        await supabase.from("app_store_reviews").upsert({
          listing_id: inserted.id,
          store: "google",
          review_id: r.review_id,
          author: r.author,
          rating: r.rating,
          title: r.title || null,
          text: r.text || null,
          sentiment,
          review_date: r.date || new Date().toISOString(),
        }, { onConflict: "listing_id,review_id" });
      }
    } catch { /* reviews are optional */ }
  }

  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * Refresh an existing app listing with latest store data.
 */
export async function refreshAppListing(
  listingId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("id, store, app_id, current_version")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const storeData = await fetchAppData(
    listing.store as "apple" | "google",
    listing.app_id as string
  );

  if (!storeData) return { error: "Could not fetch data from the store. Check the app ID." };

  // Detect version change before updating
  const oldVersion = listing.current_version as string | null;
  const newVersion = storeData.current_version;
  if (newVersion && newVersion !== oldVersion) {
    await trackVersionChange(listingId, newVersion);
  }

  await supabase.from("app_store_listings").update({
    app_name: storeData.app_name,
    app_url: storeData.app_url,
    category: storeData.category,
    developer: storeData.developer,
    icon_url: storeData.icon_url,
    rating: storeData.rating,
    reviews_count: storeData.reviews_count,
    downloads_estimate: storeData.downloads_estimate,
    current_version: storeData.current_version,
    description: storeData.description,
    last_updated: new Date().toISOString(),
  }).eq("id", listingId);

  // Record daily snapshot for trend tracking
  await recordSnapshot(listingId);

  // Refresh reviews for Google Play
  if (listing.store === "google") {
    try {
      const reviews = await fetchGooglePlayReviews(listing.app_id as string, 20);
      for (const r of reviews) {
        const sentiment = r.rating >= 4 ? "positive" : r.rating <= 2 ? "negative" : "neutral";
        await supabase.from("app_store_reviews").upsert({
          listing_id: listingId,
          store: "google",
          review_id: r.review_id,
          author: r.author,
          rating: r.rating,
          title: r.title || null,
          text: r.text || null,
          sentiment,
          review_date: r.date || new Date().toISOString(),
        }, { onConflict: "listing_id,review_id" });
      }
    } catch { /* reviews are optional */ }
  }

  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * Delete an app store listing.
 */
export async function deleteAppListing(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("app_store_listings").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * Add keywords to track for an app listing.
 */
export async function addAppKeywords(
  listingId: string,
  keywords: string[]
): Promise<{ error: string } | { success: true; added: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  let added = 0;

  for (const keyword of keywords) {
    const clean = keyword.trim().toLowerCase();
    if (!clean) continue;

    const { error } = await supabase.from("app_store_rankings").insert({
      listing_id: listingId,
      keyword: clean,
      country: "US",
    });
    if (!error) added++;
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, added };
}

/**
 * Generate AI reply for an app store review.
 */
export async function generateReviewReply(
  reviewId: string
): Promise<{ error: string } | { success: true; reply: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: review } = await supabase
    .from("app_store_reviews")
    .select("*, app_store_listings(app_name, store)")
    .eq("id", reviewId)
    .single();

  if (!review) return { error: "Review not found." };

  const listing = review.app_store_listings as Record<string, unknown> | null;
  const appName = (listing?.app_name as string) ?? "our app";
  const rating = review.rating as number;
  const title = (review.title as string) ?? "";
  const text = (review.text as string) ?? "";
  const sentiment = (review.sentiment as string) ?? "neutral";

  const prompt = `You are a professional app developer responding to a ${sentiment} review (${rating}/5 stars) for "${appName}".

Review title: "${title}"
Review text: "${text}"

Write a professional, empathetic reply that:
- Thanks the user for their feedback
- Addresses their specific points
- If negative: acknowledges concerns and mentions you're working on improvements
- If positive: expresses appreciation and encourages continued use
- Keeps it concise (2-3 sentences)
- Does NOT use generic/template language

Return ONLY the reply text, no quotes or labels.`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 300 });

  if (!result?.text) {
    // Heuristic fallback
    const fallback = rating >= 4
      ? `Thank you for your ${rating}-star review! We're glad you're enjoying ${appName}. Your feedback helps us improve.`
      : `Thank you for sharing your feedback. We take your concerns seriously and are working on improvements. Please reach out to our support team so we can help resolve your issues.`;

    await supabase
      .from("app_store_reviews")
      .update({ ai_reply: fallback })
      .eq("id", reviewId);

    revalidatePath("/dashboard/app-store");
    return { success: true, reply: fallback };
  }

  await supabase
    .from("app_store_reviews")
    .update({ ai_reply: result.text })
    .eq("id", reviewId);

  revalidatePath("/dashboard/app-store");
  return { success: true, reply: result.text };
}

/**
 * Analyze and score an app store listing for ASO optimization.
 */
export async function analyzeAppListing(
  listingId: string
): Promise<{ error: string } | { success: true; score: number; recommendations: string[] }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  // Heuristic ASO scoring
  let score = 50;
  const recommendations: string[] = [];

  // Title length (30-50 chars ideal for iOS, 30 for Android)
  const titleLen = (listing.app_name as string)?.length ?? 0;
  if (titleLen >= 20 && titleLen <= 50) score += 10;
  else if (titleLen < 20) {
    score -= 5;
    recommendations.push("App title is too short. Include relevant keywords in the title (20-50 characters ideal).");
  } else {
    recommendations.push("App title may be too long. Keep it concise and keyword-rich.");
  }

  // Subtitle
  if (listing.subtitle) score += 8;
  else recommendations.push("Add a subtitle with key features and keywords to improve discoverability.");

  // Description length
  const descLen = (listing.description as string)?.length ?? 0;
  if (descLen >= 500) score += 10;
  else if (descLen > 0) {
    score += 3;
    recommendations.push("Expand your app description to at least 500 characters. Include features, benefits, and keywords.");
  } else {
    recommendations.push("Add a detailed app description with keywords, features, and benefits.");
  }

  // Keywords field (iOS only)
  if (listing.store === "apple") {
    if (listing.keywords_field) score += 8;
    else recommendations.push("Fill in the keywords field in App Store Connect. Use all 100 characters with comma-separated terms.");
  }

  // Rating
  const rating = listing.rating as number | null;
  if (rating !== null) {
    if (rating >= 4.5) score += 12;
    else if (rating >= 4.0) score += 8;
    else if (rating >= 3.5) score += 4;
    else {
      score -= 5;
      recommendations.push(`Your rating (${rating}) is below 3.5. Focus on addressing negative reviews to improve it.`);
    }
  } else {
    recommendations.push("No rating data available yet. Encourage users to rate your app.");
  }

  // Reviews count
  const reviewsCount = listing.reviews_count as number | null;
  if (reviewsCount && reviewsCount >= 100) score += 8;
  else if (reviewsCount && reviewsCount >= 10) score += 4;
  else recommendations.push("Increase your review count. Consider in-app review prompts at key moments of user delight.");

  // Try AI-enhanced analysis
  const aiPrompt = `Analyze this app store listing and provide 3 specific ASO recommendations:

App: "${listing.app_name}"
Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
Category: ${listing.category ?? "Unknown"}
Rating: ${listing.rating ?? "N/A"}
Reviews: ${listing.reviews_count ?? 0}
Description length: ${descLen} characters

Return ONLY a JSON array of 3 recommendation strings. Example: ["Recommendation 1", "Recommendation 2", "Recommendation 3"]`;

  try {
    const aiResult = await aiChat(aiPrompt, { temperature: 0.7, maxTokens: 500 });
    if (aiResult?.text) {
      const match = aiResult.text.match(/\[[\s\S]*?\]/);
      if (match) {
        const aiRecs = JSON.parse(match[0]) as string[];
        recommendations.push(...aiRecs.slice(0, 3));
      }
    }
  } catch { /* AI enhancement is optional */ }

  score = Math.max(0, Math.min(100, score));

  await supabase
    .from("app_store_listings")
    .update({ aso_score: score })
    .eq("id", listingId);

  revalidatePath("/dashboard/app-store");
  return { success: true, score, recommendations };
}

/**
 * Generate AI keyword suggestions for an app listing.
 */
export async function generateAppKeywords(
  listingId: string
): Promise<{ error: string } | { success: true; keywords: string[]; rankings: Array<{ id: string; listing_id: string; keyword: string; position: number | null; country: string; difficulty: number | null; search_volume: number | null; checked_at: string }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_id, app_name, store, category, description")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const prompt = `You are an ASO (App Store Optimization) expert. Generate 15 app store keywords for this app.

App Name: "${listing.app_name}"
Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
Category: ${listing.category ?? "Unknown"}
Description: ${(listing.description as string)?.slice(0, 300) ?? "No description"}

Generate keywords that:
- Mix short-tail (1-2 words) and long-tail (3-4 words) terms
- Include category-relevant terms users would search
- Include competitor app names if applicable
- Focus on high-intent search terms

For each keyword, estimate:
- search_volume: monthly searches (integer, e.g. 10000, 500, 50000)
- difficulty: competition score 0-100 (0=easy, 100=hardest)

Return ONLY a JSON array of objects: [{"keyword": "...", "volume": 1000, "difficulty": 45}, ...]`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 500 });

  interface KeywordData {
    keyword: string;
    volume: number | null;
    difficulty: number | null;
  }

  let keywordData: KeywordData[] = [];

  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          keywordData = parsed.map((item: unknown) => {
            if (typeof item === "string") {
              return { keyword: item, volume: null, difficulty: null };
            }
            const obj = item as Record<string, unknown>;
            return {
              keyword: String(obj.keyword ?? obj.term ?? ""),
              volume: typeof obj.volume === "number" ? obj.volume : (typeof obj.search_volume === "number" ? obj.search_volume : null),
              difficulty: typeof obj.difficulty === "number" ? obj.difficulty : null,
            };
          }).filter((d: KeywordData) => d.keyword.length > 0);
        }
      }
    } catch { /* parse error */ }
  }

  // Heuristic fallback
  if (keywordData.length === 0) {
    const name = listing.app_name.toLowerCase();
    const words = name.split(/\s+/).filter((w: string) => w.length > 2);
    const cat = (listing.category ?? "app").toLowerCase();
    const fallbackKws = [
      ...words,
      `best ${cat}`,
      `${cat} app`,
      `free ${cat}`,
      `top ${cat}`,
      `${name}`,
      `${words[0]} app`,
      `${cat} tool`,
      `${cat} for ${listing.store === "apple" ? "iphone" : "android"}`,
    ].slice(0, 15);
    keywordData = fallbackKws.map((kw) => ({ keyword: kw, volume: null, difficulty: null }));
  }

  // Check actual ranking positions by searching the store for each keyword
  const store = listing.store as "apple" | "google";
  const appId = listing.app_id as string;
  const kwStrings = keywordData.map((d) => d.keyword.trim().toLowerCase());
  const positionMap = await batchCheckKeywordRankings(store, appId, kwStrings);

  // Insert keywords as rankings with position, volume, and difficulty
  let added = 0;
  for (const kd of keywordData) {
    const clean = kd.keyword.trim().toLowerCase();
    if (!clean) continue;
    const position = positionMap.get(clean) ?? null;

    const { error } = await supabase.from("app_store_rankings").insert({
      listing_id: listingId,
      keyword: clean,
      country: "US",
      position,
      search_volume: kd.volume,
      difficulty: kd.difficulty,
    });
    if (!error) added++;
  }

  // Read back the inserted rankings so the client can display them immediately
  const { data: insertedRankings } = await supabase
    .from("app_store_rankings")
    .select("id, listing_id, keyword, position, country, difficulty, search_volume, checked_at")
    .eq("listing_id", listingId)
    .order("checked_at", { ascending: false });

  revalidatePath("/dashboard/app-store");
  return {
    success: true,
    keywords: kwStrings.slice(0, added),
    rankings: (insertedRankings ?? []).map((r) => ({
      ...r,
      difficulty: r.difficulty ?? null,
      search_volume: r.search_volume ?? null,
    })) as Array<{
      id: string;
      listing_id: string;
      keyword: string;
      position: number | null;
      country: string;
      difficulty: number | null;
      search_volume: number | null;
      checked_at: string;
    }>,
  };
}

/**
 * Refresh ranking positions for all tracked keywords of a listing.
 * Re-searches the store for each keyword and updates position.
 */
export async function refreshKeywordRankings(
  listingId: string
): Promise<{ error: string } | { success: true; updated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_id, store")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  // Get all unique keywords for this listing
  const { data: rankings } = await supabase
    .from("app_store_rankings")
    .select("id, keyword")
    .eq("listing_id", listingId);

  if (!rankings || rankings.length === 0) return { error: "No keywords to refresh." };

  // Deduplicate keywords
  const uniqueKeywords = [...new Set(rankings.map((r) => r.keyword))];

  // Check positions in the store
  const positionMap = await batchCheckKeywordRankings(
    listing.store as "apple" | "google",
    listing.app_id as string,
    uniqueKeywords
  );

  // Update all rankings with new positions
  let updated = 0;
  for (const r of rankings) {
    const position = positionMap.get(r.keyword) ?? null;
    const { error } = await supabase
      .from("app_store_rankings")
      .update({ position, checked_at: new Date().toISOString() })
      .eq("id", r.id);
    if (!error) updated++;
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, updated };
}
