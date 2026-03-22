"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateProjectRecommendations } from "@/lib/ai/generate-recommendations";

/**
 * Generate smart recommendations for a project.
 * Analyzes all data sources and produces prioritized, actionable recommendations.
 */
export async function generateRecommendations(
  projectId: string
): Promise<{ error: string } | { success: true; generated: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    const recommendations = await generateProjectRecommendations(projectId);

    if (recommendations.length === 0) {
      return { error: "No recommendations could be generated. Add more data first." };
    }

    // Create batch ID to group this generation run
    const batchId = crypto.randomUUID();

    // Clear previous active (non-completed, non-dismissed) recommendations
    await supabase
      .from("recommendations")
      .delete()
      .eq("project_id", projectId)
      .eq("is_dismissed", false)
      .eq("is_completed", false);

    // Insert new recommendations
    const rows = recommendations.map((r) => ({
      project_id: projectId,
      category: r.category,
      title: r.title,
      description: r.description,
      expected_result: r.expected_result,
      impact: r.impact,
      effort: r.effort,
      priority_score: r.priority_score,
      data_sources: r.data_sources,
      linked_page: r.linked_page,
      linked_label: r.linked_label,
      metadata: r.metadata,
      is_ai_enhanced: false,
      batch_id: batchId,
    }));

    const { error } = await supabase.from("recommendations").insert(rows);
    if (error) return { error: error.message };

    revalidatePath("/dashboard/recommendations");
    revalidatePath("/dashboard");
    return { success: true, generated: rows.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to generate recommendations." };
  }
}

/**
 * Dismiss a recommendation so it no longer appears in the active list.
 */
export async function dismissRecommendation(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recommendations")
    .update({ is_dismissed: true })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/recommendations");
  return { success: true };
}

/**
 * Mark a recommendation as completed.
 */
export async function completeRecommendation(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recommendations")
    .update({ is_completed: true })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/recommendations");
  return { success: true };
}
