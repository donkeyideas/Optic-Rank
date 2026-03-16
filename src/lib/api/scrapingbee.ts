/**
 * ScrapingBee API Client
 *
 * Used by the site crawler to fetch pages with JavaScript rendering
 * when basic fetch() returns minimal/JS-only content. Handles:
 * - JS rendering (for SPAs like React, Angular, Vue)
 * - Anti-bot bypass (for sites that block custom user agents)
 * - Stealth mode for sites with aggressive bot detection
 */

import { requireEnv } from "./base";
import { logAPICall } from "./api-logger";

const SCRAPINGBEE_BASE = "https://app.scrapingbee.com/api/v1";

interface ScrapingBeeOptions {
  /** Render JavaScript before returning HTML (default: true) */
  renderJs?: boolean;
  /** Wait for the page to fully load in ms (default: 5000) */
  waitMs?: number;
  /** Use premium proxies for anti-bot bypass */
  premiumProxy?: boolean;
  /** Timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** Return only the page screenshot instead of HTML */
  screenshot?: boolean;
  /** Custom headers to send */
  headers?: Record<string, string>;
  /** Block ads and trackers for faster loads */
  blockAds?: boolean;
}

export interface ScrapingBeeResult {
  html: string;
  statusCode: number;
  resolvedUrl: string;
  costCredits: number;
}

/**
 * Fetch a URL through ScrapingBee with JS rendering.
 * Returns the fully rendered HTML.
 */
export async function fetchWithScrapingBee(
  url: string,
  options: ScrapingBeeOptions = {}
): Promise<ScrapingBeeResult> {
  const apiKey = requireEnv("SCRAPINGBEE_API_KEY", "ScrapingBee");

  const {
    renderJs = true,
    waitMs = 5000,
    premiumProxy = false,
    timeoutMs = 30000,
    blockAds = true,
  } = options;

  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: renderJs ? "true" : "false",
    block_ads: blockAds ? "true" : "false",
  });

  if (renderJs) {
    params.set("wait", String(waitMs));
  }
  if (premiumProxy) {
    params.set("premium_proxy", "true");
  }

  const startMs = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(`${SCRAPINGBEE_BASE}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "text/html" },
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - startMs;

    const html = await resp.text();

    // ScrapingBee returns status in headers
    const resolvedUrl = resp.headers.get("Spb-Resolved-Url") || url;
    const costCredits = renderJs ? (premiumProxy ? 25 : 5) : (premiumProxy ? 10 : 1);

    await logAPICall({
      provider: "scrapingbee",
      endpoint: "render",
      status_code: resp.status,
      response_time_ms: elapsed,
      is_success: resp.ok,
      metadata: { url, renderJs, premiumProxy, costCredits },
    }).catch(() => {});

    if (!resp.ok) {
      throw new Error(
        `ScrapingBee returned ${resp.status}: ${html.slice(0, 200)}`
      );
    }

    return {
      html,
      statusCode: resp.status,
      resolvedUrl,
      costCredits,
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Check if ScrapingBee API key is configured.
 */
export function isScrapingBeeConfigured(): boolean {
  return !!process.env.SCRAPINGBEE_API_KEY;
}
