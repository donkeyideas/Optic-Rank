import { createClient } from "@/lib/supabase/server";
import type { Profile, Organization } from "@/types";

/**
 * Get the current authenticated user's profile.
 * RLS ensures only the user's own profile (or same-org profiles) are visible.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

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
}

/**
 * Get the current user's organization.
 * Looks up the organization_id from the user's profile, then fetches the org.
 */
export async function getOrganization(): Promise<Organization | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return null;

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, logo_url, plan, stripe_customer_id, subscription_status, max_projects, max_keywords, max_pages_crawl, max_users, created_at"
    )
    .eq("id", profile.organization_id)
    .single();

  if (error || !data) return null;

  return data as Organization;
}
