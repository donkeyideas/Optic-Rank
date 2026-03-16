import { createClient } from "@/lib/supabase/server";
import type { SiteAudit, AuditIssue, IssueCategory, IssueSeverity } from "@/types";

interface GetAuditIssuesOptions {
  category?: IssueCategory;
  severity?: IssueSeverity;
}

interface AuditPage {
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
  robots: string | null;
  issues_count: number;
  crawled_at: string;
}

/**
 * Get the most recent completed site audit for a project.
 */
export async function getLatestAudit(
  projectId: string
): Promise<SiteAudit | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("site_audits")
    .select(
      "id, project_id, status, pages_crawled, issues_found, health_score, seo_score, performance_score, accessibility_score, started_at, completed_at"
    )
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return data as SiteAudit;
}

/**
 * Get audit issues with optional category and severity filters.
 */
export async function getAuditIssues(
  auditId: string,
  opts: GetAuditIssuesOptions = {}
): Promise<AuditIssue[]> {
  const { category, severity } = opts;
  const supabase = await createClient();

  let query = supabase
    .from("audit_issues")
    .select(
      "id, audit_id, rule_id, category, severity, title, description, affected_url, recommendation, created_at"
    )
    .eq("audit_id", auditId);

  if (category) {
    query = query.eq("category", category);
  }

  if (severity) {
    query = query.eq("severity", severity);
  }

  const { data, error } = await query.order("severity", { ascending: true });

  if (error || !data) return [];

  // Map affected_url to affected_pages for type compatibility
  return data.map((issue) => ({
    id: issue.id,
    audit_id: issue.audit_id,
    rule_id: issue.rule_id ?? "",
    category: issue.category as IssueCategory,
    severity: issue.severity as IssueSeverity,
    title: issue.title,
    description: issue.description ?? "",
    affected_pages: 1,
    recommendation: issue.recommendation,
  })) as AuditIssue[];
}

/**
 * Get all crawled pages for an audit.
 */
export async function getAuditPages(auditId: string): Promise<AuditPage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_pages")
    .select(
      "id, audit_id, url, status_code, title, meta_description, h1, word_count, load_time_ms, lcp_ms, cls, inp_ms, has_schema, canonical_url, robots, issues_count, crawled_at"
    )
    .eq("audit_id", auditId)
    .order("issues_count", { ascending: false });

  if (error || !data) return [];

  return data as AuditPage[];
}

/**
 * Get the history of past audits for a project, most recent first.
 */
export async function getAuditHistory(projectId: string): Promise<SiteAudit[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("site_audits")
    .select(
      "id, project_id, status, pages_crawled, issues_found, health_score, seo_score, performance_score, accessibility_score, started_at, completed_at"
    )
    .eq("project_id", projectId)
    .order("started_at", { ascending: false });

  if (error || !data) return [];

  return data as SiteAudit[];
}
