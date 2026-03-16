/**
 * AEO (Answer Engine Optimization) Analysis
 *
 * Pure functions — no LLM calls.
 * Analyzes keywords for snippet opportunities, answer readiness,
 * zero-click risk, and voice search eligibility.
 */

import type { Keyword, KeywordRank } from "@/types";

// ================================================================
// Types
// ================================================================

export interface SnippetOpportunity {
  keywordId: string;
  keyword: string;
  position: number;
  searchVolume: number;
  intent: string | null;
  serpFeatures: string[];
  score: number; // 0-100
}

export interface AnswerReadiness {
  keywordId: string;
  keyword: string;
  position: number | null;
  intent: string | null;
  score: number; // 0-100
  isQuestion: boolean;
}

export interface ZeroClickRisk {
  keywordId: string;
  keyword: string;
  serpFeatures: string[];
  featureCount: number;
  riskLevel: "high" | "medium" | "low";
  estimatedCtrLoss: number; // percentage
}

export interface VoiceSearchKeyword {
  keywordId: string;
  keyword: string;
  searchVolume: number;
  intent: string | null;
}

// ================================================================
// 1. Snippet Opportunities
// ================================================================

export function findSnippetOpportunities(
  keywords: Keyword[],
  latestRanks: Map<string, KeywordRank>,
  projectDomain?: string
): SnippetOpportunity[] {
  const results: SnippetOpportunity[] = [];

  for (const kw of keywords) {
    const rank = latestRanks.get(kw.id);
    const position = rank?.position ?? kw.current_position;
    if (position === null || position > 10) continue;

    const serpFeatures = rank?.serp_features ?? [];
    const hasFeaturedSnippet = serpFeatures.some(
      (f) => f.toLowerCase().includes("featured_snippet") || f.toLowerCase().includes("featured snippet")
    );

    // Only count if there's a featured snippet to capture and we don't own position 1
    if (!hasFeaturedSnippet && position > 3) continue;

    let score = Math.max(0, 100 - position * 10);

    // Bonuses
    if (kw.intent === "informational") score = Math.min(100, score + 15);
    if ((kw.search_volume ?? 0) > 1000) score = Math.min(100, score + 10);
    if (hasFeaturedSnippet) score = Math.min(100, score + 10);

    if (score > 20) {
      results.push({
        keywordId: kw.id,
        keyword: kw.keyword,
        position,
        searchVolume: kw.search_volume ?? 0,
        intent: kw.intent,
        serpFeatures,
        score: Math.round(score),
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ================================================================
// 2. Answer Readiness
// ================================================================

const QUESTION_PREFIXES = ["what", "how", "why", "when", "where", "who", "which", "can", "does", "is"];

function isQuestionKeyword(keyword: string): boolean {
  const lower = keyword.toLowerCase().trim();
  return QUESTION_PREFIXES.some((prefix) => lower.startsWith(prefix + " "));
}

export function computeAnswerReadiness(
  keywords: Keyword[],
  latestRanks: Map<string, KeywordRank>
): AnswerReadiness[] {
  const results: AnswerReadiness[] = [];

  for (const kw of keywords) {
    const rank = latestRanks.get(kw.id);
    const position = rank?.position ?? kw.current_position;
    const isQuestion = isQuestionKeyword(kw.keyword);

    let score = 0;

    // Intent component (40 points max)
    if (kw.intent === "informational") score += 40;
    else if (kw.intent === "commercial") score += 20;
    else if (kw.intent === "navigational") score += 10;

    // Position component (30 points max)
    if (position !== null && position <= 10) {
      score += Math.round(30 * (1 - (position - 1) / 10));
    }

    // Question format bonus (20 points max)
    if (isQuestion) score += 20;

    // Word count bonus — longer keywords are more specific answers (10 points max)
    const words = kw.keyword.split(/\s+/).length;
    if (words >= 5) score += 10;
    else if (words >= 3) score += 5;

    results.push({
      keywordId: kw.id,
      keyword: kw.keyword,
      position,
      intent: kw.intent,
      score: Math.min(100, Math.round(score)),
      isQuestion,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ================================================================
// 3. Zero-Click Risk
// ================================================================

const HIGH_RISK_FEATURES = [
  "featured_snippet",
  "knowledge_panel",
  "instant_answer",
  "calculator",
  "weather",
  "sports_results",
  "ai_overview",
];

export function assessZeroClickRisk(
  keywords: Keyword[],
  latestRanks: Map<string, KeywordRank>
): ZeroClickRisk[] {
  const results: ZeroClickRisk[] = [];

  for (const kw of keywords) {
    const rank = latestRanks.get(kw.id);
    const serpFeatures = rank?.serp_features ?? [];
    const featureCount = serpFeatures.length;

    const highRiskCount = serpFeatures.filter((f) =>
      HIGH_RISK_FEATURES.some((hr) => f.toLowerCase().includes(hr))
    ).length;

    let riskLevel: "high" | "medium" | "low";
    let estimatedCtrLoss: number;

    if (highRiskCount >= 2 || featureCount >= 4) {
      riskLevel = "high";
      estimatedCtrLoss = Math.min(60, 15 * highRiskCount + 5 * featureCount);
    } else if (featureCount >= 2) {
      riskLevel = "medium";
      estimatedCtrLoss = Math.min(40, 8 * featureCount);
    } else {
      riskLevel = "low";
      estimatedCtrLoss = Math.min(15, 5 * featureCount);
    }

    results.push({
      keywordId: kw.id,
      keyword: kw.keyword,
      serpFeatures,
      featureCount,
      riskLevel,
      estimatedCtrLoss: Math.round(estimatedCtrLoss),
    });
  }

  return results.sort(
    (a, b) => b.estimatedCtrLoss - a.estimatedCtrLoss || b.featureCount - a.featureCount
  );
}

// ================================================================
// 4. Voice Search Keywords
// ================================================================

export function identifyVoiceSearchKeywords(
  keywords: Keyword[]
): VoiceSearchKeyword[] {
  return keywords
    .filter((kw) => {
      const lower = kw.keyword.toLowerCase().trim();
      const isQuestion = QUESTION_PREFIXES.some((p) => lower.startsWith(p + " "));
      const longEnough = kw.keyword.split(/\s+/).length >= 4;
      const isInformational = kw.intent === "informational" || kw.intent === "commercial";
      return (isQuestion && longEnough) || (isQuestion && isInformational);
    })
    .map((kw) => ({
      keywordId: kw.id,
      keyword: kw.keyword,
      searchVolume: kw.search_volume ?? 0,
      intent: kw.intent,
    }))
    .sort((a, b) => b.searchVolume - a.searchVolume);
}
