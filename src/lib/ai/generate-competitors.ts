/**
 * AI-powered competitor discovery.
 * Uses unified AI provider (DeepSeek > Gemini > env fallback).
 * Fetches site context (title, description, headings, nav) to understand
 * the business before generating competitor suggestions.
 */

import { aiChat } from "./ai-provider";
import { fetchSiteContext } from "./fetch-site-context";

interface CompetitorSuggestion {
  name: string;
  domain: string;
}

interface GenerateCompetitorsResult {
  competitors: CompetitorSuggestion[];
  source: "ai";
}

export async function generateCompetitorSuggestions(
  domain: string,
  existingDomains: string[] = [],
  count = 5
): Promise<GenerateCompetitorsResult> {
  // Fetch site context to understand what the business does
  const siteContext = await fetchSiteContext(domain);

  const result = await generateWithAI(domain, siteContext, existingDomains, count);
  return { competitors: result, source: "ai" };
}

async function generateWithAI(
  domain: string,
  siteContext: { title: string; description: string; industry: string; businessSummary: string },
  existingDomains: string[],
  count: number
): Promise<CompetitorSuggestion[]> {
  const existingList =
    existingDomains.length > 0
      ? `\nAlready tracking (DO NOT suggest these): ${existingDomains.join(", ")}`
      : "";

  const businessContext = siteContext.businessSummary
    ? `\nExtracted page content:\n${siteContext.businessSummary}`
    : "";

  const industryHint = siteContext.industry !== "general"
    ? `\nDetected industry: ${siteContext.industry}`
    : "";

  const prompt = `You are an expert SEO competitive analyst. Analyze the following website and identify its ${count} closest DIRECT business competitors.

Website to analyze: ${domain}
Page title: ${siteContext.title}
Meta description: ${siteContext.description}${industryHint}${businessContext}${existingList}

CRITICAL INSTRUCTIONS:
1. First, determine what specific products or services this business offers based on the title, description, and page content above.
2. Then find ${count} companies that sell the SAME or very similar products/services to the SAME target customers.
3. Competitors MUST be in the same specific niche — not the same broad category.
   - Example: A home warranty company → other home warranty companies (American Home Shield, Choice Home Warranty, etc.)
   - Example: A WordPress hosting company → other WordPress hosting companies (not just any hosting)
   - Example: A dog food brand → other dog food brands (not just pet stores)
4. Competitors should be well-known, real companies with active websites.
5. Do NOT include the analyzed domain (${domain}) itself.
6. Do NOT include generic web companies like hosting providers, domain registrars, or website builders unless the analyzed site is actually in that business.

Return ONLY in this exact format, one per line: CompanyName|domain.com
No explanations, no numbering, no extra text.`;

  const response = await aiChat(prompt, {
    temperature: 0.3,
    maxTokens: 512,
    context: { feature: "competitor-discovery" },
  });
  if (!response) return [];

  const competitors: CompetitorSuggestion[] = [];
  const lines = response.text.split("\n").filter((l: string) => l.trim());

  for (const line of lines) {
    const cleaned = line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-*]\s*/, "").trim();
    const parts = cleaned.split("|");
    if (parts.length === 2) {
      const name = parts[0].trim();
      const dom = parts[1]
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/+$/, "")
        .toLowerCase();
      if (name && dom && !existingDomains.includes(dom) && dom !== domain) {
        competitors.push({ name, domain: dom });
      }
    }
  }

  return competitors.slice(0, count);
}
