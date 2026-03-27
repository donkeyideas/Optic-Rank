import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Search } from "lucide-react";
import { SearchAIClient } from "./search-ai-client";
import { getLatestAudit, getAuditPages, getAuditHistory } from "@/lib/dal/site-audit";
import {
  getGeoStats,
  getGeoScoresByPage,
  getCitationMatrix,
  getAeoKeywordsData,
  getSchemaAuditData,
  getConversionGoals,
  getKeywordsWithRevenue,
  getCroStats,
} from "@/lib/dal/optimization";
import { getVisibilityStats, getVisibilityChecks } from "@/lib/dal/ai-visibility";
import {
  findSnippetOpportunities,
  computeAnswerReadiness,
  identifyVoiceSearchKeywords,
} from "@/lib/ai/aeo-analysis";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";

export default async function SearchAIDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return (
      <EmptyState
        icon={Search}
        title="Organization Required"
        description="Set up your organization first to access SEO & AI Analytics."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return (
      <EmptyState
        icon={Search}
        title="No Active Project"
        description="Create a project first to access SEO & AI Analytics."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const projectDomain = project.domain ?? project.name;

  // Fetch all data in parallel where possible
  const [
    latestAudit,
    auditHistory,
    geoStats,
    geoPages,
    citationMatrix,
    visibilityStats,
    visibilityChecks,
    aeoData,
    schemaAudit,
    conversionGoals,
  ] = await Promise.all([
    getLatestAudit(project.id),
    getAuditHistory(project.id),
    getGeoStats(project.id),
    getGeoScoresByPage(project.id),
    getCitationMatrix(project.id),
    getVisibilityStats(project.id),
    getVisibilityChecks(project.id, { limit: 50 }),
    getAeoKeywordsData(project.id),
    getSchemaAuditData(project.id),
    getConversionGoals(project.id),
  ]);

  // Fetch audit pages (depends on latestAudit)
  const auditPages = latestAudit ? await getAuditPages(latestAudit.id) : [];

  // Fetch AEO/GEO signal data from audit_issues
  let aeoSignals: Array<{ url: string; signals: Record<string, unknown> }> = [];
  let geoSignals: Array<{ url: string; signals: Record<string, unknown> }> = [];
  if (latestAudit) {
    const { data: signalRows } = await supabase
      .from("audit_issues")
      .select("category, affected_url, description")
      .eq("audit_id", latestAudit.id)
      .in("rule_id", ["page-aeo-signals", "page-geo-signals"]);

    for (const row of signalRows ?? []) {
      try {
        const parsed = JSON.parse(row.description);
        if (row.category === "aeo-signal" && row.affected_url) {
          aeoSignals.push({ url: row.affected_url, signals: parsed });
        } else if (row.category === "geo-signal" && row.affected_url) {
          geoSignals.push({ url: row.affected_url, signals: parsed });
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }

  // CRO data (depends on conversionGoals)
  const keywordsWithRevenue = await getKeywordsWithRevenue(project.id, conversionGoals);
  const croStats = await getCroStats(project.id, conversionGoals, keywordsWithRevenue);

  // Compute AEO analysis from keywords data
  const snippetOpportunities = findSnippetOpportunities(
    aeoData.keywords,
    aeoData.latestRanks,
    projectDomain
  );
  const answerReadiness = computeAnswerReadiness(
    aeoData.keywords,
    aeoData.latestRanks
  );
  const voiceSearchKeywords = identifyVoiceSearchKeywords(aeoData.keywords);

  // Keywords for SEO tab
  const { data: allKeywords } = await supabase
    .from("keywords")
    .select("id, keyword, current_position, search_volume, intent, difficulty")
    .eq("project_id", project.id)
    .eq("is_active", true)
    .order("search_volume", { ascending: false, nullsFirst: false });

  const keywords = (allKeywords ?? []).map((k) => ({
    id: k.id,
    keyword: k.keyword,
    current_position: k.current_position,
    search_volume: k.search_volume,
    intent: k.intent,
    difficulty: k.difficulty,
  }));

  // Content pages for SEO tab
  const { data: contentPagesRaw } = await supabase
    .from("audit_pages")
    .select("id, url, title, status_code, word_count")
    .eq("audit_id", latestAudit?.id ?? "")
    .order("word_count", { ascending: false, nullsFirst: false })
    .limit(50);

  const contentPages = (contentPagesRaw ?? []).map((p) => ({
    id: p.id,
    url: p.url,
    title: p.title,
    status: p.status_code ? String(p.status_code) : null,
    word_count: p.word_count,
  }));

  // ------------------------------------------------------------------
  // Period comparisons from audit history
  // ------------------------------------------------------------------
  interface AuditPoint {
    date: string;
    health_score: number | null;
    seo_score: number | null;
    performance_score: number | null;
    accessibility_score: number | null;
    issues_found: number | null;
  }

  const auditPoints: AuditPoint[] = [...(auditHistory ?? [])]
    .reverse()
    .map((a) => ({
      date: (a.completed_at ?? a.started_at ?? "").split("T")[0],
      health_score: a.health_score,
      seo_score: a.seo_score,
      performance_score: a.performance_score,
      accessibility_score: a.accessibility_score,
      issues_found: a.issues_found,
    }))
    .filter((a) => a.date !== "");

  const seoMetrics: MetricDef<AuditPoint>[] = [
    { label: "Health Score", getValue: (a) => a.health_score, aggregation: "latest" },
    { label: "SEO Score", getValue: (a) => a.seo_score, aggregation: "latest" },
    { label: "Performance", getValue: (a) => a.performance_score, aggregation: "latest" },
    { label: "Accessibility", getValue: (a) => a.accessibility_score, aggregation: "latest" },
    { label: "Issues Found", getValue: (a) => a.issues_found, aggregation: "latest", invertDirection: true },
  ];

  const seoComparisons = computeAllComparisons(auditPoints, seoMetrics, (a) => a.date);

  // Fetch GSC dashboard data
  let gscData: import("@/lib/actions/gsc-dashboard").GSCDashboardData | null = null;
  try {
    const { fetchGSCDashboardData } = await import("@/lib/actions/gsc-dashboard");
    gscData = await fetchGSCDashboardData(project.id);
  } catch {
    // GSC not connected or fetch failed
  }

  return (
    <SearchAIClient
      projectId={project.id}
      projectDomain={projectDomain}
      latestAudit={latestAudit}
      auditPages={auditPages}
      auditHistory={auditHistory}
      keywords={keywords}
      contentPages={contentPages}
      geoStats={geoStats}
      geoPages={geoPages}
      citationMatrix={citationMatrix}
      visibilityStats={visibilityStats}
      visibilityChecks={visibilityChecks}
      snippetOpportunities={snippetOpportunities}
      answerReadiness={answerReadiness}
      voiceSearchKeywords={voiceSearchKeywords}
      schemaAudit={schemaAudit}
      totalKeywords={keywords.length}
      keywordsWithRevenue={keywordsWithRevenue}
      croStats={croStats}
      aeoSignals={aeoSignals}
      geoSignals={geoSignals}
      gscData={gscData}
      comparisons={seoComparisons}
    />
  );
}
