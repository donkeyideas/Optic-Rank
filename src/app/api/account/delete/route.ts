import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthUser(request: NextRequest) {
  // Check for mobile Bearer token first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user } } = await client.auth.getUser();
    return user;
  }
  // Fall back to cookie-based auth (web)
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  return user;
}

/**
 * DELETE /api/account/delete
 * Permanently deletes the authenticated user's account, their organization
 * (if they are the owner), and all associated data.
 */
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  try {
    // Get the user's profile to find their org
    const { data: profile } = await admin
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    // If user is the org owner, delete the entire organization (cascades to projects, etc.)
    if (profile?.organization_id && profile.role === "owner") {
      await admin
        .from("organizations")
        .delete()
        .eq("id", profile.organization_id);
    }

    // Delete the auth user (cascades to profile via FK)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[account/delete] Failed to delete user:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[account/delete] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
