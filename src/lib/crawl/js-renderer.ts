/**
 * Unified JS rendering abstraction.
 *
 * Routes to either self-hosted Chromium (via internal API) or
 * ScrapingBee based on JS_RENDERER env var.
 *
 * Provides the same interface so the site-crawler doesn't need
 * to know which backend is in use.
 */

import {
  fetchWithScrapingBee,
  isScrapingBeeConfigured,
} from "@/lib/api/scrapingbee";

// ================================================================
// Types
// ================================================================

interface JsRenderResult {
  html: string;
  statusCode: number;
  resolvedUrl: string;
  loadTimeMs: number;
}

type Renderer = "chromium" | "scrapingbee" | "none";

// ================================================================
// Configuration
// ================================================================

function getRenderer(): Renderer {
  const val = (process.env.JS_RENDERER || "chromium").toLowerCase();
  if (val === "scrapingbee") return "scrapingbee";
  if (val === "none") return "none";
  return "chromium";
}

/**
 * Check if any JS rendering backend is available.
 * Replaces `isScrapingBeeConfigured()` in the crawler.
 */
export function isJsRenderingAvailable(): boolean {
  const renderer = getRenderer();
  if (renderer === "none") return false;
  if (renderer === "scrapingbee") return isScrapingBeeConfigured();
  // Chromium: available if INTERNAL_API_SECRET is set
  return !!process.env.INTERNAL_API_SECRET;
}

/**
 * Render a URL with JavaScript execution.
 * Replaces `fetchWithScrapingBee()` in the crawler.
 */
export async function fetchWithJsRendering(
  url: string,
  options: { waitMs?: number; timeoutMs?: number; premiumProxy?: boolean } = {}
): Promise<JsRenderResult | null> {
  const renderer = getRenderer();

  if (renderer === "none") return null;

  if (renderer === "scrapingbee") {
    return fetchViaScrapingBee(url, options);
  }

  // Default: chromium with ScrapingBee fallback
  try {
    return await fetchViaChromium(url, options);
  } catch (err) {
    console.warn(
      "[js-renderer] Chromium rendering failed, trying ScrapingBee fallback:",
      err
    );
    if (isScrapingBeeConfigured()) {
      return fetchViaScrapingBee(url, options);
    }
    return null;
  }
}

// ================================================================
// Chromium backend (self-hosted via internal API)
// ================================================================

async function fetchViaChromium(
  url: string,
  options: { waitMs?: number; timeoutMs?: number }
): Promise<JsRenderResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4001";
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    throw new Error("INTERNAL_API_SECRET not configured for Chromium rendering");
  }

  const timeoutMs = options.timeoutMs ?? 30000;

  const response = await fetch(`${appUrl}/api/internal/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify({
      urls: [url],
      options: {
        timeoutMs: Math.min(timeoutMs, 15000),
        extraWaitMs: options.waitMs ?? 0,
        blockResources: true,
      },
    }),
    signal: AbortSignal.timeout(timeoutMs + 10000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Render API returned ${response.status}: ${text.slice(0, 200)}`
    );
  }

  const data = await response.json();
  const result = data.results?.[0];

  if (!result) {
    throw new Error("Render API returned empty results");
  }

  return result;
}

// ================================================================
// ScrapingBee backend (external API, fallback)
// ================================================================

async function fetchViaScrapingBee(
  url: string,
  options: { waitMs?: number; timeoutMs?: number; premiumProxy?: boolean }
): Promise<JsRenderResult> {
  const start = Date.now();
  const result = await fetchWithScrapingBee(url, {
    renderJs: true,
    waitMs: options.waitMs ?? 5000,
    premiumProxy: options.premiumProxy ?? false,
    timeoutMs: options.timeoutMs ?? 30000,
    blockAds: true,
  });
  return {
    html: result.html,
    statusCode: result.statusCode,
    resolvedUrl: result.resolvedUrl,
    loadTimeMs: Date.now() - start,
  };
}
