/**
 * Admin Search & AI — Platform-wide analytics queries
 *
 * All functions use createAdminClient() to bypass RLS.
 * Returns real data from Supabase — no mock/hardcoded values.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ================================================================
// Types
// ================================================================

export interface PlatformSeoOverview {
  seoScore: number;
  geoScore: number;
  aeoScore: number;
  croScore: number;
  totalProjects: number;
  totalKeywords: number;
  totalPages: number;
  totalAudits: number;
  // Sub-scores for radar chart
  technicalScore: number;
  contentScore: number;
  schemaScore: number;
  performanceScore: number;
  accessibilityScore: number;
}

export interface CmsPageAudit {
  id: string;
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  statusCode: number | null;
  wordCount: number | null;
  hasSchema: boolean;
  issuesCount: number;
  titleLength: number;
  descriptionLength: number;
  titleStatus: "good" | "short" | "long" | "missing";
  descriptionStatus: "good" | "short" | "long" | "missing";
}

export interface TechnicalCheck {
  id: string;
  name: string;
  description: string;
  status: "pass" | "warning" | "fail";
  value: number;
  total: number;
  percentage: number;
}

export interface ContentAnalysisRow {
  id: string;
  url: string;
  title: string | null;
  wordCount: number | null;
  contentScore: number | null;
  readabilityScore: number | null;
  freshnessScore: number | null;
  entityCoverage: number | null;
  lastModified: string | null;
  status: string | null;
}

export interface KeywordByIntent {
  intent: string;
  count: number;
  avgPosition: number;
  avgVolume: number;
}

export interface PositionBucket {
  label: string;
  count: number;
  pct: number;
}

export interface GeoPresenceRow {
  location: string;
  keywordsCount: number;
  avgPosition: number;
}

export interface SeoRecommendation {
  id: string;
  category: "seo" | "technical" | "content" | "performance" | "schema" | "aeo" | "geo" | "cro";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedCount: number;
}

export interface AeoOverviewData {
  totalMentions: number;
  engineBreakdown: { engine: string; count: number; mentionRate: number }[];
  mentionTypes: { type: string; count: number }[];
  recentMentions: {
    id: string;
    query: string;
    aiEngine: string;
    mentionType: string;
    urlCited: string | null;
    trackedDate: string;
  }[];
}

export interface AeoScoreRow {
  pageUrl: string;
  pageTitle: string | null;
  schemaRichness: number;
  faqCoverage: number;
  directAnswerReadiness: number;
  entityMarkup: number;
  speakableContent: number;
  aiSnippetCompatibility: number;
  overall: number;
}

export interface GeoScoreRow {
  pageUrl: string;
  pageTitle: string | null;
  citability: number;
  topicalAuthority: number;
  sourceCredibility: number;
  contentFreshness: number;
  semanticClarity: number;
  aiDiscoverability: number;
  overall: number;
}

export interface CroAbTestRow {
  id: string;
  testName: string;
  pageUrl: string;
  variantAName: string;
  variantAConversions: number;
  variantAVisitors: number;
  variantBName: string;
  variantBConversions: number;
  variantBVisitors: number;
  metricName: string;
  status: string;
  winner: string | null;
  significance: number;
  startDate: string;
  endDate: string | null;
}

// ================================================================
// 1. getPlatformSeoOverview()
// ================================================================

export async function getPlatformSeoOverview(
  projectId?: string
): Promise<PlatformSeoOverview> {
  const admin = createAdminClient();

  try {
    // Build queries with optional project filter
    const auditsQuery = admin
      .from("site_audits")
      .select("seo_score, health_score, performance_score, accessibility_score, content_score")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10);
    if (projectId) auditsQuery.eq("project_id", projectId);

    const geoQuery = admin
      .from("geo_scores")
      .select("geo_score, entity_score, structure_score, schema_score, ai_citation_score");
    if (projectId) geoQuery.eq("project_id", projectId);

    const kwQuery = admin
      .from("keywords")
      .select("ai_visibility_score, current_position, search_volume")
      .eq("is_active", true);
    if (projectId) kwQuery.eq("project_id", projectId);

    const projectCountQuery = admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    const kwCountQuery = admin
      .from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if (projectId) kwCountQuery.eq("project_id", projectId);

    const pagesCountQuery = admin
      .from("content_pages")
      .select("id", { count: "exact", head: true });
    if (projectId) pagesCountQuery.eq("project_id", projectId);

    const auditsCountQuery = admin
      .from("site_audits")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed");
    if (projectId) auditsCountQuery.eq("project_id", projectId);

    const goalsQuery = admin
      .from("conversion_goals")
      .select("estimated_conversion_rate, estimated_value");
    if (projectId) goalsQuery.eq("project_id", projectId);

    const [
      { data: audits },
      { data: geoScores },
      { data: keywords },
      { count: totalProjects },
      { count: totalKeywords },
      { count: totalPages },
      { count: totalAudits },
      { data: goals },
    ] = await Promise.all([
      auditsQuery,
      geoQuery,
      kwQuery,
      projectCountQuery,
      kwCountQuery,
      pagesCountQuery,
      auditsCountQuery,
      goalsQuery,
    ]);

    // SEO Score = average of latest audits' seo_score
    const auditArr = audits ?? [];
    const seoScore =
      auditArr.length > 0
        ? Math.round(
            auditArr.reduce((s, a) => s + (a.seo_score ?? 0), 0) /
              auditArr.length
          )
        : 0;

    const technicalScore =
      auditArr.length > 0
        ? Math.round(
            auditArr.reduce((s, a) => s + (a.health_score ?? 0), 0) /
              auditArr.length
          )
        : 0;

    const performanceScore =
      auditArr.length > 0
        ? Math.round(
            auditArr.reduce((s, a) => s + (a.performance_score ?? 0), 0) /
              auditArr.length
          )
        : 0;

    const accessibilityScore =
      auditArr.length > 0
        ? Math.round(
            auditArr.reduce((s, a) => s + (a.accessibility_score ?? 0), 0) /
              auditArr.length
          )
        : 0;

    const contentScore =
      auditArr.length > 0
        ? Math.round(
            auditArr.reduce((s, a) => s + (a.content_score ?? 0), 0) /
              auditArr.length
          )
        : 0;

    // GEO Score = average of geo_scores.geo_score
    const geoArr = geoScores ?? [];
    const geoScore =
      geoArr.length > 0
        ? Math.round(
            geoArr.reduce((s, g) => s + Number(g.geo_score), 0) / geoArr.length
          )
        : 0;

    const schemaScore =
      geoArr.length > 0
        ? Math.round(
            geoArr.reduce((s, g) => s + Number(g.schema_score), 0) /
              geoArr.length
          )
        : 0;

    // AEO Score = average ai_visibility_score across keywords
    const kwArr = keywords ?? [];
    const kwWithVis = kwArr.filter((k) => k.ai_visibility_score !== null);
    const aeoScore =
      kwWithVis.length > 0
        ? Math.round(
            kwWithVis.reduce((s, k) => s + (k.ai_visibility_score ?? 0), 0) /
              kwWithVis.length
          )
        : 0;

    // CRO Score = % of keywords in top 10 * avg conversion potential
    const kwWithPos = kwArr.filter(
      (k) => k.current_position !== null && k.current_position <= 10
    ).length;
    const croBase =
      kwArr.length > 0
        ? Math.min(Math.round((kwWithPos / kwArr.length) * 100), 100)
        : 0;
    const goalsArr = goals ?? [];
    const avgConvRate =
      goalsArr.length > 0
        ? goalsArr.reduce(
            (s, g) => s + Number(g.estimated_conversion_rate),
            0
          ) / goalsArr.length
        : 0;
    const croScore = avgConvRate > 0 ? Math.min(100, Math.round(croBase * (1 + avgConvRate))) : croBase;

    return {
      seoScore,
      geoScore,
      aeoScore,
      croScore,
      totalProjects: totalProjects ?? 0,
      totalKeywords: totalKeywords ?? 0,
      totalPages: totalPages ?? 0,
      totalAudits: totalAudits ?? 0,
      technicalScore,
      contentScore,
      schemaScore,
      performanceScore,
      accessibilityScore,
    };
  } catch {
    return {
      seoScore: 0,
      geoScore: 0,
      aeoScore: 0,
      croScore: 0,
      totalProjects: 0,
      totalKeywords: 0,
      totalPages: 0,
      totalAudits: 0,
      technicalScore: 0,
      contentScore: 0,
      schemaScore: 0,
      performanceScore: 0,
      accessibilityScore: 0,
    };
  }
}

// ================================================================
// 2. getCmsPagesSeoAudit()
// ================================================================

export async function getCmsPagesSeoAudit(
  projectId?: string
): Promise<CmsPageAudit[]> {
  const admin = createAdminClient();

  try {
    // Get latest audit
    const auditQuery = admin
      .from("site_audits")
      .select("id")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1);
    if (projectId) auditQuery.eq("project_id", projectId);

    const { data: audits } = await auditQuery;
    if (!audits || audits.length === 0) return [];

    const { data: pages } = await admin
      .from("audit_pages")
      .select(
        "id, url, title, meta_description, h1, status_code, word_count, has_schema, issues_count"
      )
      .eq("audit_id", audits[0].id)
      .order("issues_count", { ascending: false })
      .limit(200);

    if (!pages) return [];

    return pages.map((p) => {
      const titleLen = p.title?.length ?? 0;
      const descLen = p.meta_description?.length ?? 0;

      return {
        id: p.id,
        url: p.url,
        title: p.title,
        metaDescription: p.meta_description,
        h1: p.h1,
        statusCode: p.status_code,
        wordCount: p.word_count,
        hasSchema: p.has_schema,
        issuesCount: p.issues_count,
        titleLength: titleLen,
        descriptionLength: descLen,
        titleStatus:
          titleLen === 0
            ? "missing"
            : titleLen < 30
              ? "short"
              : titleLen > 60
                ? "long"
                : "good",
        descriptionStatus:
          descLen === 0
            ? "missing"
            : descLen < 70
              ? "short"
              : descLen > 160
                ? "long"
                : "good",
      };
    });
  } catch {
    return [];
  }
}

// ================================================================
// 3. getTechnicalSeoChecks()
// ================================================================

export async function getTechnicalSeoChecks(
  projectId?: string
): Promise<TechnicalCheck[]> {
  const admin = createAdminClient();

  try {
    const auditQuery = admin
      .from("site_audits")
      .select("id, pages_crawled, issues_found")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1);
    if (projectId) auditQuery.eq("project_id", projectId);

    const { data: audits } = await auditQuery;
    if (!audits || audits.length === 0) return [];

    const auditId = audits[0].id;
    const totalCrawled = audits[0].pages_crawled ?? 0;

    const [{ data: pages }, { data: issues }] = await Promise.all([
      admin
        .from("audit_pages")
        .select("title, meta_description, has_schema, status_code, word_count, lcp_ms, cls, canonical_url")
        .eq("audit_id", auditId),
      admin
        .from("audit_issues")
        .select("category, severity")
        .eq("audit_id", auditId),
    ]);

    const pageArr = pages ?? [];
    const issueArr = issues ?? [];
    const total = pageArr.length || 1;

    // 1. Meta title coverage
    const withTitle = pageArr.filter((p) => p.title && p.title.length >= 10).length;

    // 2. Meta description coverage
    const withDesc = pageArr.filter((p) => p.meta_description && p.meta_description.length >= 50).length;

    // 3. Schema markup coverage
    const withSchema = pageArr.filter((p) => p.has_schema).length;

    // 4. Pages with 200 status
    const healthy = pageArr.filter((p) => p.status_code === 200).length;

    // 5. Content coverage (300+ words)
    const withContent = pageArr.filter((p) => (p.word_count ?? 0) >= 300).length;

    // 6. Core Web Vitals (LCP ≤ 2500ms)
    const pagesWithLcp = pageArr.filter((p) => p.lcp_ms !== null);
    const goodLcp = pagesWithLcp.filter((p) => (p.lcp_ms ?? 0) <= 2500).length;

    // 7. Canonical URLs
    const withCanonical = pageArr.filter((p) => p.canonical_url && p.canonical_url.length > 0).length;

    // 8. Critical issues
    const criticalCount = issueArr.filter((i) => i.severity === "critical").length;

    function makeCheck(
      id: string,
      name: string,
      description: string,
      value: number,
      t: number
    ): TechnicalCheck {
      const pct = t > 0 ? Math.round((value / t) * 100) : 0;
      return {
        id,
        name,
        description,
        status: pct >= 90 ? "pass" : pct >= 60 ? "warning" : "fail",
        value,
        total: t,
        percentage: pct,
      };
    }

    return [
      makeCheck("meta-title", "Meta Title Coverage", "Pages with proper meta titles (10+ chars)", withTitle, total),
      makeCheck("meta-desc", "Meta Description Coverage", "Pages with meta descriptions (50+ chars)", withDesc, total),
      makeCheck("schema", "Schema Markup", "Pages with structured data", withSchema, total),
      makeCheck("status-200", "Healthy Pages (200)", "Pages returning HTTP 200", healthy, total),
      makeCheck("content", "Content Coverage", "Pages with 300+ words", withContent, total),
      makeCheck("cwv", "Core Web Vitals (LCP)", "Pages with LCP ≤ 2500ms", goodLcp, pagesWithLcp.length || 1),
      makeCheck("canonical", "Canonical URLs", "Pages with canonical tags", withCanonical, total),
      {
        id: "critical",
        name: "Critical Issues",
        description: "Critical SEO issues that need immediate attention",
        status: criticalCount === 0 ? "pass" : criticalCount <= 3 ? "warning" : "fail",
        value: criticalCount,
        total: totalCrawled,
        percentage: totalCrawled > 0 ? Math.max(0, 100 - Math.round((criticalCount / totalCrawled) * 100)) : 100,
      },
    ];
  } catch {
    return [];
  }
}

// ================================================================
// 4. getContentAnalysis()
// ================================================================

export async function getContentAnalysis(
  projectId?: string
): Promise<ContentAnalysisRow[]> {
  const admin = createAdminClient();

  try {
    const query = admin
      .from("content_pages")
      .select(
        "id, url, title, word_count, content_score, readability_score, freshness_score, entity_coverage, last_modified, status"
      )
      .order("content_score", { ascending: true, nullsFirst: true })
      .limit(200);
    if (projectId) query.eq("project_id", projectId);

    const { data } = await query;
    if (!data) return [];

    return data.map((p) => ({
      id: p.id,
      url: p.url,
      title: p.title,
      wordCount: p.word_count,
      contentScore: p.content_score,
      readabilityScore: p.readability_score,
      freshnessScore: p.freshness_score,
      entityCoverage: p.entity_coverage,
      lastModified: p.last_modified,
      status: p.status,
    }));
  } catch {
    return [];
  }
}

// ================================================================
// 5. getKeywordsByIntent()
// ================================================================

export async function getKeywordsByIntent(
  projectId?: string
): Promise<KeywordByIntent[]> {
  const admin = createAdminClient();

  try {
    const query = admin
      .from("keywords")
      .select("intent, current_position, search_volume")
      .eq("is_active", true);
    if (projectId) query.eq("project_id", projectId);

    const { data } = await query;
    if (!data || data.length === 0) return [];

    const grouped = new Map<
      string,
      { count: number; posSum: number; posCount: number; volSum: number }
    >();

    for (const kw of data) {
      const intent = kw.intent ?? "unknown";
      const existing = grouped.get(intent) ?? {
        count: 0,
        posSum: 0,
        posCount: 0,
        volSum: 0,
      };
      existing.count++;
      if (kw.current_position !== null) {
        existing.posSum += kw.current_position;
        existing.posCount++;
      }
      existing.volSum += kw.search_volume ?? 0;
      grouped.set(intent, existing);
    }

    return Array.from(grouped.entries())
      .map(([intent, data]) => ({
        intent,
        count: data.count,
        avgPosition:
          data.posCount > 0 ? Math.round(data.posSum / data.posCount) : 0,
        avgVolume: Math.round(data.volSum / data.count),
      }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

// ================================================================
// 6. getKeywordPositionDistribution()
// ================================================================

export async function getKeywordPositionDistribution(
  projectId?: string
): Promise<PositionBucket[]> {
  const admin = createAdminClient();

  try {
    const query = admin
      .from("keywords")
      .select("current_position")
      .eq("is_active", true);
    if (projectId) query.eq("project_id", projectId);

    const { data } = await query;
    if (!data || data.length === 0) return [];

    const total = data.length;
    const buckets = [
      { label: "1-3", min: 1, max: 3, count: 0 },
      { label: "4-10", min: 4, max: 10, count: 0 },
      { label: "11-20", min: 11, max: 20, count: 0 },
      { label: "21-50", min: 21, max: 50, count: 0 },
      { label: "51+", min: 51, max: Infinity, count: 0 },
      { label: "Not Ranking", min: -1, max: -1, count: 0 },
    ];

    for (const kw of data) {
      const pos = kw.current_position;
      if (pos === null) {
        buckets[5].count++;
      } else {
        for (const b of buckets) {
          if (b.min > 0 && pos >= b.min && pos <= b.max) {
            b.count++;
            break;
          }
        }
      }
    }

    return buckets.map((b) => ({
      label: b.label,
      count: b.count,
      pct: total > 0 ? Math.round((b.count / total) * 100) : 0,
    }));
  } catch {
    return [];
  }
}

// ================================================================
// 7. getPlatformGeoPresence()
// ================================================================

export async function getPlatformGeoPresence(
  projectId?: string
): Promise<GeoPresenceRow[]> {
  const admin = createAdminClient();

  try {
    const query = admin
      .from("keywords")
      .select("location, current_position")
      .eq("is_active", true);
    if (projectId) query.eq("project_id", projectId);

    const { data } = await query;
    if (!data || data.length === 0) return [];

    const grouped = new Map<
      string,
      { count: number; posSum: number; posCount: number }
    >();

    for (const kw of data) {
      const loc = kw.location || "Unknown";
      const existing = grouped.get(loc) ?? {
        count: 0,
        posSum: 0,
        posCount: 0,
      };
      existing.count++;
      if (kw.current_position !== null) {
        existing.posSum += kw.current_position;
        existing.posCount++;
      }
      grouped.set(loc, existing);
    }

    return Array.from(grouped.entries())
      .map(([location, data]) => ({
        location,
        keywordsCount: data.count,
        avgPosition:
          data.posCount > 0
            ? Math.round((data.posSum / data.posCount) * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.keywordsCount - a.keywordsCount);
  } catch {
    return [];
  }
}

// ================================================================
// 8. generateSeoRecommendations()
// ================================================================

export async function generateSeoRecommendations(
  projectId?: string
): Promise<SeoRecommendation[]> {
  const admin = createAdminClient();
  const recs: SeoRecommendation[] = [];

  try {
    // Get latest audit data
    const auditQuery = admin
      .from("site_audits")
      .select("id, pages_crawled, issues_found, health_score, seo_score, performance_score")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1);
    if (projectId) auditQuery.eq("project_id", projectId);

    const { data: audits } = await auditQuery;
    if (!audits || audits.length === 0) {
      recs.push({
        id: "no-audit",
        category: "technical",
        severity: "critical",
        title: "No site audit found",
        description: "Run a site audit to get detailed SEO analysis and recommendations.",
        affectedCount: 0,
      });
      return recs;
    }

    const auditId = audits[0].id;

    const [{ data: pages }, { data: issues }, { data: contentPages }, { data: keywords }, { data: geoScores }] =
      await Promise.all([
        admin.from("audit_pages").select("title, meta_description, has_schema, word_count, lcp_ms, cls, status_code").eq("audit_id", auditId),
        admin.from("audit_issues").select("category, severity, title").eq("audit_id", auditId),
        (() => {
          const q = admin.from("content_pages").select("word_count, content_score, entity_coverage, freshness_score");
          if (projectId) q.eq("project_id", projectId);
          return q;
        })(),
        (() => {
          const q = admin.from("keywords").select("current_position, ai_visibility_score, intent").eq("is_active", true);
          if (projectId) q.eq("project_id", projectId);
          return q;
        })(),
        (() => {
          const q = admin.from("geo_scores").select("geo_score, schema_score, entity_score, ai_citation_score");
          if (projectId) q.eq("project_id", projectId);
          return q;
        })(),
      ]);

    const pageArr = pages ?? [];
    const issueArr = issues ?? [];
    const contentArr = contentPages ?? [];
    const kwArr = keywords ?? [];
    const geoArr = geoScores ?? [];

    // Title issues
    const missingTitle = pageArr.filter((p) => !p.title || p.title.length < 10).length;
    if (missingTitle > 0) {
      recs.push({ id: "missing-titles", category: "seo", severity: missingTitle > 5 ? "critical" : "warning", title: "Missing or short meta titles", description: `${missingTitle} pages have missing or short (<10 chars) meta titles. Add descriptive titles for better search visibility.`, affectedCount: missingTitle });
    }

    // Description issues
    const missingDesc = pageArr.filter((p) => !p.meta_description || p.meta_description.length < 50).length;
    if (missingDesc > 0) {
      recs.push({ id: "missing-descriptions", category: "seo", severity: missingDesc > 10 ? "critical" : "warning", title: "Missing or short meta descriptions", description: `${missingDesc} pages have missing or short meta descriptions. Write compelling descriptions (70-160 chars) for better CTR.`, affectedCount: missingDesc });
    }

    // Schema coverage
    const noSchema = pageArr.filter((p) => !p.has_schema).length;
    if (noSchema > 0) {
      recs.push({ id: "missing-schema", category: "schema", severity: noSchema > pageArr.length * 0.5 ? "critical" : "warning", title: "Pages missing structured data", description: `${noSchema} pages lack Schema.org markup. Add Article, FAQ, or HowTo schema for rich results.`, affectedCount: noSchema });
    }

    // Thin content
    const thinContent = pageArr.filter((p) => (p.word_count ?? 0) < 300 && (p.word_count ?? 0) > 0).length;
    if (thinContent > 0) {
      recs.push({ id: "thin-content", category: "content", severity: thinContent > 10 ? "warning" : "info", title: "Thin content pages", description: `${thinContent} pages have fewer than 300 words. Expand content for better topic coverage and rankings.`, affectedCount: thinContent });
    }

    // Core Web Vitals
    const poorLcp = pageArr.filter((p) => p.lcp_ms !== null && p.lcp_ms > 4000).length;
    if (poorLcp > 0) {
      recs.push({ id: "poor-lcp", category: "performance", severity: "warning", title: "Poor Largest Contentful Paint", description: `${poorLcp} pages have LCP > 4000ms. Optimize images, reduce server response time, and minimize render-blocking resources.`, affectedCount: poorLcp });
    }

    const poorCls = pageArr.filter((p) => p.cls !== null && p.cls > 0.25).length;
    if (poorCls > 0) {
      recs.push({ id: "poor-cls", category: "performance", severity: "warning", title: "Layout shift issues (CLS)", description: `${poorCls} pages have CLS > 0.25. Set explicit dimensions on images and avoid dynamic content injection.`, affectedCount: poorCls });
    }

    // 4xx/5xx pages
    const errorPages = pageArr.filter((p) => p.status_code !== null && p.status_code >= 400).length;
    if (errorPages > 0) {
      recs.push({ id: "error-pages", category: "technical", severity: "critical", title: "Broken pages (4xx/5xx errors)", description: `${errorPages} pages return error status codes. Fix or redirect these pages.`, affectedCount: errorPages });
    }

    // Critical audit issues
    const criticalIssues = issueArr.filter((i) => i.severity === "critical").length;
    if (criticalIssues > 0) {
      recs.push({ id: "critical-issues", category: "technical", severity: "critical", title: "Critical audit issues", description: `${criticalIssues} critical issues found during site audit. Address these urgently.`, affectedCount: criticalIssues });
    }

    // Content freshness
    const lowFreshness = contentArr.filter((p) => p.freshness_score !== null && p.freshness_score < 30).length;
    if (lowFreshness > 0) {
      recs.push({ id: "stale-content", category: "content", severity: "warning", title: "Stale content pages", description: `${lowFreshness} pages have low freshness scores. Update content regularly to maintain rankings.`, affectedCount: lowFreshness });
    }

    // Entity coverage
    const lowEntity = contentArr.filter((p) => p.entity_coverage !== null && p.entity_coverage < 30).length;
    if (lowEntity > 0) {
      recs.push({ id: "low-entity", category: "geo", severity: "info", title: "Low entity coverage", description: `${lowEntity} pages have weak entity coverage. Add named entities to improve AI discoverability.`, affectedCount: lowEntity });
    }

    // AI visibility
    const lowAiVis = kwArr.filter((k) => k.ai_visibility_score !== null && k.ai_visibility_score < 20).length;
    if (lowAiVis > 0) {
      recs.push({ id: "low-ai-visibility", category: "aeo", severity: "warning", title: "Low AI visibility keywords", description: `${lowAiVis} keywords have AI visibility score below 20. Optimize for answer engine presence.`, affectedCount: lowAiVis });
    }

    // Low GEO scores
    const lowGeo = geoArr.filter((g) => Number(g.geo_score) < 40).length;
    if (lowGeo > 0) {
      recs.push({ id: "low-geo", category: "geo", severity: "warning", title: "Low GEO readiness pages", description: `${lowGeo} pages score below 40 in GEO readiness. Improve structured data, entity coverage, and content clarity.`, affectedCount: lowGeo });
    }

    // Low AI citation
    const lowCitation = geoArr.filter((g) => Number(g.ai_citation_score) < 20).length;
    if (lowCitation > 0) {
      recs.push({ id: "low-citation", category: "geo", severity: "info", title: "Low AI citation scores", description: `${lowCitation} pages are rarely cited by AI models. Create authoritative, well-structured content.`, affectedCount: lowCitation });
    }

    // Keywords not ranking
    const notRanking = kwArr.filter((k) => k.current_position === null).length;
    if (notRanking > 0) {
      recs.push({ id: "not-ranking", category: "seo", severity: notRanking > kwArr.length * 0.5 ? "critical" : "warning", title: "Keywords not ranking", description: `${notRanking} tracked keywords have no ranking position. Create or improve targeted content.`, affectedCount: notRanking });
    }

    // No conversion goals
    if (kwArr.length > 0) {
      const hasGoals = await admin.from("conversion_goals").select("id", { count: "exact", head: true });
      if ((hasGoals.count ?? 0) === 0) {
        recs.push({ id: "no-goals", category: "cro", severity: "info", title: "No conversion goals set", description: "Set up conversion goals to track estimated revenue from organic traffic.", affectedCount: 0 });
      }
    }

    return recs.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
    });
  } catch {
    return recs;
  }
}

// ================================================================
// 9. getAeoOverview()
// ================================================================

export async function getAeoOverview(
  projectId?: string
): Promise<AeoOverviewData> {
  const admin = createAdminClient();
  const empty: AeoOverviewData = {
    totalMentions: 0,
    engineBreakdown: [],
    mentionTypes: [],
    recentMentions: [],
  };

  try {
    const query = admin
      .from("aeo_tracking")
      .select("id, query, ai_engine, mention_type, url_cited, tracked_date")
      .order("tracked_date", { ascending: false })
      .limit(500);
    if (projectId) query.eq("project_id", projectId);

    const { data } = await query;
    if (!data || data.length === 0) return empty;

    const totalMentions = data.length;

    // Engine breakdown
    const engineMap = new Map<string, number>();
    const typeMap = new Map<string, number>();

    for (const row of data) {
      engineMap.set(row.ai_engine, (engineMap.get(row.ai_engine) ?? 0) + 1);
      typeMap.set(row.mention_type, (typeMap.get(row.mention_type) ?? 0) + 1);
    }

    const engineBreakdown = Array.from(engineMap.entries()).map(
      ([engine, count]) => ({
        engine,
        count,
        mentionRate: Math.round((count / totalMentions) * 100),
      })
    );

    const mentionTypes = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    }));

    const recentMentions = data.slice(0, 20).map((r) => ({
      id: r.id,
      query: r.query,
      aiEngine: r.ai_engine,
      mentionType: r.mention_type,
      urlCited: r.url_cited,
      trackedDate: r.tracked_date,
    }));

    return { totalMentions, engineBreakdown, mentionTypes, recentMentions };
  } catch {
    return empty;
  }
}

// ================================================================
// 10. getAeoScores() — 6-dimension scoring from content
// ================================================================

export async function getAeoScores(
  projectId?: string
): Promise<AeoScoreRow[]> {
  const admin = createAdminClient();

  try {
    const pagesQuery = admin
      .from("content_pages")
      .select("id, url, title, word_count, content_score, readability_score, entity_coverage")
      .limit(200);
    if (projectId) pagesQuery.eq("project_id", projectId);

    const auditQuery = admin
      .from("site_audits")
      .select("id")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1);
    if (projectId) auditQuery.eq("project_id", projectId);

    const [{ data: contentPages }, { data: audits }] = await Promise.all([
      pagesQuery,
      auditQuery,
    ]);

    if (!contentPages || contentPages.length === 0) return [];

    // Get schema info from audit pages
    let schemaMap = new Map<string, boolean>();
    if (audits && audits.length > 0) {
      const { data: auditPages } = await admin
        .from("audit_pages")
        .select("url, has_schema, h1, meta_description, word_count")
        .eq("audit_id", audits[0].id);

      for (const p of auditPages ?? []) {
        schemaMap.set(p.url, p.has_schema);
      }
    }

    return contentPages.map((page) => {
      const wc = page.word_count ?? 0;
      const cs = page.content_score ?? 0;
      const rs = page.readability_score ?? 0;
      const ec = page.entity_coverage ?? 0;
      const hasSchema = schemaMap.get(page.url) ?? false;

      // 6 AEO dimensions (0-100 each)
      const schemaRichness = hasSchema ? Math.min(100, 60 + Math.round(ec * 0.4)) : Math.min(40, Math.round(ec * 0.4));
      const faqCoverage = hasSchema && wc >= 500 ? Math.min(100, 50 + Math.round(cs * 0.5)) : Math.min(50, Math.round(cs * 0.5));
      const directAnswerReadiness = Math.min(100, Math.round((rs * 0.5) + (wc >= 300 ? 30 : wc / 10) + (cs * 0.2)));
      const entityMarkup = Math.min(100, Math.round(ec));
      const speakableContent = Math.min(100, Math.round(rs * 0.6 + (wc >= 200 ? 20 : 0) + (page.title ? 20 : 0)));
      const aiSnippetCompatibility = Math.min(100, Math.round((cs * 0.3) + (rs * 0.3) + (hasSchema ? 20 : 0) + (wc >= 500 ? 20 : 0)));

      const overall = Math.round(
        (schemaRichness + faqCoverage + directAnswerReadiness + entityMarkup + speakableContent + aiSnippetCompatibility) / 6
      );

      return {
        pageUrl: page.url,
        pageTitle: page.title,
        schemaRichness,
        faqCoverage,
        directAnswerReadiness,
        entityMarkup,
        speakableContent,
        aiSnippetCompatibility,
        overall,
      };
    }).sort((a, b) => b.overall - a.overall);
  } catch {
    return [];
  }
}

// ================================================================
// 11. getGeoScores() — 6-dimension scoring
// ================================================================

export async function getAdminGeoScores(
  projectId?: string
): Promise<GeoScoreRow[]> {
  const admin = createAdminClient();

  try {
    const geoQuery = admin
      .from("geo_scores")
      .select("geo_score, entity_score, structure_score, schema_score, ai_citation_score, content_pages(url, title)")
      .order("geo_score", { ascending: false })
      .limit(200);
    if (projectId) geoQuery.eq("project_id", projectId);

    const contentQuery = admin
      .from("content_pages")
      .select("url, word_count, content_score, readability_score, freshness_score, entity_coverage")
      .limit(200);
    if (projectId) contentQuery.eq("project_id", projectId);

    const [{ data: geoScores }, { data: contentPages }] = await Promise.all([
      geoQuery,
      contentQuery,
    ]);

    // If we have geo_scores, use them
    if (geoScores && geoScores.length > 0) {
      const contentMap = new Map<string, { freshness: number; readability: number; wordCount: number }>();
      for (const cp of contentPages ?? []) {
        contentMap.set(cp.url, {
          freshness: cp.freshness_score ?? 0,
          readability: cp.readability_score ?? 0,
          wordCount: cp.word_count ?? 0,
        });
      }

      return (geoScores as unknown as Array<{
        geo_score: number;
        entity_score: number;
        structure_score: number;
        schema_score: number;
        ai_citation_score: number;
        content_pages: { url: string; title: string | null } | null;
      }>).map((g) => {
        const url = g.content_pages?.url ?? "";
        const extra = contentMap.get(url);

        return {
          pageUrl: url,
          pageTitle: g.content_pages?.title ?? null,
          // Map to 6 GEO dimensions
          citability: Math.min(100, Number(g.ai_citation_score)),
          topicalAuthority: Math.min(100, Math.round((Number(g.entity_score) + Number(g.structure_score)) / 2)),
          sourceCredibility: Math.min(100, Number(g.entity_score)),
          contentFreshness: extra?.freshness ?? 0,
          semanticClarity: Math.min(100, Number(g.structure_score)),
          aiDiscoverability: Math.min(100, Number(g.schema_score)),
          overall: Number(g.geo_score),
        };
      });
    }

    // Fallback: compute from content_pages
    if (!contentPages || contentPages.length === 0) return [];

    return contentPages.map((cp) => {
      const wc = cp.word_count ?? 0;
      const cs = cp.content_score ?? 0;
      const rs = cp.readability_score ?? 0;
      const fs = cp.freshness_score ?? 0;
      const ec = cp.entity_coverage ?? 0;

      const citability = Math.min(100, Math.round(cs * 0.5 + (wc >= 500 ? 30 : wc / 20) + ec * 0.2));
      const topicalAuthority = Math.min(100, Math.round(ec * 0.4 + cs * 0.3 + (wc >= 1000 ? 30 : wc / 40)));
      const sourceCredibility = Math.min(100, Math.round(ec * 0.5 + rs * 0.3 + (wc >= 500 ? 20 : 0)));
      const contentFreshness = Math.min(100, Math.round(fs));
      const semanticClarity = Math.min(100, Math.round(rs * 0.6 + cs * 0.4));
      const aiDiscoverability = Math.min(100, Math.round(cs * 0.3 + ec * 0.3 + (wc >= 300 ? 20 : 0) + rs * 0.2));

      const overall = Math.round(
        (citability + topicalAuthority + sourceCredibility + contentFreshness + semanticClarity + aiDiscoverability) / 6
      );

      return {
        pageUrl: cp.url,
        pageTitle: null,
        citability,
        topicalAuthority,
        sourceCredibility,
        contentFreshness,
        semanticClarity,
        aiDiscoverability,
        overall,
      };
    }).sort((a, b) => b.overall - a.overall);
  } catch {
    return [];
  }
}

// ================================================================
// 12. getCroAbTests()
// ================================================================

export async function getCroAbTests(
  projectId?: string
): Promise<CroAbTestRow[]> {
  const admin = createAdminClient();

  try {
    const query = admin
      .from("cro_ab_tests")
      .select("*")
      .order("start_date", { ascending: false })
      .limit(50);
    if (projectId) query.eq("project_id", projectId);

    const { data } = await query;
    if (!data) return [];

    return data.map((t) => ({
      id: t.id,
      testName: t.test_name,
      pageUrl: t.page_url,
      variantAName: t.variant_a_name,
      variantAConversions: t.variant_a_conversions,
      variantAVisitors: t.variant_a_visitors,
      variantBName: t.variant_b_name,
      variantBConversions: t.variant_b_conversions,
      variantBVisitors: t.variant_b_visitors,
      metricName: t.metric_name,
      status: t.status,
      winner: t.winner,
      significance: Number(t.statistical_significance),
      startDate: t.start_date,
      endDate: t.end_date,
    }));
  } catch {
    return [];
  }
}

// ================================================================
// 13. getAdminProjects() — For project filter dropdown
// ================================================================

export async function getAdminProjects(): Promise<
  { id: string; name: string; domain: string | null }[]
> {
  const admin = createAdminClient();

  try {
    const { data } = await admin
      .from("projects")
      .select("id, name, domain")
      .eq("is_active", true)
      .order("name");

    return data ?? [];
  } catch {
    return [];
  }
}
