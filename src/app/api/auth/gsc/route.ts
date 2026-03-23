/**
 * Initiates Google OAuth2 flow for Search Console access.
 * Redirects user to Google consent screen.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGSCAuthUrl, hasGSCOAuthCredentials } from "@/lib/google/oauth";

export async function GET(request: Request) {
  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasGSCOAuthCredentials()) {
    return NextResponse.json(
      { error: "Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET." },
      { status: 500 }
    );
  }

  // Get project_id from query params
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id") ?? "";

  // Encode state with user_id and project_id for the callback
  const state = Buffer.from(
    JSON.stringify({ user_id: user.id, project_id: projectId })
  ).toString("base64url");

  const authUrl = getGSCAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
