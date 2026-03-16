"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { checkLLMVisibility } from "@/lib/ai/llm-visibility";

/**
 * Run LLM visibility checks for project keywords.
 * Queries each configured LLM to see if the brand/domain is mentioned.
 */
export async function runVisibilityCheck(
  projectId: string,
  keywordIds?: string[]
): Promise<{ error: string } | { success: true; checksRun: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Get project for brand/domain
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, domain")
      .eq("id", projectId)
      .single();

    if (!project?.domain) {
      return { error: "Project has no domain configured." };
    }

    const brand = project.name;
    const domain = project.domain;

    // Get keywords to check
    let keywordQuery = supabase
      .from("keywords")
      .select("id, keyword")
      .eq("project_id", projectId)
      .limit(20); // Limit to avoid excessive API calls

    if (keywordIds && keywordIds.length > 0) {
      keywordQuery = keywordQuery.in("id", keywordIds);
    }

    const { data: keywords } = await keywordQuery;
    if (!keywords || keywords.length === 0) {
      return { error: "No keywords found. Add keywords first." };
    }

    let totalChecks = 0;

    // Process keywords in batches of 3 to respect rate limits
    for (let i = 0; i < keywords.length; i += 3) {
      const batch = keywords.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map((kw) => checkLLMVisibility(kw.keyword, brand, domain, undefined, user.id))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status !== "fulfilled" || !result.value.data) continue;

        const visibility = result.value.data;
        const keywordId = batch[j].id;

        // Store each LLM result
        for (const check of visibility.results) {
          await supabase.from("ai_visibility_checks").insert({
            keyword_id: keywordId,
            llm_provider: check.llm_provider,
            query_text: check.query,
            response_text: check.response_excerpt,
            brand_mentioned: check.brand_mentioned,
            mention_position: check.mention_position,
            url_cited: check.url_cited,
            sentiment: check.sentiment,
            competitor_mentions: check.competitor_mentions,
          });
          totalChecks++;
        }

        // Update keyword visibility score
        await supabase
          .from("keywords")
          .update({
            ai_visibility_score: visibility.visibility_score,
            ai_visibility_count: visibility.label,
          })
          .eq("id", keywordId);
      }

      // Small delay between batches
      if (i + 3 < keywords.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    revalidatePath("/dashboard/ai-visibility");
    revalidatePath("/dashboard/keywords");
    return { success: true, checksRun: totalChecks };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to run visibility checks.",
    };
  }
}

/**
 * Run visibility check for a single keyword.
 */
export async function runSingleKeywordVisibilityCheck(
  keywordId: string,
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const result = await runVisibilityCheck(projectId, [keywordId]);
  if ("error" in result) return result;
  return { success: true };
}
