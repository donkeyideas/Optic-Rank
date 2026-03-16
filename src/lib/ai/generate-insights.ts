/**
 * AI-powered insight generation engine.
 * Analyzes project data and generates actionable SEO insights.
 * Uses unified AI provider (DeepSeek > Gemini > env fallback).
 * Always returns at least some rule-based insights.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "./ai-provider";

interface InsightData {
  type: "opportunity" | "alert" | "win" | "backlinks" | "prediction" | "content" | "technical";
  title: string;
  description: string;
  priority: number;
  revenue_impact?: number;
  action_label?: string;
  action_url?: string;
}

/**
 * Generate AI insights for a project based on its current data.
 * Always returns at least "getting started" insights if no other rules match.
 */
export async function generateProjectInsights(projectId: string): Promise<InsightData[]> {
  const supabase = createAdminClient();

  // Fetch project data for analysis
  const [projectRes, keywordsRes, backlinksRes, auditsRes, contentRes] = await Promise.all([
    supabase.from("projects").select("domain").eq("id", projectId).single(),
    supabase.from("keywords").select("keyword, current_position, previous_position, search_volume").eq("project_id", projectId),
    supabase.from("backlinks").select("source_domain, is_toxic, status, domain_authority").eq("project_id", projectId),
    supabase.from("site_audits").select("health_score, seo_score, performance_score").eq("project_id", projectId).order("created_at", { ascending: false }).limit(2),
    supabase.from("content_pages").select("title, content_score, traffic_trend, organic_traffic").eq("project_id", projectId),
  ]);

  const domain = projectRes.data?.domain ?? "your site";
  const keywords = keywordsRes.data ?? [];
  const backlinks = backlinksRes.data ?? [];
  const audits = auditsRes.data ?? [];
  const content = contentRes.data ?? [];

  const insights: InsightData[] = [];

  // --- Rule-based insights ---

  // 1. Keywords rising/falling
  const rising = keywords.filter(
    (k) => k.current_position && k.previous_position && k.current_position < k.previous_position
  );
  const falling = keywords.filter(
    (k) => k.current_position && k.previous_position && k.current_position > k.previous_position
  );

  if (rising.length > 0) {
    insights.push({
      type: "win",
      title: `${rising.length} Keywords Improved Rankings`,
      description: `Good news! ${rising.length} keyword${rising.length > 1 ? "s have" : " has"} moved up in search results. Top movers: ${rising
        .slice(0, 3)
        .map((k) => `"${k.keyword}"`)
        .join(", ")}.`,
      priority: 60,
      action_label: "View Keywords",
      action_url: "/dashboard/keywords",
    });
  }

  if (falling.length >= 3) {
    const avgDrop = falling.reduce((sum, k) => sum + (k.current_position! - k.previous_position!), 0) / falling.length;
    insights.push({
      type: "alert",
      title: `${falling.length} Keywords Lost Rankings`,
      description: `${falling.length} keywords dropped an average of ${avgDrop.toFixed(1)} positions. This could indicate an algorithm update or technical issue. Review: ${falling
        .slice(0, 3)
        .map((k) => `"${k.keyword}"`)
        .join(", ")}.`,
      priority: 85,
      revenue_impact: falling.reduce((sum, k) => sum + (k.search_volume ?? 0) * 0.03 * 12, 0),
      action_label: "Investigate",
      action_url: "/dashboard/keywords",
    });
  }

  // 2. Keywords almost in top 3
  const almostTop3 = keywords.filter(
    (k) => k.current_position && k.current_position >= 4 && k.current_position <= 10
  );
  if (almostTop3.length > 0) {
    const topOpportunity = almostTop3.sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))[0];
    insights.push({
      type: "opportunity",
      title: `${almostTop3.length} Keywords Close to Top 3`,
      description: `You have ${almostTop3.length} keywords ranking between positions 4-10. Focus on "${topOpportunity.keyword}" (position #${topOpportunity.current_position}, ${topOpportunity.search_volume?.toLocaleString() ?? 0} monthly searches) for the biggest traffic gain.`,
      priority: 75,
      revenue_impact: almostTop3.reduce((sum, k) => sum + (k.search_volume ?? 0) * 0.15 * 12, 0),
      action_label: "View Opportunities",
      action_url: "/dashboard/keywords",
    });
  }

  // 3. Toxic backlinks
  const toxicLinks = backlinks.filter((b) => b.is_toxic);
  if (toxicLinks.length > 0) {
    insights.push({
      type: "backlinks",
      title: `${toxicLinks.length} Toxic Backlinks Detected`,
      description: `Found ${toxicLinks.length} potentially harmful backlinks from domains like ${toxicLinks
        .slice(0, 3)
        .map((b) => b.source_domain)
        .join(", ")}. Consider disavowing these to protect your rankings.`,
      priority: 70,
      action_label: "Review Backlinks",
      action_url: "/dashboard/backlinks",
    });
  }

  // 4. New backlinks
  const newLinks = backlinks.filter((b) => b.status === "new");
  if (newLinks.length > 0) {
    insights.push({
      type: "win",
      title: `${newLinks.length} New Backlinks Acquired`,
      description: `Your link profile grew with ${newLinks.length} new backlinks. Highest authority: ${newLinks
        .sort((a, b) => (b.domain_authority ?? 0) - (a.domain_authority ?? 0))
        .slice(0, 3)
        .map((b) => `${b.source_domain} (DA ${b.domain_authority ?? "?"})`)
        .join(", ")}.`,
      priority: 55,
      action_label: "View Backlinks",
      action_url: "/dashboard/backlinks",
    });
  }

  // 5. Site audit health drop
  if (audits.length >= 2) {
    const latest = audits[0];
    const previous = audits[1];
    if (latest.health_score && previous.health_score && latest.health_score < previous.health_score - 5) {
      insights.push({
        type: "technical",
        title: "Site Health Score Dropped",
        description: `Your health score dropped from ${previous.health_score} to ${latest.health_score}. Run a new audit to identify the issues causing the decline.`,
        priority: 80,
        action_label: "Run Audit",
        action_url: "/dashboard/site-audit",
      });
    }
  }

  // 6. Content decay detection
  const decliningContent = content.filter((c) => c.traffic_trend === "declining");
  if (decliningContent.length > 0) {
    insights.push({
      type: "content",
      title: `${decliningContent.length} Pages Losing Traffic`,
      description: `Content decay detected on ${decliningContent.length} page${decliningContent.length > 1 ? "s" : ""}. Pages with declining traffic: ${decliningContent
        .slice(0, 3)
        .map((c) => `"${c.title ?? "Untitled"}"`)
        .join(", ")}. Consider updating these with fresh content.`,
      priority: 65,
      revenue_impact: decliningContent.reduce((sum, c) => sum + (c.organic_traffic ?? 0) * 0.05 * 12, 0),
      action_label: "View Content",
      action_url: "/dashboard/content",
    });
  }

  // 7. Keywords tracked but no rank data yet
  const unrankedKeywords = keywords.filter((k) => k.current_position === null);
  if (keywords.length > 0 && unrankedKeywords.length === keywords.length) {
    insights.push({
      type: "opportunity",
      title: `${keywords.length} Keywords Awaiting First Rank Check`,
      description: `You have ${keywords.length} keywords tracked for ${domain} but no ranking data yet. Rankings will be collected during the next scheduled check, or connect a DataForSEO API key for immediate rank tracking.`,
      priority: 80,
      action_label: "View Keywords",
      action_url: "/dashboard/keywords",
    });
  }

  // 8. Good health score
  if (audits.length > 0 && audits[0].health_score && audits[0].health_score >= 80) {
    insights.push({
      type: "win",
      title: `Strong Health Score: ${audits[0].health_score}/100`,
      description: `Your site has a health score of ${audits[0].health_score}. SEO: ${audits[0].seo_score ?? "N/A"}, Performance: ${audits[0].performance_score ?? "N/A"}. Keep up the great work — focus on content and backlinks for further growth.`,
      priority: 40,
      action_label: "View Audit",
      action_url: "/dashboard/site-audit",
    });
  }

  // 9. No backlinks tracked
  if (backlinks.length === 0) {
    insights.push({
      type: "opportunity",
      title: "Start Building Your Backlink Profile",
      description: `No backlinks are being tracked for ${domain}. Backlinks are one of the strongest ranking signals. Connect a backlink data provider or add them manually to monitor your link profile.`,
      priority: 70,
      action_label: "View Backlinks",
      action_url: "/dashboard/backlinks",
    });
  }

  // 10. No content pages tracked
  if (content.length === 0) {
    insights.push({
      type: "content",
      title: "Track Your Content Performance",
      description: `No content pages are being tracked for ${domain}. Add your key pages to monitor content scores, detect decay, and identify optimization opportunities.`,
      priority: 60,
      action_label: "Add Content",
      action_url: "/dashboard/content",
    });
  }

  // 11. No competitors tracked
  const { count: competitorCount } = await supabase
    .from("competitors")
    .select("id", { count: "exact" })
    .eq("project_id", projectId);

  if ((competitorCount ?? 0) === 0) {
    insights.push({
      type: "opportunity",
      title: "Add Competitors to Track",
      description: `No competitors are being tracked for ${domain}. Add competitors to compare authority scores, keyword overlap, and content strategies.`,
      priority: 65,
      action_label: "Add Competitors",
      action_url: "/dashboard/competitors",
    });
  }

  // 12. No keywords tracked at all
  if (keywords.length === 0) {
    insights.push({
      type: "opportunity",
      title: "Start Tracking Keywords",
      description: `No keywords are being tracked for ${domain}. Add keywords to monitor your search performance and discover ranking opportunities.`,
      priority: 90,
      action_label: "Add Keywords",
      action_url: "/dashboard/keywords",
    });
  }

  // 13. No site audit run
  if (audits.length === 0) {
    insights.push({
      type: "technical",
      title: "Run Your First Site Audit",
      description: `No site audit has been performed yet for ${domain}. Run an audit to identify technical SEO issues, Core Web Vitals problems, and optimization opportunities.`,
      priority: 88,
      action_label: "Run Audit",
      action_url: "/dashboard/site-audit",
    });
  }

  // Try AI-enhanced insights
  if (keywords.length > 0) {
    try {
      const aiInsights = await generateWithAI(domain, keywords, backlinks, audits);
      insights.push(...aiInsights);
    } catch (err) {
      console.error("[generateInsights] AI enhancement error:", err);
    }
  }

  return insights;
}

async function generateWithAI(
  domain: string,
  keywords: Array<{ keyword: string; current_position: number | null; search_volume: number | null }>,
  backlinks: Array<{ source_domain: string; is_toxic: boolean }>,
  audits: Array<{ health_score: number | null }>
): Promise<InsightData[]> {
  const keywordSummary = keywords
    .filter((k) => k.current_position)
    .slice(0, 10)
    .map((k) => `${k.keyword} (#${k.current_position}, ${k.search_volume ?? 0} vol)`)
    .join("; ");

  const prompt = `You are an expert SEO analyst. Based on this data for "${domain}", provide 2-3 actionable insights.

Keywords: ${keywordSummary || `${keywords.length} tracked, no rank data yet`}
Backlinks: ${backlinks.length} total, ${backlinks.filter((b) => b.is_toxic).length} toxic
Health Score: ${audits[0]?.health_score ?? "No audit"}

Return ONLY in this exact format, one insight per line:
type|title|description|priority
Where type is one of: opportunity, alert, win, prediction, content, technical
Priority is 1-100.
No extra text.`;

  const response = await aiChat(prompt, { temperature: 0.7, maxTokens: 512 });
  if (!response) return [];

  const insights: InsightData[] = [];
  for (const line of response.text.split("\n").filter((l: string) => l.trim())) {
    const parts = line.split("|").map((p: string) => p.trim());
    if (parts.length >= 4) {
      const validTypes = ["opportunity", "alert", "win", "backlinks", "prediction", "content", "technical"];
      const type = validTypes.includes(parts[0]) ? parts[0] as InsightData["type"] : "opportunity";
      insights.push({
        type,
        title: parts[1],
        description: parts[2],
        priority: Math.min(100, Math.max(1, parseInt(parts[3]) || 50)),
      });
    }
  }

  return insights.slice(0, 3);
}
