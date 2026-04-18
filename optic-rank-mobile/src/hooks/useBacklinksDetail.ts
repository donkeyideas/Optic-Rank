import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Backlink } from "../types";

// ── Backlinks with Filters ──────────────────────────────────────────────────

export function useBacklinks(
  projectId: string | undefined,
  opts?: {
    search?: string;
    linkType?: "dofollow" | "nofollow" | "ugc" | "sponsored";
    status?: "active" | "lost" | "new";
    limit?: number;
    offset?: number;
  }
) {
  return useQuery({
    queryKey: ["backlinks", projectId, opts],
    enabled: !!projectId,
    queryFn: async (): Promise<{ data: Backlink[]; count: number }> => {
      const limit = opts?.limit ?? 50;
      const offset = opts?.offset ?? 0;

      let query = supabase
        .from("backlinks")
        .select(
          "id, project_id, source_url, source_domain, target_url, anchor_text, link_type, domain_authority, trust_flow, citation_flow, is_toxic, first_seen, last_seen, status",
          { count: "exact" }
        )
        .eq("project_id", projectId!);

      if (opts?.search) {
        query = query.or(
          `source_url.ilike.%${opts.search}%,source_domain.ilike.%${opts.search}%,anchor_text.ilike.%${opts.search}%`
        );
      }
      if (opts?.linkType) {
        query = query.eq("link_type", opts.linkType);
      }
      if (opts?.status) {
        query = query.eq("status", opts.status);
      }

      query = query
        .order("first_seen", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (error) return { data: [], count: 0 };
      return { data: (data ?? []) as Backlink[], count: count ?? 0 };
    },
  });
}

// ── Competitor Snapshots ────────────────────────────────────────────────────

export interface CompetitorSnapshot {
  id: string;
  competitor_id: string;
  authority_score: number | null;
  organic_traffic: number | null;
  keywords_count: number | null;
  backlinks_count: number | null;
  snapshot_date: string;
  created_at: string;
}

export function useCompetitorSnapshots(competitorId: string | undefined) {
  return useQuery({
    queryKey: ["competitorSnapshots", competitorId],
    enabled: !!competitorId,
    queryFn: async (): Promise<CompetitorSnapshot[]> => {
      const { data, error } = await supabase
        .from("competitor_snapshots")
        .select(
          "id, competitor_id, authority_score, organic_traffic, keywords_count, backlinks_count, snapshot_date, created_at"
        )
        .eq("competitor_id", competitorId!)
        .order("snapshot_date", { ascending: true });

      if (error) return [];
      return (data ?? []) as CompetitorSnapshot[];
    },
  });
}
