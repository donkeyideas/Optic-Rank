/**
 * Google Play Developer API client.
 * Uses OAuth2 access tokens to fetch real developer data:
 * - Reviews (with full text, not just scraped)
 * - App details validation
 * - Reply to reviews
 *
 * For metrics (installs, crashes, ratings), uses the
 * Play Developer Reporting API (v1beta1).
 */

// ================================================================
// Types
// ================================================================

export interface PlayReview {
  reviewId: string;
  authorName: string;
  rating: number;
  title: string;
  text: string;
  language: string;
  lastModified: string;
  deviceModel: string | null;
  appVersionName: string | null;
  thumbsUpCount: number;
  developerReplyText: string | null;
  developerReplyLastModified: string | null;
}

export interface PlayAppMetrics {
  totalInstalls: number | null;
  activeInstalls: number | null;
  totalRatings: number | null;
  averageRating: number | null;
  crashRate: number | null;
  anrRate: number | null;
  userPerceivedCrashRate: number | null;
  userPerceivedAnrRate: number | null;
  excessiveWakeupRate: number | null;
  stuckWakelockRate: number | null;
}

export interface PlayStoreListingInfo {
  title: string;
  fullDescription: string;
  shortDescription: string;
  recentChanges: string | null;
  defaultLanguage: string;
}

// ================================================================
// Reviews — androidpublisher v3
// ================================================================

/**
 * Fetch reviews for a package via the Android Publisher API.
 */
export async function fetchPlayReviews(
  accessToken: string,
  packageName: string,
  maxResults = 50
): Promise<PlayReview[]> {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/reviews?maxResults=${maxResults}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[play-console] fetchPlayReviews failed: ${res.status}`, errText);
    throw new Error(`Failed to fetch Play reviews: ${res.status}`);
  }

  const data = await res.json();
  const reviews = (data.reviews ?? []) as Array<Record<string, unknown>>;

  return reviews.map((review) => {
    const comments = (review.comments as Array<Record<string, unknown>>) ?? [];
    const userComment = (comments[0]?.userComment ?? {}) as Record<string, unknown>;
    const devComment = (comments[0]?.developerComment ?? null) as Record<string, unknown> | null;

    return {
      reviewId: (review.reviewId as string) ?? "",
      authorName: (review.authorName as string) ?? "Anonymous",
      rating: (userComment.starRating as number) ?? 0,
      title: "", // Play API doesn't have titles
      text: (userComment.text as string) ?? "",
      language: (userComment.reviewerLanguage as string) ?? "en",
      lastModified: formatPlayTimestamp(userComment.lastModified as Record<string, unknown>),
      deviceModel: (userComment.device as string) ?? null,
      appVersionName: (userComment.appVersionName as string) ?? null,
      thumbsUpCount: (userComment.thumbsUpCount as number) ?? 0,
      developerReplyText: devComment ? (devComment.text as string) ?? null : null,
      developerReplyLastModified: devComment
        ? formatPlayTimestamp(devComment.lastModified as Record<string, unknown>)
        : null,
    };
  });
}

/**
 * Reply to a review via the Android Publisher API.
 */
export async function replyToPlayReview(
  accessToken: string,
  packageName: string,
  reviewId: string,
  replyText: string
): Promise<boolean> {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/reviews/${encodeURIComponent(reviewId)}:reply`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ replyText }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[play-console] replyToPlayReview failed: ${res.status}`, errText);
    return false;
  }

  return true;
}

// ================================================================
// App Details — androidpublisher v3
// ================================================================

/**
 * Fetch app store listing details for default language.
 */
export async function fetchPlayStoreListing(
  accessToken: string,
  packageName: string
): Promise<PlayStoreListingInfo | null> {
  // We need an edit to read listings. Create a temporary edit.
  const editUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits`;
  const editRes = await fetch(editUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!editRes.ok) {
    console.error(`[play-console] create edit failed: ${editRes.status}`);
    return null;
  }

  const editData = await editRes.json();
  const editId = editData.id as string;

  try {
    // Fetch default listing
    const listingUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits/${editId}/listings`;
    const listingRes = await fetch(listingUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listingRes.ok) {
      return null;
    }

    const listingData = await listingRes.json();
    const listings = (listingData.listings ?? []) as Array<Record<string, unknown>>;
    const primary = listings[0];

    if (!primary) return null;

    return {
      title: (primary.title as string) ?? "",
      fullDescription: (primary.fullDescription as string) ?? "",
      shortDescription: (primary.shortDescription as string) ?? "",
      recentChanges: null, // Available in tracks, not listings
      defaultLanguage: (primary.language as string) ?? "en-US",
    };
  } finally {
    // Delete the edit (cleanup)
    await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/edits/${editId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ).catch(() => {});
  }
}

// ================================================================
// Metrics — Play Developer Reporting API (v1beta1)
// ================================================================

/**
 * Fetch quality metrics (crash rate, ANR rate) from the Reporting API.
 * Also fetches ratings overview.
 */
export async function fetchPlayMetrics(
  accessToken: string,
  packageName: string
): Promise<PlayAppMetrics> {
  const metrics: PlayAppMetrics = {
    totalInstalls: null,
    activeInstalls: null,
    totalRatings: null,
    averageRating: null,
    crashRate: null,
    anrRate: null,
    userPerceivedCrashRate: null,
    userPerceivedAnrRate: null,
    excessiveWakeupRate: null,
    stuckWakelockRate: null,
  };

  // Fetch crash rate
  try {
    const crashRes = await fetch(
      `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${encodeURIComponent(packageName)}/crashRateMetricSet:query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timelineSpec: {
            aggregationPeriod: "DAILY",
            startTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth(), // Previous month
              day: 1,
            },
            endTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
            },
          },
          metrics: ["crashRate", "userPerceivedCrashRate"],
          dimensions: [],
        }),
      }
    );

    if (crashRes.ok) {
      const crashData = await crashRes.json();
      const rows = (crashData.rows ?? []) as Array<Record<string, unknown>>;
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const crashMetrics = (lastRow.metrics ?? {}) as Record<string, Record<string, unknown>>;
        metrics.crashRate = (crashMetrics.crashRate?.decimalValue as number) ?? null;
        metrics.userPerceivedCrashRate = (crashMetrics.userPerceivedCrashRate?.decimalValue as number) ?? null;
      }
    }
  } catch {
    // Non-critical
  }

  // Fetch ANR rate
  try {
    const anrRes = await fetch(
      `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${encodeURIComponent(packageName)}/anrRateMetricSet:query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timelineSpec: {
            aggregationPeriod: "DAILY",
            startTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth(),
              day: 1,
            },
            endTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
            },
          },
          metrics: ["anrRate", "userPerceivedAnrRate"],
          dimensions: [],
        }),
      }
    );

    if (anrRes.ok) {
      const anrData = await anrRes.json();
      const rows = (anrData.rows ?? []) as Array<Record<string, unknown>>;
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const anrMetrics = (lastRow.metrics ?? {}) as Record<string, Record<string, unknown>>;
        metrics.anrRate = (anrMetrics.anrRate?.decimalValue as number) ?? null;
        metrics.userPerceivedAnrRate = (anrMetrics.userPerceivedAnrRate?.decimalValue as number) ?? null;
      }
    }
  } catch {
    // Non-critical
  }

  // Fetch excessive wakeup rate
  try {
    const wakeupRes = await fetch(
      `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${encodeURIComponent(packageName)}/excessiveWakeupRateMetricSet:query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timelineSpec: {
            aggregationPeriod: "DAILY",
            startTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth(),
              day: 1,
            },
            endTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
            },
          },
          metrics: ["excessiveWakeupRate"],
          dimensions: [],
        }),
      }
    );

    if (wakeupRes.ok) {
      const wakeupData = await wakeupRes.json();
      const rows = (wakeupData.rows ?? []) as Array<Record<string, unknown>>;
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const wakeupMetrics = (lastRow.metrics ?? {}) as Record<string, Record<string, unknown>>;
        metrics.excessiveWakeupRate = (wakeupMetrics.excessiveWakeupRate?.decimalValue as number) ?? null;
      }
    }
  } catch {
    // Non-critical
  }

  // Fetch stuck background wakelock rate
  try {
    const wakelockRes = await fetch(
      `https://playdeveloperreporting.googleapis.com/v1beta1/apps/${encodeURIComponent(packageName)}/stuckBackgroundWakelockRateMetricSet:query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timelineSpec: {
            aggregationPeriod: "DAILY",
            startTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth(),
              day: 1,
            },
            endTime: {
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
            },
          },
          metrics: ["stuckBgWakelockRate"],
          dimensions: [],
        }),
      }
    );

    if (wakelockRes.ok) {
      const wakelockData = await wakelockRes.json();
      const rows = (wakelockData.rows ?? []) as Array<Record<string, unknown>>;
      if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const wakelockMetrics = (lastRow.metrics ?? {}) as Record<string, Record<string, unknown>>;
        metrics.stuckWakelockRate = (wakelockMetrics.stuckBgWakelockRate?.decimalValue as number) ?? null;
      }
    }
  } catch {
    // Non-critical
  }

  return metrics;
}

/**
 * Validate that the access token has access to a specific package.
 * Returns basic app info if accessible.
 */
export async function validatePlayAccess(
  accessToken: string,
  packageName: string
): Promise<{ accessible: boolean; error?: string }> {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/reviews?maxResults=1`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.ok) {
    return { accessible: true };
  }

  if (res.status === 404) {
    return { accessible: false, error: "App not found. Check the package name." };
  }

  if (res.status === 401) {
    return { accessible: false, error: "Token expired. Please reconnect." };
  }

  if (res.status === 403) {
    return {
      accessible: false,
      error: "Access denied. Make sure your Google account has developer access to this app in Google Play Console.",
    };
  }

  return { accessible: false, error: `API error: ${res.status}` };
}

// ================================================================
// Helpers
// ================================================================

function formatPlayTimestamp(ts: Record<string, unknown> | null | undefined): string {
  if (!ts) return new Date().toISOString();
  const seconds = (ts.seconds as number) ?? 0;
  const nanos = (ts.nanos as number) ?? 0;
  return new Date(seconds * 1000 + nanos / 1000000).toISOString();
}
