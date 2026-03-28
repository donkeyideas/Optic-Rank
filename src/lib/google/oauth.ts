/**
 * Google OAuth2 flows for user-facing integrations:
 * - Google Search Console (GSC)
 * - Google Analytics 4 (GA4)
 * - Google Play Developer API
 *
 * All use the same GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET.
 */

const GSC_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
];

const GA4_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
];

const GOOGLE_PLAY_SCOPES = [
  "https://www.googleapis.com/auth/androidpublisher",
];

function getOAuthConfig(redirectPath = "/api/auth/gsc/callback") {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}${redirectPath}`;

  return { clientId, clientSecret, redirectUri, baseUrl };
}

/**
 * Check if Google OAuth credentials are configured.
 */
export function hasGSCOAuthCredentials(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function hasGA4OAuthCredentials(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function hasGooglePlayOAuthCredentials(): boolean {
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
 * Generate the Google OAuth2 authorization URL for GA4.
 */
export function getGA4AuthUrl(state: string): string {
  const { clientId, redirectUri } = getOAuthConfig("/api/auth/ga4/callback");
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GA4_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Generate the Google OAuth2 authorization URL for Google Play Developer API.
 */
export function getGooglePlayAuthUrl(state: string): string {
  const { clientId, redirectUri } = getOAuthConfig("/api/auth/google-play/callback");
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_PLAY_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectPath = "/api/auth/gsc/callback"
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig(redirectPath);
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

// ================================================================
// GA4 — Property listing and user info
// ================================================================

export interface GA4PropertySummary {
  propertyId: string;
  displayName: string;
  accountName: string;
}

/**
 * Fetch the user's GA4 properties via the Analytics Admin API.
 */
export async function fetchGA4Properties(accessToken: string): Promise<GA4PropertySummary[]> {
  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=100",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch GA4 properties: ${res.status}`);
  }

  const data = await res.json();
  const results: GA4PropertySummary[] = [];

  for (const account of data.accountSummaries ?? []) {
    const accountName = account.displayName ?? account.account ?? "Unknown Account";
    for (const prop of account.propertySummaries ?? []) {
      // prop.property is like "properties/528445226"
      const propertyId = (prop.property as string)?.replace("properties/", "") ?? "";
      results.push({
        propertyId,
        displayName: prop.displayName ?? propertyId,
        accountName,
      });
    }
  }

  return results;
}

/**
 * Fetch the authenticated user's Google email address.
 */
export async function fetchGoogleUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.email ?? null;
  } catch {
    return null;
  }
}

// ================================================================
// Google Play Developer API — App listing
// ================================================================

export interface GooglePlayAppSummary {
  packageName: string;
  title: string;
}

/**
 * Fetch the list of apps accessible via the Google Play Developer API.
 * Uses the androidpublisher v3 API to list edits or simply validate access.
 * Note: The Play Developer API doesn't have a "list all apps" endpoint directly,
 * so we use the Google Play Developer API v3 to check access.
 */
export async function fetchGooglePlayApps(
  accessToken: string
): Promise<GooglePlayAppSummary[]> {
  // The Play Developer API doesn't have a direct "list apps" endpoint.
  // We use the Generalized Play Developer Reporting API to list apps.
  const res = await fetch(
    "https://playdeveloperreporting.googleapis.com/v1beta1/apps",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    // Fallback: try the androidpublisher API to validate access
    const errText = await res.text();
    throw new Error(`Failed to fetch Google Play apps: ${res.status} ${errText}`);
  }

  const data = await res.json();
  // Response format: { apps: [{ name: "apps/{packageName}", packageName: "...", displayName: "..." }] }
  const apps = (data.apps ?? []) as Array<{
    packageName?: string;
    displayName?: string;
    name?: string;
  }>;

  return apps.map((app) => ({
    packageName: app.packageName ?? app.name?.replace("apps/", "") ?? "",
    title: app.displayName ?? app.packageName ?? "",
  }));
}
