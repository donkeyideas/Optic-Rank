"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/ai-provider";

export interface KeywordOpportunity {
  keyword: string;
  estimated_volume: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  opportunity_score: number;
  reason: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
}

/**
 * Find keyword opportunities (low competition + high relevance) for a website.
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

Return ONLY a JSON array:
[{"keyword": "...", "estimated_volume": "high|medium|low", "competition": "high|medium|low", "opportunity_score": 85, "reason": "Brief explanation of why this is a good opportunity", "intent": "informational|commercial|transactional|navigational"}, ...]`;

  const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 800 });

  let opportunities: KeywordOpportunity[] = [];
  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      if (match) opportunities = JSON.parse(match[0]);
    } catch { /* parse error */ }
  }

  if (opportunities.length === 0) {
    const domain = project.domain.replace(/^www\./, "").split(".")[0];
    opportunities = [
      { keyword: `best ${domain} alternatives`, estimated_volume: "medium", competition: "low", opportunity_score: 78, reason: "Comparison queries often have low competition", intent: "commercial" },
      { keyword: `${domain} review 2026`, estimated_volume: "medium", competition: "low", opportunity_score: 75, reason: "Year-specific, low competition", intent: "informational" },
      { keyword: `how to use ${domain}`, estimated_volume: "low", competition: "low", opportunity_score: 72, reason: "Long-tail tutorial intent", intent: "informational" },
    ];
  }

  return { success: true, opportunities };
}
