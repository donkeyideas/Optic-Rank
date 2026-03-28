/**
 * Google OAuth2 callback handler for Google Play Developer API.
 * Exchanges authorization code for tokens and stores them.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, fetchGoogleUserEmail } from "@/lib/google/oauth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000";
  const settingsUrl = `${baseUrl}/dashboard/settings?tab=integrations`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}&gplay_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}&gplay_error=missing_params`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let stateData: { user_id: string; project_id: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64url").toString());
  } catch {
    return NextResponse.redirect(`${settingsUrl}&gplay_error=invalid_state`);
  }

  if (stateData.user_id !== user.id) {
    return NextResponse.redirect(`${settingsUrl}&gplay_error=user_mismatch`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, "/api/auth/google-play/callback");
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Fetch user's Google email for display
    const googleEmail = await fetchGoogleUserEmail(tokens.access_token);

    const adminClient = createAdminClient();
    const { error: dbError } = await adminClient
      .from("google_play_tokens")
      .upsert(
        {
          user_id: user.id,
          project_id: stateData.project_id || null,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt.toISOString(),
          google_email: googleEmail,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,project_id" }
      );

    if (dbError) {
      console.error("[google-play/callback] DB error:", dbError);
      return NextResponse.redirect(`${settingsUrl}&gplay_error=db_error`);
    }

    return NextResponse.redirect(`${settingsUrl}&gplay_success=true`);
  } catch (err) {
    console.error("[google-play/callback] Token exchange error:", err);
    return NextResponse.redirect(
      `${settingsUrl}&gplay_error=${encodeURIComponent(err instanceof Error ? err.message : "unknown")}`
    );
  }
}
