import { createClient } from "@/lib/supabase/server";
import type { Recommendation, RecommendationCategory } from "@/types";

interface GetRecommendationsOptions {
  category?: RecommendationCategory;
  impact?: "high" | "medium" | "low";
  showDismissed?: boolean;
  showCompleted?: boolean;
}

export interface RecommendationStats {
  totalActive: number;
  highImpactCount: number;
  quickWinCount: number;
  completedCount: number;
  lastGeneratedAt: string | null;
  byCategory: Record<string, number>;
}

/**
 * Get recommendations for a project with optional filters.
 */
export async function getRecommendations(
  projectId: string,
  opts: GetRecommendationsOptions = {}
): Promise<Recommendation[]> {
  const supabase = await createClient();

  let query = supabase
    .from("recommendations")
    .select("*")
    .eq("project_id", projectId);

  if (opts.category) {
    query = query.eq("category", opts.category);
  }
  if (opts.impact) {
    query = query.eq("impact", opts.impact);
  }
  if (!opts.showDismissed) {
    query = query.eq("is_dismissed", false);
  }
  if (!opts.showCompleted) {
    query = query.eq("is_completed", false);
  }

  const { data, error } = await query.order("priority_score", { ascending: false });

  if (error || !data) return [];
  return data as Recommendation[];
}

/**
 * Get aggregate recommendation statistics for a project.
 */
export async function getRecommendationStats(
  projectId: string
): Promise<RecommendationStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recommendations")
    .select("category, impact, is_dismissed, is_completed, created_at")
    .eq("project_id", projectId);

  if (error || !data) {
    return {
      totalActive: 0,
      highImpactCount: 0,
      quickWinCount: 0,
      completedCount: 0,
      lastGeneratedAt: null,
      byCategory: {},
    };
  }

  const active = data.filter((r) => !r.is_dismissed && !r.is_completed);
  const completed = data.filter((r) => r.is_completed);
  const highImpact = active.filter((r) => r.impact === "high");
  const quickWins = active.filter((r) => r.category === "quick_wins");

  const byCategory: Record<string, number> = {};
  for (const r of active) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
  }

  const lastGeneratedAt = data.length > 0
    ? data.reduce((latest, r) => (r.created_at > latest ? r.created_at : latest), data[0].created_at)
    : null;

  return {
    totalActive: active.length,
    highImpactCount: highImpact.length,
    quickWinCount: quickWins.length,
    completedCount: completed.length,
    lastGeneratedAt,
    byCategory,
  };
}
