"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateKeywordSuggestions } from "@/lib/ai/generate-keywords";
import { estimateKeywordMetrics, estimateKeywordRank } from "@/lib/keywords/enrichment";
import { checkPlanLimit } from "@/lib/stripe/plan-gate";

/**
 * Enrich keywords with estimated metrics (volume, CPC, difficulty, intent)
 * and estimated rank positions. Called automatically after adding keywords.
 */
async function enrichKeywords(projectId: string) {
  const supabase = createAdminClient();

  // Get project domain for rank estimation
  const { data: project } = await supabase
    .from("projects")
    .select("domain")
    .eq("id", projectId)
    .single();

  const domain = project?.domain ?? null;

  // Get all keywords missing metrics
  const { data: keywords } = await supabase
    .from("keywords")
    .select("id, keyword, search_volume, difficulty, intent, current_position")
    .eq("project_id", projectId)
    .or("search_volume.is.null,difficulty.is.null,intent.is.null,current_position.is.null");

  if (!keywords || keywords.length === 0) return;

  for (const kw of keywords) {
    const metrics = estimateKeywordMetrics(kw.keyword);

    const updateData: Record<string, unknown> = {
      search_volume: kw.search_volume ?? metrics.search_volume,
      cpc: metrics.cpc,
      difficulty: kw.difficulty ?? metrics.difficulty,
      intent: kw.intent ?? metrics.intent,
    };

    // Estimate rank position if domain is available and no position yet
    if (domain && kw.current_position === null) {
      const rank = estimateKeywordRank(kw.keyword, domain);
      updateData.current_position = rank.position;
      // Note: serp_features column only exists on keyword_ranks, NOT on keywords table

      // Create a rank history entry (with serp_features)
      await supabase.from("keyword_ranks").insert({
        keyword_id: kw.id,
        position: rank.position,
        url: rank.url,
        serp_features: rank.serp_features,
      });
    }

    await supabase
      .from("keywords")
      .update(updateData)
      .eq("id", kw.id);
  }
}

/**
 * Add one or more keywords to track for a project.
 * Auto-enriches with estimated metrics.
 */
export async function addKeywords(
  projectId: string,
  keywords: string[]
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!keywords.length) return { error: "At least one keyword is required." };

  const uniqueKeywords = [
    ...new Set(keywords.map((k) => k.trim()).filter(Boolean)),
  ];

  const supabase = createAdminClient();

  // Check plan limit for keywords
  const { data: project } = await supabase
    .from("projects")
    .select("organization_id")
    .eq("id", projectId)
    .single();

  if (project?.organization_id) {
    const planCheck = await checkPlanLimit(project.organization_id, "keywords", uniqueKeywords.length);
    if (!planCheck.allowed) {
      return {
        error: `Keyword limit reached (${planCheck.current}/${planCheck.limit} on ${planCheck.plan} plan). Upgrade to add more keywords.`,
      };
    }
  }

  const rows = uniqueKeywords.map((keyword) => ({
    project_id: projectId,
    keyword,
    search_engine: "google",
    device: "desktop" as const,
    location: "US",
  }));
  const { error } = await supabase.from("keywords").upsert(rows, {
    onConflict: "project_id,keyword,search_engine,device,location",
    ignoreDuplicates: true,
  });

  if (error) return { error: error.message };

  // Auto-enrich with estimated metrics
  await enrichKeywords(projectId);

  revalidatePath("/dashboard/keywords");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Delete a keyword by ID.
 */
export async function deleteKeyword(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("keywords").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/keywords");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Get rank history for a keyword (server action for client-side calls).
 */
export async function getKeywordRankHistory(
  keywordId: string,
  days = 30
): Promise<{ date: string; position: number | null }[]> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return [];

  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("keyword_ranks")
    .select("position, checked_at")
    .eq("keyword_id", keywordId)
    .gte("checked_at", since.toISOString())
    .order("checked_at", { ascending: true });

  return (data ?? []).map((r) => ({
    date: r.checked_at,
    position: r.position,
  }));
}

/**
 * AI-generate keyword suggestions for a project.
 * Auto-enriches with estimated metrics after insertion.
 */
export async function generateKeywordsAI(
  projectId: string
): Promise<{ error: string } | { success: true; keywords: string[]; source: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Get the project domain
  const { data: project } = await supabase
    .from("projects")
    .select("domain")
    .eq("id", projectId)
    .single();

  if (!project?.domain) return { error: "Project has no domain configured." };

  // Get existing keywords to avoid duplicates
  const { data: existing } = await supabase
    .from("keywords")
    .select("keyword")
    .eq("project_id", projectId);

  const existingKeywords = (existing ?? []).map((k) => k.keyword);

  // Generate suggestions
  const result = await generateKeywordSuggestions(
    project.domain,
    existingKeywords,
    20
  );

  if (result.keywords.length === 0) {
    return { error: "Could not generate keyword suggestions." };
  }

  // Insert the generated keywords
  const rows = result.keywords.map((keyword) => ({
    project_id: projectId,
    keyword,
    search_engine: "google",
    device: "desktop" as const,
    location: "US",
  }));

  const { error } = await supabase.from("keywords").upsert(rows, {
    onConflict: "project_id,keyword,search_engine,device,location",
    ignoreDuplicates: true,
  });

  if (error) return { error: error.message };

  // Auto-enrich with estimated metrics
  await enrichKeywords(projectId);

  revalidatePath("/dashboard/keywords");
  revalidatePath("/dashboard");
  return { success: true, keywords: result.keywords, source: result.source };
}

/**
 * Import keywords from a CSV file.
 * Auto-enriches with estimated metrics after import.
 */
export async function importKeywordsCSV(
  projectId: string,
  formData: FormData
): Promise<{ error: string } | { success: true; imported: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file uploaded." };

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length === 0) return { error: "CSV file is empty." };

  const header = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim().replace(/"/g, ""));
  const keywordIndex = header.indexOf("keyword");
  const dataStartIndex = keywordIndex >= 0 ? 1 : 0;
  const colIndex = keywordIndex >= 0 ? keywordIndex : 0;

  const keywords: string[] = [];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const kw = cols[colIndex];
    if (kw) keywords.push(kw);
  }

  if (keywords.length === 0) return { error: "No keywords found in the CSV file." };

  const uniqueKeywords = [...new Set(keywords)];

  const rows = uniqueKeywords.map((keyword) => ({
    project_id: projectId,
    keyword,
    search_engine: "google",
    device: "desktop" as const,
    location: "US",
  }));

  const supabase = createAdminClient();
  const { error } = await supabase.from("keywords").upsert(rows, {
    onConflict: "project_id,keyword,search_engine,device,location",
    ignoreDuplicates: true,
  });

  if (error) return { error: error.message };

  // Auto-enrich with estimated metrics
  await enrichKeywords(projectId);

  revalidatePath("/dashboard/keywords");
  revalidatePath("/dashboard");
  return { success: true, imported: uniqueKeywords.length };
}

/**
 * Manually trigger keyword enrichment for a project.
 */
export async function enrichProjectKeywords(
  projectId: string
): Promise<{ error: string } | { success: true; enriched: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: keywords } = await supabase
    .from("keywords")
    .select("id, keyword")
    .eq("project_id", projectId);

  if (!keywords || keywords.length === 0) return { error: "No keywords to enrich." };

  for (const kw of keywords) {
    const metrics = estimateKeywordMetrics(kw.keyword);
    await supabase
      .from("keywords")
      .update({
        search_volume: metrics.search_volume,
        cpc: metrics.cpc,
        difficulty: metrics.difficulty,
        intent: metrics.intent,
      })
      .eq("id", kw.id);
  }

  revalidatePath("/dashboard/keywords");
  revalidatePath("/dashboard");
  return { success: true, enriched: keywords.length };
}
