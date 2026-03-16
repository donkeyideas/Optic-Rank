"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { scoreContent } from "@/lib/ai/score-content";
import { aiChat } from "@/lib/ai/ai-provider";

/**
 * Delete a content page by ID.
 */
export async function deleteContentPage(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("content_pages").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/content");
  return { success: true };
}

/**
 * Add a new content page to a project.
 */
export async function addContentPage(
  projectId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const url = formData.get("url") as string;
  const title = formData.get("title") as string;

  if (!url?.trim()) return { error: "URL is required." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("content_pages").insert({
    project_id: projectId,
    url: url.trim(),
    title: title?.trim() || null,
    status: "published",
  });

  if (error) {
    if (error.code === "23505") return { error: "This URL is already being tracked." };
    return { error: error.message };
  }

  revalidatePath("/dashboard/content");
  return { success: true };
}

/**
 * Update a content page's status.
 */
export async function updateContentPageStatus(
  id: string,
  status: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const allowed = ["published", "draft", "archived", "needs_update"];
  if (!allowed.includes(status)) return { error: "Invalid status." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_pages")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/content");
  return { success: true };
}

/**
 * Score all content pages for a project using heuristic scoring.
 */
export async function scoreContentPages(
  projectId: string
): Promise<{ error: string } | { success: true; scored: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: pages } = await supabase
    .from("content_pages")
    .select("id, url, title, word_count, primary_keyword")
    .eq("project_id", projectId);

  if (!pages || pages.length === 0) return { error: "No content pages to score." };

  let scored = 0;

  for (const page of pages) {
    const scores = scoreContent({
      url: page.url,
      title: page.title,
      wordCount: page.word_count,
      primaryKeyword: page.primary_keyword,
    });

    await supabase
      .from("content_pages")
      .update({
        content_score: scores.contentScore,
        readability_score: scores.readabilityScore,
        freshness_score: scores.freshnessScore,
      })
      .eq("id", page.id);

    scored++;
  }

  revalidatePath("/dashboard/content");
  return { success: true, scored };
}

// ─── Content Intelligence: Decay Detection ──────────────────────────────────

/**
 * Detect content decay — pages losing traffic or relevance.
 * Uses traffic trends and freshness signals.
 */
export async function detectContentDecay(
  projectId: string
): Promise<{ error: string } | { success: true; atRisk: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: pages } = await supabase
    .from("content_pages")
    .select("id, url, title, word_count, content_score, last_updated, last_traffic, prev_traffic")
    .eq("project_id", projectId);

  if (!pages || pages.length === 0) return { error: "No content pages to analyze." };

  let atRisk = 0;

  for (const page of pages) {
    let risk: "none" | "low" | "medium" | "high" = "none";

    // Traffic decline
    const lastTraffic = page.last_traffic ?? 0;
    const prevTraffic = page.prev_traffic ?? 0;
    if (prevTraffic > 0 && lastTraffic < prevTraffic) {
      const decline = ((prevTraffic - lastTraffic) / prevTraffic) * 100;
      if (decline >= 50) risk = "high";
      else if (decline >= 25) risk = "medium";
      else if (decline >= 10) risk = "low";
    }

    // Content age (if last_updated exists)
    if (page.last_updated) {
      const lastUpdated = new Date(page.last_updated);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate > 365 && risk === "none") risk = "medium";
      else if (daysSinceUpdate > 180 && risk === "none") risk = "low";
    }

    // Low content score
    if (page.content_score != null && page.content_score < 40 && risk === "none") {
      risk = "low";
    }

    // Thin content
    if (page.word_count != null && page.word_count < 300 && risk === "none") {
      risk = "low";
    }

    if (risk !== "none") atRisk++;

    await supabase
      .from("content_pages")
      .update({ decay_risk: risk })
      .eq("id", page.id);
  }

  revalidatePath("/dashboard/content");
  return { success: true, atRisk };
}

// ─── Content Intelligence: Cannibalization Detection ────────────────────────

/**
 * Detect keyword cannibalization — multiple pages targeting the same keyword.
 */
export async function detectCannibalization(
  projectId: string
): Promise<{ error: string } | { success: true; groups: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: pages } = await supabase
    .from("content_pages")
    .select("id, url, title, primary_keyword, target_keywords")
    .eq("project_id", projectId);

  if (!pages || pages.length === 0) return { error: "No content pages to analyze." };

  // Group pages by primary keyword
  const keywordMap = new Map<string, string[]>();

  for (const page of pages) {
    const keywords: string[] = [];
    if (page.primary_keyword) keywords.push(page.primary_keyword.toLowerCase());
    if (page.target_keywords) {
      for (const kw of page.target_keywords) {
        keywords.push(kw.toLowerCase());
      }
    }

    // Also extract keywords from title
    if (page.title) {
      const titleWords = page.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
      // Create 2-word phrases from title
      for (let i = 0; i < titleWords.length - 1; i++) {
        keywords.push(`${titleWords[i]} ${titleWords[i + 1]}`);
      }
    }

    for (const kw of keywords) {
      if (!keywordMap.has(kw)) keywordMap.set(kw, []);
      keywordMap.get(kw)!.push(page.id);
    }
  }

  // Find cannibalization groups (2+ pages targeting same keyword)
  let groupCount = 0;

  for (const [keyword, pageIds] of keywordMap) {
    if (pageIds.length < 2) continue;

    const uniqueIds = [...new Set(pageIds)];
    if (uniqueIds.length < 2) continue;

    groupCount++;
    const groupLabel = `cannibal:${keyword}`;

    for (const pageId of uniqueIds) {
      await supabase
        .from("content_pages")
        .update({ cannibalization_group: groupLabel })
        .eq("id", pageId);
    }
  }

  revalidatePath("/dashboard/content");
  return { success: true, groups: groupCount };
}

// ─── Content Intelligence: Internal Link Suggestions ────────────────────────

/**
 * Suggest internal links between content pages using AI.
 */
export async function suggestInternalLinks(
  projectId: string
): Promise<{ error: string } | { success: true; suggestions: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: pages } = await supabase
    .from("content_pages")
    .select("id, url, title, primary_keyword, target_keywords")
    .eq("project_id", projectId)
    .limit(30);

  if (!pages || pages.length < 2) return { error: "Need at least 2 content pages for linking suggestions." };

  // Build page summary for AI
  const pageSummaries = pages.map((p) => ({
    id: p.id,
    url: p.url,
    title: p.title ?? "Untitled",
    keyword: p.primary_keyword ?? "",
  }));

  const prompt = `You are an internal linking SEO expert. Given these content pages, suggest internal links between them.

Pages:
${pageSummaries.map((p, i) => `${i + 1}. "${p.title}" (${p.url}) — targets: "${p.keyword}"`).join("\n")}

For each page, suggest 1-3 other pages it should link to, with anchor text suggestions.
Return a JSON array where each item is:
{"page_index": 1, "link_to_index": 3, "anchor_text": "suggested anchor"}

Return ONLY the JSON array.`;

  let suggestions: Array<{ page_index: number; link_to_index: number; anchor_text: string }> = [];

  try {
    const result = await aiChat(prompt, { temperature: 0.7, maxTokens: 1500 });
    if (result?.text) {
      const match = result.text.match(/\[[\s\S]*?\]/);
      if (match) suggestions = JSON.parse(match[0]);
    }
  } catch { /* AI is optional */ }

  // Heuristic fallback: suggest links based on keyword overlap
  if (suggestions.length === 0) {
    for (let i = 0; i < pageSummaries.length; i++) {
      const sourceKeywords = (pageSummaries[i].keyword + " " + pageSummaries[i].title).toLowerCase().split(/\s+/);
      for (let j = 0; j < pageSummaries.length; j++) {
        if (i === j) continue;
        const targetTitle = pageSummaries[j].title.toLowerCase();
        const overlap = sourceKeywords.filter((w) => w.length > 3 && targetTitle.includes(w));
        if (overlap.length >= 2) {
          suggestions.push({
            page_index: i + 1,
            link_to_index: j + 1,
            anchor_text: pageSummaries[j].title,
          });
        }
      }
    }
  }

  // Save suggestions to pages
  let totalSuggestions = 0;
  const pageLinksMap = new Map<string, Array<{ target_url: string; anchor_text: string }>>();

  for (const s of suggestions) {
    const sourceIdx = s.page_index - 1;
    const targetIdx = s.link_to_index - 1;
    if (sourceIdx < 0 || sourceIdx >= pageSummaries.length) continue;
    if (targetIdx < 0 || targetIdx >= pageSummaries.length) continue;

    const sourceId = pageSummaries[sourceIdx].id;
    const targetUrl = pageSummaries[targetIdx].url;

    if (!pageLinksMap.has(sourceId)) pageLinksMap.set(sourceId, []);
    pageLinksMap.get(sourceId)!.push({ target_url: targetUrl, anchor_text: s.anchor_text });
    totalSuggestions++;
  }

  for (const [pageId, links] of pageLinksMap) {
    await supabase
      .from("content_pages")
      .update({ suggested_internal_links: links })
      .eq("id", pageId);
  }

  revalidatePath("/dashboard/content");
  return { success: true, suggestions: totalSuggestions };
}

// ─── Content Calendar ───────────────────────────────────────────────────────

/**
 * Add a content calendar entry.
 */
export async function addCalendarEntry(
  projectId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const title = formData.get("title") as string;
  const targetKeyword = formData.get("target_keyword") as string;
  const targetDate = formData.get("target_date") as string;
  const notes = formData.get("notes") as string;

  if (!title?.trim()) return { error: "Title is required." };
  if (!targetDate) return { error: "Target date is required." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("content_calendar").insert({
    project_id: projectId,
    title: title.trim(),
    target_keyword: targetKeyword?.trim() || null,
    target_date: targetDate,
    notes: notes?.trim() || null,
    assigned_to: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/content");
  return { success: true };
}

/**
 * Update content calendar entry status.
 */
export async function updateCalendarEntryStatus(
  id: string,
  status: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const allowed = ["planned", "in_progress", "review", "published", "postponed"];
  if (!allowed.includes(status)) return { error: "Invalid status." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_calendar")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/content");
  return { success: true };
}

/**
 * Delete a content calendar entry.
 */
export async function deleteCalendarEntry(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("content_calendar").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/content");
  return { success: true };
}
