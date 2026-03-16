/**
 * Entity Extraction Module
 * Uses aiChat() (DeepSeek-first) to extract named entities
 * from keywords and content for SEO entity optimization.
 */

import { aiChat } from "./ai-provider";
import type { EntityType } from "@/types";

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  relevance: number; // 0-100
  description: string;
  wikipediaUrl?: string;
}

export interface EntityGapResult {
  missingEntities: ExtractedEntity[];
  recommendations: string[];
}

/**
 * Extract named entities from a list of target keywords.
 */
export async function extractEntitiesFromKeywords(
  keywords: string[],
  domain: string
): Promise<ExtractedEntity[]> {
  if (keywords.length === 0) return [];

  // Limit to top 30 keywords to avoid token overflow
  const kwSlice = keywords.slice(0, 30);

  const result = await aiChat(
    `You are an SEO entity extraction expert. Given these target keywords for the domain "${domain}", extract the most important named entities that are relevant for SEO content strategy.

Keywords: ${kwSlice.join(", ")}

For each entity, determine:
- name: the entity name
- type: one of person, organization, product, place, concept, technology, event, brand, other
- relevance: 0-100 score for how important this entity is to the keyword set
- description: one sentence describing the entity

Return ONLY a JSON array of objects. No extra text, markdown, or explanation.
Example: [{"name":"Google","type":"organization","relevance":95,"description":"Major search engine and technology company."}]`,
    { temperature: 0.3, maxTokens: 2048 }
  );

  if (!result?.text) return [];

  return parseEntitiesResponse(result.text);
}

/**
 * Extract entities from content page metadata.
 */
export async function extractEntitiesFromContent(
  pages: Array<{ title: string; url: string; primaryKeyword: string | null }>
): Promise<ExtractedEntity[]> {
  if (pages.length === 0) return [];

  const pageDescriptions = pages
    .slice(0, 20)
    .map((p) => `- "${p.title}" (${p.url})${p.primaryKeyword ? ` [keyword: ${p.primaryKeyword}]` : ""}`)
    .join("\n");

  const result = await aiChat(
    `You are an SEO entity extraction expert. Given these content pages, extract the most important named entities across all pages.

Pages:
${pageDescriptions}

For each entity, determine:
- name: the entity name
- type: one of person, organization, product, place, concept, technology, event, brand, other
- relevance: 0-100 score
- description: one sentence

Return ONLY a JSON array. No extra text.`,
    { temperature: 0.3, maxTokens: 2048 }
  );

  if (!result?.text) return [];

  return parseEntitiesResponse(result.text);
}

/**
 * Analyze entity gaps compared to competitors.
 */
export async function analyzeEntityGaps(
  projectEntities: string[],
  competitorDomains: string[],
  keywords: string[]
): Promise<EntityGapResult> {
  if (keywords.length === 0) {
    return { missingEntities: [], recommendations: [] };
  }

  const result = await aiChat(
    `You are an SEO entity strategy expert. A website covers these entities: ${projectEntities.join(", ") || "none yet"}.

Their competitors are: ${competitorDomains.join(", ") || "unknown"}.
Their target keywords are: ${keywords.slice(0, 20).join(", ")}.

Identify entities that are likely missing from their content but important for ranking on these keywords. Think about:
- Related people, companies, products, technologies
- Concepts and topics that comprehensive content should cover
- Entities that search engines associate with these keywords

Return JSON with two keys:
1. "missingEntities": array of {name, type, relevance, description}
2. "recommendations": array of action strings

No extra text, just JSON.`,
    { temperature: 0.5, maxTokens: 2048 }
  );

  if (!result?.text) {
    return { missingEntities: [], recommendations: [] };
  }

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { missingEntities: [], recommendations: [] };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      missingEntities: validateEntities(parsed.missingEntities ?? []),
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((r: unknown) => typeof r === "string").slice(0, 10)
        : [],
    };
  } catch {
    return { missingEntities: [], recommendations: [] };
  }
}

// --- Helpers ---

const VALID_TYPES: EntityType[] = [
  "person", "organization", "product", "place", "concept",
  "technology", "event", "brand", "other",
];

function parseEntitiesResponse(text: string): ExtractedEntity[] {
  try {
    // Find JSON array in response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return validateEntities(parsed);
  } catch {
    return [];
  }
}

function validateEntities(raw: unknown[]): ExtractedEntity[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      name: String(item.name ?? "").trim(),
      type: VALID_TYPES.includes(item.type as EntityType)
        ? (item.type as EntityType)
        : "other",
      relevance: Math.max(0, Math.min(100, Number(item.relevance) || 50)),
      description: String(item.description ?? "").trim(),
      wikipediaUrl: typeof item.wikipediaUrl === "string" ? item.wikipediaUrl : undefined,
    }))
    .filter((e) => e.name.length > 0)
    .slice(0, 50); // Cap at 50 entities
}
