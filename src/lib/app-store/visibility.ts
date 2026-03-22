// ────────────────────────────────────────────────────────────
// Organic Visibility Score Calculator
// Aggregate score (0-100) measuring app discoverability
// across all tracked keywords, weighted by search volume
// and position using exponential decay.
// ────────────────────────────────────────────────────────────

/** Position weight lookup — exponential decay from #1 (100%) to #10 (12%) */
const POSITION_WEIGHTS = [
  1.0,   // #1
  0.85,  // #2
  0.70,  // #3
  0.55,  // #4
  0.45,  // #5
  0.35,  // #6
  0.28,  // #7
  0.22,  // #8
  0.16,  // #9
  0.12,  // #10
];

/** Returns visibility weight for a given ranking position (0-1 scale) */
export function getPositionWeight(position: number | null): number {
  if (position == null || position < 1) return 0;
  if (position <= 10) return POSITION_WEIGHTS[position - 1];
  // Beyond #10: exponential decay from 0.12 down to ~0 at #50+
  if (position <= 50) {
    return 0.12 * Math.exp(-0.06 * (position - 10));
  }
  return 0;
}

export interface RankingInput {
  keyword: string;
  position: number | null;
  search_volume: number | null;
}

export interface VisibilityBreakdown {
  keyword: string;
  position: number | null;
  search_volume: number;
  weight: number;
  contribution: number;
  contribution_pct: number;
}

export interface VisibilityResult {
  score: number;          // 0-100
  max_possible: number;
  raw_score: number;
  keyword_count: number;
  ranked_count: number;
  breakdown: VisibilityBreakdown[];
}

/**
 * Calculate organic visibility score from keyword rankings.
 * Formula: Σ(position_weight × search_volume) / max_possible × 100
 */
export function calculateVisibility(rankings: RankingInput[]): VisibilityResult {
  const withVolume = rankings.filter(
    (r) => r.search_volume != null && r.search_volume > 0
  );

  if (withVolume.length === 0) {
    return {
      score: 0,
      max_possible: 0,
      raw_score: 0,
      keyword_count: rankings.length,
      ranked_count: 0,
      breakdown: [],
    };
  }

  // Max possible = every keyword at #1 (weight=1.0)
  const maxPossible = withVolume.reduce(
    (sum, r) => sum + (r.search_volume ?? 0),
    0
  );

  let rawScore = 0;
  let rankedCount = 0;
  const breakdown: VisibilityBreakdown[] = [];

  for (const r of withVolume) {
    const weight = getPositionWeight(r.position);
    const volume = r.search_volume ?? 0;
    const contribution = weight * volume;
    rawScore += contribution;
    if (r.position != null && r.position > 0) rankedCount++;

    breakdown.push({
      keyword: r.keyword,
      position: r.position,
      search_volume: volume,
      weight,
      contribution,
      contribution_pct: 0,
    });
  }

  // Fill contribution percentages
  for (const b of breakdown) {
    b.contribution_pct =
      rawScore > 0 ? (b.contribution / rawScore) * 100 : 0;
  }

  // Sort by contribution descending
  breakdown.sort((a, b) => b.contribution - a.contribution);

  const score =
    maxPossible > 0 ? Math.round((rawScore / maxPossible) * 100) : 0;

  return {
    score,
    max_possible: maxPossible,
    raw_score: rawScore,
    keyword_count: rankings.length,
    ranked_count: rankedCount,
    breakdown,
  };
}
