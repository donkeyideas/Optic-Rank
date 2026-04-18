import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { RankPrediction } from "../types";

export interface PredictionWithKeyword extends RankPrediction {
  keyword: string;
  current_position: number | null;
  search_volume: number | null;
  stored_direction: "improving" | "declining" | "stable" | null;
}

/**
 * Fetch predictions for a project, joined with keyword data.
 * 1. Fetch keywords for the project
 * 2. Fetch predictions for those keyword IDs
 * 3. Deduplicate to keep only the latest prediction per keyword
 * 4. Join keyword data (keyword name, current_position, search_volume) with prediction data
 *
 * Mirrors web DAL predictions.ts → getPredictions().
 */
export function usePredictions(projectId: string | undefined) {
  return useQuery<PredictionWithKeyword[]>({
    queryKey: ["predictions", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Step 1: Fetch keywords for the project
      const { data: keywords } = await supabase
        .from("keywords")
        .select("id, keyword, current_position, search_volume")
        .eq("project_id", projectId);

      if (!keywords || keywords.length === 0) return [];

      // Step 2: Fetch predictions for those keyword IDs
      const keywordIds = keywords.map((k) => k.id);
      const { data: predictions } = await supabase
        .from("rank_predictions")
        .select("*")
        .in("keyword_id", keywordIds)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!predictions) return [];

      // Step 3: Build keyword lookup map
      const kwMap = new Map(keywords.map((k) => [k.id, k]));

      // Step 4: Deduplicate — keep only the latest prediction per keyword
      const seen = new Set<string>();
      const latest: PredictionWithKeyword[] = [];

      for (const p of predictions as RankPrediction[]) {
        if (seen.has(p.keyword_id)) continue;
        seen.add(p.keyword_id);

        const kw = kwMap.get(p.keyword_id);
        if (!kw) continue;

        // Use DB current_position, or fall back to the estimate stored during prediction
        const featuresUsed = p.features_used as Record<string, unknown> | null;
        const estimatedPos =
          (featuresUsed?.current_position_estimate as number) ?? null;
        const storedDir = featuresUsed?.direction as string | undefined;
        const validDir =
          storedDir === "improving" ||
          storedDir === "declining" ||
          storedDir === "stable"
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
    },
    enabled: !!projectId,
  });
}
