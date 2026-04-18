import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Ensure an OAuth user has an organization.
 * Called from mobile app after OAuth/Apple sign-in.
 * POST /api/mobile/ensure-org
 * Headers: Authorization: Bearer <jwt>
 * Body: { displayName? }
 */
export async function POST(request: NextRequest) {
  // Extract token
  const authHeader = request.headers.get("authorization");
  let body: { displayName?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }

  // Verify user
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Check if user already has an org
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.organization_id) {
    return NextResponse.json({ success: true, alreadyHasOrg: true });
  }

  // Check if another auth identity with same email already has an org (multi-provider)
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .neq("id", user.id)
    .not("organization_id", "is", null)
    .limit(1)
    .single();

  // If found, link to existing org as member
  if (existingProfile?.organization_id) {
    await admin
      .from("profiles")
      .update({
        organization_id: existingProfile.organization_id,
        role: "member",
      })
      .eq("id", user.id);

    return NextResponse.json({ success: true, linked: true });
  }

  // Create new org
  const name = body.displayName || profile?.full_name || "My Organization";
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36);

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name,
      slug,
      plan: "free",
      subscription_status: "trialing",
      trial_ends_at: trialEnds.toISOString(),
    })
    .select("id")
    .single();

  if (orgError || !org) {
    console.error("[ensure-org] Failed to create org:", orgError);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }

  await admin
    .from("profiles")
    .update({ organization_id: org.id, role: "owner" })
    .eq("id", user.id);

  return NextResponse.json({ success: true, created: true });
}
