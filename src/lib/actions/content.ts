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
 * If no content pages exist, auto-populates them from the latest site audit.
 */
export async function scoreContentPages(
  projectId: string
): Promise<{ error: string } | { success: true; scored: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  let { data: pages } = await supabase
    .from("content_pages")
    .select("id, url, title, word_count, primary_keyword")
    .eq("project_id", projectId);

  // Auto-populate from latest site audit if no content pages exist
  if (!pages || pages.length === 0) {
    const { data: latestAudit } = await supabase
      .from("site_audits")
      .select("id")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAudit) {
      const { data: auditPages } = await supabase
        .from("audit_pages")
        .select("url, title, word_count, status_code")
        .eq("audit_id", latestAudit.id)
        .eq("status_code", 200);

      if (auditPages && auditPages.length > 0) {
        const rows = auditPages.map((ap) => ({
          project_id: projectId,
          url: ap.url,
          title: ap.title ?? null,
          word_count: ap.word_count ?? null,
          status: "published" as const,
        }));

        // Insert discovered pages (no existing pages, so no duplicates)
        await supabase.from("content_pages").insert(rows);

        // Re-fetch the newly created pages
        const { data: newPages } = await supabase
          .from("content_pages")
          .select("id, url, title, word_count, primary_keyword")
          .eq("project_id", projectId);

        pages = newPages;
      }
    }
  }

  if (!pages || pages.length === 0) return { error: "No content pages found. Run a Site Audit first to discover pages." };

  // Auto-assign primary_keyword using AI for pages that don't have one
  const pagesNeedingKeywords = pages.filter((p) => !p.primary_keyword);
  if (pagesNeedingKeywords.length > 0) {
    // Get project keywords to help AI assign the right ones
    const { data: projectKeywords } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .limit(50);

    const kwList = (projectKeywords ?? []).map((k) => k.keyword);

    // Batch pages for AI assignment (max 20 at a time)
    const batchSize = 20;
    for (let i = 0; i < pagesNeedingKeywords.length; i += batchSize) {
      const batch = pagesNeedingKeywords.slice(i, i + batchSize);
      const pageSummaries = batch.map((p, idx) => `${idx + 1}. URL: ${p.url} | Title: "${p.title ?? "Untitled"}"`).join("\n");

      let assignments: Array<{ index: number; keyword: string }> = [];

      try {
        const prompt = kwList.length > 0
          ? `Assign a primary target keyword to each content page. Use the project's tracked keywords when a good match exists, otherwise infer from the URL/title.

Project Keywords: ${kwList.join(", ")}

Pages:
${pageSummaries}

Return ONLY a JSON array: [{"index": 1, "keyword": "best keyword for this page"}, ...]`
          : `Infer the primary target keyword for each page based on its URL and title. Pick the most specific, search-intent-rich keyword phrase (2-4 words).

Pages:
${pageSummaries}

Return ONLY a JSON array: [{"index": 1, "keyword": "inferred keyword"}, ...]`;

        const result = await aiChat(prompt, { temperature: 0.3, maxTokens: 1000 });
        if (result?.text) {
          const match = result.text.match(/\[[\s\S]*\]/);
          if (match) assignments = JSON.parse(match[0]);
        }
      } catch { /* AI optional — fallback below */ }

      // Fallback: extract keyword from URL path
      if (assignments.length === 0) {
        assignments = batch.map((p, idx) => {
          const urlPath = new URL(p.url, "https://example.com").pathname;
          const slug = urlPath.split("/").filter(Boolean).pop() ?? "";
          const keyword = slug.replace(/[-_]/g, " ").replace(/\.\w+$/, "").trim() || p.title?.slice(0, 50) || "unknown";
          return { index: idx + 1, keyword };
        });
      }

      for (const a of assignments) {
        const page = batch[a.index - 1];
        if (!page || !a.keyword) continue;
        await supabase
          .from("content_pages")
          .update({ primary_keyword: a.keyword.toLowerCase().trim() })
          .eq("id", page.id);
        // Update local reference so scoring uses the keyword
        page.primary_keyword = a.keyword.toLowerCase().trim();
      }
    }
  }

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
    .select("id, url, title, word_count, content_score, last_modified, last_traffic, prev_traffic")
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

    // Content age (if last_modified exists)
    if (page.last_modified) {
      const lastUpdated = new Date(page.last_modified);
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

    // Also extract individual meaningful words and bigrams from title
    if (page.title) {
      const stopWords = new Set(["the", "and", "for", "with", "this", "that", "from", "your", "about", "what", "how", "best", "more", "into", "also", "been", "have", "will", "just", "than", "them", "then", "some", "when", "were", "like"]);
      const titleWords = page.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.has(w));
      // Create 2-word phrases from title
      for (let i = 0; i < titleWords.length - 1; i++) {
        keywords.push(`${titleWords[i]} ${titleWords[i + 1]}`);
      }
      // Also add individual meaningful words (for broader cannibalization detection)
      for (const w of titleWords) {
        if (w.length > 4) keywords.push(w);
      }
    }

    // Extract keyword from URL slug
    if (page.url) {
      try {
        const urlPath = new URL(page.url, "https://example.com").pathname;
        const slug = urlPath.split("/").filter(Boolean).pop() ?? "";
        const slugWords = slug.replace(/[-_]/g, " ").replace(/\.\w+$/, "").trim();
        if (slugWords.length > 3) keywords.push(slugWords);
      } catch { /* skip bad URLs */ }
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

  // Heuristic fallback: suggest links based on keyword/title/URL overlap
  if (suggestions.length === 0) {
    const stopWords = new Set(["the", "and", "for", "with", "this", "that", "from", "your", "about", "what", "how", "more", "into", "also", "have", "will", "just", "page", "home"]);
    for (let i = 0; i < pageSummaries.length; i++) {
      const sourceUrl = pageSummaries[i].url.toLowerCase();
      const sourceSlug = sourceUrl.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") ?? "";
      const sourceText = (pageSummaries[i].keyword + " " + pageSummaries[i].title + " " + sourceSlug).toLowerCase();
      const sourceWords = sourceText.split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
      const sourceWordsUnique = [...new Set(sourceWords)];

      for (let j = 0; j < pageSummaries.length; j++) {
        if (i === j) continue;
        const targetUrl = pageSummaries[j].url.toLowerCase();
        const targetSlug = targetUrl.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") ?? "";
        const targetText = (pageSummaries[j].keyword + " " + pageSummaries[j].title + " " + targetSlug).toLowerCase();
        const overlap = sourceWordsUnique.filter((w) => targetText.includes(w));
        if (overlap.length >= 1) {
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

// ─── Content Calendar Auto-Generation ───────────────────────────────────────

/**
 * Auto-generate content calendar entries from content briefs.
 * Creates a publishing schedule spread over the next 4 weeks.
 */
export async function generateCalendarEntries(
  projectId: string
): Promise<{ error: string } | { success: true; generated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Get content briefs that don't have calendar entries yet
  const { data: briefs } = await supabase
    .from("content_briefs")
    .select("id, target_keyword, title_suggestions, serp_intent")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!briefs || briefs.length === 0) return { error: "No content briefs to schedule." };

  // Get existing calendar entries to avoid duplicates
  const { data: existing } = await supabase
    .from("content_calendar")
    .select("target_keyword")
    .eq("project_id", projectId);

  const existingKeywords = new Set(
    (existing ?? []).map((e) => (e.target_keyword ?? "").toLowerCase())
  );

  const newBriefs = briefs.filter(
    (b) => !existingKeywords.has(b.target_keyword.toLowerCase())
  );

  if (newBriefs.length === 0) return { error: "Calendar entries already exist for all briefs." };

  // Spread entries across the next 4 weeks
  const now = new Date();
  let generated = 0;

  for (let i = 0; i < newBriefs.length; i++) {
    const brief = newBriefs[i];
    const daysOffset = 3 + Math.floor((i / newBriefs.length) * 28); // 3-31 days out
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysOffset);
    const dateStr = targetDate.toISOString().split("T")[0];

    const titles = brief.title_suggestions as string[] | null;
    const title = titles?.[0] ?? `Article: ${brief.target_keyword}`;
    const intent = brief.serp_intent ?? "informational";

    const { error } = await supabase.from("content_calendar").insert({
      project_id: projectId,
      title,
      target_keyword: brief.target_keyword,
      target_date: dateStr,
      status: "planned",
      assigned_to: user.id,
      notes: `Auto-generated from content brief. Search intent: ${intent}. Review and customize before publishing.`,
    });

    if (!error) generated++;
  }

  revalidatePath("/dashboard/content");
  return { success: true, generated };
}

// ─── Content Briefs Generation ──────────────────────────────────────────────

/**
 * Generate content briefs from the project's tracked keywords.
 * Uses AI to create title suggestions, outlines, and target metrics.
 */
/**
 * Update a content brief's fields.
 */
export async function updateContentBrief(
  briefId: string,
  updates: { status?: string; target_keyword?: string; target_word_count?: number }
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_briefs")
    .update(updates)
    .eq("id", briefId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/content");
  return { success: true };
}

/**
 * Delete a content brief by ID.
 */
export async function deleteContentBrief(
  briefId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("content_briefs")
    .delete()
    .eq("id", briefId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/content");
  return { success: true };
}

export async function generateContentBriefs(
  projectId: string
): Promise<{ error: string } | { success: true; generated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Get project keywords to base briefs on
  const { data: keywords } = await supabase
    .from("keywords")
    .select("keyword, search_volume, difficulty, current_position")
    .eq("project_id", projectId)
    .order("search_volume", { ascending: false, nullsFirst: false })
    .limit(10);

  if (!keywords || keywords.length === 0) return { error: "No keywords tracked. Generate keywords first." };

  // Check which keywords already have briefs
  const { data: existingBriefs } = await supabase
    .from("content_briefs")
    .select("target_keyword")
    .eq("project_id", projectId);

  const existingKeywords = new Set((existingBriefs ?? []).map((b) => b.target_keyword.toLowerCase()));
  const newKeywords = keywords.filter((k) => !existingKeywords.has(k.keyword.toLowerCase()));

  if (newKeywords.length === 0) return { error: "Briefs already exist for all tracked keywords." };

  // Generate briefs using AI
  const kwList = newKeywords.map((k) => `"${k.keyword}" (vol: ${k.search_volume ?? "?"}, diff: ${k.difficulty ?? "?"})`).join(", ");

  let aiBriefs: Array<{
    keyword: string;
    titles: string[];
    outline: string[];
    word_count: number;
    intent: string;
  }> = [];

  try {
    const result = await aiChat(
      `You are a content strategist. For each keyword below, generate a content brief.

Keywords: ${kwList}

For each keyword return:
- keyword: the keyword
- titles: 3 title suggestions (SEO-optimized, under 60 chars)
- outline: 4-6 section headings for the article
- word_count: recommended word count (800-3000)
- intent: search intent (informational, transactional, navigational, commercial)

Return ONLY a JSON array of objects.`,
      { temperature: 0.7, maxTokens: 2000 }
    );

    if (result?.text) {
      const match = result.text.match(/\[[\s\S]*\]/);
      if (match) aiBriefs = JSON.parse(match[0]);
    }
  } catch { /* AI optional */ }

  // Fallback: create basic briefs without AI
  if (aiBriefs.length === 0) {
    aiBriefs = newKeywords.map((k) => ({
      keyword: k.keyword,
      titles: [`${k.keyword}: Complete Guide`, `How to ${k.keyword}`, `${k.keyword} — Everything You Need to Know`],
      outline: ["Introduction", "Key Concepts", "Best Practices", "Examples", "Conclusion"],
      word_count: 1500,
      intent: "informational",
    }));
  }

  let generated = 0;

  for (const brief of aiBriefs) {
    const matchedKw = newKeywords.find((k) => k.keyword.toLowerCase() === brief.keyword.toLowerCase());
    if (!matchedKw) continue;

    const { error } = await supabase.from("content_briefs").insert({
      project_id: projectId,
      target_keyword: brief.keyword,
      title_suggestions: brief.titles ?? [],
      outline: brief.outline ?? [],
      target_word_count: brief.word_count ?? 1500,
      target_entities: [],
      serp_intent: brief.intent ?? "informational",
      competing_urls: [],
      status: "draft",
      created_by: user.id,
    });

    if (!error) generated++;
  }

  revalidatePath("/dashboard/content");
  return { success: true, generated };
}

// ─── Content Gap Analysis ───────────────────────────────────────────────────

/**
 * Detect content gaps — topics and keywords that competitors likely cover but you don't.
 * Uses AI to cross-reference your content, keywords, and competitor domains.
 */
export async function detectContentGaps(
  projectId: string
): Promise<
  | { error: string }
  | {
      success: true;
      gaps: Array<{
        topic: string;
        competitorsCovering: string[];
        trafficOpportunity: string;
        difficulty: number;
        priority: "high" | "medium" | "low";
        suggestedAction: string;
      }>;
    }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Fetch content pages for the project
    const { data: contentPages } = await supabase
      .from("content_pages")
      .select("title, url, primary_keyword")
      .eq("project_id", projectId)
      .limit(50);

    // Fetch tracked keywords
    const { data: keywords } = await supabase
      .from("keywords")
      .select("keyword, search_volume, difficulty, current_position")
      .eq("project_id", projectId)
      .limit(50);

    // Fetch competitors
    const { data: competitors } = await supabase
      .from("competitors")
      .select("domain, name")
      .eq("project_id", projectId);

    if (!competitors || competitors.length === 0) {
      return { error: "No competitors tracked. Add competitors first to find content gaps." };
    }

    const yourContent = (contentPages ?? [])
      .map((p) => `- "${p.title ?? "Untitled"}" (${p.url}) — keyword: "${p.primary_keyword ?? "none"}"`)
      .join("\n");

    const yourKeywords = (keywords ?? [])
      .map((k) => `"${k.keyword}" (vol: ${k.search_volume ?? "?"}, pos: ${k.current_position ?? "?"})`)
      .join(", ");

    const competitorList = competitors
      .map((c) => `- ${c.name} (${c.domain})`)
      .join("\n");

    const prompt = `You are an SEO content gap analyst. Identify content topics and keywords that the competitors likely cover but the user's site does NOT.

**Your existing content pages:**
${yourContent || "No content pages tracked yet."}

**Your tracked keywords:**
${yourKeywords || "No keywords tracked yet."}

**Competitors:**
${competitorList}

Analyze the competitive landscape and identify 8-12 content gaps — topics or keywords that the competitors likely rank for but are missing from the user's content.

For each gap, provide:
- topic: The topic or keyword phrase
- competitorsCovering: Array of competitor names that likely cover this topic
- trafficOpportunity: Estimated monthly traffic potential (e.g., "500-1,000")
- difficulty: Keyword difficulty (0-100)
- priority: "high", "medium", or "low" based on traffic opportunity vs difficulty
- suggestedAction: A specific recommendation (e.g., "Create a comprehensive guide on X", "Add a comparison page for Y")

Return ONLY valid JSON in this format:
{
  "gaps": [...]
}`;

    const result = await aiChat(prompt, {
      jsonMode: true,
      maxTokens: 2500,
      temperature: 0.5,
      context: { feature: "content-gap-analysis" },
    });

    if (!result?.text) return { error: "AI analysis returned no results." };

    const parsed = JSON.parse(result.text);

    revalidatePath("/dashboard/content");
    return {
      success: true,
      gaps: parsed.gaps ?? [],
    };
  } catch (err) {
    console.error("[detectContentGaps] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to detect content gaps.",
    };
  }
}
