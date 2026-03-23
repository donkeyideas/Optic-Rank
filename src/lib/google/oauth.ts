/**
 * Google OAuth2 flow for user-facing Google Search Console integration.
 * Separate from the service-account auth used for admin access.
 */

const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
];

function getOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/auth/gsc/callback`;

  return { clientId, clientSecret, redirectUri, baseUrl };
}

/**
 * Check if Google OAuth credentials are configured.
 */
export function hasGSCOAuthCredentials(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

/**
 * Generate the Google OAuth2 authorization URL.
 */
export function getGSCAuthUrl(state: string): string {
  const { clientId, redirectUri } = getOAuthConfig();
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GSC_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return res.json();
}

/**
 * Refresh an expired access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const { clientId, clientSecret } = getOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return res.json();
}

/**
 * Fetch the user's GSC sites/properties using an access token.
 */
export async function fetchGSCSites(accessToken: string): Promise<
  Array<{ siteUrl: string; permissionLevel: string }>
> {
  const res = await fetch(
    "https://www.googleapis.com/webmasters/v3/sites",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch GSC sites: ${res.status}`);
  }

  const data = await res.json();
  return (data.siteEntry ?? []).map((site: { siteUrl: string; permissionLevel: string }) => ({
    siteUrl: site.siteUrl,
    permissionLevel: site.permissionLevel,
  }));
}

/**
 * Fetch top search queries from GSC for a given property.
 */
export async function fetchGSCTopQueries(
  accessToken: string,
  siteUrl: string,
  days = 28,
  limit = 50
): Promise<Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        dimensions: ["query"],
        rowLimit: limit,
        type: "web",
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`GSC query failed: ${res.status}`);
  }

  const data = await res.json();
  return (data.rows ?? []).map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr,
    position: Math.round(row.position * 10) / 10,
  }));
}
