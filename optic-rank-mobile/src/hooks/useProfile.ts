import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { Profile, Organization } from "../types";

/**
 * Fetch the current authenticated user's profile from the `profiles` table.
 */
export function useProfile() {
  return useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, organization_id, full_name, avatar_url, role, system_role, onboarding_completed, timezone, created_at"
        )
        .eq("id", user.id)
        .single();

      if (error || !data) return null;

      return data as Profile;
    },
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch the current user's organization.
 * Uses the profile's organization_id to avoid a waterfall.
 */
export function useOrganization() {
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery<Organization | null>({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id, name, slug, logo_url, plan, stripe_customer_id, subscription_status, trial_ends_at, billing_provider, apple_original_transaction_id, apple_subscription_expires_at, max_projects, max_keywords, max_pages_crawl, max_users, created_at"
        )
        .eq("id", orgId)
        .single();

      if (error || !data) return null;

      return data as Organization;
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Fetch all team members (profiles) within the same organization.
 */
export function useTeamMembers(orgId: string | undefined) {
  return useQuery<Profile[]>({
    queryKey: ["teamMembers", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, organization_id, full_name, avatar_url, role, system_role, onboarding_completed, timezone, created_at"
        )
        .eq("organization_id", orgId);

      if (error || !data) return [];

      return data as Profile[];
    },
    enabled: !!orgId,
  });
}
