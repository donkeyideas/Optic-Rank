/**
 * AI-powered competitor discovery.
 * Uses unified AI provider (DeepSeek > Gemini > env fallback).
 * Fetches site context to understand the business before generating.
 * Falls back to heuristic suggestions if no AI available.
 */

import { aiChat } from "./ai-provider";
import { fetchSiteContext } from "./fetch-site-context";

interface CompetitorSuggestion {
  name: string;
  domain: string;
}

interface GenerateCompetitorsResult {
  competitors: CompetitorSuggestion[];
  source: "ai" | "heuristic";
}

export async function generateCompetitorSuggestions(
  domain: string,
  existingDomains: string[] = [],
  count = 5
): Promise<GenerateCompetitorsResult> {
  // Fetch site context to understand what the business does
  const siteContext = await fetchSiteContext(domain);

  // Try AI generation first
  try {
    const result = await generateWithAI(domain, siteContext, existingDomains, count);
    if (result.length > 0) {
      return { competitors: result, source: "ai" };
    }
  } catch (err) {
    console.error("[generateCompetitors] AI error, falling back to heuristic:", err);
  }

  // Fallback: heuristic competitor generation
  return {
    competitors: generateHeuristic(domain, siteContext, existingDomains, count),
    source: "heuristic",
  };
}

async function generateWithAI(
  domain: string,
  siteContext: { title: string; description: string; industry: string },
  existingDomains: string[],
  count: number
): Promise<CompetitorSuggestion[]> {
  const existingList =
    existingDomains.length > 0
      ? `\nAlready tracking: ${existingDomains.join(", ")}`
      : "";

  const prompt = `You are an SEO competitive analysis expert. For the website "${domain}", suggest exactly ${count} direct competitors.

About this website:
- Title: ${siteContext.title}
- Description: ${siteContext.description}
- Industry: ${siteContext.industry}
${existingList}

Requirements:
- These should be REAL, well-known companies in the SAME industry (${siteContext.industry})
- Competitors must offer similar products/services to "${siteContext.title}"
- Do NOT include the domain itself or any already tracked domains
- Return ONLY in this exact format, one per line: CompanyName|domain.com
- No explanations, no numbering, no extra text`;

  const response = await aiChat(prompt, { temperature: 0.7, maxTokens: 512 });
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
        .replace(/\/+$/, "")
        .toLowerCase();
      if (name && dom && !existingDomains.includes(dom) && dom !== domain) {
        competitors.push({ name, domain: dom });
      }
    }
  }

  return competitors.slice(0, count);
}

/**
 * Heuristic competitor generation based on site context and industry.
 */
function generateHeuristic(
  domain: string,
  siteContext: { title: string; description: string; industry: string },
  existingDomains: string[],
  count: number
): CompetitorSuggestion[] {
  const excluded = new Set([domain, ...existingDomains]);
  const suggestions: CompetitorSuggestion[] = [];

  // Industry-based competitor suggestions
  const industryMap: Record<string, CompetitorSuggestion[]> = {
    fintech: [
      { name: "Robinhood", domain: "robinhood.com" },
      { name: "Acorns", domain: "acorns.com" },
      { name: "Betterment", domain: "betterment.com" },
      { name: "Wealthfront", domain: "wealthfront.com" },
      { name: "Stash", domain: "stash.com" },
      { name: "Public", domain: "public.com" },
      { name: "M1 Finance", domain: "m1.com" },
      { name: "SoFi", domain: "sofi.com" },
      { name: "Webull", domain: "webull.com" },
      { name: "Cash App", domain: "cash.app" },
    ],
    ecommerce: [
      { name: "Shopify", domain: "shopify.com" },
      { name: "Amazon", domain: "amazon.com" },
      { name: "eBay", domain: "ebay.com" },
      { name: "Etsy", domain: "etsy.com" },
      { name: "WooCommerce", domain: "woocommerce.com" },
    ],
    saas: [
      { name: "HubSpot", domain: "hubspot.com" },
      { name: "Salesforce", domain: "salesforce.com" },
      { name: "Zendesk", domain: "zendesk.com" },
      { name: "Intercom", domain: "intercom.com" },
      { name: "Monday.com", domain: "monday.com" },
    ],
    marketing: [
      { name: "Ahrefs", domain: "ahrefs.com" },
      { name: "Semrush", domain: "semrush.com" },
      { name: "Moz", domain: "moz.com" },
      { name: "HubSpot", domain: "hubspot.com" },
      { name: "Mailchimp", domain: "mailchimp.com" },
    ],
    healthcare: [
      { name: "WebMD", domain: "webmd.com" },
      { name: "Healthline", domain: "healthline.com" },
      { name: "Zocdoc", domain: "zocdoc.com" },
      { name: "GoodRx", domain: "goodrx.com" },
      { name: "Teladoc", domain: "teladoc.com" },
    ],
    education: [
      { name: "Coursera", domain: "coursera.org" },
      { name: "Udemy", domain: "udemy.com" },
      { name: "Khan Academy", domain: "khanacademy.org" },
      { name: "Skillshare", domain: "skillshare.com" },
      { name: "edX", domain: "edx.org" },
    ],
    technology: [
      { name: "TechCrunch", domain: "techcrunch.com" },
      { name: "The Verge", domain: "theverge.com" },
      { name: "Wired", domain: "wired.com" },
      { name: "Ars Technica", domain: "arstechnica.com" },
      { name: "CNET", domain: "cnet.com" },
    ],
  };

  const competitors = industryMap[siteContext.industry] ?? [];
  for (const comp of competitors) {
    if (!excluded.has(comp.domain) && suggestions.length < count) {
      suggestions.push(comp);
    }
  }

  return suggestions.slice(0, count);
}
