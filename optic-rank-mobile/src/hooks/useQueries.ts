import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

// ---------------------------------------------------------------------------
// App Store — Snapshots (for Visibility + Update Impact)
// ---------------------------------------------------------------------------

export function useAppStoreSnapshots(listingIds: string[]) {
  return useQuery({
    queryKey: ["appStoreSnapshots", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_store_snapshots")
        .select("*")
        .in("listing_id", listingIds)
        .order("captured_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// App Store — Versions (for Update Impact)
// ---------------------------------------------------------------------------

export function useAppStoreVersions(listingIds: string[]) {
  return useQuery({
    queryKey: ["appStoreVersions", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_store_versions")
        .select("*")
        .in("listing_id", listingIds)
        .order("released_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// App Store — Localizations
// ---------------------------------------------------------------------------

export function useAppStoreLocalizations(listingIds: string[]) {
  return useQuery({
    queryKey: ["appStoreLocalizations", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_store_localizations")
        .select("*")
        .in("listing_id", listingIds)
        .order("country_code", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// App Store — Review Topics
// ---------------------------------------------------------------------------

export function useAppStoreReviewTopics(listingIds: string[]) {
  return useQuery({
    queryKey: ["appStoreReviewTopics", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_store_review_topics")
        .select("*")
        .in("listing_id", listingIds)
        .order("mention_count", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Social Intelligence — Analyses (AI results)
// ---------------------------------------------------------------------------

export function useSocialAnalyses(profileId: string | undefined) {
  return useQuery({
    queryKey: ["socialAnalyses", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_analyses")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Social Intelligence — Competitors
// ---------------------------------------------------------------------------

export function useSocialCompetitors(profileId: string | undefined) {
  return useQuery({
    queryKey: ["socialCompetitors", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_competitors")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Social Intelligence — Metrics (daily snapshots)
// ---------------------------------------------------------------------------

export function useSocialMetricsHistory(profileId: string | undefined) {
  return useQuery({
    queryKey: ["socialMetricsHistory", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_metrics")
        .select("*")
        .eq("profile_id", profileId!)
        .order("captured_at", { ascending: false })
        .limit(90);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Social Intelligence — Goals
// ---------------------------------------------------------------------------

export function useSocialGoals(profileId: string | undefined) {
  return useQuery({
    queryKey: ["socialGoals", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_goals")
        .select("*")
        .eq("profile_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export function useRecommendations(projectId: string | undefined) {
  return useQuery({
    queryKey: ["recommendations", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("project_id", projectId!)
        .eq("is_dismissed", false)
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Team Members (for Settings)
// ---------------------------------------------------------------------------

export function useTeamMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: ["teamMembers", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_url, created_at, last_sign_in_at")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Organization Invites (for Settings)
// ---------------------------------------------------------------------------

export function useOrgInvites(orgId: string | undefined) {
  return useQuery({
    queryKey: ["orgInvites", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// User API Keys (for Settings)
// ---------------------------------------------------------------------------

export function useUserApiKeys(orgId: string | undefined) {
  return useQuery({
    queryKey: ["userApiKeys", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("id, name, key_prefix, scopes, expires_at, last_used_at, is_active, created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Billing Events (for Settings)
// ---------------------------------------------------------------------------

export function useBillingEvents(orgId: string | undefined) {
  return useQuery({
    queryKey: ["billingEvents", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_events")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Integration Settings (for Settings)
// ---------------------------------------------------------------------------

export function useIntegrationSettings(orgId: string | undefined) {
  return useQuery({
    queryKey: ["integrationSettings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_settings")
        .select("*")
        .eq("organization_id", orgId!)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data ?? null;
    },
  });
}

// ---------------------------------------------------------------------------
// Optimization Data (for Search AI tabs)
// ---------------------------------------------------------------------------

export function useSnippetOpportunities(projectId: string | undefined) {
  return useQuery({
    queryKey: ["snippetOpportunities", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keywords")
        .select("id, keyword, current_position, search_volume, serp_features")
        .eq("project_id", projectId!)
        .not("serp_features", "is", null)
        .order("search_volume", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useKeywordsWithRevenue(projectId: string | undefined) {
  return useQuery({
    queryKey: ["keywordsWithRevenue", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keywords")
        .select("id, keyword, current_position, search_volume, cpc, intent, difficulty")
        .eq("project_id", projectId!)
        .not("cpc", "is", null)
        .order("cpc", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}
