/**
 * Shared utility for processing PageSpeed data into audit records.
 * Used by both auto-collect (collectPageSpeed) and manual (runSiteAudit).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface CrUXFieldData {
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  overall_category: "FAST" | "AVERAGE" | "SLOW" | null;
}

interface CWVData {
  performance_score: number;
  accessibility_score: number;
  lcp_ms: number;
  cls: number;
  inp_ms: number;
  fcp_ms: number;
  ttfb_ms: number;
  speed_index: number;
  total_blocking_time: number;
  page_title?: string | null;
  field_page?: CrUXFieldData | null;
  field_origin?: CrUXFieldData | null;
}

interface AuditIssueRow {
  audit_id: string;
  category: string;
  severity: string;
  rule_id: string;
  title: string;
  description: string;
  affected_url: string | null;
  recommendation: string;
}

/**
 * Process PageSpeed CWV data into a full audit with scores + issues.
 * Creates or updates the audit record and inserts issues.
 */
export async function processPageSpeedAudit(
  supabase: SupabaseClient,
  projectId: string,
  cwv: CWVData,
  existingAuditId?: string,
  auditedUrl?: string
): Promise<{ auditId: string; issues: number }> {
  const performanceScore = cwv.performance_score;
  const accessibilityScore = cwv.accessibility_score;

  // Placeholder scores — will be overridden by crawl-based scoring in runSiteAudit.
  // When called standalone (e.g., from collectPageSpeed), these serve as baseline estimates.
  const seoScore = Math.min(100, Math.round(performanceScore * 0.4 + 60));
  const contentScore = Math.min(100, Math.round(performanceScore * 0.35 + 65));
  const healthScore = Math.round(
    (performanceScore + seoScore + accessibilityScore) / 3
  );

  // Build issues based on CWV metrics
  const issues: AuditIssueRow[] = [];

  // LCP
  if (cwv.lcp_ms > 2500) {
    issues.push({
      audit_id: "", // Set after audit insert
      category: "performance",
      severity: "critical",
      rule_id: "cwv-lcp-critical",
      title: "Largest Contentful Paint exceeds 2.5s",
      description: `LCP is ${(cwv.lcp_ms / 1000).toFixed(1)}s, above the 2.5s threshold for a good user experience.`,
      affected_url: null,
      recommendation:
        "Optimize images (use WebP/AVIF), reduce render-blocking resources, implement lazy loading, and preload critical assets.",
    });
  } else if (cwv.lcp_ms > 1800) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "warning",
      rule_id: "cwv-lcp-warning",
      title: "Largest Contentful Paint needs improvement",
      description: `LCP is ${(cwv.lcp_ms / 1000).toFixed(1)}s. Target under 1.8s for optimal performance.`,
      affected_url: null,
      recommendation:
        "Preload critical resources, optimize server response times, and compress images.",
    });
  }

  // CLS
  if (cwv.cls > 0.25) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "critical",
      rule_id: "cwv-cls-critical",
      title: "Cumulative Layout Shift is too high",
      description: `CLS is ${cwv.cls.toFixed(3)}, above the 0.25 threshold. Significant visual instability detected.`,
      affected_url: null,
      recommendation:
        "Add explicit dimensions to images/videos, avoid inserting content above existing content, use CSS containment.",
    });
  } else if (cwv.cls > 0.1) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "warning",
      rule_id: "cwv-cls-warning",
      title: "Cumulative Layout Shift needs improvement",
      description: `CLS is ${cwv.cls.toFixed(3)}. Aim for under 0.1 for a stable visual experience.`,
      affected_url: null,
      recommendation:
        "Set size attributes on images and video elements, avoid dynamically injected content.",
    });
  }

  // INP
  if (cwv.inp_ms > 500) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "critical",
      rule_id: "cwv-inp-critical",
      title: "Interaction to Next Paint is poor",
      description: `INP is ${Math.round(cwv.inp_ms)}ms, well above the 500ms threshold.`,
      affected_url: null,
      recommendation:
        "Break up long tasks, optimize event handlers, and reduce JavaScript execution time.",
    });
  } else if (cwv.inp_ms > 200) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "warning",
      rule_id: "cwv-inp-warning",
      title: "Interaction to Next Paint needs improvement",
      description: `INP is ${Math.round(cwv.inp_ms)}ms. Target under 200ms for responsive interactions.`,
      affected_url: null,
      recommendation:
        "Minimize main thread work and use requestIdleCallback for non-critical tasks.",
    });
  }

  // TTFB
  if (cwv.ttfb_ms > 800) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "warning",
      rule_id: "cwv-ttfb-warning",
      title: "Server response time is slow",
      description: `Time to First Byte is ${Math.round(cwv.ttfb_ms)}ms. Aim for under 800ms.`,
      affected_url: null,
      recommendation:
        "Optimize server-side code, use a CDN, implement caching, and consider upgrading hosting.",
    });
  }

  // FCP
  if (cwv.fcp_ms > 3000) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "warning",
      rule_id: "cwv-fcp-warning",
      title: "First Contentful Paint is slow",
      description: `FCP is ${(cwv.fcp_ms / 1000).toFixed(1)}s. Aim for under 1.8s.`,
      affected_url: null,
      recommendation:
        "Eliminate render-blocking resources, inline critical CSS, and defer non-essential JavaScript.",
    });
  }

  // Total Blocking Time
  if (cwv.total_blocking_time > 600) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "warning",
      rule_id: "cwv-tbt-warning",
      title: "Total Blocking Time is high",
      description: `TBT is ${Math.round(cwv.total_blocking_time)}ms. This delays interactivity.`,
      affected_url: null,
      recommendation:
        "Split long JavaScript tasks, remove unused code, and defer third-party scripts.",
    });
  }

  // Always store CWV metrics as info issues for dashboard display
  const cwvMetrics = [
    { rule_id: "cwv-metric-lcp", title: `LCP: ${(cwv.lcp_ms / 1000).toFixed(2)}s`, value: cwv.lcp_ms, good: cwv.lcp_ms <= 2500 },
    { rule_id: "cwv-metric-cls", title: `CLS: ${cwv.cls.toFixed(3)}`, value: cwv.cls, good: cwv.cls <= 0.1 },
    { rule_id: "cwv-metric-fcp", title: `FCP: ${(cwv.fcp_ms / 1000).toFixed(2)}s`, value: cwv.fcp_ms, good: cwv.fcp_ms <= 1800 },
    { rule_id: "cwv-metric-ttfb", title: `TTFB: ${Math.round(cwv.ttfb_ms)}ms`, value: cwv.ttfb_ms, good: cwv.ttfb_ms <= 800 },
    { rule_id: "cwv-metric-tbt", title: `TBT: ${Math.round(cwv.total_blocking_time)}ms`, value: cwv.total_blocking_time, good: cwv.total_blocking_time <= 200 },
    { rule_id: "cwv-metric-si", title: `Speed Index: ${(cwv.speed_index / 1000).toFixed(2)}s`, value: cwv.speed_index, good: cwv.speed_index <= 3400 },
  ];
  for (const m of cwvMetrics) {
    issues.push({
      audit_id: "",
      category: "performance",
      severity: "info",
      rule_id: m.rule_id,
      title: m.title,
      description: String(m.value),
      affected_url: null,
      recommendation: m.good ? "Good - within recommended threshold." : "Needs improvement.",
    });
  }

  // Performance score based SEO issue
  if (performanceScore < 50) {
    issues.push({
      audit_id: "",
      category: "seo",
      severity: "critical",
      rule_id: "perf-score-seo-critical",
      title: "Very low performance score impacts SEO",
      description: `Performance score is ${performanceScore}/100 (poor range). This may negatively affect search rankings.`,
      affected_url: null,
      recommendation:
        "Address all critical performance issues. Google uses Core Web Vitals as a ranking factor.",
    });
  } else if (performanceScore < 75) {
    issues.push({
      audit_id: "",
      category: "seo",
      severity: "info",
      rule_id: "perf-score-seo-info",
      title: "Performance score could be improved for better SEO",
      description: `Performance score is ${performanceScore}/100. Improving to 90+ can positively influence rankings.`,
      affected_url: null,
      recommendation:
        "Continue optimizing Core Web Vitals to achieve a score above 90.",
    });
  }

  // Count only real issues (not CWV metric entries) for issues_found
  const realIssueCount = issues.filter((i) => !i.rule_id.startsWith("cwv-metric-")).length;

  // Create or update the audit record
  let auditId = existingAuditId;

  if (auditId) {
    // Update existing audit
    await supabase
      .from("site_audits")
      .update({
        status: "completed",
        pages_crawled: 1,
        pages_total: 1,
        issues_found: realIssueCount,
        health_score: healthScore,
        seo_score: seoScore,
        performance_score: performanceScore,
        accessibility_score: accessibilityScore,
        content_score: contentScore,
        completed_at: new Date().toISOString(),
      })
      .eq("id", auditId);
  } else {
    // Create new audit
    const { data: audit, error } = await supabase
      .from("site_audits")
      .insert({
        project_id: projectId,
        status: "completed",
        pages_crawled: 1,
        pages_total: 1,
        issues_found: realIssueCount,
        health_score: healthScore,
        seo_score: seoScore,
        performance_score: performanceScore,
        accessibility_score: accessibilityScore,
        content_score: contentScore,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !audit) {
      throw new Error(error?.message ?? "Failed to create audit record.");
    }
    auditId = audit.id;
  }

  // Insert issues with audit_id set
  if (issues.length > 0) {
    const issueRows = issues.map((issue) => ({ ...issue, audit_id: auditId! }));
    const { error: issueInsertError } = await supabase.from("audit_issues").insert(issueRows);
    if (issueInsertError) {
      console.error("[processPageSpeedAudit] Failed to insert issues:", issueInsertError.message);
    }
  }

  // Insert audit_pages record for the crawled page
  if (auditedUrl) {
    const { error: pageInsertError } = await supabase.from("audit_pages").insert({
      audit_id: auditId!,
      url: auditedUrl,
      status_code: 200,
      title: cwv.page_title ?? null,
      load_time_ms: Math.round(cwv.ttfb_ms + cwv.lcp_ms),
      lcp_ms: cwv.lcp_ms,
      cls: cwv.cls,
      inp_ms: cwv.inp_ms,
      issues_count: realIssueCount,
      // CrUX field data (real-user metrics at p75)
      ...(cwv.field_page ? {
        field_lcp_ms: cwv.field_page.lcp_ms,
        field_cls: cwv.field_page.cls,
        field_inp_ms: cwv.field_page.inp_ms,
        field_fcp_ms: cwv.field_page.fcp_ms,
        field_ttfb_ms: cwv.field_page.ttfb_ms,
        field_category: cwv.field_page.overall_category,
      } : {}),
      ...(cwv.field_origin ? {
        origin_lcp_ms: cwv.field_origin.lcp_ms,
        origin_cls: cwv.field_origin.cls,
        origin_inp_ms: cwv.field_origin.inp_ms,
        origin_category: cwv.field_origin.overall_category,
      } : {}),
    });
    if (pageInsertError) {
      console.error("[processPageSpeedAudit] Failed to insert audit page:", pageInsertError.message);
    }
  }

  return { auditId: auditId!, issues: issues.length };
}
