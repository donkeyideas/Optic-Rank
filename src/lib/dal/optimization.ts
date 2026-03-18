import { createClient } from "@/lib/supabase/server";
import type { GeoScore, ConversionGoal, Keyword, KeywordRank } from "@/types";

// ================================================================
// Types
// ================================================================

export interface GeoStats {
  avgGeoScore: number;
  pagesScored: number;
  avgEntityScore: number;
  avgStructureScore: number;
  avgSchemaScore: number;
  avgCitationScore: number;
}

export interface GeoPageScore {
  id: string;
  contentPageId: string;
  url: string;
  title: string | null;
  geoScore: number;
  entityScore: number;
  structureScore: number;
  schemaScore: number;
  aiCitationScore: number;
  recommendations: GeoScore["recommendations"];
  scoredAt: string;
}

export interface CitationMatrixEntry {
  pageUrl: string;
  pageTitle: string | null;
  keyword: string;
  llmProvider: string;
  mentioned: boolean;
  citationUrl: string | null;
  position: number | null;
}

export interface AeoStats {
  totalKeywords: number;
  snippetOpportunities: number;
  avgAnswerScore: number;
  voiceReadyKeywords: number;
  questionsCount: number;
}

export interface SchemaAuditData {
  totalPages: number;
  pagesWithSchema: number;
  coveragePct: number;
}

export interface CroStats {
  estimatedMonthlyRevenue: number;
  goalsCount: number;
  topKeywordsByRevenue: number;
  highValueGaps: number;
  avgPosition: number;
  estimatedTraffic: number;
}

export interface KeywordWithRevenue {
  keywordId: string;
  keyword: string;
  searchVolume: number;
  cpc: number | null;
  currentPosition: number | null;
  intent: string | null;
  estimatedCtr: number;
  estimatedTraffic: number;
  estimatedRevenue: number;
}

// ================================================================
// CTR Curve
// ================================================================

const CTR_BY_POSITION: Record<number, number> = {
  1: 0.284,
  2: 0.155,
  3: 0.11,
  4: 0.081,
  5: 0.062,
  6: 0.047,
  7: 0.038,
  8: 0.031,
  9: 0.026,
  10: 0.022,
};

function getCtr(position: number | null): number {
  if (position === null || position < 1) return 0;
  if (position > 10) return 0.005;
  return CTR_BY_POSITION[position] ?? 0.005;
}

// ================================================================
// GEO Queries
// ================================================================

export async function getGeoStats(projectId: string): Promise<GeoStats> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("geo_scores")
      .select("geo_score, entity_score, structure_score, schema_score, ai_citation_score")
      .eq("project_id", projectId);

    if (!data || data.length === 0) {
      return { avgGeoScore: 0, pagesScored: 0, avgEntityScore: 0, avgStructureScore: 0, avgSchemaScore: 0, avgCitationScore: 0 };
    }

    const len = data.length;
    return {
      avgGeoScore: Math.round(data.reduce((s, r) => s + Number(r.geo_score), 0) / len),
      pagesScored: len,
      avgEntityScore: Math.round(data.reduce((s, r) => s + Number(r.entity_score), 0) / len),
      avgStructureScore: Math.round(data.reduce((s, r) => s + Number(r.structure_score), 0) / len),
      avgSchemaScore: Math.round(data.reduce((s, r) => s + Number(r.schema_score), 0) / len),
      avgCitationScore: Math.round(data.reduce((s, r) => s + Number(r.ai_citation_score), 0) / len),
    };
  } catch {
    return { avgGeoScore: 0, pagesScored: 0, avgEntityScore: 0, avgStructureScore: 0, avgSchemaScore: 0, avgCitationScore: 0 };
  }
}

export async function getGeoScoresByPage(projectId: string): Promise<GeoPageScore[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("geo_scores")
      .select("id, content_page_id, geo_score, entity_score, structure_score, schema_score, ai_citation_score, recommendations, scored_at, content_pages!inner(url, title)")
      .eq("project_id", projectId)
      .order("geo_score", { ascending: false });

    if (!data) return [];

    return data.map((row: Record<string, unknown>) => {
      const page = row.content_pages as Record<string, unknown> | null;
      return {
        id: row.id as string,
        contentPageId: row.content_page_id as string,
        url: (page?.url as string) ?? "",
        title: (page?.title as string) ?? null,
        geoScore: Number(row.geo_score),
        entityScore: Number(row.entity_score),
        structureScore: Number(row.structure_score),
        schemaScore: Number(row.schema_score),
        aiCitationScore: Number(row.ai_citation_score),
        recommendations: (row.recommendations ?? []) as GeoScore["recommendations"],
        scoredAt: row.scored_at as string,
      };
    });
  } catch {
    return [];
  }
}

export async function getCitationMatrix(projectId: string): Promise<CitationMatrixEntry[]> {
  try {
    const supabase = await createClient();

    // Get visibility checks with keyword info
    const { data: checks } = await supabase
      .from("ai_visibility_checks")
      .select("keyword_id, llm_provider, mentioned, citation_url, position, keywords!inner(keyword, project_id)")
      .eq("keywords.project_id", projectId)
      .order("checked_at", { ascending: false })
      .limit(500);

    if (!checks || checks.length === 0) return [];

    // Get content pages for URL matching
    const { data: pages } = await supabase
      .from("content_pages")
      .select("url, title")
      .eq("project_id", projectId);

    const pageMap = new Map<string, string>();
    for (const p of pages ?? []) {
      pageMap.set(p.url, p.title ?? p.url);
    }

    return checks.map((c: Record<string, unknown>) => {
      const kw = c.keywords as Record<string, unknown>;
      const citUrl = c.citation_url as string | null;
      const pageTitle = citUrl ? (pageMap.get(citUrl) ?? null) : null;
      return {
        pageUrl: citUrl ?? "",
        pageTitle,
        keyword: kw?.keyword as string,
        llmProvider: c.llm_provider as string,
        mentioned: c.mentioned as boolean,
        citationUrl: citUrl,
        position: c.position as number | null,
      };
    });
  } catch {
    return [];
  }
}

// ================================================================
// AEO Queries
// ================================================================

export async function getAeoKeywordsData(projectId: string): Promise<{
  keywords: Keyword[];
  latestRanks: Map<string, KeywordRank>;
}> {
  try {
    const supabase = await createClient();

    const { data: keywords } = await supabase
      .from("keywords")
      .select("id, project_id, keyword, search_engine, device, location, current_position, previous_position, best_position, search_volume, cpc, difficulty, intent, ai_visibility_score, ai_visibility_count, created_at")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("search_volume", { ascending: false, nullsFirst: false });

    if (!keywords || keywords.length === 0) {
      return { keywords: [], latestRanks: new Map() };
    }

    // Get latest rank for each keyword
    const keywordIds = keywords.map((k) => k.id);
    const { data: ranks } = await supabase
      .from("keyword_ranks")
      .select("id, keyword_id, position, url, serp_features, checked_at")
      .in("keyword_id", keywordIds)
      .order("checked_at", { ascending: false });

    const latestRanks = new Map<string, KeywordRank>();
    for (const rank of (ranks ?? []) as KeywordRank[]) {
      if (!latestRanks.has(rank.keyword_id)) {
        latestRanks.set(rank.keyword_id, rank);
      }
    }

    return { keywords: keywords as Keyword[], latestRanks };
  } catch {
    return { keywords: [], latestRanks: new Map() };
  }
}

export async function getSchemaAuditData(projectId: string): Promise<SchemaAuditData> {
  try {
    const supabase = await createClient();

    // Get latest completed audit
    const { data: audit } = await supabase
      .from("site_audits")
      .select("id")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!audit) return { totalPages: 0, pagesWithSchema: 0, coveragePct: 0 };

    const { data: pages } = await supabase
      .from("audit_pages")
      .select("has_schema")
      .eq("audit_id", audit.id);

    if (!pages || pages.length === 0) return { totalPages: 0, pagesWithSchema: 0, coveragePct: 0 };

    const totalPages = pages.length;
    const pagesWithSchema = pages.filter((p) => p.has_schema).length;

    return {
      totalPages,
      pagesWithSchema,
      coveragePct: totalPages > 0 ? Math.round((pagesWithSchema / totalPages) * 100) : 0,
    };
  } catch {
    return { totalPages: 0, pagesWithSchema: 0, coveragePct: 0 };
  }
}

// ================================================================
// CRO Queries
// ================================================================

export async function getConversionGoals(projectId: string): Promise<ConversionGoal[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("conversion_goals")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    return (data ?? []) as ConversionGoal[];
  } catch {
    return [];
  }
}

export async function getKeywordsWithRevenue(
  projectId: string,
  goals: ConversionGoal[]
): Promise<KeywordWithRevenue[]> {
  try {
    const supabase = await createClient();
    const { data: keywords } = await supabase
      .from("keywords")
      .select("id, keyword, search_volume, cpc, current_position, intent")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .not("current_position", "is", null)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(200);

    if (!keywords || keywords.length === 0) return [];

    // Average conversion rate and value across goals
    const avgRate = goals.length > 0
      ? goals.reduce((s, g) => s + Number(g.estimated_conversion_rate), 0) / goals.length
      : 0.02;
    const avgValue = goals.length > 0
      ? goals.reduce((s, g) => s + Number(g.estimated_value), 0) / goals.length
      : 10;

    return keywords.map((kw) => {
      const ctr = getCtr(kw.current_position);
      const traffic = Math.round((kw.search_volume ?? 0) * ctr);
      const revenue = traffic * avgRate * avgValue;
      return {
        keywordId: kw.id,
        keyword: kw.keyword,
        searchVolume: kw.search_volume ?? 0,
        cpc: kw.cpc,
        currentPosition: kw.current_position,
        intent: kw.intent,
        estimatedCtr: Math.round(ctr * 1000) / 10, // percentage with 1 decimal
        estimatedTraffic: traffic,
        estimatedRevenue: Math.round(revenue * 100) / 100,
      };
    }).sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
  } catch {
    return [];
  }
}

export async function getCroStats(
  projectId: string,
  goals: ConversionGoal[],
  keywordsWithRevenue: KeywordWithRevenue[]
): Promise<CroStats> {
  const estimatedMonthlyRevenue = keywordsWithRevenue.reduce(
    (sum, kw) => sum + kw.estimatedRevenue,
    0
  );

  // High-value gaps: keywords with position > 5 but high revenue potential
  const highValueGaps = keywordsWithRevenue.filter(
    (kw) =>
      kw.currentPosition !== null &&
      kw.currentPosition > 5 &&
      kw.estimatedRevenue > 0
  ).length;

  // Top keywords generating most revenue (position 1-5)
  const topKeywordsByRevenue = keywordsWithRevenue.filter(
    (kw) => kw.currentPosition !== null && kw.currentPosition <= 5
  ).length;

  // Average position across all ranked keywords
  const rankedKeywords = keywordsWithRevenue.filter(
    (kw) => kw.currentPosition !== null && kw.currentPosition > 0
  );
  const avgPosition =
    rankedKeywords.length > 0
      ? Math.round(
          (rankedKeywords.reduce((s, kw) => s + kw.currentPosition!, 0) /
            rankedKeywords.length) *
            10
        ) / 10
      : 0;

  // Total estimated monthly organic traffic
  const estimatedTraffic = keywordsWithRevenue.reduce(
    (sum, kw) => sum + kw.estimatedTraffic,
    0
  );

  return {
    estimatedMonthlyRevenue: Math.round(estimatedMonthlyRevenue),
    goalsCount: goals.length,
    topKeywordsByRevenue,
    highValueGaps,
    avgPosition,
    estimatedTraffic,
  };
}
