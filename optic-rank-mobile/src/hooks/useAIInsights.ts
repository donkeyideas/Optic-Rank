import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AIInsight, InsightType } from "../types";

interface AIInsightsOptions {
  type?: InsightType;
  limit?: number;
}

/**
 * Fetch AI insight cards for a project, ordered by priority descending.
 * Optionally filter by insight type. Non-dismissed insights only by default.
 * Mirrors web DAL ai-insights.ts → getAIInsights().
 */
export function useAIInsights(
  projectId: string | undefined,
  opts: AIInsightsOptions = {}
) {
  const { type, limit } = opts;

  return useQuery<AIInsight[]>({
    queryKey: ["aiInsights", projectId, type, limit],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from("ai_insights")
        .select(
          "id, project_id, type, title, description, action_label, action_url, priority, revenue_impact, is_read, is_dismissed, expires_at, created_at"
        )
        .eq("project_id", projectId)
        .eq("is_dismissed", false);

      if (type) {
        query = query.eq("type", type);
      }

      query = query.order("priority", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data as AIInsight[];
    },
    enabled: !!projectId,
  });
}

/**
 * Mutation to mark an AI insight as read.
 * Updates is_read = true on the given insight ID.
 */
export function useMarkInsightRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from("ai_insights")
        .update({ is_read: true })
        .eq("id", insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aiInsights"] });
    },
  });
}
