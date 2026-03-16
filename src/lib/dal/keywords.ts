import { createClient } from "@/lib/supabase/server";
import type { Keyword, KeywordRank } from "@/types";

interface GetKeywordsOptions {
  search?: string;
  device?: "desktop" | "mobile";
  limit?: number;
  offset?: number;
}

interface KeywordStats {
  total: number;
  top3Count: number;
  avgPosition: number;
  upCount: number;
  downCount: number;
}

interface KeywordCluster {
  id: string;
  project_id: string;
  name: string;
  keywords: string[];
  topic: string | null;
  created_at: string;
}

/**
 * Get paginated keywords for a project with optional search and device filters.
 */
export async function getKeywords(
  projectId: string,
  opts: GetKeywordsOptions = {}
): Promise<{ data: Keyword[]; count: number }> {
  const { search, device, limit = 50, offset = 0 } = opts;
  const supabase = await createClient();

  let query = supabase
    .from("keywords")
    .select(
      "id, project_id, keyword, search_engine, device, location, current_position, previous_position, best_position, search_volume, cpc, difficulty, intent, ai_visibility_score, ai_visibility_count, created_at",
      { count: "exact" }
    )
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (search) {
    query = query.ilike("keyword", `%${search}%`);
  }

  if (device) {
    query = query.eq("device", device);
  }

  const { data, error, count } = await query
    .order("current_position", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { data: [], count: 0 };

  return { data: data as Keyword[], count: count ?? 0 };
}

/**
 * Get aggregate keyword statistics for a project.
 */
export async function getKeywordStats(
  projectId: string
): Promise<KeywordStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("keywords")
    .select(
      "current_position, previous_position"
    )
    .eq("project_id", projectId)
    .eq("is_active", true);

  if (error || !data) {
    return { total: 0, top3Count: 0, avgPosition: 0, upCount: 0, downCount: 0 };
  }

  const total = data.length;
  let top3Count = 0;
  let positionSum = 0;
  let positionCount = 0;
  let upCount = 0;
  let downCount = 0;

  for (const kw of data) {
    if (kw.current_position !== null && kw.current_position <= 3) {
      top3Count++;
    }
    if (kw.current_position !== null) {
      positionSum += kw.current_position;
      positionCount++;
    }
    if (
      kw.current_position !== null &&
      kw.previous_position !== null
    ) {
      if (kw.current_position < kw.previous_position) {
        upCount++;
      } else if (kw.current_position > kw.previous_position) {
        downCount++;
      }
    }
  }

  const avgPosition = positionCount > 0 ? positionSum / positionCount : 0;

  return { total, top3Count, avgPosition, upCount, downCount };
}

/**
 * Get rank history for a specific keyword, optionally limited to the last N days.
 */
export async function getKeywordRanks(
  keywordId: string,
  days?: number
): Promise<KeywordRank[]> {
  const supabase = await createClient();

  let query = supabase
    .from("keyword_ranks")
    .select("id, keyword_id, position, url, serp_features, checked_at")
    .eq("keyword_id", keywordId)
    .order("checked_at", { ascending: true });

  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    query = query.gte("checked_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data as KeywordRank[];
}

/**
 * Get keyword clusters for a project.
 */
export async function getKeywordClusters(
  projectId: string
): Promise<KeywordCluster[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("keyword_clusters")
    .select("id, project_id, name, keywords, topic, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as KeywordCluster[];
}
