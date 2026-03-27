/**
 * Smart Recommendations Engine.
 * Analyzes ALL project data (keywords, backlinks, audits, content, AI visibility,
 * competitors, performance) and generates actionable recommendations with
 * expected impact estimates.
 *
 * Pattern: rule-based heuristics first, AI enhancement second.
 * Always returns at least basic recommendations; never fails completely.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "./ai-provider";
import type { RecommendationCategory, ImpactLevel, EffortLevel } from "@/types";

// CTR curve by position (approximate Google CTR %)
const CTR: Record<number, number> = {
  1: 0.316, 2: 0.241, 3: 0.187, 4: 0.131, 5: 0.095,
  6: 0.065, 7: 0.047, 8: 0.035, 9: 0.030, 10: 0.025,
};

function ctrForPos(pos: number): number {
  if (pos <= 0) return 0;
  if (pos <= 10) return CTR[pos] ?? 0.025;
  if (pos <= 20) return 0.01;
  return 0.005;
}

export interface RawRecommendation {
  category: RecommendationCategory;
  title: string;
  description: string;
  expected_result: string;
  impact: ImpactLevel;
  effort: EffortLevel;
  priority_score: number;
  data_sources: string[];
  linked_page: string;
  linked_label: string;
  metadata: Record<string, unknown>;
}

/**
 * Generate smart recommendations for a project by analyzing all data sources.
 */
export async function generateProjectRecommendations(
  projectId: string
): Promise<RawRecommendation[]> {
  const supabase = createAdminClient();

  // ── Parallel data fetch ──────────────────────────────────────────
  const [
    projectRes,
    keywordsRes,
    backlinksRes,
    auditsRes,
    contentRes,
    competitorsRes,
    geoScoresRes,
  ] = await Promise.all([
    supabase.from("projects").select("domain").eq("id", projectId).single(),
    supabase.from("keywords").select("id, keyword, current_position, previous_position, best_position, search_volume, cpc, difficulty, intent").eq("project_id", projectId),
    supabase.from("backlinks").select("id, source_domain, domain_authority, trust_flow, is_toxic, status, link_type").eq("project_id", projectId),
    supabase.from("site_audits").select("id, health_score, seo_score, performance_score, accessibility_score, pages_crawled, issues_found").eq("project_id", projectId).eq("status", "completed").order("completed_at", { ascending: false }).limit(1),
    supabase.from("content_pages").select("id, url, title, content_score, readability_score, freshness_score, traffic_trend, organic_traffic, word_count, entity_coverage").eq("project_id", projectId),
    supabase.from("competitors").select("id, name, domain, authority_score, organic_traffic, keywords_count").eq("project_id", projectId),
    supabase.from("geo_scores").select("id, geo_score, entity_score, structure_score, schema_score, ai_citation_score").eq("project_id", projectId),
  ]);

  const domain = projectRes.data?.domain ?? "your site";
  const keywords = keywordsRes.data ?? [];
  const backlinks = backlinksRes.data ?? [];
  const latestAudit = auditsRes.data?.[0] ?? null;
  const content = contentRes.data ?? [];
  const competitors = competitorsRes.data ?? [];
  const geoScores = geoScoresRes.data ?? [];

  // Fetch audit-dependent data
  let auditIssues: Array<{ severity: string; category: string; title: string; affected_url: string | null }> = [];
  let auditPages: Array<{ url: string; word_count: number | null; load_time_ms: number | null; lcp_ms: number | null; cls: number | null; inp_ms: number | null; has_schema: boolean | null }> = [];

  if (latestAudit) {
    const [issuesRes, pagesRes] = await Promise.all([
      supabase.from("audit_issues").select("severity, category, title, affected_url").eq("audit_id", latestAudit.id),
      supabase.from("audit_pages").select("url, word_count, load_time_ms, lcp_ms, cls, inp_ms, has_schema").eq("audit_id", latestAudit.id),
    ]);
    auditIssues = issuesRes.data ?? [];
    auditPages = pagesRes.data ?? [];
  }

  // Fetch AI visibility data (needs keyword join)
  const kwIds = keywords.map((k) => k.id);
  let visibilityChecks: Array<{ keyword_id: string; brand_mentioned: boolean; sentiment: string | null }> = [];
  if (kwIds.length > 0) {
    const { data: vc } = await supabase
      .from("ai_visibility_checks")
      .select("keyword_id, brand_mentioned, sentiment")
      .in("keyword_id", kwIds);
    visibilityChecks = vc ?? [];
  }

  const recs: RawRecommendation[] = [];

  // ── RULE 1: Push to Top 3 ────────────────────────────────────────
  const almostTop3 = keywords
    .filter((k) => k.current_position && k.current_position >= 4 && k.current_position <= 10 && (k.search_volume ?? 0) > 100)
    .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0));

  if (almostTop3.length > 0) {
    const top = almostTop3[0];
    const currentClicks = Math.round((top.search_volume ?? 0) * ctrForPos(top.current_position!));
    const projectedClicks = Math.round((top.search_volume ?? 0) * ctrForPos(3));
    const gain = projectedClicks - currentClicks;

    recs.push({
      category: "quick_wins",
      title: `${almostTop3.length} Keywords Close to Top 3`,
      description: `You have ${almostTop3.length} keywords ranking between positions 4-10. Focus on "${top.keyword}" (#${top.current_position}, ${(top.search_volume ?? 0).toLocaleString()} monthly searches) for the biggest traffic gain.`,
      expected_result: `Moving "${top.keyword}" from #${top.current_position} to #3 could increase clicks by ~${gain.toLocaleString()}/month. Across all ${almostTop3.length} keywords, estimated additional traffic: ~${almostTop3.reduce((s, k) => s + Math.round((k.search_volume ?? 0) * (ctrForPos(3) - ctrForPos(k.current_position!))), 0).toLocaleString()}/month.`,
      impact: "high",
      effort: "medium",
      priority_score: 90,
      data_sources: ["keywords"],
      linked_page: "/dashboard/keywords",
      linked_label: "View Keywords",
      metadata: { count: almostTop3.length, topKeyword: top.keyword, topPosition: top.current_position },
    });
  }

  // ── RULE 2: Striking Distance ────────────────────────────────────
  const strikingDistance = keywords.filter(
    (k) => k.current_position && k.current_position >= 11 && k.current_position <= 20 &&
      k.previous_position && k.previous_position <= 10
  );

  if (strikingDistance.length > 0) {
    const totalVol = strikingDistance.reduce((s, k) => s + (k.search_volume ?? 0), 0);
    recs.push({
      category: "quick_wins",
      title: `${strikingDistance.length} Keywords Dropped from Page 1`,
      description: `${strikingDistance.length} keywords recently fell from the top 10: ${strikingDistance.slice(0, 3).map((k) => `"${k.keyword}" (#${k.previous_position} → #${k.current_position})`).join(", ")}. Recovery is typically easier than achieving new page-1 rankings.`,
      expected_result: `Recovering these keywords to their previous positions could restore ~${Math.round(totalVol * 0.03).toLocaleString()} monthly clicks. Focus on updating content and building targeted backlinks.`,
      impact: "high",
      effort: "low",
      priority_score: 85,
      data_sources: ["keywords"],
      linked_page: "/dashboard/keywords",
      linked_label: "View Keywords",
      metadata: { keywords: strikingDistance.slice(0, 5).map((k) => k.keyword) },
    });
  }

  // ── RULE 3: Low Content Scores ───────────────────────────────────
  const lowScoreContent = content.filter((p) => p.content_score !== null && p.content_score < 50);
  if (lowScoreContent.length > 0) {
    recs.push({
      category: "content",
      title: `${lowScoreContent.length} Pages with Low Content Scores`,
      description: `${lowScoreContent.length} pages scored below 50/100. Lowest: ${lowScoreContent.slice(0, 3).map((p) => `"${p.title ?? p.url}" (${p.content_score})`).join(", ")}.`,
      expected_result: `Improving content scores from <50 to 70+ typically correlates with a 15-30% traffic increase per page. Estimated combined traffic boost: ~${Math.round(lowScoreContent.reduce((s, p) => s + (p.organic_traffic ?? 0) * 0.2, 0)).toLocaleString()}/month.`,
      impact: "medium",
      effort: "medium",
      priority_score: 70,
      data_sources: ["content_pages"],
      linked_page: "/dashboard/content",
      linked_label: "View Content",
      metadata: { count: lowScoreContent.length },
    });
  }

  // ── RULE 4: Content Decay ────────────────────────────────────────
  const decayingContent = content.filter((p) => p.traffic_trend === "declining");
  if (decayingContent.length > 0) {
    const lostTraffic = decayingContent.reduce((s, p) => s + (p.organic_traffic ?? 0), 0);
    recs.push({
      category: "content",
      title: `${decayingContent.length} Pages Losing Traffic`,
      description: `Content decay detected on ${decayingContent.length} pages: ${decayingContent.slice(0, 3).map((p) => `"${p.title ?? "Untitled"}"`).join(", ")}. These pages have declining organic traffic trends.`,
      expected_result: `Refreshing declining pages with updated statistics, new examples, and expanded sections can recover 40-60% of lost traffic within 2-3 months. Estimated recovery: ~${Math.round(lostTraffic * 0.5).toLocaleString()} visits/month.`,
      impact: "high",
      effort: "medium",
      priority_score: 78,
      data_sources: ["content_pages"],
      linked_page: "/dashboard/content",
      linked_label: "View Content",
      metadata: { count: decayingContent.length, lostTraffic },
    });
  }

  // ── RULE 5: Thin Pages ───────────────────────────────────────────
  // Exclude legal/utility pages (terms, privacy, contact, etc.) from thin content
  const nonContentPatterns = [
    /\/(terms|tos|terms-of-service|terms-and-conditions)(\/|$)/i,
    /\/(privacy|privacy-policy)(\/|$)/i,
    /\/(cookie|cookies|cookie-policy)(\/|$)/i,
    /\/(legal|disclaimer|dmca|gdpr|compliance)(\/|$)/i,
    /\/(contact|contact-us)(\/|$)/i,
    /\/(login|signin|sign-in|signup|sign-up|register|auth)(\/|$)/i,
    /\/(sitemap|robots|404|500|error)(\/|$)/i,
  ];
  const isNonContent = (url: string) => {
    try { const p = new URL(url).pathname.toLowerCase(); return nonContentPatterns.some(r => r.test(p)); }
    catch { return false; }
  };
  const thinPages = auditPages.filter(
    (p) => p.word_count !== null && p.word_count < 300 && !isNonContent(p.url)
  );
  if (thinPages.length > 3) {
    recs.push({
      category: "content",
      title: `${thinPages.length} Thin Content Pages (<300 words)`,
      description: `${thinPages.length} pages have fewer than 300 words. Thin content rarely ranks well and can dilute your site's topical authority.`,
      expected_result: `Expanding thin pages to 800+ words with relevant, quality content typically improves rankings by 5-15 positions. Consider consolidating or adding depth to these pages.`,
      impact: "medium",
      effort: "medium",
      priority_score: 65,
      data_sources: ["audit_pages"],
      linked_page: "/dashboard/site-audit",
      linked_label: "View Audit",
      metadata: { count: thinPages.length },
    });
  }

  // ── RULE 6: Low Readability ──────────────────────────────────────
  const lowReadability = content.filter((p) => p.readability_score !== null && p.readability_score < 40);
  if (lowReadability.length > 0) {
    recs.push({
      category: "content",
      title: `${lowReadability.length} Pages with Poor Readability`,
      description: `${lowReadability.length} pages have readability scores below 40. Hard-to-read content leads to higher bounce rates and lower engagement.`,
      expected_result: `Improving readability to 60+ by using shorter sentences, simpler words, and better formatting can increase time-on-page by 20-40% and reduce bounce rate.`,
      impact: "medium",
      effort: "low",
      priority_score: 55,
      data_sources: ["content_pages"],
      linked_page: "/dashboard/content",
      linked_label: "View Content",
      metadata: { count: lowReadability.length },
    });
  }

  // ── RULE 7: Critical Audit Issues ────────────────────────────────
  const criticalIssues = auditIssues.filter((i) => i.severity === "critical");
  if (criticalIssues.length > 0) {
    const effortLevel: EffortLevel = criticalIssues.length > 10 ? "high" : criticalIssues.length > 3 ? "medium" : "low";
    recs.push({
      category: "technical",
      title: `${criticalIssues.length} Critical Technical Issues`,
      description: `Your site has ${criticalIssues.length} critical issues that may prevent proper indexing or harm user experience. Top issues: ${criticalIssues.slice(0, 3).map((i) => `"${i.title}"`).join(", ")}.`,
      expected_result: `Fixing critical issues can improve your health score by 10-25 points and prevent pages from being de-indexed. This is the highest-priority fix for SEO.`,
      impact: "high",
      effort: effortLevel,
      priority_score: 95,
      data_sources: ["audit_issues"],
      linked_page: "/dashboard/site-audit",
      linked_label: "Fix Issues",
      metadata: { count: criticalIssues.length, topIssues: criticalIssues.slice(0, 5).map((i) => i.title) },
    });
  }

  // ── RULE 8: Core Web Vitals Failures ─────────────────────────────
  const cwvFailing = auditPages.filter(
    (p) => (p.lcp_ms && p.lcp_ms > 2500) || (p.cls && p.cls > 0.1) || (p.inp_ms && p.inp_ms > 200)
  );
  if (cwvFailing.length > 0) {
    const avgLcp = cwvFailing.filter((p) => p.lcp_ms).reduce((s, p) => s + p.lcp_ms!, 0) / Math.max(1, cwvFailing.filter((p) => p.lcp_ms).length);
    recs.push({
      category: "performance",
      title: `${cwvFailing.length} Pages Failing Core Web Vitals`,
      description: `${cwvFailing.length} pages fail Google's Core Web Vitals thresholds (LCP > 2.5s, CLS > 0.1, or INP > 200ms). Average LCP: ${(avgLcp / 1000).toFixed(1)}s.`,
      expected_result: `Passing Core Web Vitals is a confirmed ranking factor. Fixing ${cwvFailing.length} failing pages can improve rankings by 1-3 positions and boost conversion rates by 7%.`,
      impact: "high",
      effort: "high",
      priority_score: 85,
      data_sources: ["audit_pages"],
      linked_page: "/dashboard/site-audit",
      linked_label: "View Audit",
      metadata: { count: cwvFailing.length, avgLcp: Math.round(avgLcp) },
    });
  }

  // ── RULE 9: Missing Schema Markup ────────────────────────────────
  if (auditPages.length > 0) {
    const noSchema = auditPages.filter((p) => p.has_schema === false);
    const coverage = Math.round(((auditPages.length - noSchema.length) / auditPages.length) * 100);
    if (noSchema.length > 0 && coverage < 60) {
      recs.push({
        category: "technical",
        title: `Schema Markup Missing on ${noSchema.length} Pages`,
        description: `Only ${coverage}% of your pages have structured data. ${noSchema.length} pages lack schema markup, reducing your chances of rich results in search.`,
        expected_result: `Adding structured data (Article, FAQ, Product, etc.) can enable rich results and improve click-through rates by 20-30%. Target 80%+ schema coverage.`,
        impact: "medium",
        effort: "low",
        priority_score: 60,
        data_sources: ["audit_pages"],
        linked_page: "/dashboard/search-ai",
        linked_label: "View Schema Audit",
        metadata: { noSchemaCount: noSchema.length, coverage },
      });
    }
  }

  // ── RULE 10: Low Referring Domains ───────────────────────────────
  const uniqueDomains = new Set(backlinks.map((b) => b.source_domain));
  if (uniqueDomains.size < 10 && backlinks.length > 0) {
    recs.push({
      category: "backlinks",
      title: `Only ${uniqueDomains.size} Referring Domains`,
      description: `Your backlink profile has ${backlinks.length} links but only ${uniqueDomains.size} unique referring domains. Domain diversity is a key ranking signal.`,
      expected_result: `Growing from ${uniqueDomains.size} to 30+ referring domains typically correlates with a 10-20 point authority score increase. Focus on guest posting, digital PR, and resource link building.`,
      impact: "high",
      effort: "high",
      priority_score: 72,
      data_sources: ["backlinks"],
      linked_page: "/dashboard/backlinks",
      linked_label: "View Backlinks",
      metadata: { domains: uniqueDomains.size, totalLinks: backlinks.length },
    });
  }

  // ── RULE 11: Toxic Backlinks ─────────────────────────────────────
  const toxicLinks = backlinks.filter((b) => b.is_toxic);
  if (toxicLinks.length > 0 && backlinks.length > 0 && toxicLinks.length / backlinks.length > 0.05) {
    recs.push({
      category: "backlinks",
      title: `${toxicLinks.length} Toxic Backlinks (${Math.round((toxicLinks.length / backlinks.length) * 100)}%)`,
      description: `${toxicLinks.length} of ${backlinks.length} backlinks are flagged as toxic. A high toxic ratio can trigger manual penalties or algorithmic suppression.`,
      expected_result: `Disavowing toxic backlinks can prevent ranking penalties and protect existing positions. Create and submit a disavow file via Google Search Console.`,
      impact: "high",
      effort: "low",
      priority_score: 80,
      data_sources: ["backlinks"],
      linked_page: "/dashboard/backlinks",
      linked_label: "Review Toxic Links",
      metadata: { toxicCount: toxicLinks.length, ratio: Math.round((toxicLinks.length / backlinks.length) * 100) },
    });
  }

  // ── RULE 12: Lost Backlink Recovery ──────────────────────────────
  const lostHighDA = backlinks.filter((b) => b.status === "lost" && (b.domain_authority ?? 0) >= 30);
  if (lostHighDA.length > 0) {
    const avgDA = Math.round(lostHighDA.reduce((s, b) => s + (b.domain_authority ?? 0), 0) / lostHighDA.length);
    recs.push({
      category: "backlinks",
      title: `${lostHighDA.length} Lost High-Authority Backlinks`,
      description: `${lostHighDA.length} backlinks from domains with DA 30+ have been lost: ${lostHighDA.slice(0, 3).map((b) => b.source_domain).join(", ")}.`,
      expected_result: `Recovering lost high-authority backlinks (avg DA ${avgDA}) is easier than building new ones. Reach out to webmasters to restore these valuable links.`,
      impact: "medium",
      effort: "medium",
      priority_score: 68,
      data_sources: ["backlinks"],
      linked_page: "/dashboard/backlinks",
      linked_label: "View Lost Links",
      metadata: { count: lostHighDA.length, avgDA },
    });
  }

  // ── RULE 13: Keywords Not in LLM Responses ───────────────────────
  if (visibilityChecks.length > 0) {
    // Group by keyword_id, find keywords with no brand mentions
    const kwMentions = new Map<string, boolean>();
    for (const vc of visibilityChecks) {
      const current = kwMentions.get(vc.keyword_id) ?? false;
      kwMentions.set(vc.keyword_id, current || vc.brand_mentioned);
    }
    const neverMentioned = [...kwMentions.entries()].filter(([, mentioned]) => !mentioned);

    if (neverMentioned.length > 0) {
      const kwNames = neverMentioned
        .slice(0, 3)
        .map(([id]) => keywords.find((k) => k.id === id)?.keyword ?? id)
        .filter(Boolean);

      recs.push({
        category: "ai_visibility",
        title: `${neverMentioned.length} Keywords Invisible to AI`,
        description: `Your brand is not mentioned by any LLM for ${neverMentioned.length} tracked keywords: ${kwNames.map((k) => `"${k}"`).join(", ")}${neverMentioned.length > 3 ? "..." : ""}.`,
        expected_result: `Optimizing content for LLM citations (adding factual data, structured answers, authoritative sources) can capture emerging AI search traffic. LLM answers influence 10-30% of informational queries.`,
        impact: "high",
        effort: "high",
        priority_score: 73,
        data_sources: ["ai_visibility_checks", "keywords"],
        linked_page: "/dashboard/advanced-ai",
        linked_label: "View AI Visibility",
        metadata: { count: neverMentioned.length },
      });
    }
  }

  // ── RULE 14: Negative AI Sentiment ───────────────────────────────
  const negativeSentiment = visibilityChecks.filter((vc) => vc.sentiment === "negative");
  if (negativeSentiment.length > 0) {
    recs.push({
      category: "ai_visibility",
      title: `${negativeSentiment.length} Negative AI Mentions`,
      description: `${negativeSentiment.length} LLM responses mention ${domain} with negative sentiment. This can damage brand perception in AI-powered search results.`,
      expected_result: `Address negative mentions by creating authoritative, fact-based content that counters misinformation. Improved AI sentiment can boost brand trust and click-through from AI results.`,
      impact: "high",
      effort: "medium",
      priority_score: 82,
      data_sources: ["ai_visibility_checks"],
      linked_page: "/dashboard/advanced-ai",
      linked_label: "View AI Visibility",
      metadata: { count: negativeSentiment.length },
    });
  }

  // ── RULE 15: High CPC / Low Position ─────────────────────────────
  const highCpcLowPos = keywords
    .filter((k) => (k.cpc ?? 0) > 3 && k.current_position && k.current_position > 10)
    .sort((a, b) => (b.cpc ?? 0) - (a.cpc ?? 0));

  if (highCpcLowPos.length > 0) {
    const top = highCpcLowPos[0];
    const monthlySavings = Math.round((top.cpc ?? 0) * (top.search_volume ?? 0) * ctrForPos(3));
    recs.push({
      category: "revenue",
      title: `${highCpcLowPos.length} High-Value Keywords Below Page 1`,
      description: `${highCpcLowPos.length} keywords with CPC > $3 are ranking below the top 10. Top opportunity: "${top.keyword}" (CPC $${(top.cpc ?? 0).toFixed(2)}, position #${top.current_position}).`,
      expected_result: `Ranking page 1 for "${top.keyword}" could generate ~$${monthlySavings.toLocaleString()}/month in equivalent ad value. Total opportunity across all ${highCpcLowPos.length} keywords: ~$${highCpcLowPos.reduce((s, k) => s + Math.round((k.cpc ?? 0) * (k.search_volume ?? 0) * ctrForPos(3)), 0).toLocaleString()}/month.`,
      impact: "high",
      effort: "high",
      priority_score: 88,
      data_sources: ["keywords"],
      linked_page: "/dashboard/keywords",
      linked_label: "View Keywords",
      metadata: { count: highCpcLowPos.length, topKeyword: top.keyword, topCpc: top.cpc },
    });
  }

  // ── RULE 16: Commercial Intent Keywords Near Top 10 ──────────────
  const commercialNearTop = keywords.filter(
    (k) => k.current_position && k.current_position >= 4 && k.current_position <= 10 &&
      (k.intent === "transactional" || k.intent === "commercial")
  );

  if (commercialNearTop.length > 0) {
    recs.push({
      category: "revenue",
      title: `${commercialNearTop.length} Revenue-Driving Keywords in Striking Distance`,
      description: `${commercialNearTop.length} commercial/transactional keywords are ranking positions 4-10: ${commercialNearTop.slice(0, 3).map((k) => `"${k.keyword}" (#${k.current_position})`).join(", ")}.`,
      expected_result: `Pushing commercial-intent keywords to top 3 significantly increases conversion-ready traffic. Estimated additional clicks: ~${commercialNearTop.reduce((s, k) => s + Math.round((k.search_volume ?? 0) * (ctrForPos(3) - ctrForPos(k.current_position!))), 0).toLocaleString()}/month.`,
      impact: "high",
      effort: "medium",
      priority_score: 85,
      data_sources: ["keywords"],
      linked_page: "/dashboard/keywords",
      linked_label: "View Keywords",
      metadata: { count: commercialNearTop.length },
    });
  }

  // ── RULE 17: Competitor Authority Gap ────────────────────────────
  // Estimate project's authority from latest audit health score
  const projectAuthority = latestAudit?.health_score ?? 0;
  const strongerCompetitors = competitors.filter(
    (c) => (c.authority_score ?? 0) > projectAuthority + 10
  );

  if (strongerCompetitors.length > 0) {
    const avgCompAuth = Math.round(strongerCompetitors.reduce((s, c) => s + (c.authority_score ?? 0), 0) / strongerCompetitors.length);
    recs.push({
      category: "competitive",
      title: `${strongerCompetitors.length} Competitors Have Higher Authority`,
      description: `${strongerCompetitors.length} competitors have 10+ point authority advantage: ${strongerCompetitors.slice(0, 3).map((c) => `${c.name} (${c.authority_score})`).join(", ")}. Your score: ${projectAuthority}.`,
      expected_result: `Closing the authority gap (current: ${projectAuthority}, competitors avg: ${avgCompAuth}) requires consistent backlink building and content publishing. Each 10-point increase typically correlates with 20-40% more organic traffic.`,
      impact: "medium",
      effort: "high",
      priority_score: 65,
      data_sources: ["competitors", "site_audits"],
      linked_page: "/dashboard/competitors",
      linked_label: "View Competitors",
      metadata: { strongerCount: strongerCompetitors.length, projectAuthority, avgCompAuth },
    });
  }

  // ── RULE 18: Slow Loading Pages ──────────────────────────────────
  const slowPages = auditPages.filter((p) => p.load_time_ms && p.load_time_ms > 3000);
  if (slowPages.length > 0) {
    const avgLoad = Math.round(slowPages.reduce((s, p) => s + (p.load_time_ms ?? 0), 0) / slowPages.length);
    recs.push({
      category: "performance",
      title: `${slowPages.length} Pages Load Slower Than 3 Seconds`,
      description: `${slowPages.length} pages take over 3 seconds to load (avg: ${(avgLoad / 1000).toFixed(1)}s). Slow pages lose visitors and rank lower.`,
      expected_result: `Reducing load time to under 2 seconds can improve conversion rate by 7%, reduce bounce rate by 15%, and improve rankings. Optimize images, minify CSS/JS, and enable caching.`,
      impact: "medium",
      effort: "medium",
      priority_score: 70,
      data_sources: ["audit_pages"],
      linked_page: "/dashboard/site-audit",
      linked_label: "View Audit",
      metadata: { count: slowPages.length, avgLoadMs: avgLoad },
    });
  }

  // ── RULE 19: Low GEO Scores ──────────────────────────────────────
  const lowGeo = geoScores.filter((g) => g.geo_score < 40);
  if (lowGeo.length > 0) {
    recs.push({
      category: "performance",
      title: `${lowGeo.length} Pages with Low GEO Readiness`,
      description: `${lowGeo.length} pages have GEO readiness scores below 40. These pages are poorly optimized for AI-driven search (entity coverage, structured data, citations).`,
      expected_result: `Improving GEO readiness by adding entities, structured data, and authoritative citations can increase AI search visibility by 30-50%.`,
      impact: "medium",
      effort: "medium",
      priority_score: 67,
      data_sources: ["geo_scores"],
      linked_page: "/dashboard/search-ai",
      linked_label: "View GEO Scores",
      metadata: { count: lowGeo.length },
    });
  }

  // ── "Getting Started" fallbacks if no data ───────────────────────
  if (keywords.length === 0) {
    recs.push({
      category: "quick_wins",
      title: "Start Tracking Keywords",
      description: `No keywords are being tracked for ${domain}. Add keywords to monitor search rankings and discover optimization opportunities.`,
      expected_result: `Tracking keywords enables data-driven SEO decisions. Start with 10-20 high-value keywords to establish a baseline.`,
      impact: "high",
      effort: "low",
      priority_score: 92,
      data_sources: [],
      linked_page: "/dashboard/keywords",
      linked_label: "Add Keywords",
      metadata: {},
    });
  }

  if (!latestAudit) {
    recs.push({
      category: "technical",
      title: "Run Your First Site Audit",
      description: `No site audit has been performed for ${domain}. Audits identify critical technical issues that may be hurting your rankings.`,
      expected_result: `A comprehensive audit reveals indexing issues, broken links, missing meta tags, and performance problems. Most sites find 5-20 fixable issues on the first audit.`,
      impact: "high",
      effort: "low",
      priority_score: 90,
      data_sources: [],
      linked_page: "/dashboard/site-audit",
      linked_label: "Run Audit",
      metadata: {},
    });
  }

  if (backlinks.length === 0) {
    recs.push({
      category: "backlinks",
      title: "Start Building Your Backlink Profile",
      description: `No backlinks are being tracked for ${domain}. Backlinks are one of the strongest ranking signals.`,
      expected_result: `Start by discovering existing backlinks, then build new ones through guest posting, digital PR, and outreach. Even 10-20 quality backlinks can significantly improve authority.`,
      impact: "high",
      effort: "medium",
      priority_score: 75,
      data_sources: [],
      linked_page: "/dashboard/backlinks",
      linked_label: "Discover Backlinks",
      metadata: {},
    });
  }

  // ── AI Enhancement ───────────────────────────────────────────────
  if (recs.length > 0) {
    try {
      const enhanced = await enhanceWithAI(domain, recs);
      return enhanced;
    } catch (err) {
      console.error("[generateRecommendations] AI enhancement error:", err);
    }
  }

  return recs;
}

/**
 * Enhance rule-based recommendations with AI for richer descriptions
 * and more specific expected outcomes.
 */
async function enhanceWithAI(
  domain: string,
  recommendations: RawRecommendation[]
): Promise<RawRecommendation[]> {
  const recSummary = recommendations
    .slice(0, 15)
    .map((r, i) => `${i + 1}. [${r.category}] ${r.title} — ${r.description.slice(0, 120)}`)
    .join("\n");

  const prompt = `You are a world-class SEO consultant analyzing "${domain}".
Below are preliminary recommendations from an automated analysis. For each one,
provide an enhanced description and a more specific, realistic expected outcome.

RECOMMENDATIONS:
${recSummary}

Return ONLY a JSON array where each element has:
{"index": <1-based>, "description": "2-3 sentence enhanced description", "expected_result": "specific realistic expected outcome"}

Rules:
- Be realistic. Use "could", "typically", "estimated", never guarantee results.
- Include specific metrics or percentages where the data supports it.
- Do NOT add new recommendations, only enhance existing ones.
- Return valid JSON only, no markdown fences or extra text.`;

  const response = await aiChat(prompt, {
    temperature: 0.6,
    maxTokens: 2048,
    timeout: 45000,
  });

  if (!response?.text) return recommendations;

  try {
    // Extract JSON from response (handle potential markdown fences)
    let jsonText = response.text.trim();
    const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonText = fenceMatch[1].trim();

    const enhancements = JSON.parse(jsonText) as Array<{
      index: number;
      description?: string;
      expected_result?: string;
    }>;

    for (const enh of enhancements) {
      const idx = enh.index - 1;
      if (idx >= 0 && idx < recommendations.length) {
        if (enh.description) recommendations[idx].description = enh.description;
        if (enh.expected_result) recommendations[idx].expected_result = enh.expected_result;
        recommendations[idx] = { ...recommendations[idx] };
      }
    }
  } catch {
    // AI response wasn't valid JSON — return rule-based recommendations as-is
    console.warn("[enhanceWithAI] Failed to parse AI response, using rule-based recommendations");
  }

  return recommendations;
}
