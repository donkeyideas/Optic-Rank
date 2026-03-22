/**
 * AI Context Retrieval — fetches relevant past interactions
 * to inject as context into new AI calls, enabling the system
 * to learn from and build upon previous analyses.
 *
 * Learning modes:
 * 1. Project-specific: When project_id is provided, fetches context scoped to that project
 * 2. Feature-wide: When only feature is provided, fetches recent successful interactions
 *    for that feature across the platform (useful for ASO, optimizer, etc.)
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface PastInteraction {
  response_summary: string;
  feature: string;
  sub_type: string | null;
  created_at: string;
}

/**
 * Get recent successful interactions for a feature, optionally scoped to a project.
 * Returns truncated response summaries to avoid token bloat.
 */
export async function getRelevantContext(
  feature: string,
  options: { projectId?: string; subType?: string; limit?: number } = {}
): Promise<PastInteraction[]> {
  const { projectId, subType, limit = 3 } = options;
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("ai_interactions")
      .select("response_text, feature, sub_type, created_at")
      .eq("feature", feature)
      .eq("is_success", true)
      .not("response_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) query = query.eq("project_id", projectId);
    if (subType) query = query.eq("sub_type", subType);

    const { data } = await query;

    if (!data || data.length === 0) return [];

    return data.map((row) => ({
      response_summary: (row.response_text ?? "").slice(0, 500),
      feature: row.feature,
      sub_type: row.sub_type,
      created_at: row.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Build a context block for injection into prompts.
 * Returns a formatted string or empty string if no context exists.
 *
 * Works with or without project_id — always learns from past feature interactions.
 */
export async function buildContextBlock(
  feature: string,
  options: { projectId?: string; subType?: string; limit?: number } = {}
): Promise<string> {
  const context = await getRelevantContext(feature, options);
  if (context.length === 0) return "";

  const entries = context.map((c) => {
    const date = new Date(c.created_at).toLocaleDateString();
    const type = c.sub_type ? ` (${c.sub_type})` : "";
    return `--- Previous ${c.feature}${type} from ${date} ---\n${c.response_summary}`;
  });

  return `\n\n=== CONTEXT FROM PREVIOUS ANALYSES ===\nThe following are summaries of previous analyses. Use them to provide more informed, consistent, and progressive recommendations. Avoid repeating the exact same outputs — build upon them.\n\n${entries.join("\n\n")}\n=== END CONTEXT ===\n`;
}
