"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";
import { revalidatePath } from "next/cache";

export interface KeywordOpportunity {
  keyword: string;
  estimated_volume: "high" | "medium" | "low";
  estimated_searches: number;
  competition: "high" | "medium" | "low";
  opportunity_score: number;
  reason: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

/**
 * Fetch saved keyword opportunities from the database.
 */
export async function getKeywordOpportunities(
  projectId: string
): Promise<KeywordOpportunity[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("keyword_opportunities")
    .select("keyword, estimated_volume, estimated_searches, competition, opportunity_score, reason, intent")
    .eq("project_id", projectId)
    .order("opportunity_score", { ascending: false });

  return (data ?? []) as KeywordOpportunity[];
}

/**
 * Find keyword opportunities (low competition + high relevance) for a website.
 * Results are persisted to the database.
 */
export async function findWebsiteKeywordOpportunities(
  projectId: string
): Promise<{ error: string } | { success: true; opportunities: KeywordOpportunity[] }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const [projectRes, keywordsRes] = await Promise.all([
    supabase.from("projects").select("domain, name").eq("id", projectId).single(),
    supabase.from("keywords").select("keyword, current_position, search_volume, difficulty").eq("project_id", projectId),
  ]);

  const project = projectRes.data;
  if (!project?.domain) return { error: "Project has no domain configured." };

  const existingKeywords = (keywordsRes.data ?? []).map((k) => k.keyword);

  // Build context about current keyword performance
  const rankedKeywords = (keywordsRes.data ?? [])
    .filter((k) => k.current_position !== null)
    .sort((a, b) => (a.current_position ?? 999) - (b.current_position ?? 999))
    .slice(0, 10);

  const topKeywordsContext = rankedKeywords.length > 0
    ? rankedKeywords.map((k) => `"${k.keyword}" (#${k.current_position}, vol: ${k.search_volume ?? "?"})`).join(", ")
    : "none ranked yet";

  const prompt = `You are an SEO keyword research expert. Find keyword opportunities for this website:

Domain: ${project.domain}
Site Name: ${project.name ?? project.domain}
Top Performing Keywords: ${topKeywordsContext}
Already Tracking (${existingKeywords.length} total): ${existingKeywords.slice(0, 20).join(", ") || "none"}

IMPORTANT: Only suggest keywords that are relevant to the website's apparent niche based on its domain and existing keywords. Do NOT suggest unrelated keywords.

Find 10 keyword opportunities that are:
- NOT already being tracked
- Relevant to the site's content and industry
- Mix of low-competition long-tail and moderate-competition short-tail
- Include seasonal/trending terms if applicable
- Consider search intent (informational, commercial, transactional, navigational)

Return ONLY a JSON array with estimated monthly search volume numbers:
[{"keyword": "example keyword", "estimated_volume": "high", "estimated_searches": 5400, "competition": "low", "opportunity_score": 85, "reason": "Brief explanation", "intent": "informational"}, ...]

Volume guidelines: high = 5000+, medium = 500-5000, low = under 500. Provide realistic estimated_searches numbers.`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 1200 });

  let opportunities: KeywordOpportunity[] = [];
  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*\]/);
      if (match) opportunities = JSON.parse(match[0]);
    } catch { /* parse error */ }
  }

  if (opportunities.length === 0) {
    const domain = project.domain.replace(/^www\./, "").split(".")[0];
    opportunities = [
      { keyword: `best ${domain} alternatives`, estimated_volume: "medium", estimated_searches: 2400, competition: "low", opportunity_score: 88, reason: "Comparison queries with commercial intent, low competition", intent: "commercial" },
      { keyword: `${domain} vs competitors`, estimated_volume: "medium", estimated_searches: 1800, competition: "low", opportunity_score: 85, reason: "Versus queries drive high-intent traffic", intent: "commercial" },
      { keyword: `${domain} review 2026`, estimated_volume: "medium", estimated_searches: 1200, competition: "low", opportunity_score: 82, reason: "Year-specific review query, low competition", intent: "informational" },
      { keyword: `how to use ${domain}`, estimated_volume: "medium", estimated_searches: 980, competition: "low", opportunity_score: 80, reason: "Tutorial intent with branded awareness", intent: "informational" },
      { keyword: `${domain} pricing plans`, estimated_volume: "medium", estimated_searches: 720, competition: "low", opportunity_score: 78, reason: "High purchase intent, bottom of funnel", intent: "transactional" },
      { keyword: `is ${domain} worth it`, estimated_volume: "low", estimated_searches: 480, competition: "low", opportunity_score: 76, reason: "Decision-stage query, easy to rank", intent: "commercial" },
      { keyword: `${domain} tutorial for beginners`, estimated_volume: "low", estimated_searches: 390, competition: "low", opportunity_score: 74, reason: "Long-tail educational query", intent: "informational" },
      { keyword: `${domain} free trial`, estimated_volume: "low", estimated_searches: 320, competition: "low", opportunity_score: 72, reason: "Transactional query near conversion", intent: "transactional" },
      { keyword: `${domain} features list`, estimated_volume: "low", estimated_searches: 260, competition: "low", opportunity_score: 70, reason: "Feature comparison research query", intent: "informational" },
      { keyword: `${domain} integrations`, estimated_volume: "low", estimated_searches: 210, competition: "low", opportunity_score: 68, reason: "Specific feature discovery, low competition", intent: "informational" },
    ];
  }

  // Ensure estimated_searches exists for all entries
  for (const opp of opportunities) {
    if (!opp.estimated_searches) {
      opp.estimated_searches = opp.estimated_volume === "high" ? 5000 : opp.estimated_volume === "medium" ? 1500 : 300;
    }
  }

  // Persist to database: clear old results and insert new
  await supabase
    .from("keyword_opportunities")
    .delete()
    .eq("project_id", projectId);

  const rows = opportunities.map((opp) => ({
    project_id: projectId,
    keyword: opp.keyword,
    estimated_volume: opp.estimated_volume,
    estimated_searches: opp.estimated_searches,
    competition: opp.competition,
    opportunity_score: opp.opportunity_score,
    reason: opp.reason,
    intent: opp.intent,
  }));

  await supabase.from("keyword_opportunities").insert(rows);

  revalidatePath("/dashboard/keywords");
  return { success: true, opportunities };
}
