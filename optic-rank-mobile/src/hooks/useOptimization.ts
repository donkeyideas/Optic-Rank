import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { GeoScore, ConversionGoal } from "../types";

// ── GEO Statistics ──────────────────────────────────────────────────────────

export interface GeoStats {
  avgGeoScore: number;
  avgEntityScore: number;
  avgStructureScore: number;
  avgSchemaScore: number;
  avgCitationScore: number;
  totalPages: number;
}

export function useGeoStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ["geoStats", projectId],
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<GeoStats> => {
      const { data, error } = await supabase
        .from("geo_scores")
        .select("geo_score, entity_score, structure_score, schema_score, ai_citation_score")
        .eq("project_id", projectId!);

      if (error || !data || data.length === 0) {
        return { avgGeoScore: 0, avgEntityScore: 0, avgStructureScore: 0, avgSchemaScore: 0, avgCitationScore: 0, totalPages: 0 };
      }

      const n = data.length;
      return {
        avgGeoScore: Math.round(data.reduce((s, d) => s + (d.geo_score ?? 0), 0) / n),
        avgEntityScore: Math.round(data.reduce((s, d) => s + (d.entity_score ?? 0), 0) / n),
        avgStructureScore: Math.round(data.reduce((s, d) => s + (d.structure_score ?? 0), 0) / n),
        avgSchemaScore: Math.round(data.reduce((s, d) => s + (d.schema_score ?? 0), 0) / n),
        avgCitationScore: Math.round(data.reduce((s, d) => s + (d.ai_citation_score ?? 0), 0) / n),
        totalPages: n,
      };
    },
  });
}

// ── GEO Scores by Page ──────────────────────────────────────────────────────

export interface GeoPageScore extends GeoScore {
  content_pages: { url: string; title: string } | null;
}

export function useGeoScoresByPage(projectId: string | undefined) {
  return useQuery({
    queryKey: ["geoScoresByPage", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<GeoPageScore[]> => {
      const { data, error } = await supabase
        .from("geo_scores")
        .select("*, content_pages!inner(url, title)")
        .eq("project_id", projectId!)
        .order("geo_score", { ascending: false });

      if (error) return [];
      return (data ?? []) as GeoPageScore[];
    },
  });
}

// ── AEO Keywords Data ───────────────────────────────────────────────────────

export function useAeoKeywords(projectId: string | undefined) {
  return useQuery({
    queryKey: ["aeoKeywords", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: keywords } = await supabase
        .from("keywords")
        .select("id, keyword, search_volume, cpc, current_position, intent, ai_visibility_score, ai_visibility_count")
        .eq("project_id", projectId!)
        .eq("is_active", true)
        .order("search_volume", { ascending: false, nullsFirst: false });

      return keywords ?? [];
    },
  });
}

// ── Schema Audit Data ───────────────────────────────────────────────────────

export interface SchemaAuditStats {
  totalPages: number;
  withSchema: number;
  withoutSchema: number;
  coveragePct: number;
}

export function useSchemaAudit(projectId: string | undefined) {
  return useQuery({
    queryKey: ["schemaAudit", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<SchemaAuditStats> => {
      const { data: audit } = await supabase
        .from("site_audits")
        .select("id")
        .eq("project_id", projectId!)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!audit) return { totalPages: 0, withSchema: 0, withoutSchema: 0, coveragePct: 0 };

      const { data: pages } = await supabase
        .from("audit_pages")
        .select("has_schema")
        .eq("audit_id", audit.id);

      const all = pages ?? [];
      const withSchema = all.filter((p) => p.has_schema).length;
      return {
        totalPages: all.length,
        withSchema,
        withoutSchema: all.length - withSchema,
        coveragePct: all.length > 0 ? Math.round((withSchema / all.length) * 100) : 0,
      };
    },
  });
}

// ── Conversion Goals (CRO) ─────────────────────────────────────────────────

export function useConversionGoals(projectId: string | undefined) {
  return useQuery({
    queryKey: ["conversionGoals", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ConversionGoal[]> => {
      const { data, error } = await supabase
        .from("conversion_goals")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data ?? []) as ConversionGoal[];
    },
  });
}

// ── Keywords with Revenue (CRO) ────────────────────────────────────────────

export interface KeywordWithRevenue {
  id: string;
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  current_position: number | null;
  intent: string | null;
  estimated_traffic: number;
  estimated_revenue: number;
}

export function useKeywordsWithRevenue(projectId: string | undefined) {
  return useQuery({
    queryKey: ["keywordsWithRevenue", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<KeywordWithRevenue[]> => {
      const { data, error } = await supabase
        .from("keywords")
        .select("id, keyword, search_volume, cpc, current_position, intent")
        .eq("project_id", projectId!)
        .eq("is_active", true)
        .not("current_position", "is", null)
        .order("search_volume", { ascending: false, nullsFirst: false })
        .limit(200);

      if (error) return [];

      // CTR estimates by position
      const ctrByPos: Record<number, number> = {
        1: 0.316, 2: 0.241, 3: 0.186, 4: 0.131, 5: 0.095,
        6: 0.062, 7: 0.044, 8: 0.034, 9: 0.031, 10: 0.028,
      };

      return (data ?? []).map((k) => {
        const pos = k.current_position ?? 100;
        const ctr = ctrByPos[Math.min(pos, 10)] ?? 0.01;
        const traffic = Math.round((k.search_volume ?? 0) * ctr);
        const revenue = Math.round(traffic * (k.cpc ?? 0));
        return { ...k, estimated_traffic: traffic, estimated_revenue: revenue };
      });
    },
  });
}
