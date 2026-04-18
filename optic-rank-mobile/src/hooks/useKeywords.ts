import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Keyword, KeywordRank } from "../types";

interface KeywordFilters {
  search?: string;
  device?: "desktop" | "mobile";
  limit?: number;
  offset?: number;
}

interface KeywordStats {
  total: number;
  top3Count: number;
  top10Count: number;
  avgPosition: number;
  upCount: number;
  downCount: number;
  organicTraffic: number;
  aiVisibilityAvg: number;
}

/** CTR curve matching the web dashboard exactly */
const CTR_CURVE: Record<number, number> = {
  1: 0.315, 2: 0.158, 3: 0.1, 4: 0.07, 5: 0.053,
  6: 0.038, 7: 0.028, 8: 0.021, 9: 0.017, 10: 0.014,
};

/**
 * Fetch paginated keywords for a project with optional search and device filters.
 */
export function useKeywords(
  projectId: string | undefined,
  filters: KeywordFilters = {}
) {
  const { search, device, limit = 50, offset = 0 } = filters;

  return useQuery<{ data: Keyword[]; count: number }>({
    queryKey: ["keywords", projectId, search, device, limit, offset],
    queryFn: async () => {
      if (!projectId) return { data: [], count: 0 };

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
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch aggregate keyword statistics using a single limited query.
 * Only fetches position columns to minimize payload.
 */
export function useKeywordStats(projectId: string | undefined) {
  return useQuery<KeywordStats>({
    queryKey: ["keywordStats", projectId],
    queryFn: async () => {
      const empty: KeywordStats = {
        total: 0, top3Count: 0, top10Count: 0, avgPosition: 0,
        upCount: 0, downCount: 0, organicTraffic: 0, aiVisibilityAvg: 0,
      };
      if (!projectId) return empty;

      const { data, error, count } = await supabase
        .from("keywords")
        .select("current_position, previous_position, search_volume, ai_visibility_score", { count: "exact" })
        .eq("project_id", projectId)
        .eq("is_active", true)
        .limit(500);

      if (error || !data) return empty;

      const total = count ?? data.length;
      let top3Count = 0;
      let top10Count = 0;
      let positionSum = 0;
      let positionCount = 0;
      let upCount = 0;
      let downCount = 0;
      let organicTraffic = 0;
      let aiVisSum = 0;
      let aiVisCount = 0;

      for (const kw of data) {
        const pos = kw.current_position;
        if (pos !== null && pos <= 3) top3Count++;
        if (pos !== null && pos <= 10) top10Count++;
        if (pos !== null) {
          positionSum += pos;
          positionCount++;
          // CTR-based organic traffic estimation
          const vol = kw.search_volume ?? 0;
          if (vol > 0) {
            const ctr = pos <= 10 ? (CTR_CURVE[pos] ?? 0.01) : 0.005;
            organicTraffic += Math.round(vol * ctr);
          }
        }
        if (kw.current_position !== null && kw.previous_position !== null) {
          if (kw.current_position < kw.previous_position) upCount++;
          else if (kw.current_position > kw.previous_position) downCount++;
        }
        if (kw.ai_visibility_score != null) {
          aiVisSum += kw.ai_visibility_score;
          aiVisCount++;
        }
      }

      const avgPosition = positionCount > 0 ? positionSum / positionCount : 0;
      const aiVisibilityAvg = aiVisCount > 0 ? Math.round(aiVisSum / aiVisCount) : 0;

      return { total, top3Count, top10Count, avgPosition, upCount, downCount, organicTraffic, aiVisibilityAvg };
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch rank history for a specific keyword.
 * Used for sparkline charts.
 */
export function useKeywordRanks(
  keywordId: string | undefined,
  days?: number
) {
  return useQuery<KeywordRank[]>({
    queryKey: ["keywordRanks", keywordId, days],
    queryFn: async () => {
      if (!keywordId) return [];

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

      const { data, error } = await query.limit(30);

      if (error || !data) return [];

      return data as KeywordRank[];
    },
    enabled: !!keywordId,
  });
}
