import { createClient } from "@/lib/supabase/server";
import type { AIBrief } from "@/types";

/**
 * Get briefs for a project, ordered by most recent.
 */
export async function getBriefs(
  projectId: string,
  options?: { type?: string; limit?: number }
): Promise<AIBrief[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("ai_briefs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (options?.type) {
      query = query.eq("brief_type", options.type);
    }

    const { data } = await query.limit(options?.limit ?? 20);
    return (data ?? []) as AIBrief[];
  } catch {
    return [];
  }
}

/**
 * Get the most recent brief for a project.
 */
export async function getLatestBrief(
  projectId: string
): Promise<AIBrief | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ai_briefs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data as AIBrief) ?? null;
  } catch {
    return null;
  }
}

/**
 * Get a single brief by ID.
 */
export async function getBriefById(
  briefId: string
): Promise<AIBrief | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ai_briefs")
      .select("*")
      .eq("id", briefId)
      .single();

    return (data as AIBrief) ?? null;
  } catch {
    return null;
  }
}
