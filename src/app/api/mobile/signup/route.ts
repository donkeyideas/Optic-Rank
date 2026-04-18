import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { emailConfirmationTemplate } from "@/lib/email/templates/supabase-auth";

/**
 * Mobile signup endpoint — uses admin client to bypass RLS.
 * POST /api/mobile/signup
 * Body: { email, password, fullName, company? }
 */
export async function POST(request: NextRequest) {
  let body: { email: string; password: string; fullName: string; company?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, password, fullName, company } = body;

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Email, password, and name are required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // 1. Create auth user (unconfirmed)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
  }

  // 2. Create organization (non-blocking — signup succeeds even if this fails)
  const orgName = company?.trim() || `${fullName}'s Organization`;
  const slug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  try {
    const { data: org, error: orgError } = await admin
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

    if (!orgError && org) {
      await admin
        .from("profiles")
        .update({
          organization_id: org.id,
          full_name: fullName,
          role: "owner",
        })
        .eq("id", authData.user.id);
    } else {
      console.error("[mobile/signup] Org creation failed (non-blocking):", orgError?.message);
      // Still update the profile name even without an org
      await admin
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", authData.user.id);
    }
  } catch (err) {
    console.error("[mobile/signup] Org setup error (non-blocking):", err);
  }

  // 3. Send confirmation email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opticrank.com";
  try {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (linkData?.properties?.action_link) {
      const confirmHtml = emailConfirmationTemplate
        .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, linkData.properties.action_link)
        .replace(/\{\{\s*\.SiteURL\s*\}\}/g, appUrl);

      sendEmail(email, "Confirm your email — Optic Rank", confirmHtml, {
        userId: authData.user.id,
        emailType: "signup_confirmation",
      }).catch((err) => {
        console.error("[mobile/signup] Failed to send confirmation email:", err);
      });
    }
  } catch {
    // Email is best-effort
  }

  return NextResponse.json({ success: true, needsEmailConfirmation: true });
}
