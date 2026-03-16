/**
 * App Store data fetchers.
 * - Google Play: uses google-play-scraper (npm)
 * - Apple App Store: uses iTunes Search/Lookup API (free, no key needed)
 */

export interface AppStoreData {
  app_name: string;
  developer: string | null;
  icon_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  downloads_estimate: number | null;
  current_version: string | null;
  description: string | null;
  category: string | null;
  app_url: string | null;
}

/**
 * Fetch app data from Google Play Store.
 */
export async function fetchGooglePlayData(appId: string): Promise<AppStoreData | null> {
  try {
    // google-play-scraper is a CJS module
    const gplay = await import("google-play-scraper");
    const app = await gplay.default.app({ appId, lang: "en", country: "us" });

    return {
      app_name: app.title ?? appId,
      developer: app.developer ?? null,
      icon_url: app.icon ?? null,
      rating: app.score ? Math.round(app.score * 100) / 100 : null,
      reviews_count: app.reviews ?? null,
      downloads_estimate: parseInstalls(app.installs),
      current_version: app.version ?? null,
      description: app.description?.slice(0, 4000) ?? null,
      category: app.genre ?? null,
      app_url: app.url ?? `https://play.google.com/store/apps/details?id=${appId}`,
    };
  } catch (err) {
    console.error(`[fetchGooglePlayData] Failed for ${appId}:`, err);
    return null;
  }
}

/**
 * Fetch app data from Apple App Store via iTunes Lookup API.
 */
export async function fetchAppleAppData(appId: string): Promise<AppStoreData | null> {
  try {
    // appId can be numeric ID or bundle ID
    const isNumeric = /^\d+$/.test(appId);
    const url = isNumeric
      ? `https://itunes.apple.com/lookup?id=${appId}&country=us`
      : `https://itunes.apple.com/lookup?bundleId=${appId}&country=us`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results as Array<Record<string, unknown>>;
    if (!results || results.length === 0) return null;

    const app = results[0];

    return {
      app_name: (app.trackName as string) ?? appId,
      developer: (app.artistName as string) ?? null,
      icon_url: (app.artworkUrl512 as string) ?? (app.artworkUrl100 as string) ?? null,
      rating: app.averageUserRating
        ? Math.round((app.averageUserRating as number) * 100) / 100
        : null,
      reviews_count: (app.userRatingCount as number) ?? null,
      downloads_estimate: null, // Apple doesn't expose download numbers
      current_version: (app.version as string) ?? null,
      description: ((app.description as string) ?? "").slice(0, 4000),
      category: (app.primaryGenreName as string) ?? null,
      app_url: (app.trackViewUrl as string) ?? null,
    };
  } catch (err) {
    console.error(`[fetchAppleAppData] Failed for ${appId}:`, err);
    return null;
  }
}

/**
 * Fetch app data from either store.
 */
export async function fetchAppData(
  store: "apple" | "google",
  appId: string
): Promise<AppStoreData | null> {
  if (store === "google") return fetchGooglePlayData(appId);
  return fetchAppleAppData(appId);
}

/**
 * Fetch reviews from Google Play.
 */
export async function fetchGooglePlayReviews(
  appId: string,
  count: number = 30
): Promise<Array<{
  review_id: string;
  author: string;
  rating: number;
  title: string;
  text: string;
  date: string;
}>> {
  try {
    const gplay = await import("google-play-scraper");
    const result = await gplay.default.reviews({
      appId,
      lang: "en",
      country: "us",
      sort: (gplay.default.sort as unknown as Record<string, number>).NEWEST ?? 2,
      num: count,
    });

    const reviews = result.data ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return reviews.map((r: any) => ({
      review_id: (r.id as string) ?? `gp-${Date.now()}-${Math.random()}`,
      author: (r.userName as string) ?? "Anonymous",
      rating: (r.score as number) ?? 3,
      title: (r.title as string) ?? "",
      text: (r.text as string) ?? "",
      date: (r.date as string) ?? new Date().toISOString(),
    }));
  } catch (err) {
    console.error(`[fetchGooglePlayReviews] Failed for ${appId}:`, err);
    return [];
  }
}

/** Parse "10,000,000+" installs string to a number */
function parseInstalls(installs: string | null | undefined): number | null {
  if (!installs) return null;
  const cleaned = installs.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}
