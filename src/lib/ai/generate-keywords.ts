/**
 * AI-powered keyword generation.
 * Uses unified AI provider (DeepSeek > Gemini > env fallback).
 * Fetches site context to understand the business before generating.
 * Falls back to domain-based heuristic generation if no AI available.
 */

import { aiChat } from "./ai-provider";
import { fetchSiteContext } from "./fetch-site-context";

interface GenerateKeywordsResult {
  keywords: string[];
  source: "ai" | "heuristic";
}

/**
 * Generate keyword suggestions for a domain using AI or heuristic fallback.
 */
export async function generateKeywordSuggestions(
  domain: string,
  existingKeywords: string[] = [],
  count = 20
): Promise<GenerateKeywordsResult> {
  // Fetch site context to understand what the website does
  const siteContext = await fetchSiteContext(domain);

  try {
    const result = await generateWithAI(domain, siteContext, existingKeywords, count);
    if (result.length > 0) {
      return { keywords: result, source: "ai" };
    }
  } catch (err) {
    console.error("[generateKeywords] AI error, falling back to heuristic:", err);
  }

  // Fallback: domain-based heuristic
  return {
    keywords: generateHeuristic(domain, siteContext, existingKeywords, count),
    source: "heuristic",
  };
}

async function generateWithAI(
  domain: string,
  siteContext: { title: string; description: string; industry: string },
  existingKeywords: string[],
  count: number
): Promise<string[]> {
  const existingList =
    existingKeywords.length > 0
      ? `\nAlready tracking: ${existingKeywords.slice(0, 20).join(", ")}`
      : "";

  const prompt = `You are an SEO keyword research expert. Generate exactly ${count} high-value keyword suggestions for the website "${domain}".

About this website:
- Title: ${siteContext.title}
- Description: ${siteContext.description}
- Industry: ${siteContext.industry}
${existingList}

Requirements:
- Keywords MUST be relevant to this specific business and industry (${siteContext.industry})
- Mix of head terms (1-2 words) and long-tail keywords (3-5 words)
- Include informational, transactional, and commercial intent keywords
- Focus on what potential customers would search for to find this business
- Do NOT repeat any existing keywords
- Return ONLY the keywords, one per line, no numbering, no explanations`;

  const response = await aiChat(prompt, { temperature: 0.8, maxTokens: 1024 });
  if (!response) return [];

  const keywords = response.text
    .split("\n")
    .map((line: string) => line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((line: string) => line.length > 0 && line.length < 100)
    .filter((line: string) => !existingKeywords.includes(line.toLowerCase()));

  return keywords.slice(0, count);
}

function generateHeuristic(
  domain: string,
  siteContext: { title: string; description: string; industry: string },
  existingKeywords: string[],
  count: number
): string[] {
  // Use site context to generate better heuristic keywords
  const words = `${siteContext.title} ${siteContext.description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter((w) => !["http", "https", "www", "com", "the", "and", "for", "with", "that", "this", "from"].includes(w));

  // Get unique meaningful words
  const uniqueWords = [...new Set(words)].slice(0, 5);
  const brandName = uniqueWords.slice(0, 2).join(" ") || domain.replace(/\.(com|org|net|io|co|ai).*$/, "");

  const modifiers = [
    "best", "top", "how to", "what is", "guide",
    "review", "vs", "alternative", "pricing", "free",
    "tools", "software", "platform", "services", "solutions",
    "for beginners", "tutorial", "examples", "tips", "strategy",
  ];

  const suggestions: string[] = [];
  const existing = new Set(existingKeywords.map((k) => k.toLowerCase()));

  // Add industry-specific keywords
  for (const word of uniqueWords) {
    for (const mod of modifiers.slice(0, 6)) {
      const keyword = `${mod} ${word}`.trim();
      if (!existing.has(keyword.toLowerCase()) && suggestions.length < count) {
        suggestions.push(keyword);
      }
    }
  }

  // Add brand-based keywords
  for (const mod of modifiers) {
    const keyword = `${brandName} ${mod}`.trim();
    if (!existing.has(keyword.toLowerCase()) && suggestions.length < count) {
      suggestions.push(keyword);
    }
    if (suggestions.length >= count) break;
  }

  return suggestions.slice(0, count);
}
