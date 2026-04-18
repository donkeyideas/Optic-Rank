import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type {
  SocialProfile,
  SocialMetric,
  SocialAnalysis,
  SocialAnalysisType,
  SocialCompetitor,
  SocialGoal,
} from "../types";

// ── Social Profiles ─────────────────────────────────────────────────────────

export function useSocialProfiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ["socialProfiles", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<SocialProfile[]> => {
      const { data, error } = await supabase
        .from("social_profiles")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });

      if (error) return [];
      return (data ?? []) as SocialProfile[];
    },
  });
}

// ── Social Metrics ──────────────────────────────────────────────────────────

export function useSocialMetrics(profileId: string | undefined, days = 30) {
  return useQuery({
    queryKey: ["socialMetrics", profileId, days],
    enabled: !!profileId,
    queryFn: async (): Promise<SocialMetric[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("social_metrics")
        .select("*")
        .eq("social_profile_id", profileId!)
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) return [];
      return (data ?? []) as SocialMetric[];
    },
  });
}

// ── Social Analysis ─────────────────────────────────────────────────────────

export function useSocialAnalysis(
  profileId: string | undefined,
  type: SocialAnalysisType
) {
  return useQuery({
    queryKey: ["socialAnalysis", profileId, type],
    enabled: !!profileId,
    queryFn: async (): Promise<SocialAnalysis | null> => {
      const { data, error } = await supabase
        .from("social_analyses")
        .select("*")
        .eq("social_profile_id", profileId!)
        .eq("analysis_type", type)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as SocialAnalysis | null;
    },
  });
}

// ── All Latest Analyses ─────────────────────────────────────────────────────

export function useAllSocialAnalyses(profileId: string | undefined) {
  return useQuery({
    queryKey: ["allSocialAnalyses", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<SocialAnalysis[]> => {
      const { data, error } = await supabase
        .from("social_analyses")
        .select("*")
        .eq("social_profile_id", profileId!)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data ?? []) as SocialAnalysis[];
    },
  });
}

// ── Social Competitors ──────────────────────────────────────────────────────

export function useSocialCompetitors(profileId: string | undefined) {
  return useQuery({
    queryKey: ["socialCompetitors", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<SocialCompetitor[]> => {
      const { data, error } = await supabase
        .from("social_competitors")
        .select("*")
        .eq("social_profile_id", profileId!)
        .order("followers_count", { ascending: false });

      if (error) return [];
      return (data ?? []) as SocialCompetitor[];
    },
  });
}

// ── Social Goals ────────────────────────────────────────────────────────────

export function useSocialGoal(profileId: string | undefined) {
  return useQuery({
    queryKey: ["socialGoal", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<SocialGoal | null> => {
      const { data, error } = await supabase
        .from("social_goals")
        .select("*")
        .eq("social_profile_id", profileId!)
        .eq("is_active", true)
        .maybeSingle();

      if (error) return null;
      return data as SocialGoal | null;
    },
  });
}
