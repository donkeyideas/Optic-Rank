/**
 * Self-hosted headless Chrome renderer.
 *
 * Uses puppeteer-core + @sparticuz/chromium on Vercel/Lambda,
 * or system Chrome for local development.
 * Replaces ScrapingBee for zero-cost JS rendering.
 */

import type { Browser, Page } from "puppeteer-core";
import { logAPICall } from "@/lib/api/api-logger";
import * as fs from "fs";

// ================================================================
// Types
// ================================================================

export interface BrowserRenderResult {
  html: string;
  statusCode: number;
  resolvedUrl: string;
  loadTimeMs: number;
}

export interface BrowserRenderOptions {
  /** Wait for network idle before extracting HTML (default: true) */
  waitForNetworkIdle?: boolean;
  /** Additional wait time in ms after page load (default: 0) */
  extraWaitMs?: number;
  /** Timeout per page in ms (default: 15000) */
  timeoutMs?: number;
  /** Block images/fonts/media for faster loads (default: true) */
  blockResources?: boolean;
  /** Viewport width (default: 1280) */
  viewportWidth?: number;
  /** Viewport height (default: 720) */
  viewportHeight?: number;
}

// ================================================================
// Environment detection
// ================================================================

function isServerless(): boolean {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

const LOCAL_CHROME_PATHS = [
  // Windows
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  // Linux
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function findLocalChrome(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  for (const p of LOCAL_CHROME_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }

  throw new Error(
    "No Chrome/Chromium found. Set CHROME_PATH environment variable or install Chrome."
  );
}

// ================================================================
// Browser lifecycle
// ================================================================

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;

  const puppeteer = await import("puppeteer-core");

  if (isServerless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    browserInstance = await puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    browserInstance = await puppeteer.default.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
      defaultViewport: { width: 1280, height: 720 },
      executablePath: findLocalChrome(),
    });
  }

  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

// ================================================================
// Page rendering
// ================================================================

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BLOCKED_RESOURCE_TYPES = new Set([
  "image",
  "font",
  "media",
  "stylesheet",
]);

export async function renderPage(
  url: string,
  options: BrowserRenderOptions = {}
): Promise<BrowserRenderResult> {
  const {
    waitForNetworkIdle = true,
    extraWaitMs = 0,
    timeoutMs = 15000,
    blockResources = true,
    viewportWidth = 1280,
    viewportHeight = 720,
  } = options;

  const browser = await getBrowser();
  const page: Page = await browser.newPage();

  try {
    await page.setViewport({ width: viewportWidth, height: viewportHeight });
    await page.setUserAgent(USER_AGENT);

    // Block heavy resources to speed up rendering
    if (blockResources) {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (BLOCKED_RESOURCE_TYPES.has(req.resourceType())) {
          req.abort().catch(() => {});
        } else {
          req.continue().catch(() => {});
        }
      });
    }

    const startMs = Date.now();

    const response = await page.goto(url, {
      waitUntil: waitForNetworkIdle ? "networkidle2" : "domcontentloaded",
      timeout: timeoutMs,
    });

    if (extraWaitMs > 0) {
      await new Promise((r) => setTimeout(r, extraWaitMs));
    }

    const html = await page.content();
    const loadTimeMs = Date.now() - startMs;
    const statusCode = response?.status() ?? 0;
    const resolvedUrl = page.url();

    // Log for monitoring (fire-and-forget)
    logAPICall({
      provider: "chromium-self-hosted",
      endpoint: "render",
      status_code: statusCode,
      response_time_ms: loadTimeMs,
      is_success: statusCode >= 200 && statusCode < 400,
      cost_usd: 0,
      metadata: { url, resolvedUrl, blockResources },
    }).catch(() => {});

    return { html, statusCode, resolvedUrl, loadTimeMs };
  } finally {
    await page.close().catch(() => {});
  }
}

export async function renderPages(
  urls: string[],
  options: BrowserRenderOptions = {}
): Promise<BrowserRenderResult[]> {
  const results: BrowserRenderResult[] = [];

  for (const url of urls) {
    try {
      const result = await renderPage(url, options);
      results.push(result);
    } catch (err) {
      console.warn(`[browser-renderer] Failed to render ${url}:`, err);
      results.push({
        html: "",
        statusCode: 0,
        resolvedUrl: url,
        loadTimeMs: 0,
      });
    }
  }

  return results;
}
