import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AIBrief } from "../types";

// ── AI Briefs ───────────────────────────────────────────────────────────────

export function useBriefs(
  projectId: string | undefined,
  type?: "daily" | "weekly" | "monthly" | "on_demand"
) {
  return useQuery({
    queryKey: ["briefs", projectId, type],
    enabled: !!projectId,
    queryFn: async (): Promise<AIBrief[]> => {
      let query = supabase
        .from("ai_briefs")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (type) {
        query = query.eq("brief_type", type);
      }

      const { data, error } = await query;
      if (error) return [];
      return (data ?? []) as AIBrief[];
    },
  });
}

// ── Latest Brief ────────────────────────────────────────────────────────────

export function useLatestBrief(projectId: string | undefined) {
  return useQuery({
    queryKey: ["latestBrief", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<AIBrief | null> => {
      const { data, error } = await supabase
        .from("ai_briefs")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as AIBrief | null;
    },
  });
}

// ── Brief by ID ─────────────────────────────────────────────────────────────

export function useBriefById(briefId: string | undefined) {
  return useQuery({
    queryKey: ["brief", briefId],
    enabled: !!briefId,
    queryFn: async (): Promise<AIBrief | null> => {
      const { data, error } = await supabase
        .from("ai_briefs")
        .select("*")
        .eq("id", briefId!)
        .single();

      if (error) return null;
      return data as AIBrief;
    },
  });
}
