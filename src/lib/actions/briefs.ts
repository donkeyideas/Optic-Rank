"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateSEOBrief } from "@/lib/ai/generate-brief";

/**
 * Generate a comprehensive AI intelligence brief for a project.
 */
export async function generateBrief(
  projectId: string,
  briefType: "daily" | "weekly" | "monthly" | "on_demand" = "on_demand"
): Promise<{ error: string } | { success: true; briefId: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    const brief = await generateSEOBrief(projectId, briefType);

    if (!brief) {
      return { error: "Failed to generate brief. Ensure an AI provider (DeepSeek) is configured." };
    }

    const { data, error } = await supabase
      .from("ai_briefs")
      .insert({
        project_id: projectId,
        title: brief.title,
        summary: brief.summary,
        sections: brief.sections,
        brief_type: briefType,
        data_snapshot: brief.dataSnapshot,
        generated_by: "deepseek",
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

    revalidatePath("/dashboard/ai-briefs");
    revalidatePath("/dashboard/advanced-ai");

    // Push notification: brief ready
    try {
      const { sendPushToUser } = await import("@/lib/notifications/push");
      await sendPushToUser(user.id, {
        title: "AI Brief Ready",
        message: `Your ${briefType} intelligence brief has been generated.`,
        type: "brief.generated",
        actionUrl: "/dashboard/advanced-ai/ai-briefs",
      });
    } catch { /* push is best-effort */ }

    return { success: true, briefId: data.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to generate brief.",
    };
  }
}

/**
 * Delete a brief.
 */
export async function deleteBrief(
  briefId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("ai_briefs").delete().eq("id", briefId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/ai-briefs");
  return { success: true };
}
