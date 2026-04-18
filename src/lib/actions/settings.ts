"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Update user profile settings (name, timezone).
 */
export async function updateProfileSettings(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const fullName = formData.get("full_name") as string;
  const timezone = formData.get("timezone") as string;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName?.trim() || null,
      timezone: timezone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Update organization settings (name).
 */
export async function updateOrganizationSettings(
  orgId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const name = formData.get("org_name") as string;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: name?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Create an organization for the current user (if they don't have one).
 * Starts a 14-day free trial.
 */
export async function createOrganization(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const orgName = (formData.get("org_name") as string)?.trim();
  if (!orgName) return { error: "Organization name is required." };

  const supabase = createAdminClient();

  // Check if user already has an org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (profile?.organization_id) {
    return { error: "You already belong to an organization." };
  }

  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 14-day trial
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      slug: `${slug}-${Date.now().toString(36)}`,
      plan: "free",
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? "Failed to create organization." };
  }

  // Link profile to the new org as owner
  const { error: linkError } = await supabase
    .from("profiles")
    .update({ organization_id: org.id, role: "owner" })
    .eq("id", user.id);

  if (linkError) {
    return { error: linkError.message };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Notification preferences shape stored in profiles.notification_prefs JSONB.
 */
export interface NotificationPrefs {
  email: boolean;
  push: boolean;
  weekly_digest: boolean;
  rank_changes: boolean;
  backlink_alerts: boolean;
  audit_complete: boolean;
  report_ready: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: true,
  push: true,
  weekly_digest: true,
  rank_changes: true,
  backlink_alerts: true,
  audit_complete: true,
  report_ready: true,
};

/**
 * Update the current user's notification preferences.
 */
export async function updateNotificationPreferences(
  prefs: Partial<NotificationPrefs>
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Get current prefs to merge
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .single();

  const currentPrefs = (profile?.notification_prefs as NotificationPrefs | null) ?? DEFAULT_NOTIFICATION_PREFS;
  const merged = { ...currentPrefs, ...prefs };

  const { error } = await supabase
    .from("profiles")
    .update({
      notification_prefs: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Mark onboarding as complete for the current user.
 */
export async function completeOnboarding(): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Dismiss the "What's Next" guidance card on the dashboard.
 */
export async function dismissWhatsNext(): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ whats_next_dismissed: true })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
