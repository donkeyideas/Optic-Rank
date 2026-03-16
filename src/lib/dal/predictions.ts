import { createClient } from "@/lib/supabase/server";
import type { RankPrediction } from "@/types";

export interface PredictionWithKeyword extends RankPrediction {
  keyword: string;
  current_position: number | null;
  search_volume: number | null;
  stored_direction: "improving" | "declining" | "stable" | null;
}

export interface PredictionStats {
  total: number;
  avgConfidence: number;
  improving: number;
  declining: number;
  stable: number;
  accuracyRate: number | null;
}

/**
 * Get predictions for a project, joined with keyword data.
 */
export async function getPredictions(
  projectId: string,
  options?: { minConfidence?: number; limit?: number }
): Promise<PredictionWithKeyword[]> {
  try {
    const supabase = await createClient();
    const { data: keywords } = await supabase
      .from("keywords")
      .select("id, keyword, current_position, search_volume")
      .eq("project_id", projectId);

    if (!keywords || keywords.length === 0) return [];

    const keywordIds = keywords.map((k) => k.id);
    let query = supabase
      .from("rank_predictions")
      .select("*")
      .in("keyword_id", keywordIds)
      .order("created_at", { ascending: false });

    if (options?.minConfidence) {
      query = query.gte("confidence", options.minConfidence);
    }

    const { data: predictions } = await query.limit(options?.limit ?? 200);
    if (!predictions) return [];

    const kwMap = new Map(keywords.map((k) => [k.id, k]));

    // Keep only the latest prediction per keyword
    const seen = new Set<string>();
    const latest: PredictionWithKeyword[] = [];
    for (const p of predictions as RankPrediction[]) {
      if (seen.has(p.keyword_id)) continue;
      seen.add(p.keyword_id);
      const kw = kwMap.get(p.keyword_id);
      if (!kw) continue;
      // Use DB current_position, or fall back to the estimate stored during prediction
      const featuresUsed = p.features_used as Record<string, unknown> | null;
      const estimatedPos = (featuresUsed?.current_position_estimate as number) ?? null;
      const storedDir = featuresUsed?.direction as string | undefined;
      const validDir = storedDir === "improving" || storedDir === "declining" || storedDir === "stable"
        ? storedDir
        : null;
      latest.push({
        ...p,
        keyword: kw.keyword,
        current_position: kw.current_position ?? estimatedPos,
        search_volume: kw.search_volume,
        stored_direction: validDir,
      });
    }

    return latest;
  } catch {
    return [];
  }
}

/**
 * Compute prediction stats for a project.
 */
export async function getPredictionStats(
  projectId: string
): Promise<PredictionStats> {
  const predictions = await getPredictions(projectId);

  if (predictions.length === 0) {
    return {
      total: 0,
      avgConfidence: 0,
      improving: 0,
      declining: 0,
      stable: 0,
      accuracyRate: null,
    };
  }

  const avgConfidence =
    Math.round(
      (predictions.reduce((s, p) => s + p.confidence, 0) / predictions.length) * 100
    ) / 100;

  let improving = 0;
  let declining = 0;
  let stable = 0;
  let accurate = 0;
  let withActuals = 0;

  for (const p of predictions) {
    // Prefer stored direction from AI; fall back to position diff
    const dir = p.stored_direction ?? (() => {
      const diff = p.predicted_position - (p.current_position ?? p.predicted_position);
      if (diff <= -2) return "improving" as const; // negative diff = lower predicted position = improving
      if (diff >= 2) return "declining" as const;  // positive diff = higher predicted position = declining
      return "stable" as const;
    })();
    if (dir === "improving") improving++;
    else if (dir === "declining") declining++;
    else stable++;

    if (p.actual_position != null) {
      withActuals++;
      // Accurate if within 3 positions of prediction
      if (Math.abs(p.actual_position - p.predicted_position) <= 3) {
        accurate++;
      }
    }
  }

  return {
    total: predictions.length,
    avgConfidence,
    improving,
    declining,
    stable,
    accuracyRate: withActuals > 0 ? Math.round((accurate / withActuals) * 100) : null,
  };
}

/**
 * Get prediction history for a specific keyword.
 */
export async function getPredictionHistory(
  keywordId: string
): Promise<RankPrediction[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rank_predictions")
      .select("*")
      .eq("keyword_id", keywordId)
      .order("created_at", { ascending: true })
      .limit(50);

    return (data ?? []) as RankPrediction[];
  } catch {
    return [];
  }
}
