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

/**
 * Fetch similar/related apps from Google Play.
 */
export async function fetchSimilarApps(
  store: "apple" | "google",
  appId: string,
  count: number = 10
): Promise<Array<{ app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null; store: "apple" | "google" }>> {
  try {
    if (store === "google") {
      const gplay = await import("google-play-scraper");
      const results = await gplay.default.similar({ appId, lang: "en", country: "us", num: count });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return results.map((app: any) => ({
        app_id: (app.appId as string) ?? "",
        app_name: (app.title as string) ?? "",
        developer: (app.developer as string) ?? null,
        icon_url: (app.icon as string) ?? null,
        rating: app.score ? Math.round((app.score as number) * 100) / 100 : null,
        store: "google" as const,
      }));
    }
    // Apple: search by category/genre from the app's metadata
    const appData = await fetchAppleAppData(appId);
    if (!appData?.category) return [];
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(appData.category)}&media=software&country=us&limit=${count}`;
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const data = await response.json();
    return ((data.results ?? []) as Array<Record<string, unknown>>)
      .filter((app) => String(app.trackId ?? app.bundleId) !== appId)
      .map((app) => ({
        app_id: String(app.bundleId ?? app.trackId ?? ""),
        app_name: (app.trackName as string) ?? "",
        developer: (app.artistName as string) ?? null,
        icon_url: (app.artworkUrl512 as string) ?? (app.artworkUrl100 as string) ?? null,
        rating: app.averageUserRating ? Math.round((app.averageUserRating as number) * 100) / 100 : null,
        store: "apple" as const,
      }));
  } catch (err) {
    console.error(`[fetchSimilarApps] Failed for ${appId}:`, err);
    return [];
  }
}

/**
 * Search for apps by name in the store.
 */
export async function fetchAppBySearch(
  store: "apple" | "google",
  query: string,
  count: number = 10
): Promise<Array<{ app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null }>> {
  try {
    if (store === "google") {
      const gplay = await import("google-play-scraper");
      const results = await gplay.default.search({ term: query, num: count, lang: "en", country: "us" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return results.map((app: any) => ({
        app_id: (app.appId as string) ?? "",
        app_name: (app.title as string) ?? "",
        developer: (app.developer as string) ?? null,
        icon_url: (app.icon as string) ?? null,
        rating: app.score ? Math.round((app.score as number) * 100) / 100 : null,
      }));
    }
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=software&country=us&limit=${count}`;
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const data = await response.json();
    return ((data.results ?? []) as Array<Record<string, unknown>>).map((app) => ({
      app_id: String(app.bundleId ?? app.trackId ?? ""),
      app_name: (app.trackName as string) ?? "",
      developer: (app.artistName as string) ?? null,
      icon_url: (app.artworkUrl512 as string) ?? (app.artworkUrl100 as string) ?? null,
      rating: app.averageUserRating ? Math.round((app.averageUserRating as number) * 100) / 100 : null,
    }));
  } catch (err) {
    console.error(`[fetchAppBySearch] Failed for "${query}":`, err);
    return [];
  }
}

/**
 * Fetch top apps in a category from Google Play.
 */
export async function fetchCategoryTopApps(
  store: "apple" | "google",
  category: string,
  count: number = 10
): Promise<Array<{ app_id: string; app_name: string; developer: string | null; icon_url: string | null; rating: number | null; downloads_estimate: number | null }>> {
  try {
    if (store === "google") {
      const gplay = await import("google-play-scraper");
      // Search by category name as a proxy for top charts
      const results = await gplay.default.search({ term: category, num: count, lang: "en", country: "us" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return results.map((app: any) => ({
        app_id: (app.appId as string) ?? "",
        app_name: (app.title as string) ?? "",
        developer: (app.developer as string) ?? null,
        icon_url: (app.icon as string) ?? null,
        rating: app.score ? Math.round((app.score as number) * 100) / 100 : null,
        downloads_estimate: parseInstalls(app.installs as string),
      }));
    }
    // Apple: search by category
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(category)}&media=software&country=us&limit=${count}`;
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return [];
    const data = await response.json();
    return ((data.results ?? []) as Array<Record<string, unknown>>).map((app) => ({
      app_id: String(app.bundleId ?? app.trackId ?? ""),
      app_name: (app.trackName as string) ?? "",
      developer: (app.artistName as string) ?? null,
      icon_url: (app.artworkUrl512 as string) ?? (app.artworkUrl100 as string) ?? null,
      rating: app.averageUserRating ? Math.round((app.averageUserRating as number) * 100) / 100 : null,
      downloads_estimate: null,
    }));
  } catch (err) {
    console.error(`[fetchCategoryTopApps] Failed for ${category}:`, err);
    return [];
  }
}

/**
 * Check an app's ranking position for a given keyword by searching the store.
 * Returns the 1-based position (index) in search results, or null if not found.
 */
export async function checkKeywordRanking(
  store: "apple" | "google",
  appId: string,
  keyword: string,
  maxResults: number = 250
): Promise<number | null> {
  try {
    if (store === "google") {
      const gplay = await import("google-play-scraper");
      const results = await gplay.default.search({
        term: keyword,
        num: maxResults,
        lang: "en",
        country: "us",
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const idx = results.findIndex((app: any) => (app.appId as string) === appId);
      return idx >= 0 ? idx + 1 : null;
    }
    // Apple: search via iTunes API
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&media=software&country=us&limit=${Math.min(maxResults, 200)}`;
    const response = await fetch(searchUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    const data = await response.json();
    const results = (data.results ?? []) as Array<Record<string, unknown>>;
    const idx = results.findIndex(
      (app) => String(app.bundleId ?? "") === appId || String(app.trackId ?? "") === appId
    );
    return idx >= 0 ? idx + 1 : null;
  } catch (err) {
    console.error(`[checkKeywordRanking] Failed for "${keyword}":`, err);
    return null;
  }
}

/**
 * Batch-check rankings for multiple keywords. Runs sequentially to avoid rate limits.
 * Returns a map of keyword → position (or null).
 */
export async function batchCheckKeywordRankings(
  store: "apple" | "google",
  appId: string,
  keywords: string[]
): Promise<Map<string, number | null>> {
  const results = new Map<string, number | null>();
  for (const kw of keywords) {
    const position = await checkKeywordRanking(store, appId, kw);
    results.set(kw, position);
    // Small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return results;
}

/** Parse "10,000,000+" installs string to a number */
function parseInstalls(installs: string | null | undefined): number | null {
  if (!installs) return null;
  const cleaned = installs.replace(/[^0-9]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}
