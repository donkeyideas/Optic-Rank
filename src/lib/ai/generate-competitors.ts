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
  console.log("[generateCompetitors] Site context:", {
    title: siteContext.title,
    description: siteContext.description?.slice(0, 100),
    industry: siteContext.industry,
    hasSummary: !!siteContext.businessSummary,
  });

  try {
    const result = await generateWithAI(
      domain,
      siteContext,
      existingDomains,
      count,
      projectName
    );
    return { competitors: result, source: "ai" };
  } catch (err) {
    console.error("[generateCompetitors] AI generation failed:", err);
    return { competitors: [], source: "ai" };
  }
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

  if (!response) {
    console.error("[generateCompetitors] aiChat returned null — no AI provider available");
    return [];
  }

  console.log("[generateCompetitors] Raw AI response:", response.text);

  const competitors: CompetitorSuggestion[] = [];
  const lines = response.text.split("\n").filter((l: string) => l.trim());

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed && !existingDomains.includes(parsed.domain) && parsed.domain !== domain) {
      competitors.push(parsed);
    }
  }

  console.log(`[generateCompetitors] Parsed ${competitors.length} competitors from ${lines.length} lines`);
  return competitors.slice(0, count);
}

/**
 * Parse a single line from the AI response into a competitor suggestion.
 * Handles multiple formats the AI might return:
 *   CompanyName|domain.com
 *   CompanyName | domain.com
 *   CompanyName - domain.com
 *   CompanyName: domain.com
 *   1. CompanyName|domain.com
 *   - CompanyName|domain.com
 *   CompanyName (domain.com)
 */
function parseLine(raw: string): CompetitorSuggestion | null {
  // Strip leading numbers, bullets, dashes
  const line = raw
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .trim();

  if (!line) return null;

  // Try pipe delimiter first (preferred format)
  if (line.includes("|")) {
    const parts = line.split("|");
    if (parts.length >= 2) {
      return extractPair(parts[0], parts.slice(1).join("|"));
    }
  }

  // Try " - " delimiter
  if (line.includes(" - ")) {
    const idx = line.indexOf(" - ");
    return extractPair(line.slice(0, idx), line.slice(idx + 3));
  }

  // Try ": " delimiter
  if (line.includes(": ")) {
    const idx = line.indexOf(": ");
    return extractPair(line.slice(0, idx), line.slice(idx + 2));
  }

  // Try parentheses: "CompanyName (domain.com)"
  const parenMatch = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    return extractPair(parenMatch[1], parenMatch[2]);
  }

  return null;
}

function extractPair(rawName: string, rawDomain: string): CompetitorSuggestion | null {
  const name = rawName.trim().replace(/^["']|["']$/g, "");
  const dom = rawDomain
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  // Basic domain validation
  if (!name || !dom || !dom.includes(".") || dom.length < 4) return null;

  return { name, domain: dom };
}
