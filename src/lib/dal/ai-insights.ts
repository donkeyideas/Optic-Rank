import { createClient } from "@/lib/supabase/server";
import type { AIInsight, InsightType } from "@/types";

interface GetAIInsightsOptions {
  type?: InsightType;
  dismissed?: boolean;
}

interface AIInsightStats {
  activeCount: number;
  revenueImpactSum: number;
  thisWeek: number;
  dismissedCount: number;
}

/**
 * Get AI insights for a project with optional type and dismissed filters.
 */
export async function getAIInsights(
  projectId: string,
  opts: GetAIInsightsOptions = {}
): Promise<AIInsight[]> {
  const { type, dismissed } = opts;
  const supabase = await createClient();

  let query = supabase
    .from("ai_insights")
    .select(
      "id, project_id, type, title, description, action_label, action_url, priority, revenue_impact, is_read, is_dismissed, expires_at, created_at"
    )
    .eq("project_id", projectId);

  if (type) {
    query = query.eq("type", type);
  }

  if (dismissed !== undefined) {
    query = query.eq("is_dismissed", dismissed);
  }

  const { data, error } = await query.order("priority", {
    ascending: false,
  });

  if (error || !data) return [];

  return data as AIInsight[];
}

/**
 * Get aggregate AI insight statistics for a project.
 */
export async function getAIInsightStats(
  projectId: string
): Promise<AIInsightStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ai_insights")
    .select("is_dismissed, revenue_impact, created_at")
    .eq("project_id", projectId);

  if (error || !data) {
    return {
      activeCount: 0,
      revenueImpactSum: 0,
      thisWeek: 0,
      dismissedCount: 0,
    };
  }

  const activeCount = data.filter((i) => !i.is_dismissed).length;
  const dismissedCount = data.filter((i) => i.is_dismissed).length;

  const revenueImpactSum = data
    .filter((i) => !i.is_dismissed && i.revenue_impact !== null)
    .reduce((sum, i) => sum + (i.revenue_impact ?? 0), 0);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeek = data.filter(
    (i) => new Date(i.created_at) >= oneWeekAgo
  ).length;

  return { activeCount, revenueImpactSum, thisWeek, dismissedCount };
}
