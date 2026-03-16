import { createClient } from "@/lib/supabase/server";

interface ContentPage {
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
  target_keywords: string[];
  created_at: string;
}

interface GetContentPagesOptions {
  search?: string;
  trafficTrend?: "growing" | "stable" | "declining";
  limit?: number;
  offset?: number;
}

interface ContentBrief {
  id: string;
  project_id: string;
  target_keyword: string;
  title_suggestions: string[];
  outline: unknown;
  target_word_count: number | null;
  target_entities: string[];
  serp_intent: string | null;
  competing_urls: string[];
  status: "draft" | "in_progress" | "published" | "archived";
  created_by: string | null;
  created_at: string;
}

/**
 * Get content pages for a project with optional search and filtering.
 */
export async function getContentPages(
  projectId: string,
  opts: GetContentPagesOptions = {}
): Promise<{ data: ContentPage[]; count: number }> {
  const { search, trafficTrend, limit = 50, offset = 0 } = opts;
  const supabase = await createClient();

  let query = supabase
    .from("content_pages")
    .select(
      "id, project_id, url, title, word_count, content_score, readability_score, freshness_score, entity_coverage, last_modified, organic_traffic, traffic_trend, primary_keyword, target_keywords, created_at",
      { count: "exact" }
    )
    .eq("project_id", projectId);

  if (search) {
    query = query.or(
      `url.ilike.%${search}%,title.ilike.%${search}%,primary_keyword.ilike.%${search}%`
    );
  }

  if (trafficTrend) {
    query = query.eq("traffic_trend", trafficTrend);
  }

  const { data, error, count } = await query
    .order("content_score", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { data: [], count: 0 };

  return { data: data as ContentPage[], count: count ?? 0 };
}

/**
 * Get all content briefs for a project.
 */
export async function getContentBriefs(
  projectId: string
): Promise<ContentBrief[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content_briefs")
    .select(
      "id, project_id, target_keyword, title_suggestions, outline, target_word_count, target_entities, serp_intent, competing_urls, status, created_by, created_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as ContentBrief[];
}
