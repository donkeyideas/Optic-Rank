"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateProjectInsights } from "@/lib/ai/generate-insights";

/**
 * Dismiss an AI insight so it no longer appears in the active list.
 */
export async function dismissInsight(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_insights")
    .update({ is_dismissed: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ai-insights");
  return { success: true };
}

/**
 * Mark an AI insight as read.
 */
export async function markInsightRead(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ai_insights")
    .update({ is_read: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ai-insights");
  return { success: true };
}

/**
 * Generate new AI insights for a project.
 * Analyzes keywords, backlinks, audits, and content to produce actionable insights.
 */
export async function generateInsightsForProject(
  projectId: string
): Promise<{ error: string } | { success: true; generated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    const insights = await generateProjectInsights(projectId);

    if (insights.length === 0) {
      return { error: "No insights could be generated. Add more data first." };
    }

    // Skip duplicates by checking existing active titles
    const { data: existing } = await supabase
      .from("ai_insights")
      .select("title")
      .eq("project_id", projectId)
      .eq("is_dismissed", false);

    const existingTitles = new Set((existing ?? []).map((i) => i.title));

    const newInsights = insights
      .filter((i) => !existingTitles.has(i.title))
      .map((i) => ({
        project_id: projectId,
        type: i.type,
        title: i.title,
        description: i.description,
        priority: i.priority,
        revenue_impact: i.revenue_impact ?? null,
        action_label: i.action_label ?? null,
        action_url: i.action_url ?? null,
      }));

    if (newInsights.length > 0) {
      const { error } = await supabase.from("ai_insights").insert(newInsights);
      if (error) return { error: error.message };
    }

    revalidatePath("/dashboard/ai-insights");
    revalidatePath("/dashboard");
    return { success: true, generated: newInsights.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to generate insights." };
  }
}
