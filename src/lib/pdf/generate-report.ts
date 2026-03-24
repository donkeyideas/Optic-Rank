import React from "react";
import { renderToBuffer, View, Text } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportDocument, ensureFontsRegistered } from "./editorial-template";
import {
  KeywordsSection,
  buildKeywordRows,
  buildKeywordStats,
} from "./sections/keywords-section";
import {
  BacklinksSection,
  buildBacklinkRows,
  buildBacklinkStats,
} from "./sections/backlinks-section";
import {
  AuditSection,
  buildAuditData,
} from "./sections/audit-section";
import {
  CompetitorsSection,
  buildCompetitorRows,
} from "./sections/competitors-section";
import {
  AIInsightsSection,
  buildInsights,
  buildInsightStats,
} from "./sections/ai-insights-section";
import {
  ExecutiveSection,
  buildExecutiveSummary,
} from "./sections/executive-section";

export { ALL_SECTIONS } from "./report-constants";
export type { ReportTemplate, ReportSection } from "./report-constants";
import type { ReportTemplate, ReportSection } from "./report-constants";

/**
 * Generate a PDF report for a project.
 * Accepts either a template name or a custom section list.
 * Returns a Buffer of the PDF content.
 */
export async function generateReportPDF(
  projectId: string,
  template: ReportTemplate,
  customSections?: ReportSection[]
): Promise<Buffer> {
  // Register fonts lazily — only runs server-side, only once
  ensureFontsRegistered();

  const supabase = createAdminClient();

  // Fetch project info
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain, url")
    .eq("id", projectId)
    .single();

  if (!project) throw new Error("Project not found");

  const now = new Date();
  const generatedAt = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Determine which sections to include
  const sections = template === "custom" && customSections?.length
    ? customSections
    : getSectionsForTemplate(template);

  // Fetch data for each section in parallel
  const [keywordsData, backlinksData, auditData, competitorsData, insightsData] =
    await Promise.all([
      sections.includes("keywords") ? fetchKeywords(supabase, projectId) : null,
      sections.includes("backlinks") ? fetchBacklinks(supabase, projectId) : null,
      sections.includes("audit") ? fetchAudit(supabase, projectId) : null,
      sections.includes("competitors") ? fetchCompetitors(supabase, projectId) : null,
      sections.includes("insights") ? fetchInsights(supabase, projectId) : null,
    ]);

  // Build the title
  const templateNames: Record<ReportTemplate, string> = {
    full: "Full SEO Report",
    keywords: "Keyword Rankings Report",
    backlinks: "Backlink Profile Report",
    audit: "Site Audit Report",
    executive: "Executive Summary",
    custom: "Custom SEO Report",
  };

  // Build section elements
  const children: React.ReactElement[] = [];

  if (sections.includes("executive")) {
    const kwRows = keywordsData?.rows ?? [];
    const kwStats = keywordsData?.stats ?? { total: 0, top3: 0, top10: 0, avgPosition: 0 };
    const blStats = backlinksData?.stats ?? { totalBacklinks: 0, referringDomains: 0, toxicLinks: 0, avgTrustFlow: 0 };

    children.push(
      React.createElement(ExecutiveSection, {
        key: "executive",
        data: buildExecutiveSummary({
          project,
          keywordCount: kwStats.total,
          avgPosition: kwStats.avgPosition,
          top10Count: kwStats.top10,
          healthScore: auditData?.healthScore ?? 0,
          backlinkCount: blStats.totalBacklinks,
          referringDomains: blStats.referringDomains,
          aiVisibilityAvg: 0,
          highPriorityInsights: insightsData?.stats.highPriority ?? 0,
        }),
      })
    );
  }

  if (sections.includes("keywords") && keywordsData) {
    children.push(
      React.createElement(KeywordsSection, {
        key: "keywords",
        keywords: keywordsData.rows,
        stats: keywordsData.stats,
      })
    );
  }

  if (sections.includes("backlinks") && backlinksData) {
    children.push(
      React.createElement(BacklinksSection, {
        key: "backlinks",
        backlinks: backlinksData.rows,
        stats: backlinksData.stats,
      })
    );
  }

  if (sections.includes("audit") && auditData) {
    children.push(
      React.createElement(AuditSection, {
        key: "audit",
        data: auditData,
      })
    );
  }

  if (sections.includes("competitors") && competitorsData) {
    children.push(
      React.createElement(CompetitorsSection, {
        key: "competitors",
        competitors: competitorsData,
      })
    );
  }

  if (sections.includes("insights") && insightsData) {
    children.push(
      React.createElement(AIInsightsSection, {
        key: "insights",
        insights: insightsData.items,
        stats: insightsData.stats,
      })
    );
  }

  // Filter out any null/undefined children just in case
  const safeChildren = children.filter(Boolean);

  const doc = React.createElement(
    ReportDocument,
    {
      title: templateNames[template],
      projectName: project.name,
      generatedAt,
    },
    ...(safeChildren.length > 0 ? safeChildren : [React.createElement(View, { key: "empty" }, React.createElement(Text, {}, "No data available for this report template."))])
  );

  try {
    return await renderToBuffer(doc);
  } catch (err) {
    console.error("[PDF] renderToBuffer failed:", err);
    throw new Error(`PDF generation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Section mapping                                                    */
/* ------------------------------------------------------------------ */
function getSectionsForTemplate(template: ReportTemplate): string[] {
  switch (template) {
    case "full":
      return ["executive", "keywords", "backlinks", "audit", "competitors", "insights"];
    case "keywords":
      return ["keywords"];
    case "backlinks":
      return ["backlinks"];
    case "audit":
      return ["audit"];
    case "executive":
      return ["executive", "keywords", "backlinks", "audit", "insights"];
    default:
      return ["executive"];
  }
}

/* ------------------------------------------------------------------ */
/*  Data fetchers                                                      */
/* ------------------------------------------------------------------ */
type AdminClient = ReturnType<typeof createAdminClient>;

async function fetchKeywords(supabase: AdminClient, projectId: string) {
  const { data } = await supabase
    .from("keywords")
    .select("keyword, current_position, previous_position, search_volume, difficulty")
    .eq("project_id", projectId)
    .order("current_position", { ascending: true, nullsFirst: false })
    .limit(100);

  const rows = buildKeywordRows((data as Record<string, unknown>[]) ?? []);
  const stats = buildKeywordStats(rows);
  return { rows, stats };
}

async function fetchBacklinks(supabase: AdminClient, projectId: string) {
  const { data } = await supabase
    .from("backlinks")
    .select("source_url, target_url, trust_flow, citation_flow, anchor_text, is_toxic")
    .eq("project_id", projectId)
    .order("trust_flow", { ascending: false, nullsFirst: false })
    .limit(100);

  const rows = buildBacklinkRows((data as Record<string, unknown>[]) ?? []);
  const stats = buildBacklinkStats(rows);
  return { rows, stats };
}

async function fetchAudit(supabase: AdminClient, projectId: string) {
  const { data: audit } = await supabase
    .from("site_audits")
    .select("id, health_score, pages_crawled, issues_found")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let issues: Record<string, unknown>[] = [];
  if (audit?.id) {
    const { data } = await supabase
      .from("audit_issues")
      .select("title, severity, category, description, affected_url")
      .eq("audit_id", audit.id)
      .order("severity", { ascending: true })
      .limit(30);
    issues = (data as Record<string, unknown>[]) ?? [];
  }

  return buildAuditData(audit as Record<string, unknown> | null, issues);
}

async function fetchCompetitors(supabase: AdminClient, projectId: string) {
  const { data } = await supabase
    .from("competitors")
    .select("name, domain, authority_score, organic_traffic, keywords_count")
    .eq("project_id", projectId)
    .limit(20);

  return buildCompetitorRows((data as Record<string, unknown>[]) ?? []);
}

async function fetchInsights(supabase: AdminClient, projectId: string) {
  const { data } = await supabase
    .from("ai_insights")
    .select("title, description, priority, type, is_dismissed")
    .eq("project_id", projectId)
    .order("priority", { ascending: true })
    .limit(20);

  const raw = (data as Record<string, unknown>[]) ?? [];
  return {
    items: buildInsights(raw),
    stats: buildInsightStats(raw),
  };
}
