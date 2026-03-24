"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/* ------------------------------------------------------------------
   Helper: verify caller is admin/superadmin
   ------------------------------------------------------------------ */
async function requireAdminCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, admin: null, userId: null };

  const admin = createAdminClient();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (
    callerProfile?.system_role !== "superadmin" &&
    callerProfile?.system_role !== "admin"
  ) {
    return { error: "Unauthorized" as const, admin: null, userId: null };
  }

  return { error: null, admin, userId: user.id };
}

/**
 * Fetch detailed KPIs for a single user (admin only).
 */
export async function getUserDetails(userId: string) {
  const { error, admin } = await requireAdminCaller();
  if (error || !admin) return { error: error ?? "Unauthorized" };

  // Fetch profile
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, full_name, avatar_url, role, system_role, organization_id, onboarding_completed, timezone, comp_account, created_at"
    )
    .eq("id", userId)
    .single();

  if (!profile) return { error: "User not found" };

  // Fetch auth user for email/provider
  const { data: authData } = await admin.auth.admin.getUserById(userId);
  const email = authData?.user?.email ?? null;
  const provider =
    authData?.user?.app_metadata?.provider ?? "email";
  const lastSignIn = authData?.user?.last_sign_in_at ?? null;

  // Fetch organization
  let org = null;
  if (profile.organization_id) {
    const { data } = await admin
      .from("organizations")
      .select(
        "id, name, slug, plan, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, max_projects, max_keywords, max_pages_crawl, max_users, created_at"
      )
      .eq("id", profile.organization_id)
      .single();
    org = data;
  }

  // Fetch usage data if org exists
  let projectCount = 0;
  let keywordCount = 0;
  let auditCount = 0;
  let memberCount = 0;

  if (profile.organization_id) {
    const [projects, keywords, audits, members] = await Promise.all([
      admin
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id),
      admin
        .from("keywords")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id),
      admin
        .from("site_audits")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", profile.organization_id),
    ]);

    projectCount = projects.count ?? 0;
    keywordCount = keywords.count ?? 0;
    auditCount = audits.count ?? 0;
    memberCount = members.count ?? 0;
  }

  // Fetch recent audit log for this user
  const { data: recentActivity } = await admin
    .from("audit_log")
    .select("id, action, resource_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch billing events for user's org
  let billingEvents: Array<{
    id: string;
    event_type: string;
    amount_cents: number | null;
    created_at: string;
  }> = [];

  if (profile.organization_id) {
    const { data } = await admin
      .from("billing_events")
      .select("id, event_type, amount_cents, created_at")
      .eq("organization_id", profile.organization_id)
      .order("created_at", { ascending: false })
      .limit(5);
    billingEvents = data ?? [];
  }

  return {
    data: {
      profile: {
        ...profile,
        email,
        provider,
        lastSignIn,
      },
      organization: org,
      usage: {
        projects: projectCount,
        keywords: keywordCount,
        audits: auditCount,
        members: memberCount,
      },
      recentActivity: recentActivity ?? [],
      billingEvents,
    },
  };
}

/**
 * Fetch detailed KPIs for a single organization (admin only).
 */
export async function getOrgDetails(orgId: string) {
  const { error, admin } = await requireAdminCaller();
  if (error || !admin) return { error: error ?? "Unauthorized" };

  // Fetch org
  const { data: org } = await admin
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (!org) return { error: "Organization not found" };

  // Fetch members with their auth info
  const { data: members } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, role, system_role, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  const memberList = members ?? [];

  // Fetch emails for each member
  const memberDetails = await Promise.all(
    memberList.map(async (m) => {
      const { data: authData } = await admin.auth.admin.getUserById(m.id);
      return {
        ...m,
        email: authData?.user?.email ?? null,
        provider: authData?.user?.app_metadata?.provider ?? "email",
        lastSignIn: authData?.user?.last_sign_in_at ?? null,
      };
    })
  );

  // Usage counts
  const [projects, keywords, audits, apiKeys] = await Promise.all([
    admin
      .from("projects")
      .select("id, name, domain, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("keywords")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("site_audits")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
    admin
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId),
  ]);

  // Billing events
  const { data: billingEvents } = await admin
    .from("billing_events")
    .select("id, event_type, amount_cents, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Recent activity for this org
  const { data: recentActivity } = await admin
    .from("audit_log")
    .select("id, action, resource_type, user_id, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    data: {
      organization: org,
      members: memberDetails,
      projects: projects.data ?? [],
      usage: {
        projects: projects.data?.length ?? 0,
        keywords: keywords.count ?? 0,
        audits: audits.count ?? 0,
        apiKeys: apiKeys.count ?? 0,
        members: memberList.length,
      },
      billingEvents: billingEvents ?? [],
      recentActivity: recentActivity ?? [],
    },
  };
}

/**
 * Delete an organization (admin only).
 * Also unlinks all member profiles.
 */
export async function deleteOrganization(
  orgId: string
): Promise<{ error: string } | { success: true }> {
  const { error, admin, userId } = await requireAdminCaller();
  if (error || !admin) return { error: error ?? "Unauthorized" };

  // Prevent deleting the admin's own org
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId!)
    .single();

  if (callerProfile?.organization_id === orgId) {
    return { error: "Cannot delete your own organization" };
  }

  // Unlink all profiles from this org (set organization_id to null)
  await admin
    .from("profiles")
    .update({ organization_id: null })
    .eq("organization_id", orgId);

  // Delete the org (cascades to projects, keywords, billing_events, etc.)
  const { error: delError } = await admin
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (delError) {
    return { error: delError.message };
  }

  revalidatePath("/admin/orgs");
  revalidatePath("/admin/users");
  return { success: true };
}

/**
 * Toggle complimentary (unlimited free) account for a user (admin only).
 * When enabled, the user bypasses all plan limits with no billing.
 */
export async function toggleCompAccount(
  userId: string,
  enabled: boolean
): Promise<{ error: string } | { success: true }> {
  const { error, admin } = await requireAdminCaller();
  if (error || !admin) return { error: error ?? "Unauthorized" };

  const { error: updateError } = await admin
    .from("profiles")
    .update({ comp_account: enabled })
    .eq("id", userId);

  if (updateError) return { error: updateError.message };

  revalidatePath("/admin/users");
  return { success: true };
}
