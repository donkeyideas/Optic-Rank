import { createClient } from "@/lib/supabase/server";
import type { AIVisibilityCheck } from "@/types";

export interface VisibilityStats {
  totalChecks: number;
  avgScore: number;
  keywordsChecked: number;
  llmsWithMention: number;
  totalLLMs: number;
  lastChecked: string | null;
}

export interface KeywordVisibility {
  keyword_id: string;
  keyword: string;
  search_volume: number | null;
  ai_visibility_score: number | null;
  ai_visibility_count: string | null;
  checks: AIVisibilityCheck[];
}

/**
 * Get the latest visibility checks for a project, joined with keyword names.
 */
export async function getVisibilityChecks(
  projectId: string,
  options?: { provider?: string; limit?: number }
): Promise<AIVisibilityCheck[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("ai_visibility_checks")
      .select("*, keywords!inner(project_id)")
      .eq("keywords.project_id", projectId)
      .order("checked_at", { ascending: false })
      .limit(options?.limit ?? 500);

    if (options?.provider) {
      query = query.eq("llm_provider", options.provider);
    }

    const { data } = await query;
    return (data ?? []) as unknown as AIVisibilityCheck[];
  } catch {
    return [];
  }
}

/**
 * Get aggregated visibility stats for a project.
 */
export async function getVisibilityStats(
  projectId: string
): Promise<VisibilityStats> {
  try {
    const supabase = await createClient();

    // Get keywords with visibility data
    const { data: keywords } = await supabase
      .from("keywords")
      .select("id, ai_visibility_score, ai_visibility_count")
      .eq("project_id", projectId)
      .not("ai_visibility_score", "is", null);

    const kws = keywords ?? [];
    const avgScore =
      kws.length > 0
        ? Math.round(kws.reduce((s, k) => s + (k.ai_visibility_score ?? 0), 0) / kws.length)
        : 0;

    // Get latest check time
    const { data: latestCheck } = await supabase
      .from("ai_visibility_checks")
      .select("checked_at, keywords!inner(project_id)")
      .eq("keywords.project_id", projectId)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Count total checks
    const { count } = await supabase
      .from("ai_visibility_checks")
      .select("id, keywords!inner(project_id)", { count: "exact", head: true })
      .eq("keywords.project_id", projectId);

    return {
      totalChecks: count ?? 0,
      avgScore,
      keywordsChecked: kws.length,
      llmsWithMention: 0, // computed client-side from checks
      totalLLMs: 5,
      lastChecked: (latestCheck as unknown as { checked_at: string })?.checked_at ?? null,
    };
  } catch {
    return {
      totalChecks: 0,
      avgScore: 0,
      keywordsChecked: 0,
      llmsWithMention: 0,
      totalLLMs: 5,
      lastChecked: null,
    };
  }
}

/**
 * Get visibility checks grouped by keyword for the project.
 */
export async function getVisibilityByKeyword(
  projectId: string
): Promise<KeywordVisibility[]> {
  try {
    const supabase = await createClient();

    // Fetch keywords
    const { data: keywords } = await supabase
      .from("keywords")
      .select("id, keyword, search_volume, ai_visibility_score, ai_visibility_count")
      .eq("project_id", projectId)
      .order("search_volume", { ascending: false, nullsFirst: false });

    if (!keywords || keywords.length === 0) return [];

    // Fetch latest checks for each keyword (last check per provider)
    const keywordIds = keywords.map((k) => k.id);
    const { data: checks } = await supabase
      .from("ai_visibility_checks")
      .select("*")
      .in("keyword_id", keywordIds)
      .order("checked_at", { ascending: false });

    const checksMap = new Map<string, AIVisibilityCheck[]>();
    for (const check of (checks ?? []) as AIVisibilityCheck[]) {
      const existing = checksMap.get(check.keyword_id) ?? [];
      // Keep only the latest check per provider per keyword
      if (!existing.some((c) => c.llm_provider === check.llm_provider)) {
        existing.push(check);
        checksMap.set(check.keyword_id, existing);
      }
    }

    return keywords.map((kw) => ({
      keyword_id: kw.id,
      keyword: kw.keyword,
      search_volume: kw.search_volume,
      ai_visibility_score: kw.ai_visibility_score,
      ai_visibility_count: kw.ai_visibility_count,
      checks: checksMap.get(kw.id) ?? [],
    }));
  } catch {
    return [];
  }
}

/**
 * Get visibility history for a specific keyword over time.
 */
export async function getVisibilityHistory(
  keywordId: string,
  days: number = 30
): Promise<AIVisibilityCheck[]> {
  try {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await supabase
      .from("ai_visibility_checks")
      .select("*")
      .eq("keyword_id", keywordId)
      .gte("checked_at", since.toISOString())
      .order("checked_at", { ascending: true });

    return (data ?? []) as AIVisibilityCheck[];
  } catch {
    return [];
  }
}
