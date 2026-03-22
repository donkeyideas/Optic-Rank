/**
 * AI-powered competitor discovery.
 * Fetches site context (title, description, headings, nav) to understand
 * the business, then asks the AI to identify direct competitors.
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
  count = 5,
  projectName?: string
): Promise<GenerateCompetitorsResult> {
  const siteContext = await fetchSiteContext(domain);

  const result = await generateWithAI(
    domain,
    siteContext,
    existingDomains,
    count,
    projectName
  );
  return { competitors: result, source: "ai" };
}

async function generateWithAI(
  domain: string,
  siteContext: {
    title: string;
    description: string;
    industry: string;
    businessSummary: string;
  },
  existingDomains: string[],
  count: number,
  projectName?: string
): Promise<CompetitorSuggestion[]> {
  const existingList =
    existingDomains.length > 0
      ? `\nAlready tracking (DO NOT suggest these): ${existingDomains.join(", ")}`
      : "";

  const businessContext = siteContext.businessSummary
    ? `\nExtracted page content:\n${siteContext.businessSummary}`
    : "";

  const industryHint =
    siteContext.industry !== "general"
      ? `\nDetected industry: ${siteContext.industry}`
      : "";

  const projectNameHint = projectName
    ? `\nProject/Company name: ${projectName}`
    : "";

  const prompt = `You are an expert SEO competitive analyst. Your job is to identify the ${count} closest DIRECT business competitors for the website below.

STEP 1 — Understand the business:
- Website domain: ${domain}${projectNameHint}
- Page title: ${siteContext.title}
- Meta description: ${siteContext.description}${industryHint}${businessContext}

STEP 2 — Based on ALL the information above, determine:
- What specific products or services does this company sell?
- Who are their target customers?
- What industry niche are they in?

STEP 3 — Find ${count} DIRECT competitors. These are companies that:
- Sell the SAME or very similar products/services
- Target the SAME customer segment
- Compete for the SAME search keywords
- A customer would consider as alternatives to this company

WRONG examples (DO NOT do this):
- Returning web hosting companies for a warranty company
- Returning electronics manufacturers for a software company
- Returning generic tech companies instead of niche competitors
- Returning companies with a similar name but different business

RIGHT examples:
- Home warranty company → American Home Shield, Choice Home Warranty, Select Home Warranty, First American Home Warranty, 2-10 Home Buyers Warranty
- Dog food brand → Blue Buffalo, Purina, Hill's Science Diet, Royal Canin, Merrick
- CRM software → Salesforce, HubSpot, Pipedrive, Zoho CRM, Monday CRM
${existingList}

Return ONLY in this exact format, one per line: CompanyName|domain.com
No explanations, no numbering, no extra text, no markdown.`;

  const response = await aiChat(prompt, {
    temperature: 0.2,
    maxTokens: 512,
    context: { feature: "competitor-discovery" },
  });
  if (!response) return [];

  const competitors: CompetitorSuggestion[] = [];
  const lines = response.text.split("\n").filter((l: string) => l.trim());

  for (const line of lines) {
    const cleaned = line
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/^[-*]\s*/, "")
      .trim();
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
