"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";

/**
 * Fetch full context for a listing: keywords, competitors, review topics.
 * Used by AI generators to produce data-informed suggestions.
 */
async function getListingContext(listingId: string) {
  const supabase = createAdminClient();
  const [rankingsRes, competitorsRes, topicsRes, localizationsRes, listingRes] = await Promise.all([
    supabase
      .from("app_store_rankings")
      .select("keyword, position, search_volume, difficulty")
      .eq("listing_id", listingId)
      .order("position", { ascending: true, nullsFirst: false }),
    supabase
      .from("app_store_competitors")
      .select("competitor_name, competitor_description, competitor_rating, competitor_downloads")
      .eq("listing_id", listingId)
      .limit(5),
    supabase
      .from("review_topics")
      .select("topic, category, mention_count, sentiment_avg")
      .eq("listing_id", listingId)
      .order("mention_count", { ascending: false })
      .limit(10),
    supabase
      .from("app_store_localizations")
      .select("country_code, opportunity_score")
      .eq("listing_id", listingId)
      .order("opportunity_score", { ascending: false })
      .limit(5),
    supabase
      .from("app_store_listings")
      .select("visibility_score, aso_score")
      .eq("id", listingId)
      .maybeSingle(),
  ]);

  const rankings = (rankingsRes.data ?? []) as Array<{ keyword: string; position: number | null; search_volume: number | null; difficulty: number | null }>;
  const competitors = (competitorsRes.data ?? []) as Array<{ competitor_name: string; competitor_description: string | null; competitor_rating: number | null; competitor_downloads: number | null }>;
  const topics = (topicsRes.data ?? []) as Array<{ topic: string; category: string; mention_count: number; sentiment_avg: number | null }>;
  const localizations = (localizationsRes.data ?? []) as Array<{ country_code: string; opportunity_score: number | null }>;

  // Build keyword context string
  const topKeywords = rankings.slice(0, 20);
  const keywordsContext = topKeywords.length > 0
    ? `TRACKED KEYWORDS (${rankings.length} total, top 20 by position):\n${topKeywords.map((k) => `  - "${k.keyword}" → position: ${k.position ?? ">250"}, volume: ${k.search_volume?.toLocaleString() ?? "?"}/mo, difficulty: ${k.difficulty ?? "?"}`).join("\n")}`
    : "TRACKED KEYWORDS: None tracked yet";

  // High-value keywords (high volume, good position)
  const highValueKw = rankings
    .filter((k) => k.position != null && k.position <= 50 && (k.search_volume ?? 0) >= 1000)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 10)
    .map((k) => k.keyword);

  // Weak keywords (ranked but poorly)
  const weakKw = rankings
    .filter((k) => k.position != null && k.position > 50)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 5)
    .map((k) => k.keyword);

  // Competitor context
  const competitorContext = competitors.length > 0
    ? `TOP COMPETITORS (${competitors.length}):\n${competitors.map((c) => `  - ${c.competitor_name} (rating: ${c.competitor_rating ?? "?"}, downloads: ${c.competitor_downloads?.toLocaleString() ?? "?"}): ${(c.competitor_description ?? "").slice(0, 150)}`).join("\n")}`
    : "";

  // Review insights
  const featureRequests = topics.filter((t) => t.category === "feature_request").map((t) => t.topic);
  const praises = topics.filter((t) => t.category === "praise").map((t) => t.topic);
  const complaints = topics.filter((t) => t.category === "complaint" || t.category === "bug").map((t) => t.topic);

  const reviewContext = topics.length > 0
    ? `USER REVIEW INSIGHTS:\n${praises.length > 0 ? `  Praised: ${praises.slice(0, 3).join(", ")}\n` : ""}${featureRequests.length > 0 ? `  Requested: ${featureRequests.slice(0, 3).join(", ")}\n` : ""}${complaints.length > 0 ? `  Complaints: ${complaints.slice(0, 3).join(", ")}` : ""}`
    : "";

  // Build visibility context from scores + ranking data
  const visScore = listingRes.data?.visibility_score as number | null;
  const asoScore = listingRes.data?.aso_score as number | null;

  // Compute visibility metrics from rankings
  const ranked = rankings.filter((r) => r.position != null && r.position > 0);
  const totalVol = rankings.reduce((s, r) => s + (r.search_volume ?? 0), 0);
  const capturedVol = rankings.reduce((s, r) => {
    if (r.position == null || r.position <= 0) return s;
    const w = r.position <= 3 ? 0.85 : r.position <= 10 ? 0.35 : r.position <= 25 ? 0.15 : 0.05;
    return s + w * (r.search_volume ?? 0);
  }, 0);
  const capturePct = totalVol > 0 ? Math.round((capturedVol / totalVol) * 100) : 0;

  // Near-miss keywords (positions 4-10, high value — best optimization targets)
  const nearMiss = ranked
    .filter((r) => r.position! >= 4 && r.position! <= 10 && (r.search_volume ?? 0) > 0)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 5);

  // Unranked high-volume keywords (biggest missed opportunities)
  const unrankedHighVol = rankings
    .filter((r) => (r.position == null || r.position <= 0) && (r.search_volume ?? 0) > 100)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
    .slice(0, 5);

  const visibilityContext = [
    `VISIBILITY INTELLIGENCE:`,
    `  Visibility Score: ${visScore ?? "Not calculated"}/100 | ASO Score: ${asoScore ?? "Not calculated"}/100`,
    `  Keywords ranked: ${ranked.length}/${rankings.length} | Volume captured: ${capturePct}% (${Math.round(capturedVol).toLocaleString()} of ${totalVol.toLocaleString()})`,
    nearMiss.length > 0
      ? `  NEAR-MISS KEYWORDS (positions 4-10 — include these in title/subtitle to push to top 3):\n${nearMiss.map((k) => `    - "${k.keyword}" #${k.position} (${(k.search_volume ?? 0).toLocaleString()} vol)`).join("\n")}`
      : "",
    unrankedHighVol.length > 0
      ? `  UNRANKED HIGH-VOLUME KEYWORDS (not ranking — MUST include in listing):\n${unrankedHighVol.map((k) => `    - "${k.keyword}" (${(k.search_volume ?? 0).toLocaleString()} vol)`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  return {
    rankings,
    competitors,
    topics,
    localizations,
    keywordsContext,
    highValueKw,
    weakKw,
    competitorContext,
    reviewContext,
    visibilityContext,
    featureRequests,
    praises,
    complaints,
  };
}

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
  const maxTitle = 30; // Both stores limit titles to 30 characters
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
 * Generate optimized title variants using AI — informed by tracked keywords, competitors, and reviews.
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

  const ctx = await getListingContext(listingId);
  const maxLen = 30;

  // Use tracked high-value keywords if user didn't specify target keywords
  const kwList = targetKeywords.length > 0
    ? targetKeywords.join(", ")
    : ctx.highValueKw.length > 0
      ? ctx.highValueKw.slice(0, 5).join(", ")
      : "inferred from app description";

  const descText = (listing.description as string)?.slice(0, 300) ?? "N/A";

  const prompt = `Generate 5 optimized app store titles for this app. GOAL: Maximize organic visibility — the title is the #1 ranking factor. Every character must target high-impact keywords.

App: "${listing.app_name}"
Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
Category: ${listing.category ?? "Unknown"}
Max Length: ${maxLen} characters
Description: ${descText}

${ctx.keywordsContext}
${ctx.competitorContext ? `\n${ctx.competitorContext}` : ""}
${ctx.reviewContext ? `\n${ctx.reviewContext}` : ""}

PRIORITY KEYWORDS to include: ${kwList}
${ctx.weakKw.length > 0 ? `OPPORTUNITY KEYWORDS (currently ranked poorly, worth targeting): ${ctx.weakKw.join(", ")}` : ""}

${ctx.visibilityContext}

For each title:
- HARD LIMIT: Each title MUST be ${maxLen} characters or fewer (count every character including spaces, colons, dashes). Any title over ${maxLen} chars is invalid.
- NEAR-MISS keywords (positions 4-10) get TOP PRIORITY — including them in the title can push them to top 3, giving the biggest visibility boost
- Include the brand name "${listing.app_name}" or a close variant
- Pack remaining space with the highest-volume keywords that fit naturally
- Differentiate from competitor titles listed above
- Score should reflect expected VISIBILITY IMPACT, not just quality

Return ONLY a JSON array: [{"title": "...", "score": 85, "reason": "Targets near-miss keyword X + high-volume keyword Y"}, ...]`;

  const result = await aiChat(prompt, {
    temperature: 0.8,
    maxTokens: 600,
    context: { feature: "aso_optimizer", sub_type: "title_variants", metadata: { listingId } },
  });

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
 * Generate optimized subtitle / short description using AI — informed by keyword data and competitor intel.
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

  const ctx = await getListingContext(listingId);
  const isApple = listing.store === "apple";
  const maxLen = isApple ? 30 : 80;
  const fieldName = isApple ? "Subtitle" : "Short Description";

  const prompt = `Generate an optimized ${fieldName} for this ${isApple ? "Apple App Store" : "Google Play"} listing. GOAL: Maximize organic visibility — the ${fieldName.toLowerCase()} is a key ranking signal.${isApple ? " Apple indexes every word in the subtitle for search." : " Google shows this in search results — it must be keyword-rich AND compelling."}

App: "${listing.app_name}"
Category: ${listing.category ?? "Unknown"}
Description: "${(listing.description as string)?.slice(0, 500) ?? "N/A"}"
Current ${fieldName}: "${listing.subtitle ?? "none"}"

${ctx.keywordsContext}
${ctx.visibilityContext}
${ctx.competitorContext ? `\n${ctx.competitorContext}` : ""}
${ctx.reviewContext ? `\n${ctx.reviewContext}` : ""}

Requirements:
- MUST be ${maxLen} characters or fewer
- NEAR-MISS keywords (positions 4-10) get TOP PRIORITY — pushing these to top 3 gives the biggest visibility score jump
- Fill remaining space with highest-volume keywords not already in the title
${ctx.highValueKw.length > 0 ? `- PRIORITIZE these proven keywords: ${ctx.highValueKw.slice(0, 3).join(", ")}` : "- Include the most important keyword for discoverability"}
${ctx.praises.length > 0 ? `- Highlight what users love: ${ctx.praises.slice(0, 2).join(", ")}` : ""}
- Every word must serve visibility or conversion — no filler words

Return ONLY the optimized ${fieldName} text (no quotes, no explanation).`;

  const result = await aiChat(prompt, {
    temperature: 0.8,
    maxTokens: 100,
    context: { feature: "aso_optimizer", sub_type: "subtitle_variant", metadata: { listingId } },
  });
  const subtitle = result?.text?.replace(/^["']|["']$/g, "").trim().slice(0, maxLen) ?? "";

  return { success: true, subtitle };
}

/**
 * Generate optimized description using AI — incorporating keyword gaps, competitor intel, and user reviews.
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

  const ctx = await getListingContext(listingId);

  const prompt = `Rewrite this app store description to MAXIMIZE VISIBILITY AND DOWNLOADS.${listing.store === "google" ? " Google Play indexes the FULL description for keyword ranking — every keyword mention matters." : " Apple does NOT index the description for search — this is purely for CONVERSION. Convince users to download."}

App: "${listing.app_name}"
Store: ${listing.store === "apple" ? "Apple App Store" : "Google Play"}
Category: ${listing.category ?? "Unknown"}
Current Description: "${(listing.description as string)?.slice(0, 2000) ?? "No current description"}"

${ctx.keywordsContext}
${ctx.visibilityContext}
${ctx.competitorContext ? `\n${ctx.competitorContext}` : ""}
${ctx.reviewContext ? `\n${ctx.reviewContext}` : ""}

KEYWORD STRATEGY:
${ctx.highValueKw.length > 0 ? `- MUST include these high-volume keywords naturally: ${ctx.highValueKw.slice(0, 8).join(", ")}` : ""}
${ctx.weakKw.length > 0 ? `- OPPORTUNITY: Boost these underperforming keywords by weaving them in: ${ctx.weakKw.join(", ")}` : ""}
${ctx.featureRequests.length > 0 ? `- ADDRESS user-requested features: ${ctx.featureRequests.slice(0, 3).join(", ")}` : ""}
${ctx.praises.length > 0 ? `- HIGHLIGHT what users love: ${ctx.praises.slice(0, 3).join(", ")}` : ""}
${ctx.complaints.length > 0 ? `- COUNTER common complaints by emphasizing solutions: ${ctx.complaints.slice(0, 3).join(", ")}` : ""}

Requirements:
- Start with a compelling hook (first 3 lines visible before "Read More") — this is the conversion moment
- ${listing.store === "google" ? "Repeat high-volume keywords 2-3× naturally across different sections to maximize keyword density for Google Play indexing" : "Focus on benefits, social proof, and clear value props — Apple ranks on title/subtitle/keywords, description sells the download"}
- Use bullet points (•) or short paragraphs for features
- Address the top user concerns and feature requests from reviews (improves conversion → more downloads)
- Differentiate from competitors listed above
- Include a call-to-action at the end
- MUST be under 4000 characters total (hard limit for both stores)
- 1000-2000 characters optimal
- IMPORTANT: Return PLAIN TEXT only. Do NOT use markdown formatting (no **, no ##, no \`code\`). Use simple bullet characters (•) instead of markdown lists. Do NOT include emoji unicode characters.

Return ONLY the optimized description text in plain text format.`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 2000,
    context: { feature: "aso_optimizer", sub_type: "description_variant", metadata: { listingId } },
  });

  // Strip any markdown formatting the AI might still include
  let desc = result?.text ?? "Unable to generate description. Please try again.";
  desc = desc
    .replace(/\*\*([^*]+)\*\*/g, "$1")     // **bold** → bold
    .replace(/\*([^*]+)\*/g, "$1")           // *italic* → italic
    .replace(/__([^_]+)__/g, "$1")           // __bold__ → bold
    .replace(/_([^_]+)_/g, "$1")             // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, "")             // ## headings → plain text
    .replace(/```[\s\S]*?```/g, "")          // code blocks
    .replace(/`([^`]+)`/g, "$1")             // inline code
    .replace(/^\s*[-*+]\s+/gm, "• ")         // markdown lists → bullet
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) → text
    .trim()
    .slice(0, 4000);

  return { success: true, description: desc };
}

/**
 * Generate optimized iOS keyword field (100 chars max) — using tracked rankings, competitor data, and gap analysis.
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

  const ctx = await getListingContext(listingId);

  // Categorize keywords by performance
  const strongKw = ctx.rankings.filter((k) => k.position != null && k.position <= 10).map((k) => k.keyword);
  const midKw = ctx.rankings.filter((k) => k.position != null && k.position > 10 && k.position <= 50).map((k) => k.keyword);
  const weakHighVolKw = ctx.rankings
    .filter((k) => (k.position == null || k.position > 50) && (k.search_volume ?? 0) >= 1000)
    .map((k) => k.keyword);

  const prompt = `Generate an optimized iOS App Store keyword field for this app:

App: "${listing.app_name}"
Category: ${listing.category ?? "Unknown"}
Description: ${(listing.description as string)?.slice(0, 500) ?? "N/A"}
Current Keywords: "${listing.keywords_field ?? "none"}"

${ctx.keywordsContext}
${ctx.visibilityContext}
${ctx.competitorContext ? `\n${ctx.competitorContext}` : ""}

KEYWORD PERFORMANCE DATA:
${strongKw.length > 0 ? `- Already ranking top 10 (KEEP these): ${strongKw.slice(0, 5).join(", ")}` : ""}
${midKw.length > 0 ? `- Ranked 10-50 (include to boost): ${midKw.slice(0, 5).join(", ")}` : ""}
${weakHighVolKw.length > 0 ? `- High volume but poor ranking (PRIORITIZE): ${weakHighVolKw.slice(0, 5).join(", ")}` : ""}

Rules:
- EXACTLY 100 characters max (comma-separated, no spaces after commas)
- Do NOT include the app name (Apple already indexes it)
- Do NOT include the category name
- PRIORITIZE high-volume keywords where you rank poorly (biggest opportunity)
- Include competitor-related terms users might search
- Include misspellings of common search terms
- Mix singular and plural forms
- Use every character — don't waste space

Return ONLY the keyword string (e.g., "fitness,workout,exercise,gym,training,health").`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 200,
    context: { feature: "aso_optimizer", sub_type: "keyword_field", metadata: { listingId } },
  });
  const keywords = result?.text?.replace(/["\n]/g, "").slice(0, 100) ?? "";

  return { success: true, keywords };
}

/**
 * Generate a complete AI store listing recommendation.
 * Analyzes ALL platform data (keywords, competitors, reviews, locale, intel)
 * and writes the ideal title, subtitle, description, and keywords for the store.
 */
export async function generateFullListingRecommendation(
  listingId: string
): Promise<{ error: string } | {
  success: true;
  recommendation: {
    title: string;
    subtitle: string;
    description: string;
    keywordsField: string;
    analysis: string;
    dataSources: { keywords: number; competitors: number; reviewTopics: number; locales: number };
  };
}> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, store, category, description, subtitle, keywords_field")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const ctx = await getListingContext(listingId);
  const isApple = listing.store === "apple";
  const store = isApple ? "Apple App Store" : "Google Play";

  const prompt = `You are a world-class ASO strategist. Your PRIMARY OBJECTIVE is to MAXIMIZE ORGANIC VISIBILITY — get this app discovered by the most people and drive downloads.

Visibility Score measures how discoverable the app is across all tracked keywords, weighted by search volume and position. A higher visibility score = more people see the app = more downloads. Every word in this listing must serve that goal.

APP: "${listing.app_name}"
STORE: ${store}
CATEGORY: ${listing.category ?? "Unknown"}
CURRENT TITLE: "${listing.app_name}"
CURRENT SUBTITLE: "${listing.subtitle ?? "none"}"
CURRENT DESCRIPTION:
"${(listing.description as string)?.slice(0, 2000) ?? "No description"}"
${isApple ? `CURRENT KEYWORDS FIELD: "${listing.keywords_field ?? "none"}"` : ""}

${ctx.keywordsContext}

${ctx.visibilityContext}

${ctx.competitorContext || "NO COMPETITORS TRACKED YET"}

${ctx.reviewContext || "NO REVIEW DATA YET"}

LOCALIZATION: ${ctx.localizations.length > 0 ? `${ctx.localizations.length} market opportunities identified` : "Not yet analyzed"}

Now write the COMPLETE optimized store listing. Return ONLY valid JSON in this exact format:
{
  "analysis": "2-3 sentences explaining your visibility strategy — which keywords will move the needle most and why",
  "title": "optimized title (max 30 chars)",
  "subtitle": "${isApple ? "optimized subtitle (max 30 chars)" : "optimized short description (max 80 chars)"}",
  "description": "full optimized description (1000-2000 chars, plain text, use bullet • for lists, NO markdown, NO emoji)",
  "keywords_field": "${isApple ? "comma-separated keywords, no spaces after commas, max 100 chars" : ""}"
}

CRITICAL RULES — VISIBILITY-FIRST OPTIMIZATION:
1. NEAR-MISS KEYWORDS (positions 4-10) go in title and subtitle FIRST — pushing these to top 3 has the highest visibility impact per change
2. UNRANKED HIGH-VOLUME KEYWORDS must appear in the listing — these are zero-visibility keywords with massive upside
3. Title MUST be 30 characters or fewer — pack it with the highest-volume keywords that fit
4. ${isApple ? "Subtitle MUST be 30 characters or fewer — use it for the next-best keywords not in the title" : "Short description MUST be 80 characters or fewer — keyword-rich and compelling"}
5. Description must be plain text only (no markdown ** ## etc), use • for bullets
6. ${isApple ? "Keywords field max 100 chars, comma-separated, no spaces after commas, exclude app name and category — fill EVERY character with keywords sorted by search volume × position opportunity" : "keywords_field should be empty string for Google Play"}
7. ${listing.store === "google" ? "Google Play indexes the FULL description — repeat high-volume keywords 2-3× naturally across different sections" : "Apple only indexes title + subtitle + keyword field for search — description is for CONVERSION (convince users to download)"}
8. Address what users praise and complain about in reviews — this improves conversion rate (more downloads from the same visibility)
9. Differentiate from competitors — unique value props make users choose YOUR app
10. Start description with a compelling hook (first 3 lines visible before "Read More") — this is your conversion moment
11. End description with a clear call-to-action`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 3000,
    jsonMode: true,
    context: { feature: "aso_optimizer", sub_type: "full_recommendation", metadata: { listingId } },
  });

  if (!result?.text) return { error: "AI failed to generate recommendation. Please try again." };

  try {
    const parsed = JSON.parse(result.text) as {
      analysis?: string;
      title?: string;
      subtitle?: string;
      description?: string;
      keywords_field?: string;
    };

    // Strip markdown from description
    let desc = parsed.description ?? "";
    desc = desc
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "• ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim()
      .slice(0, 4000);

    return {
      success: true,
      recommendation: {
        title: (parsed.title ?? listing.app_name as string).slice(0, 30),
        subtitle: (parsed.subtitle ?? "").slice(0, isApple ? 30 : 80),
        description: desc,
        keywordsField: isApple ? (parsed.keywords_field ?? "").slice(0, 100) : "",
        analysis: parsed.analysis ?? "Optimized based on your keyword rankings, competitor landscape, and user reviews.",
        dataSources: {
          keywords: ctx.rankings.length,
          competitors: ctx.competitors.length,
          reviewTopics: ctx.topics.length,
          locales: ctx.localizations.length,
        },
      },
    };
  } catch {
    return { error: "Failed to parse AI response. Please try again." };
  }
}
