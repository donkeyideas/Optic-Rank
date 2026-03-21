/**
 * Multi-page site crawler for site audits.
 *
 * Discovers pages via sitemap.xml and link extraction,
 * then fetches each page to extract on-page SEO signals.
 *
 * Strategy:
 * 1. Fetch and respect robots.txt disallow rules
 * 2. Try fast plain fetch() first with a realistic User-Agent
 * 3. Detect SPA/JS-heavy pages (low content despite 200 status)
 * 4. Re-fetch sparse pages via self-hosted Chromium JS renderer
 */

import * as cheerio from "cheerio";
import {
  fetchWithJsRendering,
  isJsRenderingAvailable,
} from "@/lib/crawl/js-renderer";

// ================================================================
// Types
// ================================================================

export interface CrawledPage {
  url: string;
  statusCode: number;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  hasSchema: boolean;
  schemaTypes: string[];
  hasOgTags: boolean;
  hasFaqSchema: boolean;
  hasHowToSchema: boolean;
  hasSpeakableSchema: boolean;
  hasArticleSchema: boolean;
  hasOrganizationSchema: boolean;
  hasCanonical: boolean;
  canonicalUrl: string | null;
  hasBreadcrumbs: boolean;
  lang: string | null;
  questionCount: number;
  listCount: number;
  h2Count: number;
  h3Count: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  imagesWithoutAlt: number;
  loadTimeMs: number;
  /** Whether this page was rendered via JS rendering (self-hosted Chromium) */
  jsRendered?: boolean;
  /** Whether the page was detected as a SPA/JS-heavy page (regardless of rendering) */
  detectedAsSPA?: boolean;
}

interface CrawlOptions {
  maxPages: number;
  timeoutMs?: number;
  concurrency?: number;
}

// Realistic browser User-Agent to avoid basic bot blocks
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const BOT_UA = "OpticRank-Bot/1.0 (SEO Audit)";

// ================================================================
// SPA / JS-Heavy Detection
// ================================================================

/**
 * Heuristic to detect if a page is JS-heavy and needs rendering.
 * Returns true if the HTML appears to be a mostly-empty shell.
 *
 * Common false-negative scenario: Next.js/Nuxt sites where the layout
 * (nav, sidebar, footer) is server-rendered but page content is client-
 * rendered. The layout text can be 100-200 words, passing old thresholds.
 */
function isLikelySPA(html: string, $: cheerio.CheerioAPI): boolean {
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const scriptTags = $("script[src]").length;

  // ---------------------------------------------------------------
  // 1. Framework-specific detection (definitive markers)
  // ---------------------------------------------------------------

  // Next.js: __NEXT_DATA__ script or #__next container
  const isNextJs =
    $('script#__NEXT_DATA__').length > 0 || $("#__next").length > 0;

  // Nuxt: #__nuxt container or window.__NUXT__
  const isNuxt =
    $("#__nuxt").length > 0 || html.includes("window.__NUXT__");

  // Generic SPA: #root, #app, [data-reactroot], #__vue-root
  const hasFrameworkRoot =
    $("#root, #app, [data-reactroot], #__vue-root").length > 0;

  const isKnownFramework = isNextJs || isNuxt;

  // ---------------------------------------------------------------
  // 2. Content analysis for framework sites
  // ---------------------------------------------------------------

  if (isKnownFramework) {
    // Known framework detected. These sites often have SSR layouts
    // (nav, footer = 100-200 words) but client-rendered page content.
    // If body word count is low relative to a real content page, flag it.
    // A real content page typically has 300+ words of actual content
    // PLUS layout text. Under 250 total words means content is likely
    // client-rendered.
    if (wordCount < 250) return true;

    // Even with more words, if there are many script bundles and the
    // main content area (<main>, [role="main"], article) is nearly
    // empty, it's a SPA with SSR layout.
    const mainContent = $("main, [role='main'], article").text().replace(/\s+/g, " ").trim();
    const mainWordCount = mainContent ? mainContent.split(/\s+/).length : 0;
    if (mainWordCount < 50 && scriptTags > 3) return true;
  }

  // ---------------------------------------------------------------
  // 3. Generic SPA root with minimal content
  // ---------------------------------------------------------------

  if (hasFrameworkRoot) {
    const rootDiv = $("#root, #app, [data-reactroot], #__vue-root");
    const rootText = rootDiv.text().replace(/\s+/g, " ").trim();
    // Raised from 50 to 100 chars to catch layouts with nav text
    if (rootText.length < 100) return true;
  }

  // ---------------------------------------------------------------
  // 4. General heuristics (non-framework sites)
  // ---------------------------------------------------------------

  const title = $("title").text().trim();

  // Has a title but almost no body text = SPA shell
  if (title && wordCount < 30) return true;

  // Large amount of JS bundles relative to content
  if (scriptTags > 5 && wordCount < 100) return true;

  // Noscript tag telling user to enable JS
  const noscript = $("noscript").text().toLowerCase();
  if (
    noscript.includes("javascript") ||
    noscript.includes("enable javascript") ||
    noscript.includes("need to enable")
  ) {
    return true;
  }

  return false;
}

/**
 * Check if the initial fetch returned very sparse content that
 * would benefit from JS rendering (even for non-SPA sites that
 * block bots or return login walls).
 */
function isSparseResult(page: CrawledPage): boolean {
  // No title and no content = likely blocked or empty shell
  if (!page.title && page.wordCount < 20) return true;

  // Has title but almost no content, OG tags, or schema
  if (
    page.wordCount < 50 &&
    !page.hasOgTags &&
    !page.hasSchema &&
    page.statusCode === 200
  ) {
    return true;
  }

  // Page with title but thin content and no H1 = likely client-rendered
  // (SSR layouts provide the title but H1/content comes from client JS)
  if (page.title && !page.h1 && page.wordCount < 200 && page.statusCode === 200) {
    return true;
  }

  return false;
}

// ================================================================
// Robots.txt Parsing
// ================================================================

/**
 * Fetch and parse robots.txt for the given domain.
 * Extracts Disallow paths for User-agent: * (and our bot UA).
 * Returns an array of disallowed path prefixes.
 */
async function fetchRobotsTxtRules(domain: string): Promise<string[]> {
  const disallowed: string[] = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(`https://${domain}/robots.txt`, {
      signal: controller.signal,
      headers: { "User-Agent": BOT_UA },
    });
    clearTimeout(timeout);

    if (!resp.ok) return [];

    const text = await resp.text();
    const lines = text.split("\n");

    let inRelevantBlock = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;

      const lower = line.toLowerCase();
      if (lower.startsWith("user-agent:")) {
        const agent = lower.replace("user-agent:", "").trim();
        inRelevantBlock = agent === "*" || agent.includes("opticrank");
      } else if (lower.startsWith("disallow:") && inRelevantBlock) {
        const path = line.replace(/^disallow:\s*/i, "").trim();
        if (path) disallowed.push(path);
      }
    }
  } catch {
    // robots.txt not available — proceed without restrictions
  }
  return disallowed;
}

/**
 * Check if a URL is blocked by robots.txt disallow rules.
 */
function isBlockedByRobots(url: string, disallowedPaths: string[]): boolean {
  if (disallowedPaths.length === 0) return false;
  try {
    const { pathname } = new URL(url);
    return disallowedPaths.some((rule) => pathname.startsWith(rule));
  } catch {
    return false;
  }
}

// ================================================================
// Sitemap Discovery
// ================================================================

async function fetchSitemapUrls(domain: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapLocations = [
    `https://${domain}/sitemap.xml`,
    `https://${domain}/sitemap_index.xml`,
    `https://www.${domain}/sitemap.xml`,
  ];

  for (const sitemapUrl of sitemapLocations) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(sitemapUrl, {
        signal: controller.signal,
        headers: { "User-Agent": BROWSER_UA },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!resp.ok) continue;

      const text = await resp.text();
      if (!text.includes("<urlset") && !text.includes("<sitemapindex"))
        continue;

      const $ = cheerio.load(text, { xmlMode: true });

      // Handle sitemap index (references other sitemaps)
      const sitemapRefs = $("sitemap > loc")
        .map((_, el) => $(el).text().trim())
        .get();
      if (sitemapRefs.length > 0) {
        // Fetch first 10 sub-sitemaps
        for (const subUrl of sitemapRefs.slice(0, 10)) {
          try {
            const subCtrl = new AbortController();
            const subTimeout = setTimeout(() => subCtrl.abort(), 10000);
            const subResp = await fetch(subUrl, {
              signal: subCtrl.signal,
              headers: { "User-Agent": BROWSER_UA },
              redirect: "follow",
            });
            clearTimeout(subTimeout);

            if (subResp.ok) {
              const subText = await subResp.text();
              const sub$ = cheerio.load(subText, { xmlMode: true });
              sub$("url > loc").each((_, el) => {
                urls.push(sub$(el).text().trim());
              });
            }
          } catch {
            // Skip failed sub-sitemaps
          }
        }
      }

      // Direct URL entries
      $("url > loc").each((_, el) => {
        urls.push($(el).text().trim());
      });

      if (urls.length > 0) break;
    } catch {
      // Continue to next sitemap location
    }
  }

  return urls;
}

// ================================================================
// Link Extraction from HTML
// ================================================================

function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: Set<string> = new Set();
  const base = new URL(baseUrl);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl);
      if (
        resolved.hostname === base.hostname ||
        resolved.hostname === `www.${base.hostname}` ||
        `www.${resolved.hostname}` === base.hostname
      ) {
        resolved.hash = "";
        const clean = resolved.toString();
        if (
          !/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|mp4|mp3|woff|woff2|ttf|ico)$/i.test(
            clean
          )
        ) {
          links.add(clean);
        }
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return Array.from(links);
}

// ================================================================
// HTML → CrawledPage extraction (shared by both fetch strategies)
// ================================================================

function extractPageSignals(
  url: string,
  html: string,
  statusCode: number,
  loadTimeMs: number,
  jsRendered: boolean = false
): CrawledPage {
  const $ = cheerio.load(html);

  // Title
  const title = $("title").first().text().trim() || null;

  // Meta description
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;

  // H1
  const h1 = $("h1").first().text().trim() || null;

  // Word count (body text only, strip scripts/styles)
  $("script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

  // Schema markup
  // Re-load the original HTML for schema extraction since we removed script tags above
  const $full = cheerio.load(html);
  const schemaScripts = $full('script[type="application/ld+json"]');
  const schemaTypes: string[] = [];
  let hasFaqSchema = false;
  let hasHowToSchema = false;
  let hasSpeakableSchema = false;
  let hasArticleSchema = false;
  let hasOrganizationSchema = false;
  let hasBreadcrumbs = false;

  schemaScripts.each((_, el) => {
    try {
      const raw = $full(el).html() || "{}";
      const json = JSON.parse(raw);
      // Handle @graph arrays (common in Yoast, RankMath, etc.)
      const items = json["@graph"]
        ? (json["@graph"] as Record<string, unknown>[])
        : [json];
      for (const item of items) {
        const type = item["@type"];
        if (type) {
          const types = Array.isArray(type) ? type : [type];
          schemaTypes.push(...(types as string[]));
          if (types.some((t: string) => t === "FAQPage" || t === "Question"))
            hasFaqSchema = true;
          if (types.some((t: string) => t === "HowTo")) hasHowToSchema = true;
          if (
            types.some(
              (t: string) =>
                t === "Article" || t === "NewsArticle" || t === "BlogPosting"
            )
          )
            hasArticleSchema = true;
          if (
            types.some(
              (t: string) => t === "Organization" || t === "LocalBusiness"
            )
          )
            hasOrganizationSchema = true;
          if (types.some((t: string) => t === "BreadcrumbList"))
            hasBreadcrumbs = true;
        }
        if (item.speakable) hasSpeakableSchema = true;
      }
    } catch {
      // Invalid JSON-LD
    }
  });
  const hasSchema = schemaTypes.length > 0;

  // Also detect breadcrumbs via nav[aria-label] or .breadcrumb
  if (!hasBreadcrumbs) {
    hasBreadcrumbs =
      $full(
        'nav[aria-label*="breadcrumb"], nav[aria-label*="Breadcrumb"], .breadcrumb, .breadcrumbs, [itemtype*="BreadcrumbList"]'
      ).length > 0;
  }

  // Language
  const lang = $full("html").attr("lang")?.trim() || null;

  // Question headings (H2/H3 that start with question words or contain ?)
  const questionPattern =
    /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would)\b/i;
  let questionCount = 0;
  $full("h2, h3").each((_, el) => {
    const text = $full(el).text().trim();
    if (text.includes("?") || questionPattern.test(text)) questionCount++;
  });

  // Lists (ol, ul with at least 2 items)
  let listCount = 0;
  $full("ol, ul").each((_, el) => {
    if ($full(el).children("li").length >= 2) listCount++;
  });

  // Heading counts
  const h2Count = $full("h2").length;
  const h3Count = $full("h3").length;

  // OG tags
  const hasOgTags = $full('meta[property^="og:"]').length > 0;

  // Canonical
  const canonicalUrl = $full('link[rel="canonical"]').attr("href") || null;
  const hasCanonical = !!canonicalUrl;

  // Links
  const baseHost = new URL(url).hostname;
  let internalLinks = 0;
  let externalLinks = 0;
  $full("a[href]").each((_, el) => {
    const href = $full(el).attr("href");
    if (!href) return;
    try {
      const linkUrl = new URL(href, url);
      if (
        linkUrl.hostname === baseHost ||
        linkUrl.hostname === `www.${baseHost}` ||
        `www.${linkUrl.hostname}` === baseHost
      ) {
        internalLinks++;
      } else if (linkUrl.protocol.startsWith("http")) {
        externalLinks++;
      }
    } catch {
      internalLinks++;
    }
  });

  // Images
  const imageCount = $full("img").length;
  const imagesWithoutAlt = $full("img:not([alt]), img[alt='']").length;

  return {
    url,
    statusCode,
    title,
    metaDescription,
    h1,
    wordCount,
    hasSchema,
    schemaTypes,
    hasOgTags,
    hasFaqSchema,
    hasHowToSchema,
    hasSpeakableSchema,
    hasArticleSchema,
    hasOrganizationSchema,
    hasCanonical,
    canonicalUrl,
    hasBreadcrumbs,
    lang,
    questionCount,
    listCount,
    h2Count,
    h3Count,
    internalLinks,
    externalLinks,
    imageCount,
    imagesWithoutAlt,
    loadTimeMs,
    jsRendered,
  };
}

// ================================================================
// Single Page Fetch (plain fetch)
// ================================================================

async function fetchPageHtml(
  url: string,
  timeoutMs: number
): Promise<{ html: string; statusCode: number; loadTimeMs: number } | null> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const loadTimeMs = Date.now() - start;

    if (!resp.ok) {
      return { html: "", statusCode: resp.status, loadTimeMs };
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }

    const html = await resp.text();
    return { html, statusCode: resp.status, loadTimeMs };
  } catch {
    return null;
  }
}

// ================================================================
// Single Page Fetch via JS Rendering (self-hosted Chromium)
// ================================================================

async function fetchPageWithJsRendering(
  url: string
): Promise<{ html: string; statusCode: number; loadTimeMs: number } | null> {
  try {
    const result = await fetchWithJsRendering(url, {
      waitMs: 0,
      timeoutMs: 30000,
    });
    if (!result) return null;
    return {
      html: result.html,
      statusCode: result.statusCode,
      loadTimeMs: result.loadTimeMs,
    };
  } catch (err) {
    console.warn(`JS rendering failed for ${url}:`, err);
    return null;
  }
}

// ================================================================
// Single Page Analysis (with SPA fallback)
// ================================================================

async function analyzePage(
  url: string,
  timeoutMs: number = 15000,
  useJsRendering: boolean = false
): Promise<CrawledPage | null> {
  // Step 1: Try plain fetch first
  const plainResult = await fetchPageHtml(url, timeoutMs);

  if (!plainResult) return null;

  if (plainResult.statusCode !== 200 || !plainResult.html) {
    return extractPageSignals(
      url,
      plainResult.html || "",
      plainResult.statusCode,
      plainResult.loadTimeMs
    );
  }

  // Step 2: Parse and check if it's a JS-heavy page
  const $ = cheerio.load(plainResult.html);
  const page = extractPageSignals(
    url,
    plainResult.html,
    plainResult.statusCode,
    plainResult.loadTimeMs
  );

  const needsJsRendering =
    isLikelySPA(plainResult.html, $) || isSparseResult(page);

  // Always mark whether SPA was detected (even if we can't render it)
  page.detectedAsSPA = needsJsRendering;

  // Step 3: If sparse/SPA and ScrapingBee is available, re-fetch with JS rendering
  if (needsJsRendering && useJsRendering) {
    const jsResult = await fetchPageWithJsRendering(url);
    if (jsResult && jsResult.html) {
      const jsPage = extractPageSignals(
        url,
        jsResult.html,
        jsResult.statusCode,
        jsResult.loadTimeMs,
        true
      );
      jsPage.detectedAsSPA = true;

      // Only use JS-rendered result if it's actually richer
      if (
        jsPage.wordCount > page.wordCount ||
        (jsPage.hasOgTags && !page.hasOgTags) ||
        (jsPage.hasSchema && !page.hasSchema)
      ) {
        return jsPage;
      }
    }
  }

  return page;
}

// ================================================================
// Multi-Page Crawl
// ================================================================

export interface CrawlResult {
  pages: CrawledPage[];
  /** Whether the site was detected as a JS-heavy SPA */
  siteIsSPA: boolean;
  /** Whether JS rendering (self-hosted Chromium) was used */
  jsRenderingUsed: boolean;
}

export async function crawlSite(
  domain: string,
  options: CrawlOptions
): Promise<CrawlResult> {
  const { maxPages, timeoutMs = 15000, concurrency = 3 } = options;
  const results: CrawledPage[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];
  const useJsRendering = isJsRenderingAvailable();

  // Normalize domain
  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const rootUrl = `https://${cleanDomain}`;

  // 0. Fetch robots.txt rules to respect Disallow directives
  const disallowedPaths = await fetchRobotsTxtRules(cleanDomain);
  if (disallowedPaths.length > 0) {
    console.log(`[crawler] Loaded ${disallowedPaths.length} robots.txt disallow rules for ${cleanDomain}`);
  }

  // 1. Try sitemap discovery first
  const sitemapUrls = await fetchSitemapUrls(cleanDomain);

  if (sitemapUrls.length > 0) {
    const seen = new Set<string>();
    for (const u of sitemapUrls) {
      try {
        const parsed = new URL(u);
        const normalized = `${parsed.origin}${parsed.pathname}`.replace(
          /\/$/,
          ""
        );
        if (!seen.has(normalized)) {
          seen.add(normalized);
          queue.push(u);
        }
      } catch {
        queue.push(u);
      }
    }
  }

  // Always ensure root URL is in queue
  if (!queue.includes(rootUrl) && !queue.includes(rootUrl + "/")) {
    queue.unshift(rootUrl);
  }

  // 2. Crawl the homepage first to detect if the site needs JS rendering
  let siteNeedsJsRendering = false;
  const rootNormalized = rootUrl.replace(/\/$/, "");
  visited.add(rootNormalized);

  const rootPage = await analyzePage(rootUrl, timeoutMs, useJsRendering);
  if (rootPage) {
    results.push(rootPage);
    // Flag site as SPA if the homepage was DETECTED as SPA (not just rendered)
    siteNeedsJsRendering = rootPage.detectedAsSPA === true;

    // Extract links for discovery if no sitemap
    if (sitemapUrls.length === 0) {
      const rootHtml = await fetchPageHtml(rootPage.url, timeoutMs);
      if (rootHtml?.html) {
        const links = extractLinksFromHtml(rootHtml.html, rootPage.url);
        for (const link of links) {
          const norm = link.replace(/\/$/, "");
          if (!visited.has(norm)) {
            queue.push(link);
          }
        }
      }
    }
  }

  // Remove root from queue since we already crawled it
  const rootIdx = queue.findIndex(
    (u) => u.replace(/\/$/, "") === rootNormalized
  );
  if (rootIdx !== -1) queue.splice(rootIdx, 1);

  // 3. Crawl remaining pages with concurrency control
  // If root needed JS rendering, use it for all pages on this site
  // but limit to fewer pages to conserve resources
  const effectiveMax = siteNeedsJsRendering
    ? Math.min(maxPages, 10)
    : maxPages;
  // Lower concurrency for JS rendering to avoid overloading renderer
  const effectiveConcurrency = siteNeedsJsRendering
    ? Math.min(concurrency, 2)
    : concurrency;

  while (queue.length > 0 && results.length < effectiveMax) {
    const batch = queue.splice(0, effectiveConcurrency);
    const promises = batch.map(async (url) => {
      const normalized = url.replace(/\/$/, "");
      if (visited.has(normalized)) return null;
      visited.add(normalized);

      // Skip URLs blocked by robots.txt
      if (isBlockedByRobots(url, disallowedPaths)) return null;

      // If the site was detected as SPA, use JS rendering for all pages
      return analyzePage(
        url,
        timeoutMs,
        siteNeedsJsRendering && useJsRendering
      );
    });

    const batchResults = await Promise.all(promises);

    for (const page of batchResults) {
      if (!page || results.length >= effectiveMax) continue;
      results.push(page);
    }
  }

  // Post-crawl heuristic: if the homepage didn't trigger SPA detection
  // but a majority of inner pages look like empty shells, flag the site.
  // This catches cases where the homepage is SSG but inner pages are CSR.
  if (!siteNeedsJsRendering && results.length >= 3) {
    const okPages = results.filter((p) => p.statusCode === 200);
    const thinPages = okPages.filter(
      (p) => p.wordCount < 300 && !p.h1
    );
    // If >50% of pages are thin with no H1, site is very likely SPA
    if (thinPages.length > okPages.length * 0.5) {
      siteNeedsJsRendering = true;
    }
    // Also check if any page was individually detected as SPA
    if (results.some((p) => p.detectedAsSPA)) {
      siteNeedsJsRendering = true;
    }
  }

  // JS rendering is only considered "used" if it actually improved content.
  // If pages are still thin after rendering, issues are still false positives
  // from unrenderable client-side content (API-loaded data, auth-gated, etc.).
  const jsRenderingActuallyHelped =
    siteNeedsJsRendering &&
    useJsRendering &&
    results.some((p) => p.jsRendered && p.wordCount >= 300);

  return {
    pages: results,
    siteIsSPA: siteNeedsJsRendering,
    jsRenderingUsed: jsRenderingActuallyHelped,
  };
}
