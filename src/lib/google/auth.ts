/**
 * Google Service Account Auth
 *
 * Creates authenticated clients for GA4 and Search Console APIs.
 */

import { GoogleAuth } from "google-auth-library";

let _auth: GoogleAuth | null = null;

export function getGoogleAuth(scopes: string[]): GoogleAuth {
  if (_auth) return _auth;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars"
    );
  }

  _auth = new GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    projectId: projectId ?? undefined,
    scopes,
  });

  return _auth;
}
