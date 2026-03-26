/**
 * Initiates Google OAuth2 flow for GA4 Analytics access.
 * Redirects user to Google consent screen.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGA4AuthUrl, hasGA4OAuthCredentials } from "@/lib/google/oauth";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasGA4OAuthCredentials()) {
    return NextResponse.json(
      { error: "Google OAuth not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("project_id") ?? "";

  const state = Buffer.from(
    JSON.stringify({ user_id: user.id, project_id: projectId })
  ).toString("base64url");

  const authUrl = getGA4AuthUrl(state);
  return NextResponse.redirect(authUrl);
}
