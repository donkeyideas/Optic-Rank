/**
 * Google PageSpeed Insights API Client
 * For Core Web Vitals and performance scoring.
 * Free API with rate limits.
 */

import { requireEnv, safeAPICall, type APIResponse } from "./base";
import { logAPICall } from "./api-logger";

const BASE_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface CoreWebVitals {
  url: string;
  performance_score: number;
  lcp_ms: number;
  cls: number;
  inp_ms: number;
  fcp_ms: number;
  ttfb_ms: number;
  speed_index: number;
  total_blocking_time: number;
  page_title: string | null;
}

export async function getPageSpeedData(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<APIResponse<CoreWebVitals>> {
  return safeAPICall("PageSpeed Insights", async () => {
    const apiKey = requireEnv("PAGESPEED_API_KEY", "PageSpeed Insights");

    const params = new URLSearchParams({
      url,
      key: apiKey,
      strategy,
      category: "performance",
    });

    const start = Date.now();
    const response = await fetch(`${BASE_URL}?${params}`);
    const responseTime = Date.now() - start;

    if (!response.ok) {
      logAPICall({
        provider: "pagespeed",
        endpoint: BASE_URL,
        method: "GET",
        status_code: response.status,
        response_time_ms: responseTime,
        is_success: false,
        error_message: `${response.status}: ${response.statusText}`,
      });
      throw new Error(`PageSpeed API ${response.status}: ${response.statusText}`);
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

    // Extract page title from document-title audit or final-screenshot
    const pageTitle = (lighthouse?.finalUrl as string)
      ? (audits["document-title"]?.details?.items?.[0]?.title as string) ??
        (data.loadingExperience?.id as string) ??
        null
      : null;

    return {
      url,
      performance_score: Math.round((lighthouse?.categories?.performance?.score || 0) * 100),
      lcp_ms: audits["largest-contentful-paint"]?.numericValue || 0,
      cls: audits["cumulative-layout-shift"]?.numericValue || 0,
      inp_ms: audits["interaction-to-next-paint"]?.numericValue || 0,
      fcp_ms: audits["first-contentful-paint"]?.numericValue || 0,
      ttfb_ms: audits["server-response-time"]?.numericValue || 0,
      speed_index: audits["speed-index"]?.numericValue || 0,
      total_blocking_time: audits["total-blocking-time"]?.numericValue || 0,
      page_title: pageTitle,
    };
  });
}
