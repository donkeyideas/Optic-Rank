import { createClient } from "@/lib/supabase/server";
import type { Entity, EntityMention } from "@/types";

export interface EntityStats {
  total: number;
  byType: Record<string, number>;
  avgRelevance: number;
  topType: string | null;
}

export interface EntityWithMentions extends Entity {
  mention_count: number;
}

/**
 * Get entities for a project with optional type filter.
 */
export async function getEntities(
  projectId: string,
  options?: { type?: string; limit?: number }
): Promise<Entity[]> {
  try {
    const supabase = await createClient();
    let query = supabase
      .from("entities")
      .select("*")
      .eq("project_id", projectId)
      .order("relevance_score", { ascending: false, nullsFirst: false });

    if (options?.type) {
      query = query.eq("entity_type", options.type);
    }

    const { data } = await query.limit(options?.limit ?? 200);
    return (data ?? []) as Entity[];
  } catch {
    return [];
  }
}

/**
 * Get entity statistics for a project.
 */
export async function getEntityStats(
  projectId: string
): Promise<EntityStats> {
  try {
    const supabase = await createClient();
    const { data: entities } = await supabase
      .from("entities")
      .select("entity_type, relevance_score")
      .eq("project_id", projectId);

    if (!entities || entities.length === 0) {
      return { total: 0, byType: {}, avgRelevance: 0, topType: null };
    }

    const byType: Record<string, number> = {};
    let relevanceSum = 0;
    let relevanceCount = 0;

    for (const e of entities) {
      byType[e.entity_type] = (byType[e.entity_type] ?? 0) + 1;
      if (e.relevance_score != null) {
        relevanceSum += Number(e.relevance_score);
        relevanceCount++;
      }
    }

    // Find top type
    let topType: string | null = null;
    let topCount = 0;
    for (const [type, count] of Object.entries(byType)) {
      if (count > topCount) {
        topCount = count;
        topType = type;
      }
    }

    return {
      total: entities.length,
      byType,
      avgRelevance: relevanceCount > 0 ? Math.round(relevanceSum / relevanceCount) : 0,
      topType,
    };
  } catch {
    return { total: 0, byType: {}, avgRelevance: 0, topType: null };
  }
}

/**
 * Get entity mentions — pages where an entity appears.
 */
export async function getEntityMentions(
  entityId: string
): Promise<Array<EntityMention & { page_title: string; page_url: string }>> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("entity_mentions")
      .select("*, content_pages(title, url)")
      .eq("entity_id", entityId);

    if (!data) return [];

    return data.map((m: Record<string, unknown>) => {
      const page = m.content_pages as Record<string, unknown> | null;
      return {
        id: m.id as string,
        entity_id: m.entity_id as string,
        content_page_id: m.content_page_id as string,
        mention_count: m.mention_count as number,
        context_snippet: m.context_snippet as string | null,
        page_title: (page?.title as string) ?? "Unknown",
        page_url: (page?.url as string) ?? "",
      };
    });
  } catch {
    return [];
  }
}

/**
 * Get entity coverage per content page.
 */
export async function getEntityCoverage(
  projectId: string
): Promise<Array<{ page_id: string; page_title: string; page_url: string; entity_count: number; entity_coverage: number }>> {
  try {
    const supabase = await createClient();
    const { data: pages } = await supabase
      .from("content_pages")
      .select("id, title, url, entity_coverage")
      .eq("project_id", projectId);

    if (!pages) return [];

    // Count entities per page
    const pageIds = pages.map((p) => p.id);
    const { data: mentions } = await supabase
      .from("entity_mentions")
      .select("content_page_id")
      .in("content_page_id", pageIds);

    const countMap = new Map<string, number>();
    for (const m of mentions ?? []) {
      countMap.set(m.content_page_id, (countMap.get(m.content_page_id) ?? 0) + 1);
    }

    return pages.map((p) => ({
      page_id: p.id,
      page_title: p.title ?? "Untitled",
      page_url: p.url ?? "",
      entity_count: countMap.get(p.id) ?? 0,
      entity_coverage: Number(p.entity_coverage ?? 0),
    }));
  } catch {
    return [];
  }
}
