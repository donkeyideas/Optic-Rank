"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email/resend";
import { emailConfirmationTemplate } from "@/lib/email/templates/supabase-auth";
import {
  normalizeEmail,
  isDisposableEmail,
  isValidEmailFormat,
  hasDeliverableDomain,
  isPlausibleName,
} from "@/lib/auth/anti-spam";

// Signup rate limits (durable, DB-backed — see migration 00063).
const SIGNUP_MAX_PER_IP_PER_HOUR = 3;
const SIGNUP_MAX_PER_EMAIL_PER_DAY = 2;

/**
 * Sign up a new user with email/password, create an organization, and link the profile.
 */
export async function signUp(
  formData: FormData
): Promise<{ error: string } | { success: true; needsEmailConfirmation?: boolean }> {
  const email = ((formData.get("email") as string) || "").trim();
  const password = formData.get("password") as string;
  const fullName = ((formData.get("full_name") as string) || "").trim();
  const orgName = formData.get("org_name") as string | null;
  // Honeypot — hidden field that real users never see/fill. Bots fill every field.
  const honeypot = ((formData.get("company_website") as string) || "").trim();

  // --- Anti-spam guards (email/password path) --------------------------

  // 1) Honeypot tripped → pretend success without creating anything, so the
  //    bot doesn't learn it was blocked.
  if (honeypot) {
    return { success: true, needsEmailConfirmation: true };
  }

  // 2) Required fields — enforced server-side (client checks are trivially skipped).
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (!fullName) {
    return { error: "Please enter your full name." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!isPlausibleName(fullName)) {
    return { error: "Please enter a valid name." };
  }

  // 3) Email format + disposable-domain checks.
  if (!isValidEmailFormat(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (isDisposableEmail(email)) {
    return { error: "Please sign up with a permanent email address." };
  }

  // 4) Collapse provider aliasing (Gmail dots/+tags, googlemail⇄gmail) to a
  //    canonical form — used for dedup and rate limiting.
  const canonical = normalizeEmail(email);
  if (!canonical) {
    return { error: "Please enter a valid email address." };
  }
  const emailDomain = canonical.slice(canonical.lastIndexOf("@") + 1);

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip")?.trim() ||
    "unknown";

  // Use admin client for the entire signup flow — bypasses RLS and email rate limits
  const admin = createAdminClient();

  // Helper to record an attempt for the durable rate limiter / auditing.
  const recordAttempt = (outcome: "attempt" | "blocked" | "created") =>
    admin
      .from("signup_attempts")
      .insert({ ip, normalized_email: canonical, email_domain: emailDomain, outcome })
      .then(() => {}, () => {}); // best-effort, never block signup on logging

  // 5) Durable, DB-backed rate limiting — works across all serverless instances
  //    (unlike the in-memory limiter). Cap per-IP and per-canonical-email.
  const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();

  const [{ count: ipCount }, { count: emailCount }] = await Promise.all([
    admin
      .from("signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", hourAgo),
    admin
      .from("signup_attempts")
      .select("id", { count: "exact", head: true })
      .eq("normalized_email", canonical)
      .gte("created_at", dayAgo),
  ]);

  if (ip !== "unknown" && (ipCount ?? 0) >= SIGNUP_MAX_PER_IP_PER_HOUR) {
    await recordAttempt("blocked");
    return { error: "Too many sign-up attempts. Please try again later." };
  }
  if ((emailCount ?? 0) >= SIGNUP_MAX_PER_EMAIL_PER_DAY) {
    await recordAttempt("blocked");
    return { error: "Too many sign-up attempts for this email. Please try again later." };
  }

  // Log this attempt up front so bursts are counted even if later steps fail.
  await recordAttempt("attempt");

  // 6) Block if a normalized-equivalent account already exists (kills the
  //    "j.o.y+1@gmail.com" duplicate-account abuse).
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("normalized_email", canonical)
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Don't reveal whether the exact address exists — generic message.
    return {
      error: "An account with this email already exists. Try signing in.",
    };
  }

  // 7) Reject undeliverable domains (no MX/A records) — dynamically catches
  //    junk/disposable domains without a static list.
  if (!(await hasDeliverableDomain(email))) {
    await recordAttempt("blocked");
    return { error: "That email domain can't receive mail. Please use a valid email." };
  }

  // ---------------------------------------------------------------------

  // 1. Create the auth user (unconfirmed — requires email verification)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
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

  await recordAttempt("created");

  const slug = (orgName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // 14-day trial for all new organizations
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  // 2. Create organization (non-blocking — signup succeeds even if this fails)
  try {
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

    if (!orgError && org) {
      // 3. Link the profile to the organization with owner role
      await admin
        .from("profiles")
        .update({
          organization_id: org.id,
          full_name: fullName || null,
          role: "owner",
          normalized_email: canonical,
        })
        .eq("id", authData.user.id);
    } else {
      console.error("[Signup] Org creation failed (non-blocking):", orgError?.message);
      // Still update the profile name even without an org
      await admin
        .from("profiles")
        .update({ full_name: fullName || null, normalized_email: canonical })
        .eq("id", authData.user.id);
    }
  } catch (err) {
    console.error("[Signup] Org setup error (non-blocking):", err);
  }

  // Generate a confirmation link and send verification email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opticrank.com";
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
    },
  });

  if (linkData?.properties?.action_link) {
    // Send branded confirmation email via Resend
    const confirmHtml = emailConfirmationTemplate
      .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, linkData.properties.action_link)
      .replace(/\{\{\s*\.SiteURL\s*\}\}/g, appUrl);

    sendEmail(email, "Confirm your email — Optic Rank", confirmHtml, {
      userId: authData.user.id,
      emailType: "signup_confirmation",
    }).catch((err) => {
      console.error("[Signup] Failed to send confirmation email:", err);
    });
  } else {
    console.error("[Signup] Failed to generate confirmation link:", linkError?.message);
  }

  return { success: true, needsEmailConfirmation: true };
}

/**
 * Sign in with email and password.
 */
export async function signIn(
  formData: FormData
): Promise<{ error: string } | { success: true } | { requires2FA: true }> {
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

  // Check if user has TOTP MFA enrolled — redirect to 2FA verification
  if (data.user) {
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      aalData &&
      aalData.currentLevel === "aal1" &&
      aalData.nextLevel === "aal2"
    ) {
      // User has MFA enrolled but hasn't verified yet — send to 2FA page
      return { requires2FA: true };
    }
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
