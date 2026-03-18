import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SocialProfile,
  SocialMetric,
  SocialAnalysis,
  SocialAnalysisType,
  SocialCompetitor,
  SocialGoal,
} from "@/types";

/* ------------------------------------------------------------------
   Social Profiles
   ------------------------------------------------------------------ */

export async function getSocialProfiles(
  projectId: string
): Promise<SocialProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_profiles")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []) as SocialProfile[];
}

export async function getSocialProfileById(
  profileId: string
): Promise<SocialProfile | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("social_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();
  return data as SocialProfile | null;
}

/* ------------------------------------------------------------------
   Social Metrics (daily snapshots)
   ------------------------------------------------------------------ */

export async function getSocialMetrics(
  profileId: string,
  days: number = 30
): Promise<SocialMetric[]> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("social_metrics")
    .select("*")
    .eq("social_profile_id", profileId)
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: true });
  return (data ?? []) as SocialMetric[];
}

/* ------------------------------------------------------------------
   Social Analyses (AI-generated, cached)
   ------------------------------------------------------------------ */

export async function getLatestAnalysis(
  profileId: string,
  type: SocialAnalysisType
): Promise<SocialAnalysis | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("social_analyses")
    .select("*")
    .eq("social_profile_id", profileId)
    .eq("analysis_type", type)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as SocialAnalysis | null;
}

export async function getAllLatestAnalyses(
  profileId: string
): Promise<SocialAnalysis[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("social_analyses")
    .select("*")
    .eq("social_profile_id", profileId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false });

  // Deduplicate: keep only the latest per analysis_type
  const seen = new Set<string>();
  const unique: SocialAnalysis[] = [];
  for (const row of (data ?? []) as SocialAnalysis[]) {
    if (!seen.has(row.analysis_type)) {
      seen.add(row.analysis_type);
      unique.push(row);
    }
  }
  return unique;
}

/* ------------------------------------------------------------------
   Social Competitors
   ------------------------------------------------------------------ */

export async function getSocialCompetitors(
  profileId: string
): Promise<SocialCompetitor[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("social_competitors")
    .select("*")
    .eq("social_profile_id", profileId)
    .order("followers_count", { ascending: false });
  return (data ?? []) as SocialCompetitor[];
}

/* ------------------------------------------------------------------
   Aggregate helpers
   ------------------------------------------------------------------ */

/* ------------------------------------------------------------------
   Social Goals
   ------------------------------------------------------------------ */

export async function getSocialGoals(
  profileId: string
): Promise<SocialGoal | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .eq("is_active", true)
    .maybeSingle();
  return data as SocialGoal | null;
}

/* ------------------------------------------------------------------
   Aggregate helpers
   ------------------------------------------------------------------ */

export async function getSocialProfileCount(
  projectId: string
): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("social_profiles")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  return count ?? 0;
}
