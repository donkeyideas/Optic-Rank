import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

// ── Content Pages ───────────────────────────────────────────────────────────

export interface ContentPage {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  word_count: number | null;
  content_score: number | null;
  readability_score: number | null;
  freshness_score: number | null;
  entity_coverage: number | null;
  last_modified: string | null;
  organic_traffic: number | null;
  traffic_trend: "growing" | "stable" | "declining" | null;
  primary_keyword: string | null;
  target_keywords: string[] | null;
  created_at: string;
}

export interface ContentBrief {
  id: string;
  project_id: string;
  target_keyword: string;
  title_suggestions: string[] | null;
  outline: Record<string, unknown> | null;
  target_word_count: number | null;
  target_entities: string[] | null;
  serp_intent: string | null;
  competing_urls: string[] | null;
  status: "draft" | "in_progress" | "published";
  created_by: string | null;
  created_at: string;
}

export function useContentPages(
  projectId: string | undefined,
  opts?: { search?: string; trafficTrend?: string; limit?: number; offset?: number }
) {
  return useQuery({
    queryKey: ["contentPages", projectId, opts],
    enabled: !!projectId,
    queryFn: async (): Promise<{ data: ContentPage[]; count: number }> => {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;

      let query = supabase
        .from("content_pages")
        .select(
          "id, project_id, url, title, word_count, content_score, readability_score, freshness_score, entity_coverage, last_modified, organic_traffic, traffic_trend, primary_keyword, target_keywords, created_at",
          { count: "exact" }
        )
        .eq("project_id", projectId!);

      if (opts?.search) {
        query = query.or(
          `url.ilike.%${opts.search}%,title.ilike.%${opts.search}%,primary_keyword.ilike.%${opts.search}%`
        );
      }
      if (opts?.trafficTrend) {
        query = query.eq("traffic_trend", opts.trafficTrend);
      }

      query = query
        .order("content_score", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) return { data: [], count: 0 };
      return { data: (data ?? []) as ContentPage[], count: count ?? 0 };
    },
  });
}

export function useContentBriefs(projectId: string | undefined) {
  return useQuery({
    queryKey: ["contentBriefs", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ContentBrief[]> => {
      const { data, error } = await supabase
        .from("content_briefs")
        .select(
          "id, project_id, target_keyword, title_suggestions, outline, target_word_count, target_entities, serp_intent, competing_urls, status, created_by, created_at"
        )
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data ?? []) as ContentBrief[];
    },
  });
}
