/**
 * Multi-page site crawler for site audits.
 *
 * Discovers pages via sitemap.xml and link extraction,
 * then fetches each page to extract on-page SEO signals.
 */

import * as cheerio from "cheerio";

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
}

interface CrawlOptions {
  maxPages: number;
  timeoutMs?: number;
  concurrency?: number;
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
        headers: { "User-Agent": "OpticRank-Bot/1.0 (SEO Audit)" },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!resp.ok) continue;

      const text = await resp.text();
      if (!text.includes("<urlset") && !text.includes("<sitemapindex")) continue;

      const $ = cheerio.load(text, { xmlMode: true });

      // Handle sitemap index (references other sitemaps)
      const sitemapRefs = $("sitemap > loc").map((_, el) => $(el).text().trim()).get();
      if (sitemapRefs.length > 0) {
        // Fetch first 3 sub-sitemaps
        for (const subUrl of sitemapRefs.slice(0, 3)) {
          try {
            const subCtrl = new AbortController();
            const subTimeout = setTimeout(() => subCtrl.abort(), 10000);
            const subResp = await fetch(subUrl, {
              signal: subCtrl.signal,
              headers: { "User-Agent": "OpticRank-Bot/1.0 (SEO Audit)" },
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

      if (urls.length > 0) break; // Found URLs, stop trying other sitemap locations
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
      // Only include same-domain links
      if (resolved.hostname === base.hostname || resolved.hostname === `www.${base.hostname}` || `www.${resolved.hostname}` === base.hostname) {
        // Clean up: remove hash, normalize
        resolved.hash = "";
        const clean = resolved.toString();
        // Skip non-HTML resources
        if (!/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|mp4|mp3|woff|woff2|ttf|ico)$/i.test(clean)) {
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
// Single Page Analysis
// ================================================================

async function analyzePage(url: string, timeoutMs: number = 15000): Promise<CrawledPage | null> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OpticRank-Bot/1.0 (SEO Audit)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const loadTimeMs = Date.now() - start;

    if (!resp.ok) {
      return {
        url,
        statusCode: resp.status,
        title: null,
        metaDescription: null,
        h1: null,
        wordCount: 0,
        hasSchema: false,
        schemaTypes: [],
        hasOgTags: false,
        hasFaqSchema: false,
        hasHowToSchema: false,
        hasSpeakableSchema: false,
        hasArticleSchema: false,
        hasOrganizationSchema: false,
        hasCanonical: false,
        canonicalUrl: null,
        hasBreadcrumbs: false,
        lang: null,
        questionCount: 0,
        listCount: 0,
        h2Count: 0,
        h3Count: 0,
        internalLinks: 0,
        externalLinks: 0,
        imageCount: 0,
        imagesWithoutAlt: 0,
        loadTimeMs,
      };
    }

    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return null; // Skip non-HTML
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    // Title
    const title = $("title").first().text().trim() || null;

    // Meta description
    const metaDescription = $('meta[name="description"]').attr("content")?.trim() || null;

    // H1
    const h1 = $("h1").first().text().trim() || null;

    // Word count (body text only)
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;

    // Schema markup
    const schemaScripts = $('script[type="application/ld+json"]');
    const schemaTypes: string[] = [];
    let hasFaqSchema = false;
    let hasHowToSchema = false;
    let hasSpeakableSchema = false;
    let hasArticleSchema = false;
    let hasOrganizationSchema = false;
    let hasBreadcrumbs = false;
    schemaScripts.each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || "{}");
        const type = json["@type"];
        if (type) {
          const types = Array.isArray(type) ? type : [type];
          schemaTypes.push(...types);
          if (types.some((t: string) => t === "FAQPage")) hasFaqSchema = true;
          if (types.some((t: string) => t === "HowTo")) hasHowToSchema = true;
          if (types.some((t: string) => t === "Article" || t === "NewsArticle" || t === "BlogPosting")) hasArticleSchema = true;
          if (types.some((t: string) => t === "Organization" || t === "LocalBusiness")) hasOrganizationSchema = true;
          if (types.some((t: string) => t === "BreadcrumbList")) hasBreadcrumbs = true;
        }
        if (json.speakable) hasSpeakableSchema = true;
      } catch {
        // Invalid JSON-LD
      }
    });
    const hasSchema = schemaTypes.length > 0;
    // Also detect breadcrumbs via nav[aria-label] or .breadcrumb
    if (!hasBreadcrumbs) {
      hasBreadcrumbs = $('nav[aria-label*="breadcrumb"], nav[aria-label*="Breadcrumb"], .breadcrumb, .breadcrumbs, [itemtype*="BreadcrumbList"]').length > 0;
    }

    // Language
    const lang = $("html").attr("lang")?.trim() || null;

    // Question headings (H2/H3 that start with question words or contain ?)
    const questionPattern = /^(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would)\b/i;
    let questionCount = 0;
    $("h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes("?") || questionPattern.test(text)) questionCount++;
    });

    // Lists (ol, ul with at least 2 items)
    let listCount = 0;
    $("ol, ul").each((_, el) => {
      if ($(el).children("li").length >= 2) listCount++;
    });

    // Heading counts
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;

    // OG tags
    const hasOgTags = $('meta[property^="og:"]').length > 0;

    // Canonical
    const canonicalUrl = $('link[rel="canonical"]').attr("href") || null;
    const hasCanonical = !!canonicalUrl;

    // Links
    const baseHost = new URL(url).hostname;
    let internalLinks = 0;
    let externalLinks = 0;
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === baseHost || linkUrl.hostname === `www.${baseHost}` || `www.${linkUrl.hostname}` === baseHost) {
          internalLinks++;
        } else if (linkUrl.protocol.startsWith("http")) {
          externalLinks++;
        }
      } catch {
        // Relative or malformed
        internalLinks++;
      }
    });

    // Images
    const imageCount = $("img").length;
    const imagesWithoutAlt = $("img:not([alt]), img[alt='']").length;

    return {
      url,
      statusCode: resp.status,
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
    };
  } catch {
    return null;
  }
}

// ================================================================
// Multi-Page Crawl
// ================================================================

export async function crawlSite(
  domain: string,
  options: CrawlOptions
): Promise<CrawledPage[]> {
  const { maxPages, timeoutMs = 15000, concurrency = 3 } = options;
  const results: CrawledPage[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Normalize domain
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const rootUrl = `https://${cleanDomain}`;

  // 1. Try sitemap discovery first
  const sitemapUrls = await fetchSitemapUrls(cleanDomain);

  if (sitemapUrls.length > 0) {
    // Add sitemap URLs to queue (prioritize unique paths)
    const seen = new Set<string>();
    for (const u of sitemapUrls) {
      try {
        const parsed = new URL(u);
        const normalized = `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
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

  // 2. Crawl pages with concurrency control
  while (queue.length > 0 && results.length < maxPages) {
    const batch = queue.splice(0, concurrency);
    const promises = batch.map(async (url) => {
      // Normalize for dedup
      const normalized = url.replace(/\/$/, "");
      if (visited.has(normalized)) return null;
      visited.add(normalized);

      return analyzePage(url, timeoutMs);
    });

    const batchResults = await Promise.all(promises);

    for (const page of batchResults) {
      if (!page || results.length >= maxPages) continue;
      results.push(page);

      // If we got the root page and no sitemap URLs, extract links for discovery
      if (sitemapUrls.length === 0 && results.length === 1) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          const resp = await fetch(page.url, {
            signal: controller.signal,
            headers: { "User-Agent": "OpticRank-Bot/1.0 (SEO Audit)" },
            redirect: "follow",
          });
          clearTimeout(timeout);

          if (resp.ok) {
            const html = await resp.text();
            const links = extractLinksFromHtml(html, page.url);
            for (const link of links) {
              const norm = link.replace(/\/$/, "");
              if (!visited.has(norm)) {
                queue.push(link);
              }
            }
          }
        } catch {
          // Continue with what we have
        }
      }
    }
  }

  return results;
}
