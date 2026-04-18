import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { SiteAudit, AuditIssue, IssueCategory, IssueSeverity } from "../types";

interface AuditIssueFilters {
  category?: IssueCategory;
  severity?: IssueSeverity;
}

/**
 * Fetch the most recent completed site audit for a project.
 * Mirrors web DAL site-audit.ts → getLatestAudit().
 */
export function useLatestAudit(projectId: string | undefined) {
  return useQuery<SiteAudit | null>({
    queryKey: ["latestAudit", projectId],
    queryFn: async () => {
      if (!projectId) return null;

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
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch audit issues with optional category and severity filters.
 * Maps affected_url to affected_pages for type compatibility (same as web DAL).
 * Mirrors web DAL site-audit.ts → getAuditIssues().
 */
export function useAuditIssues(
  auditId: string | undefined,
  filters: AuditIssueFilters = {}
) {
  const { category, severity } = filters;

  return useQuery<AuditIssue[]>({
    queryKey: ["auditIssues", auditId, category, severity],
    queryFn: async () => {
      if (!auditId) return [];

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

      const { data, error } = await query.order("severity", {
        ascending: true,
      });

      if (error || !data) return [];

      // Map affected_url to affected_pages for type compatibility (matches web DAL)
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
    },
    enabled: !!auditId,
  });
}

/**
 * Fetch audit pages for a given audit ID.
 */
export interface AuditPage {
  id: string;
  audit_id: string;
  url: string;
  status_code: number | null;
  title: string | null;
  word_count: number | null;
  load_time_ms: number | null;
  has_schema: boolean | null;
}

export function useAuditPages(auditId: string | undefined) {
  return useQuery<AuditPage[]>({
    queryKey: ["auditPages", auditId],
    queryFn: async () => {
      if (!auditId) return [];
      const { data, error } = await supabase
        .from("audit_pages")
        .select("id, audit_id, url, status_code, title, word_count, load_time_ms, has_schema")
        .eq("audit_id", auditId)
        .order("url", { ascending: true });
      if (error || !data) return [];
      return data as AuditPage[];
    },
    enabled: !!auditId,
  });
}
