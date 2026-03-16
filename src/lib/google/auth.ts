/**
 * Google Service Account Auth
 *
 * Creates authenticated clients for GA4 and Search Console APIs.
 * Caches auth instances per scope-set to support multiple APIs.
 */

import { GoogleAuth } from "google-auth-library";

const _authCache = new Map<string, GoogleAuth>();

export function getGoogleAuth(scopes: string[]): GoogleAuth {
  const cacheKey = scopes.sort().join(",");
  const cached = _authCache.get(cacheKey);
  if (cached) return cached;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars"
    );
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    projectId: projectId ?? undefined,
    scopes,
  });

  _authCache.set(cacheKey, auth);
  return auth;
}
