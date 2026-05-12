import { createAdminClient } from "@/lib/supabase/admin";

/* ── Types ──────────────────────────────────────────────────── */

export interface OptimizablePage {
  id: string;
  audit_id: string;
  url: string;
  status_code: number | null;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  word_count: number | null;
  load_time_ms: number | null;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  has_schema: boolean;
  canonical_url: string | null;
  issues_count: number;
}

export interface PageKeyword {
  keyword: string;
  current_position: number | null;
  previous_position: number | null;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  cpc: number | null;
  url: string | null;
}

export interface PageBacklink {
  source_url: string;
  domain_authority: number | null;
  anchor_text: string | null;
  link_type: string | null;
}

/* ── Queries ─────────────────────────────────────────────────── */

/**
 * Get all optimizable pages from the latest completed audit.
 * Returns pages with status 200 only (valid, crawlable pages).
 */
export async function getOptimizablePages(projectId: string): Promise<OptimizablePage[]> {
  const supabase = createAdminClient();

  // Get latest completed audit
  const { data: audit } = await supabase
    .from("site_audits")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (!audit) return [];

  const { data: pages } = await supabase
    .from("audit_pages")
    .select("id, audit_id, url, status_code, title, meta_description, h1, word_count, load_time_ms, lcp_ms, cls, inp_ms, has_schema, canonical_url, issues_count")
    .eq("audit_id", audit.id)
    .eq("status_code", 200)
    .order("url", { ascending: true });

  return (pages ?? []) as OptimizablePage[];
}

/**
 * Get keywords that rank for a specific page URL.
 * Joins keywords with their latest rank data filtered by URL.
 */
export async function getPageKeywords(projectId: string, pageUrl: string): Promise<PageKeyword[]> {
  const supabase = createAdminClient();

  // Get keywords for this project
  const { data: keywords } = await supabase
    .from("keywords")
    .select("id, keyword, current_position, previous_position, search_volume, difficulty, intent, cpc, url")
    .eq("project_id", projectId)
    .order("search_volume", { ascending: false, nullsFirst: false });

  if (!keywords) return [];

  // Filter to keywords that rank for this specific URL
  // Match by URL path (ignore trailing slashes and query params)
  const normalizeUrl = (u: string) => {
    try {
      const parsed = new URL(u);
      return parsed.pathname.replace(/\/$/, "");
    } catch {
      return u.replace(/\/$/, "");
    }
  };

  const targetPath = normalizeUrl(pageUrl);

  return keywords
    .filter((k) => {
      if (!k.url) return false;
      return normalizeUrl(k.url) === targetPath;
    })
    .map((k) => ({
      keyword: k.keyword,
      current_position: k.current_position,
      previous_position: k.previous_position,
      search_volume: k.search_volume,
      difficulty: k.difficulty,
      intent: k.intent,
      cpc: k.cpc,
      url: k.url,
    })) as PageKeyword[];
}

/**
 * Get backlinks pointing to a specific page URL.
 */
export async function getPageBacklinks(projectId: string, pageUrl: string): Promise<PageBacklink[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("backlinks")
    .select("source_url, domain_authority, anchor_text, link_type")
    .eq("project_id", projectId)
    .eq("target_url", pageUrl)
    .order("domain_authority", { ascending: false, nullsFirst: false })
    .limit(50);

  return (data ?? []) as PageBacklink[];
}

/**
 * Get audit issues affecting a specific page URL.
 */
export async function getPageAuditIssues(auditId: string, pageUrl: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("audit_issues")
    .select("id, category, severity, title, description, recommendation")
    .eq("audit_id", auditId)
    .eq("affected_url", pageUrl)
    .order("severity", { ascending: true });

  return data ?? [];
}

/* ── Optimization History ───────────────────────────────────── */

export interface PageOptimizationRecord {
  id: string;
  page_url: string;
  score_before: number;
  score_after: number;
  original_title: string | null;
  original_meta: string | null;
  original_h1: string | null;
  optimized_title: string | null;
  optimized_meta: string | null;
  optimized_h1: string | null;
  optimization_goal: string;
  content_brief: string | null;
  created_at: string;
}

/**
 * Get optimization history for a specific page.
 */
export async function getPageOptimizationHistory(
  projectId: string,
  pageUrl: string,
  limit = 10
): Promise<PageOptimizationRecord[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("page_optimizations")
    .select("id, page_url, score_before, score_after, original_title, original_meta, original_h1, optimized_title, optimized_meta, optimized_h1, optimization_goal, content_brief, created_at")
    .eq("project_id", projectId)
    .eq("page_url", pageUrl)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as PageOptimizationRecord[];
}

/**
 * Get the latest optimization for each page in a project (for showing historical scores in page selector).
 */
export async function getLatestOptimizationScores(
  projectId: string
): Promise<Record<string, { scoreBefore: number; scoreAfter: number; date: string }>> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("page_optimizations")
    .select("page_url, score_before, score_after, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (!data) return {};

  // Keep only the latest per URL
  const map: Record<string, { scoreBefore: number; scoreAfter: number; date: string }> = {};
  for (const row of data) {
    if (!map[row.page_url]) {
      map[row.page_url] = {
        scoreBefore: row.score_before,
        scoreAfter: row.score_after,
        date: row.created_at,
      };
    }
  }
  return map;
}

/**
 * Get all tracked keywords for the project (not filtered by page).
 * Used for keyword presence analysis across all target keywords.
 */
export async function getAllProjectKeywords(projectId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("keywords")
    .select("keyword, current_position, search_volume, difficulty, intent, url")
    .eq("project_id", projectId)
    .order("search_volume", { ascending: false, nullsFirst: false })
    .limit(100);

  return data ?? [];
}
