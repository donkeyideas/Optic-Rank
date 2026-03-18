"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/ai-provider";

/** Top 20 app store markets by revenue */
const TOP_MARKETS = [
  { code: "US", locale: "en-US", name: "United States", size: "very_large" },
  { code: "CN", locale: "zh-CN", name: "China", size: "very_large" },
  { code: "JP", locale: "ja-JP", name: "Japan", size: "very_large" },
  { code: "KR", locale: "ko-KR", name: "South Korea", size: "large" },
  { code: "GB", locale: "en-GB", name: "United Kingdom", size: "large" },
  { code: "DE", locale: "de-DE", name: "Germany", size: "large" },
  { code: "FR", locale: "fr-FR", name: "France", size: "large" },
  { code: "BR", locale: "pt-BR", name: "Brazil", size: "large" },
  { code: "IN", locale: "hi-IN", name: "India", size: "very_large" },
  { code: "CA", locale: "en-CA", name: "Canada", size: "medium" },
  { code: "AU", locale: "en-AU", name: "Australia", size: "medium" },
  { code: "IT", locale: "it-IT", name: "Italy", size: "medium" },
  { code: "ES", locale: "es-ES", name: "Spain", size: "medium" },
  { code: "MX", locale: "es-MX", name: "Mexico", size: "medium" },
  { code: "RU", locale: "ru-RU", name: "Russia", size: "large" },
  { code: "TR", locale: "tr-TR", name: "Turkey", size: "medium" },
  { code: "SA", locale: "ar-SA", name: "Saudi Arabia", size: "medium" },
  { code: "ID", locale: "id-ID", name: "Indonesia", size: "large" },
  { code: "TH", locale: "th-TH", name: "Thailand", size: "medium" },
  { code: "NL", locale: "nl-NL", name: "Netherlands", size: "small" },
];

/**
 * Analyze localization opportunity for all major markets.
 */
export async function analyzeLocalizationOpportunity(
  listingId: string
): Promise<{ error: string } | { success: true; markets: Array<{ code: string; name: string; locale: string; size: string; opportunity_score: number; status: string }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const [listingRes, locRes] = await Promise.all([
    supabase.from("app_store_listings").select("app_name, category, store").eq("id", listingId).single(),
    supabase.from("app_store_localizations").select("country_code, completeness_score").eq("listing_id", listingId),
  ]);

  if (!listingRes.data) return { error: "Listing not found." };

  const localizedCodes = new Set((locRes.data ?? []).map((l) => l.country_code));

  const sizeScores: Record<string, number> = { very_large: 40, large: 30, medium: 20, small: 10 };

  const markets = TOP_MARKETS.map((market) => {
    const isLocalized = localizedCodes.has(market.code);
    const sizeScore = sizeScores[market.size] ?? 10;
    // English-speaking markets need less localization effort
    const effortPenalty = market.locale.startsWith("en") ? 0 : 10;
    const opportunityScore = isLocalized ? 20 : Math.min(100, sizeScore + effortPenalty + 30);

    return {
      code: market.code,
      name: market.name,
      locale: market.locale,
      size: market.size,
      opportunity_score: opportunityScore,
      status: isLocalized ? "localized" : market.locale.startsWith("en") ? "english_ok" : "not_localized",
    };
  }).sort((a, b) => b.opportunity_score - a.opportunity_score);

  return { success: true, markets };
}

/**
 * Generate AI translation for a specific locale.
 */
export async function generateTranslation(
  listingId: string,
  countryCode: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("app_store_listings")
    .select("app_name, subtitle, description, keywords_field, store")
    .eq("id", listingId)
    .single();

  if (!listing) return { error: "Listing not found." };

  const market = TOP_MARKETS.find((m) => m.code === countryCode);
  if (!market) return { error: "Unsupported market." };

  const prompt = `Translate this app store listing metadata to ${market.name} (${market.locale}). This is for ASO — optimize keyword choices for the local market, don't just literally translate.

App Name: "${listing.app_name}"
Subtitle: "${listing.subtitle ?? ""}"
Description: "${(listing.description as string)?.slice(0, 1500) ?? ""}"
Keywords: "${listing.keywords_field ?? ""}"

Return ONLY a JSON object:
{"title": "...", "subtitle": "...", "description": "...", "keywords": "..."}

Rules:
- Keep the brand name in the title (don't translate it)
- Adapt keywords to local search behavior
- Keywords: comma-separated, max 100 chars
- Description: culturally adapted, not literal translation`;

  const result = await aiChat(prompt, { temperature: 0.5, maxTokens: 2000 });

  let translated: { title?: string; subtitle?: string; description?: string; keywords?: string } = {};
  if (result?.text) {
    try {
      const match = result.text.match(/\{[\s\S]*?\}/);
      if (match) translated = JSON.parse(match[0]);
    } catch { /* parse error */ }
  }

  // Calculate completeness
  let completeness = 0;
  if (translated.title) completeness += 25;
  if (translated.subtitle) completeness += 25;
  if (translated.description) completeness += 25;
  if (translated.keywords) completeness += 25;

  await supabase.from("app_store_localizations").upsert({
    listing_id: listingId,
    country_code: countryCode,
    locale: market.locale,
    localized_title: translated.title ?? null,
    localized_subtitle: translated.subtitle ?? null,
    localized_description: translated.description ?? null,
    localized_keywords: translated.keywords ?? null,
    completeness_score: completeness,
    opportunity_score: 50, // Reduced after localization
    ai_translated: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "listing_id,country_code" });

  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * Bulk translate to multiple markets.
 */
export async function bulkTranslate(
  listingId: string,
  countryCodes: string[]
): Promise<{ error: string } | { success: true; translated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  let translated = 0;
  for (const code of countryCodes) {
    const result = await generateTranslation(listingId, code);
    if ("success" in result) translated++;
  }

  return { success: true, translated };
}
