/**
 * GEO (Generative Engine Optimization) Readiness Scoring
 *
 * Pure heuristic scoring — no LLM calls.
 * Score = weighted average of 4 components (25% each):
 *   - Entity Score: how well entities are covered
 *   - Structure Score: content quality + readability
 *   - Schema Score: structured data coverage
 *   - AI Citation Score: how often the page is cited by LLMs
 */

import type { GeoRecommendation } from "@/types";

export interface GeoScoreInput {
  // From content_pages
  contentScore: number | null;
  readabilityScore: number | null;
  entityCoverage: number | null;
  wordCount: number | null;
  title: string | null;
  url: string;
  // From audit_pages
  hasSchema: boolean;
  hasCleanUrl: boolean;
  // From ai_visibility_checks
  citationCount: number; // how many LLM checks cited this page
  totalChecks: number; // total LLM checks run
}

export interface GeoScoreResult {
  geoScore: number;
  entityScore: number;
  structureScore: number;
  schemaScore: number;
  aiCitationScore: number;
  recommendations: GeoRecommendation[];
}

export function computeGeoScore(input: GeoScoreInput): GeoScoreResult {
  const recommendations: GeoRecommendation[] = [];

  // --- Entity Score (25%) ---
  const entityScore = Math.min(100, Math.max(0, input.entityCoverage ?? 30));
  if (entityScore < 50) {
    recommendations.push({
      category: "entity",
      priority: entityScore < 25 ? "high" : "medium",
      title: "Improve entity coverage",
      description:
        "Add more named entities (people, organizations, concepts) to help AI models understand and cite your content.",
    });
  }

  // --- Structure Score (25%) ---
  const contentQuality = input.contentScore ?? 0;
  const readability = input.readabilityScore ?? 0;
  let structureScore = (contentQuality + readability) / 2;
  if ((input.wordCount ?? 0) >= 1500) structureScore = Math.min(100, structureScore + 10);
  structureScore = Math.min(100, Math.max(0, structureScore));
  if (structureScore < 50) {
    recommendations.push({
      category: "structure",
      priority: structureScore < 25 ? "high" : "medium",
      title: "Improve content structure",
      description:
        "Enhance content quality and readability. Use clear headings, concise paragraphs, and aim for 1500+ words on key pages.",
    });
  }

  // --- Schema Score (25%) ---
  let schemaScore = 0;
  if (input.hasSchema) {
    schemaScore = 100;
  } else if (input.title && input.hasCleanUrl) {
    schemaScore = 50;
  }
  if (schemaScore < 100) {
    recommendations.push({
      category: "schema",
      priority: schemaScore === 0 ? "high" : "medium",
      title: "Add structured data markup",
      description:
        "Implement Schema.org markup (FAQ, HowTo, Article) to help AI models parse and cite your content.",
    });
  }

  // --- AI Citation Score (25%) ---
  const aiCitationScore =
    input.totalChecks > 0
      ? Math.min(100, Math.round((input.citationCount / input.totalChecks) * 100))
      : 0;
  if (aiCitationScore < 40) {
    recommendations.push({
      category: "citation",
      priority: aiCitationScore < 20 ? "high" : "medium",
      title: "Increase AI citation presence",
      description:
        "Your content is rarely cited by AI models. Focus on authoritative, well-structured content that directly answers common questions.",
    });
  }

  // --- Composite GEO Score ---
  const geoScore = Math.round(
    (entityScore + structureScore + schemaScore + aiCitationScore) / 4
  );

  // Add general recommendation if score is low
  if (geoScore < 40) {
    recommendations.push({
      category: "general",
      priority: "high",
      title: "Low GEO readiness",
      description:
        "This page needs significant optimization to be discoverable by AI-powered search engines. Focus on entity coverage and structured data first.",
    });
  }

  return {
    geoScore,
    entityScore: Math.round(entityScore),
    structureScore: Math.round(structureScore),
    schemaScore,
    aiCitationScore,
    recommendations,
  };
}
