/**
 * Google Indexing API Client
 *
 * Allows submitting URLs for (re)indexing or deletion from Google's index.
 * Uses service account auth — the service account must be added as an owner
 * of the Search Console property.
 *
 * Free tier: 200 URLs/day per property.
 */

import { getGoogleAuth } from "./auth";

const INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";
const INDEXING_SCOPES = ["https://www.googleapis.com/auth/indexing"];

export type IndexingAction = "URL_UPDATED" | "URL_DELETED";

export interface IndexingResult {
  url: string;
  action: IndexingAction;
  success: boolean;
  error?: string;
  notifyTime?: string;
}

/**
 * Submit a single URL for indexing or removal.
 */
export async function submitUrlForIndexing(
  url: string,
  action: IndexingAction = "URL_UPDATED"
): Promise<IndexingResult> {
  try {
    const auth = getGoogleAuth(INDEXING_SCOPES);
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const response = await fetch(INDEXING_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        type: action,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMsg =
        errorBody?.error?.message ?? `HTTP ${response.status}: ${response.statusText}`;
      return { url, action, success: false, error: errorMsg };
    }

    const data = await response.json();
    return {
      url,
      action,
      success: true,
      notifyTime: data.urlNotificationMetadata?.latestUpdate?.notifyTime ?? null,
    };
  } catch (err) {
    return {
      url,
      action,
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Submit multiple URLs for indexing (batch, up to 100 at a time).
 * Google doesn't have a real batch endpoint for Indexing API,
 * so we send individual requests in parallel with concurrency limit.
 */
export async function submitBatchForIndexing(
  urls: string[],
  action: IndexingAction = "URL_UPDATED",
  concurrency = 5
): Promise<IndexingResult[]> {
  const results: IndexingResult[] = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const result = await submitUrlForIndexing(url, action);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () =>
    worker()
  );
  await Promise.all(workers);

  return results;
}
