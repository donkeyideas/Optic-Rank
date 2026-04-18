import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Competitor } from "../types";

/**
 * Fetch all competitors for a project, ordered by authority_score descending.
 * Mirrors web DAL competitors.ts → getCompetitors().
 */
export function useCompetitors(projectId: string | undefined) {
  return useQuery<Competitor[]>({
    queryKey: ["competitors", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("competitors")
        .select(
          "id, project_id, name, domain, authority_score, organic_traffic, keywords_count, created_at"
        )
        .eq("project_id", projectId)
        .order("authority_score", { ascending: false, nullsFirst: false });

      if (error || !data) return [];

      return data as Competitor[];
    },
    enabled: !!projectId,
  });
}
