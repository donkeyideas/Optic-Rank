import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

interface OrgInvite {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  invited_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * Get all team members (profiles) in an organization.
 */
export async function getTeamMembers(orgId: string): Promise<Profile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, organization_id, full_name, avatar_url, role, system_role, onboarding_completed, timezone, created_at"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data as Profile[];
}

/**
 * Get pending (not yet accepted) organization invites.
 */
export async function getOrgInvites(orgId: string): Promise<OrgInvite[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_invites")
    .select(
      "id, organization_id, email, role, invited_by, accepted_at, expires_at, created_at"
    )
    .eq("organization_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as OrgInvite[];
}
