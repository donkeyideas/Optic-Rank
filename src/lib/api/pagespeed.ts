/**
 * Google PageSpeed Insights API Client
 * For Core Web Vitals, performance, and accessibility scoring.
 * Free API with rate limits (~25,000 requests/day).
 */

import { requireEnv, safeAPICall, type APIResponse } from "./base";
import { logAPICall } from "./api-logger";

const BASE_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/** Timeout for PageSpeed API calls (55 seconds — Google Lighthouse audits can take 30-45s). */
const PAGESPEED_TIMEOUT_MS = 55_000;

export interface CrUXFieldData {
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  overall_category: "FAST" | "AVERAGE" | "SLOW" | null;
}

export interface CoreWebVitals {
  url: string;
  performance_score: number;
  accessibility_score: number;
  lcp_ms: number;
  cls: number;
  inp_ms: number;
  fcp_ms: number;
  ttfb_ms: number;
  speed_index: number;
  total_blocking_time: number;
  page_title: string | null;
  /** CrUX real-user data for this specific page (p75 values) */
  field_page: CrUXFieldData | null;
  /** CrUX real-user data for the entire origin (p75 values) */
  field_origin: CrUXFieldData | null;
}

export async function getPageSpeedData(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<APIResponse<CoreWebVitals>> {
  return safeAPICall("PageSpeed Insights", async () => {
    const apiKey = requireEnv("PAGESPEED_API_KEY", "PageSpeed Insights");

    // Build URL with multiple category params (URLSearchParams merges duplicates,
    // so we append manually for the repeated "category" key).
    const params = new URLSearchParams({
      url,
      key: apiKey,
      strategy,
    });
    params.append("category", "performance");
    params.append("category", "accessibility");

    const requestUrl = `${BASE_URL}?${params}`;
    const start = Date.now();

    // Add timeout to prevent hanging on slow responses
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PAGESPEED_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(requestUrl, { signal: controller.signal });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const responseTime = Date.now() - start;
      const isTimeout = fetchErr instanceof DOMException && fetchErr.name === "AbortError";
      const errorMsg = isTimeout
        ? `Timeout after ${PAGESPEED_TIMEOUT_MS}ms`
        : fetchErr instanceof Error ? fetchErr.message : "Network error";

      logAPICall({
        provider: "pagespeed",
        endpoint: BASE_URL,
        method: "GET",
        status_code: isTimeout ? 408 : 0,
        response_time_ms: responseTime,
        is_success: false,
        error_message: errorMsg,
      });
      console.error(`[PageSpeed] Fetch failed for ${url}: ${errorMsg}`);
      throw new Error(`PageSpeed API error: ${errorMsg}`);
    } finally {
      clearTimeout(timeout);
    }

    const responseTime = Date.now() - start;

    if (!response.ok) {
      // Try to extract Google's error message for better diagnostics
      let errorDetail = `${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody?.error?.message) {
          errorDetail = `${response.status}: ${errorBody.error.message}`;
        }
      } catch {
        // Ignore parse errors on error response
      }

      logAPICall({
        provider: "pagespeed",
        endpoint: BASE_URL,
        method: "GET",
        status_code: response.status,
        response_time_ms: responseTime,
        is_success: false,
        error_message: errorDetail,
      });
      console.error(`[PageSpeed] API error for ${url}: ${errorDetail}`);
      throw new Error(`PageSpeed API ${errorDetail}`);
    }

    logAPICall({
      provider: "pagespeed",
      endpoint: BASE_URL,
      method: "GET",
      status_code: 200,
      response_time_ms: responseTime,
      is_success: true,
    });

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits || {};

    // Extract page title from document-title audit
    const pageTitle = (lighthouse?.finalUrl as string)
      ? (audits["document-title"]?.details?.items?.[0]?.title as string) ??
        (data.loadingExperience?.id as string) ??
        null
      : null;

    // Real accessibility score from Lighthouse (falls back to heuristic if category missing)
    const rawAccessibility = lighthouse?.categories?.accessibility?.score;
    const accessibilityScore = rawAccessibility != null
      ? Math.round(rawAccessibility * 100)
      : Math.min(100, Math.round((lighthouse?.categories?.performance?.score || 0) * 100 * 0.3 + 70));

    // Extract CrUX field data (real-user metrics at p75)
    const fieldPage = extractCrUXData(data.loadingExperience);
    const fieldOrigin = extractCrUXData(data.originLoadingExperience);

    return {
      url,
      performance_score: Math.round((lighthouse?.categories?.performance?.score || 0) * 100),
      accessibility_score: accessibilityScore,
      lcp_ms: audits["largest-contentful-paint"]?.numericValue || 0,
      cls: audits["cumulative-layout-shift"]?.numericValue || 0,
      inp_ms: audits["interaction-to-next-paint"]?.numericValue || 0,
      fcp_ms: audits["first-contentful-paint"]?.numericValue || 0,
      ttfb_ms: audits["server-response-time"]?.numericValue || 0,
      speed_index: audits["speed-index"]?.numericValue || 0,
      total_blocking_time: audits["total-blocking-time"]?.numericValue || 0,
      page_title: pageTitle,
      field_page: fieldPage,
      field_origin: fieldOrigin,
    };
  });
}

/**
 * Extract CrUX real-user field data from PageSpeed API loading experience.
 * Returns p75 percentile values for each metric.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCrUXData(loadingExperience: any): CrUXFieldData | null {
  if (!loadingExperience?.metrics) return null;

  const metrics = loadingExperience.metrics;
  const getP75 = (metricKey: string): number | null => {
    const m = metrics[metricKey];
    if (!m) return null;
    return m.percentile ?? null;
  };

  return {
    lcp_ms: getP75("LARGEST_CONTENTFUL_PAINT_MS"),
    cls: getP75("CUMULATIVE_LAYOUT_SHIFT_SCORE") != null
      ? (getP75("CUMULATIVE_LAYOUT_SHIFT_SCORE")! / 100)
      : null,
    inp_ms: getP75("INTERACTION_TO_NEXT_PAINT"),
    fcp_ms: getP75("FIRST_CONTENTFUL_PAINT_MS"),
    ttfb_ms: getP75("EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
    overall_category: loadingExperience.overall_category ?? null,
  };
}
