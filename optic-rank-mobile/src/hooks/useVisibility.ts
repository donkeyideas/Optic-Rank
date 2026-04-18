import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AIVisibilityCheck } from "../types";

// ── Visibility Checks ───────────────────────────────────────────────────────

export function useVisibilityChecks(
  projectId: string | undefined,
  provider?: string
) {
  return useQuery({
    queryKey: ["visibilityChecks", projectId, provider],
    enabled: !!projectId,
    queryFn: async (): Promise<AIVisibilityCheck[]> => {
      let query = supabase
        .from("ai_visibility_checks")
        .select("*, keywords!inner(project_id)")
        .eq("keywords.project_id", projectId!)
        .order("checked_at", { ascending: false })
        .limit(500);

      if (provider) {
        query = query.eq("llm_provider", provider);
      }

      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as AIVisibilityCheck[];
    },
  });
}

// ── Visibility Statistics ───────────────────────────────────────────────────

export interface VisibilityStats {
  avgScore: number;
  keywordsWithVisibility: number;
  totalChecks: number;
  lastChecked: string | null;
  providerBreakdown: Record<string, { mentioned: number; total: number }>;
}

export function useVisibilityStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ["visibilityStats", projectId],
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<VisibilityStats> => {
      // Keywords with AI visibility scores
      const { data: keywords } = await supabase
        .from("keywords")
        .select("id, ai_visibility_score, ai_visibility_count")
        .eq("project_id", projectId!)
        .not("ai_visibility_score", "is", null);

      const kws = keywords ?? [];
      const avgScore =
        kws.length > 0
          ? Math.round(
              kws.reduce((s, k) => s + (k.ai_visibility_score ?? 0), 0) /
                kws.length
            )
          : 0;

      // Total checks count
      const { count: totalChecks } = await supabase
        .from("ai_visibility_checks")
        .select("id, keywords!inner(project_id)", { count: "exact", head: true })
        .eq("keywords.project_id", projectId!);

      // Last checked date
      const { data: lastCheck } = await supabase
        .from("ai_visibility_checks")
        .select("checked_at, keywords!inner(project_id)")
        .eq("keywords.project_id", projectId!)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Provider breakdown
      const { data: checks } = await supabase
        .from("ai_visibility_checks")
        .select("llm_provider, brand_mentioned, keywords!inner(project_id)")
        .eq("keywords.project_id", projectId!);

      const providerBreakdown: Record<string, { mentioned: number; total: number }> = {};
      for (const c of checks ?? []) {
        const p = c.llm_provider;
        if (!providerBreakdown[p]) providerBreakdown[p] = { mentioned: 0, total: 0 };
        providerBreakdown[p].total++;
        if (c.brand_mentioned) providerBreakdown[p].mentioned++;
      }

      return {
        avgScore,
        keywordsWithVisibility: kws.length,
        totalChecks: totalChecks ?? 0,
        lastChecked: lastCheck?.checked_at ?? null,
        providerBreakdown,
      };
    },
  });
}

// ── Visibility by Keyword ───────────────────────────────────────────────────

export interface KeywordVisibility {
  keywordId: string;
  keyword: string;
  searchVolume: number | null;
  visibilityScore: number | null;
  visibilityCount: string | null;
  checks: AIVisibilityCheck[];
}

export function useVisibilityByKeyword(projectId: string | undefined) {
  return useQuery({
    queryKey: ["visibilityByKeyword", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<KeywordVisibility[]> => {
      const { data: keywords } = await supabase
        .from("keywords")
        .select("id, keyword, search_volume, ai_visibility_score, ai_visibility_count")
        .eq("project_id", projectId!)
        .order("search_volume", { ascending: false, nullsFirst: false });

      const kws = keywords ?? [];
      if (kws.length === 0) return [];

      const keywordIds = kws.map((k) => k.id);
      const { data: checks } = await supabase
        .from("ai_visibility_checks")
        .select("*")
        .in("keyword_id", keywordIds)
        .order("checked_at", { ascending: false });

      const checksMap = new Map<string, AIVisibilityCheck[]>();
      for (const c of checks ?? []) {
        const arr = checksMap.get(c.keyword_id) ?? [];
        arr.push(c as AIVisibilityCheck);
        checksMap.set(c.keyword_id, arr);
      }

      return kws.map((k) => ({
        keywordId: k.id,
        keyword: k.keyword,
        searchVolume: k.search_volume,
        visibilityScore: k.ai_visibility_score,
        visibilityCount: k.ai_visibility_count,
        checks: checksMap.get(k.id) ?? [],
      }));
    },
  });
}
