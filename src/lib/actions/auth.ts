"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Sign up a new user with email/password, create an organization, and link the profile.
 */
export async function signUp(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const orgName = formData.get("org_name") as string | null;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  // Use admin client for the entire signup flow — bypasses RLS and email rate limits
  const admin = createAdminClient();

  // 1. Create the auth user (auto-confirmed, no email needed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || undefined,
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Failed to create user account." };
  }

  const slug = (orgName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 14-day trial for all new organizations
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: orgName || `${fullName || email.split("@")[0]}'s Organization`,
      slug: `${slug}-${Date.now().toString(36)}`,
      plan: "free",
      subscription_status: "trialing",
      trial_ends_at: trialEndsAt.toISOString(),
    })
    .select("id")
    .single();

  if (orgError) {
    return { error: orgError.message };
  }

  // 3. Link the profile to the organization with owner role
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      organization_id: org.id,
      full_name: fullName || null,
      role: "owner",
    })
    .eq("id", authData.user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/", "layout");
  redirect("/login?message=Account created! Sign in to get started.");
}

/**
 * Sign in with email and password.
 */
export async function signIn(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    return { error: "Server configuration error. Please contact support." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === "fetch failed" || error.message === "Failed to fetch") {
      return { error: "Unable to reach authentication service. Please try again in a moment." };
    }
    return { error: error.message };
  }

  // Check if user is an admin — redirect to admin dashboard
  let dest = "/dashboard";
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("system_role")
      .eq("id", data.user.id)
      .single();

    if (profile?.system_role === "superadmin" || profile?.system_role === "admin") {
      dest = "/admin";
    }
  }

  revalidatePath("/", "layout");
  redirect(dest);
}

/**
 * Sign in with an OAuth provider (Google or GitHub).
 * Redirects the user to the provider's auth page.
 */
export async function signInWithOAuth(
  provider: "google" | "github"
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }

  return { success: true };
}

/**
 * Sign out the current user and redirect to the home page.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Send a password reset email to the provided address.
 */
export async function resetPassword(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Email is required." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard/settings`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Delete a user account (admin only).
 * Deletes from auth.users which cascades to profiles table.
 */
export async function deleteUserAccount(
  userId: string
): Promise<{ error: string } | { success: true }> {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (profile?.system_role !== "superadmin" && profile?.system_role !== "admin") {
    return { error: "Unauthorized" };
  }

  // Prevent deleting yourself
  if (userId === user.id) {
    return { error: "Cannot delete your own account" };
  }

  // Get the user's org before deleting, to clean up orphaned orgs
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    return { error: error.message };
  }

  // Clean up orphaned org (if no other members remain)
  if (targetProfile?.organization_id) {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", targetProfile.organization_id);

    if (count === 0) {
      await admin
        .from("organizations")
        .delete()
        .eq("id", targetProfile.organization_id);
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/orgs");
  return { success: true };
}
