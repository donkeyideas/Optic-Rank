import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Entity, EntityMention, EntityType } from "../types";

// ── Entities ────────────────────────────────────────────────────────────────

export function useEntities(
  projectId: string | undefined,
  type?: EntityType
) {
  return useQuery({
    queryKey: ["entities", projectId, type],
    enabled: !!projectId,
    queryFn: async (): Promise<Entity[]> => {
      let query = supabase
        .from("entities")
        .select("*")
        .eq("project_id", projectId!)
        .order("relevance_score", { ascending: false, nullsFirst: false })
        .limit(200);

      if (type) {
        query = query.eq("entity_type", type);
      }

      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as Entity[];
    },
  });
}

// ── Entity Statistics ───────────────────────────────────────────────────────

export interface EntityStats {
  total: number;
  byType: Record<string, number>;
  avgRelevance: number;
}

export function useEntityStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ["entityStats", projectId],
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<EntityStats> => {
      const { data, error } = await supabase
        .from("entities")
        .select("entity_type, relevance_score")
        .eq("project_id", projectId!);

      if (error || !data) return { total: 0, byType: {}, avgRelevance: 0 };

      const byType: Record<string, number> = {};
      let totalRelevance = 0;
      for (const e of data) {
        byType[e.entity_type] = (byType[e.entity_type] ?? 0) + 1;
        totalRelevance += e.relevance_score ?? 0;
      }

      return {
        total: data.length,
        byType,
        avgRelevance:
          data.length > 0 ? Math.round(totalRelevance / data.length) : 0,
      };
    },
  });
}

// ── Entity Mentions ─────────────────────────────────────────────────────────

export interface EntityMentionWithPage extends EntityMention {
  content_pages?: { title: string; url: string } | null;
}

export function useEntityMentions(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entityMentions", entityId],
    enabled: !!entityId,
    queryFn: async (): Promise<EntityMentionWithPage[]> => {
      const { data, error } = await supabase
        .from("entity_mentions")
        .select("*, content_pages(title, url)")
        .eq("entity_id", entityId!);

      if (error) return [];
      return (data ?? []) as EntityMentionWithPage[];
    },
  });
}
