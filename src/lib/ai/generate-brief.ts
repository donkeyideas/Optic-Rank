/**
 * AI Intelligence Brief Generator
 * Aggregates all project data and generates a comprehensive
 * SEO intelligence brief using aiChat() (DeepSeek-first).
 */

import { aiChat } from "./ai-provider";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BriefSection } from "@/types";

export interface GeneratedBrief {
  title: string;
  summary: string;
  sections: BriefSection[];
  dataSnapshot: Record<string, unknown>;
}

/**
 * Generate a comprehensive SEO intelligence brief for a project.
 * Aggregates keywords, ranks, backlinks, audit, competitors,
 * visibility, predictions, entities, and insights data.
 */
export async function generateSEOBrief(
  projectId: string,
  briefType: "daily" | "weekly" | "monthly" | "on_demand" = "on_demand"
): Promise<GeneratedBrief | null> {
  const supabase = createAdminClient();

  // 1. Fetch ALL project data in parallel
  const [
    projectRes,
    keywordsRes,
    backlinkStatsRes,
    auditRes,
    competitorsRes,
    insightsRes,
    entitiesRes,
    predictionsRes,
  ] = await Promise.all([
    supabase.from("projects").select("name, domain, authority_score, health_score").eq("id", projectId).single(),
    supabase.from("keywords").select("keyword, current_position, previous_position, search_volume, difficulty, ai_visibility_score").eq("project_id", projectId).order("search_volume", { ascending: false, nullsFirst: false }).limit(20),
    supabase.from("backlinks").select("id, is_toxic, status, domain_authority").eq("project_id", projectId),
    supabase.from("site_audits").select("health_score, seo_score, performance_score, issues_found, completed_at").eq("project_id", projectId).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("competitors").select("name, domain, authority_score, organic_traffic").eq("project_id", projectId).limit(10),
    supabase.from("ai_insights").select("type, title, priority, revenue_impact").eq("project_id", projectId).eq("is_dismissed", false).order("priority", { ascending: false }).limit(10),
    supabase.from("entities").select("name, entity_type, relevance_score").eq("project_id", projectId).order("relevance_score", { ascending: false, nullsFirst: false }).limit(15),
    supabase.from("rank_predictions").select("predicted_position, confidence, keyword_id, keywords!inner(keyword, current_position, project_id)").eq("keywords.project_id", projectId).order("confidence", { ascending: false }).limit(10),
  ]);

  const project = projectRes.data;
  if (!project) return null;

  const keywords = keywordsRes.data ?? [];
  const backlinks = backlinkStatsRes.data ?? [];
  const audit = auditRes.data;
  const competitors = competitorsRes.data ?? [];
  const insights = insightsRes.data ?? [];
  const entities = entitiesRes.data ?? [];
  const predictions = predictionsRes.data ?? [];

  // 2. Build data snapshot
  const totalBacklinks = backlinks.length;
  const toxicBacklinks = backlinks.filter((b) => b.is_toxic).length;
  const newBacklinks = backlinks.filter((b) => b.status === "new").length;
  const avgDA = backlinks.length > 0
    ? Math.round(backlinks.reduce((s, b) => s + (b.domain_authority ?? 0), 0) / backlinks.length)
    : 0;

  const keywordsImproving = keywords.filter((k) =>
    k.current_position != null && k.previous_position != null && k.current_position < k.previous_position
  ).length;
  const keywordsDeclining = keywords.filter((k) =>
    k.current_position != null && k.previous_position != null && k.current_position > k.previous_position
  ).length;

  const avgVisibility = keywords.filter((k) => k.ai_visibility_score != null).length > 0
    ? Math.round(keywords.filter((k) => k.ai_visibility_score != null).reduce((s, k) => s + (k.ai_visibility_score ?? 0), 0) / keywords.filter((k) => k.ai_visibility_score != null).length)
    : null;

  const dataSnapshot: Record<string, unknown> = {
    domain: project.domain,
    authority_score: project.authority_score,
    health_score: project.health_score,
    keywords_total: keywords.length,
    keywords_improving: keywordsImproving,
    keywords_declining: keywordsDeclining,
    backlinks_total: totalBacklinks,
    backlinks_toxic: toxicBacklinks,
    backlinks_new: newBacklinks,
    avg_domain_authority: avgDA,
    audit_health_score: audit?.health_score,
    audit_issues: audit?.issues_found,
    competitors_count: competitors.length,
    entities_count: entities.length,
    avg_ai_visibility: avgVisibility,
    active_insights: insights.length,
    total_revenue_impact: insights.reduce((s, i) => s + (Number(i.revenue_impact) || 0), 0),
  };

  // 3. Build prompt
  const keywordSummary = keywords.slice(0, 15).map((k) =>
    `"${k.keyword}": pos ${k.current_position ?? "?"} (prev ${k.previous_position ?? "?"}), vol ${k.search_volume ?? "?"}, diff ${k.difficulty ?? "?"}, AI vis ${k.ai_visibility_score ?? "?"}`
  ).join("\n");

  const competitorSummary = competitors.map((c) =>
    `${c.name} (${c.domain}): authority ${c.authority_score ?? "?"}, traffic ${c.organic_traffic ?? "?"}`
  ).join("\n");

  const insightSummary = insights.map((i) =>
    `[${i.type}] ${i.title} (priority: ${i.priority}, revenue: $${i.revenue_impact ?? 0})`
  ).join("\n");

  const entitySummary = entities.map((e) =>
    `${e.name} (${e.entity_type}, relevance: ${e.relevance_score})`
  ).join(", ");

  const predictionSummary = predictions.map((p) => {
    const kw = p.keywords as unknown as { keyword: string; current_position: number | null };
    return `"${kw?.keyword}": current ${kw?.current_position ?? "?"} → predicted ${p.predicted_position} (confidence ${(p.confidence * 100).toFixed(0)}%)`;
  }).join("\n");

  const periodLabel = briefType === "daily" ? "daily" : briefType === "weekly" ? "weekly" : briefType === "monthly" ? "monthly" : "on-demand";

  const prompt = `You are a world-class SEO strategist. Generate a comprehensive ${periodLabel} intelligence brief for "${project.domain}".

## Current Data
Authority Score: ${project.authority_score ?? "N/A"}
Health Score: ${project.health_score ?? "N/A"} (audit: ${audit?.health_score ?? "N/A"}, issues: ${audit?.issues_found ?? "N/A"})

## Keywords (${keywords.length} tracked)
${keywordSummary || "No keywords tracked yet"}
Improving: ${keywordsImproving}, Declining: ${keywordsDeclining}

## Backlinks
Total: ${totalBacklinks}, Toxic: ${toxicBacklinks}, New: ${newBacklinks}, Avg DA: ${avgDA}

## Competitors (${competitors.length})
${competitorSummary || "No competitors added"}

## AI Visibility
Average Score: ${avgVisibility ?? "Not checked"}

## Active Insights
${insightSummary || "No active insights"}

## Entities
${entitySummary || "No entities extracted"}

## Rank Predictions
${predictionSummary || "No predictions generated"}

Generate a brief with these sections:
1. Executive Summary (3-4 sentences overview)
2. Keyword Performance (analysis of rankings, movers, opportunities)
3. Ranking Trends (velocity, direction, momentum)
4. Backlink Profile (health, growth, toxic links)
5. AI Visibility (brand presence across LLMs)
6. Technical Health (site audit status, CWV)
7. Competitive Landscape (positioning vs competitors)
8. Predicted Movements (upcoming rank changes)
9. Entity Coverage (semantic SEO status)
10. Recommended Actions (5 prioritized, specific action items)

Return ONLY JSON: { "title": "...", "summary": "...", "sections": [{"title": "...", "content": "...", "type": "...", "priority": 1-10}] }
Where type is one of: summary, keywords, rankings, backlinks, visibility, technical, competitors, predictions, entities, actions.
No markdown, no extra text. Just the JSON object.`;

  const result = await aiChat(prompt, { temperature: 0.5, maxTokens: 4096, timeout: 120000 });
  if (!result?.text) return null;

  // 4. Parse response
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    const sections: BriefSection[] = (parsed.sections ?? [])
      .filter((s: Record<string, unknown>) => s.title && s.content)
      .map((s: Record<string, unknown>) => ({
        title: String(s.title),
        content: String(s.content),
        type: String(s.type ?? "summary"),
        priority: Number(s.priority) || 5,
      }));

    return {
      title: String(parsed.title ?? `SEO Intelligence Brief — ${project.domain}`),
      summary: String(parsed.summary ?? "Brief generated successfully."),
      sections,
      dataSnapshot,
    };
  } catch {
    // Fallback brief if parsing fails
    return {
      title: `SEO Intelligence Brief — ${project.domain}`,
      summary: "Brief generation encountered a parsing issue. Raw data snapshot is available.",
      sections: [
        {
          title: "Data Snapshot",
          content: `Domain: ${project.domain}\nKeywords: ${keywords.length} tracked (${keywordsImproving} improving, ${keywordsDeclining} declining)\nBacklinks: ${totalBacklinks} total (${toxicBacklinks} toxic)\nHealth Score: ${audit?.health_score ?? "N/A"}\nCompetitors: ${competitors.length}\nEntities: ${entities.length}`,
          type: "summary",
          priority: 10,
        },
      ],
      dataSnapshot,
    };
  }
}
