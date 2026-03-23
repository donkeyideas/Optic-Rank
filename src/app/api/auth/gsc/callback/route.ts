/**
 * Google OAuth2 callback handler for Search Console.
 * Exchanges authorization code for tokens and stores them.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/google/oauth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/dashboard/settings?tab=integrations`;

  // Handle user denial
  if (error) {
    return NextResponse.redirect(`${settingsUrl}&gsc_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}&gsc_error=missing_params`);
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Decode state
  let stateData: { user_id: string; project_id: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(`${settingsUrl}&gsc_error=invalid_state`);
  }

  // Verify state matches current user
  if (stateData.user_id !== user.id) {
    return NextResponse.redirect(`${settingsUrl}&gsc_error=user_mismatch`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database
    const adminClient = createAdminClient();
    const { error: dbError } = await adminClient
      .from("gsc_tokens")
      .upsert(
        {
          user_id: user.id,
          project_id: stateData.project_id || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,project_id" }
      );

    if (dbError) {
      console.error("[gsc/callback] DB error:", dbError);
      return NextResponse.redirect(`${settingsUrl}&gsc_error=db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}&gsc_success=true`);
  } catch (err) {
    console.error("[gsc/callback] Token exchange error:", err);
    return NextResponse.redirect(
      `${settingsUrl}&gsc_error=${encodeURIComponent(err instanceof Error ? err.message : "unknown")}`
    );
  }
}
