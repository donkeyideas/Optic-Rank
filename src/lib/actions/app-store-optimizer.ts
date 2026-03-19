"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";

/**
 * Score metadata in real-time (called on debounced keystrokes).
 * Returns a score 0-100 and specific recommendations.
 */
export async function scoreMetadata(
  store: "apple" | "google",
  title: string,
  subtitle: string,
  description: string,
  keywordsField: string
): Promise<{ score: number; recommendations: string[] }> {
  let score = 0;
  const recs: string[] = [];

  // Title scoring (max 25 pts)
  const maxTitle = store === "apple" ? 30 : 50;
  const titleLen = title.trim().length;
  if (titleLen >= 15 && titleLen <= maxTitle) {
    score += 25;
  } else if (titleLen > 0 && titleLen < 15) {
    score += 10;
    recs.push(`Title too short (${titleLen}/${maxTitle} chars). Add keywords to improve discoverability.`);
  } else if (titleLen > maxTitle) {
    score += 15;
    recs.push(`Title exceeds ${maxTitle} chars — it may be truncated in search results.`);
  } else {
    recs.push("Add a title with relevant keywords.");
  }

  // Subtitle scoring (max 15 pts, iOS only)
  if (store === "apple") {
    const subLen = subtitle.trim().length;
    if (subLen >= 10 && subLen <= 30) {
      score += 15;
    } else if (subLen > 0) {
      score += 8;
      recs.push("Subtitle should be 10-30 chars with key feature/keyword.");
    } else {
      recs.push("Add a subtitle — it's indexed by Apple for keyword ranking.");
    }
  } else {
    // Android: short description equivalent
    score += subtitle.trim().length > 0 ? 15 : 0;
    if (!subtitle.trim()) recs.push("Add a short description (80 chars max) with primary keywords.");
  }

  // Description scoring (max 25 pts)
  const descLen = description.trim().length;
  if (descLen >= 1000) score += 25;
  else if (descLen >= 500) { score += 18; recs.push("Expand description to 1000+ chars for better keyword coverage."); }
  else if (descLen >= 200) { score += 10; recs.push("Description is too short. Aim for 1000+ characters with features, benefits, and keywords."); }
  else if (descLen > 0) { score += 5; recs.push("Very short description. Add detailed features, benefits, use cases, and keywords."); }
  else recs.push("Add a description — it's critical for both stores' ranking algorithms.");

  // Keywords field (max 15 pts, iOS only)
  if (store === "apple") {
    const kwLen = keywordsField.trim().length;
    if (kwLen >= 80 && kwLen <= 100) score += 15;
    else if (kwLen >= 50) { score += 10; recs.push(`Keywords field: ${kwLen}/100 chars used. Fill remaining space with relevant terms.`); }
    else if (kwLen > 0) { score += 5; recs.push(`Only ${kwLen}/100 keyword chars used. Maximize this field with comma-separated terms.`); }
    else recs.push("Keywords field is empty! Use all 100 characters with comma-separated keywords.");
  } else {
    score += 15; // Android doesn't have a separate keywords field
  }

  // Keyword density bonus (max 10 pts)
  const keywords = keywordsField.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  const descLower = description.toLowerCase();
  const titleLower = title.toLowerCase();
  let kwInDesc = 0;
  let kwInTitle = 0;
  for (const kw of keywords) {
    if (descLower.includes(kw)) kwInDesc++;
    if (titleLower.includes(kw)) kwInTitle++;
  }
  if (keywords.length > 0) {
    const descRatio = kwInDesc / keywords.length;
    const titleRatio = kwInTitle / Math.min(keywords.length, 3);
    score += Math.round((descRatio * 5) + (titleRatio * 5));
    if (descRatio < 0.5) recs.push("Include more target keywords naturally in your description.");
  }

  // Readability bonus (max 10 pts)
  const sentences = description.split(/[.!?]+/).filter(Boolean);
  const avgSentenceLen = sentences.length > 0 ? description.split(/\s+/).length / sentences.length : 0;
  if (avgSentenceLen >= 10 && avgSentenceLen <= 20) score += 10;
  else if (avgSentenceLen > 0) { score += 5; recs.push("Improve readability: aim for 10-20 words per sentence."); }

  return { score: Math.min(100, Math.max(0, score)), recommendations: recs };
}

/**
 * Generate optimized title variants using AI.
 */
export async function generateTitleVariants(
  listingId: string,
  targetKeywords: string[] = []
): Promise<{ error: string } | { success: true; variants: Array<{ title: string; score: number; reason: string }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, store, category, description")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const maxLen = listing.store === "apple" ? 30 : 50;
  const kwList = targetKeywords.length > 0 ? targetKeywords.join(", ") : "inferred from app description";

  const descText = (listing.description as string)?.slice(0, 300) ?? "N/A";

  const prompt = `Generate 5 optimized app store titles for this app:

App: "${listing.app_name}"
Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
Category: ${listing.category ?? "Unknown"}
Target Keywords: ${kwList}
Max Length: ${maxLen} characters
Description: ${descText}

For each title:
- HARD LIMIT: Each title MUST be ${maxLen} characters or fewer (count every character including spaces, colons, dashes). Any title over ${maxLen} chars is invalid.
- Include the brand name "${listing.app_name}" or a close variant
- Optimize for keyword ranking
- Only reference features/capabilities that appear in the description above

Return ONLY a JSON array: [{"title": "...", "score": 85, "reason": "Includes brand + primary keyword"}, ...]`;

  const result = await aiChat(prompt, { temperature: 0.8, maxTokens: 600 });

  let variants: Array<{ title: string; score: number; reason: string }> = [];
  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      if (match) variants = JSON.parse(match[0]);
    } catch { /* parse error */ }
  }

  // Enforce character limit: drop variants that exceed maxLen, trim whitespace
  variants = variants
    .map((v) => ({ ...v, title: v.title.trim() }))
    .filter((v) => v.title.length <= maxLen && v.title.length > 0);

  if (variants.length === 0) {
    const name = (listing.app_name as string).slice(0, maxLen);
    const cat = (listing.category as string ?? "App").toLowerCase();
    const fallbacks = [
      { title: `${name} - Best ${cat}`, score: 70, reason: "Brand + category keyword" },
      { title: `${name}: ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, score: 65, reason: "Brand + generic keyword" },
      { title: `${name} — #1 ${cat}`, score: 60, reason: "Brand + ranking claim" },
    ];
    variants = fallbacks
      .map((v) => ({ ...v, title: v.title.slice(0, maxLen) }))
      .filter((v) => v.title.length > 0);
  }

  return { success: true, variants };
}

/**
 * Generate optimized subtitle / short description using AI.
 */
export async function generateSubtitleVariant(
  listingId: string
): Promise<{ error: string } | { success: true; subtitle: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, store, category, description, subtitle")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const isApple = listing.store === "apple";
  const maxLen = isApple ? 30 : 80;
  const fieldName = isApple ? "Subtitle" : "Short Description";

  const prompt = `Generate an optimized ${fieldName} for this ${isApple ? "Apple App Store" : "Google Play"} listing:

App: "${listing.app_name}"
Category: ${listing.category ?? "Unknown"}
Description: "${(listing.description as string)?.slice(0, 500) ?? "N/A"}"
Current ${fieldName}: "${listing.subtitle ?? "none"}"

Requirements:
- MUST be ${maxLen} characters or fewer
- Include the most important keyword for discoverability
- Be compelling and descriptive${isApple ? "\n- Apple indexes the subtitle for keyword ranking — make every word count" : "\n- Google Play shows this in search results — make it compelling"}

Return ONLY the optimized ${fieldName} text (no quotes, no explanation).`;

  const result = await aiChat(prompt, { temperature: 0.8, maxTokens: 100 });
  const subtitle = result?.text?.replace(/^["']|["']$/g, "").trim().slice(0, maxLen) ?? "";

  return { success: true, subtitle };
}

/**
 * Generate optimized description using AI.
 */
export async function generateDescriptionVariant(
  listingId: string
): Promise<{ error: string } | { success: true; description: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, store, category, description")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const prompt = `Rewrite this app store description to be fully optimized for ASO:

App: "${listing.app_name}"
Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
Category: ${listing.category ?? "Unknown"}
Current Description: "${(listing.description as string)?.slice(0, 2000) ?? "No current description"}"

Requirements:
- Start with a compelling hook (first 3 lines visible before "Read More")
- Include relevant keywords naturally throughout
- Use bullet points or short paragraphs for features
- Include a call-to-action at the end
- 1000-2000 characters optimal
- ${listing.store === "google" ? "Google Play indexes the full description for keywords" : "Apple indexes only title, subtitle, and keyword field — description is for conversion, not keywords"}

Return ONLY the optimized description text.`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 2000 });
  return { success: true, description: result?.text ?? "Unable to generate description. Please try again." };
}

/**
 * Generate optimized iOS keyword field (100 chars max).
 */
export async function generateKeywordField(
  listingId: string
): Promise<{ error: string } | { success: true; keywords: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, category, description, keywords_field")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const prompt = `Generate an optimized iOS App Store keyword field for this app:

App: "${listing.app_name}"
Category: ${listing.category ?? "Unknown"}
Description: ${(listing.description as string)?.slice(0, 500) ?? "N/A"}
Current Keywords: "${listing.keywords_field ?? "none"}"

Rules:
- EXACTLY 100 characters max (comma-separated, no spaces after commas)
- Do NOT include the app name (Apple already indexes it)
- Do NOT include the category name
- Include misspellings of common search terms
- Mix singular and plural forms
- Use every character — don't waste space

Return ONLY the keyword string (e.g., "fitness,workout,exercise,gym,training,health").`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 200 });
  const keywords = result?.text?.replace(/["\n]/g, "").slice(0, 100) ?? "";

  return { success: true, keywords };
}
