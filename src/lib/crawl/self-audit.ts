/**
 * Self-Audit Crawler
 *
 * Crawls the Optic Rank site's own pages and analyzes them for
 * SEO, AEO, GEO, and CRO readiness. No external APIs needed —
 * just fetches our own pages and parses the HTML.
 */

import * as cheerio from "cheerio";

// ================================================================
// Types
// ================================================================

export interface CrawledPage {
  url: string;
  path: string;
  statusCode: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  descriptionLength: number;
  h1: string;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  wordCount: number;
  hasSchema: boolean;
  schemaTypes: string[];
  hasOgImage: boolean;
  ogTitle: string;
  ogDescription: string;
  hasCanonical: boolean;
  canonicalUrl: string;
  hasRobotsMeta: boolean;
  robotsContent: string;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  imagesWithoutAlt: number;
  loadTimeMs: number;
  // AEO signals
  hasFaqSchema: boolean;
  hasHowToSchema: boolean;
  questionCount: number; // h2/h3 that look like questions
  listCount: number; // ol/ul count
  // GEO signals
  hasArticleSchema: boolean;
  hasOrganizationSchema: boolean;
  hasBreadcrumbs: boolean;
  hasSpeakableSchema: boolean;
  metaKeywords: string;
  lang: string;
}

export interface SelfAuditResult {
  pages: CrawledPage[];
  crawledAt: string;
  siteUrl: string;
  totalPages: number;
  // Aggregate scores
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  croScore: number;
  technicalScore: number;
  contentScore: number;
  // Issues
  issues: AuditIssue[];
}

export interface AuditIssue {
  id: string;
  severity: "critical" | "warning" | "info";
  category: "seo" | "technical" | "content" | "aeo" | "geo" | "cro" | "performance";
  title: string;
  description: string;
  affectedPages: string[];
}

// ================================================================
// Known marketing routes to crawl
// ================================================================

const MARKETING_ROUTES = [
  "/",
  "/features",
  "/pricing",
  "/search-ai",
  "/docs",
  "/login",
  "/signup",
  "/forgot-password",
];

// ================================================================
// Main crawl function
// ================================================================

export async function crawlOwnSite(
  siteUrl?: string
): Promise<SelfAuditResult> {
  const baseUrl = siteUrl || process.env.SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const pages: CrawledPage[] = [];

  // Crawl all known routes in parallel (small site, safe to do)
  const results = await Promise.allSettled(
    MARKETING_ROUTES.map((path) => crawlPage(baseUrl, path))
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      pages.push(result.value);
    }
  }

  // Generate issues and compute scores
  const issues = generateIssues(pages);
  const scores = computeScores(pages);

  return {
    pages,
    crawledAt: new Date().toISOString(),
    siteUrl: baseUrl,
    totalPages: pages.length,
    ...scores,
    issues,
  };
}

// ================================================================
// Single page crawl
// ================================================================

async function crawlPage(
  baseUrl: string,
  path: string
): Promise<CrawledPage | null> {
  const url = `${baseUrl}${path}`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "OpticRank-SelfAudit/1.0",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    const loadTimeMs = Date.now() - start;
    const html = await response.text();
    const $ = cheerio.load(html);

    // Meta tags
    const title = $("title").first().text().trim();
    const metaDescription = $('meta[name="description"]').attr("content") ?? "";
    const h1 = $("h1").first().text().trim();
    const ogTitle = $('meta[property="og:title"]').attr("content") ?? "";
    const ogDescription = $('meta[property="og:description"]').attr("content") ?? "";
    const ogImage = $('meta[property="og:image"]').attr("content") ?? "";
    const canonical = $('link[rel="canonical"]').attr("href") ?? "";
    const robotsMeta = $('meta[name="robots"]').attr("content") ?? "";
    const metaKeywords = $('meta[name="keywords"]').attr("content") ?? "";
    const lang = $("html").attr("lang") ?? "";

    // Content analysis
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

    // Headings
    const h1Count = $("h1").length;
    const h2Count = $("h2").length;
    const h3Count = $("h3").length;

    // Questions in headings (for AEO)
    const questionPrefixes = ["what", "how", "why", "when", "where", "who", "which", "can", "does", "is"];
    let questionCount = 0;
    $("h2, h3").each((_, el) => {
      const text = $(el).text().toLowerCase().trim();
      if (text.endsWith("?") || questionPrefixes.some((p) => text.startsWith(p + " "))) {
        questionCount++;
      }
    });

    // Lists
    const listCount = $("ul, ol").length;

    // Links
    const links = $("a[href]");
    let internalLinks = 0;
    let externalLinks = 0;
    links.each((_, el) => {
      const href = $(el).attr("href") ?? "";
      if (href.startsWith("/") || href.startsWith(baseUrl)) {
        internalLinks++;
      } else if (href.startsWith("http")) {
        externalLinks++;
      }
    });

    // Images
    const images = $("img");
    let imagesWithoutAlt = 0;
    images.each((_, el) => {
      if (!$(el).attr("alt")) imagesWithoutAlt++;
    });

    // Schema / structured data
    const schemaScripts = $('script[type="application/ld+json"]');
    const schemaTypes: string[] = [];
    let hasFaqSchema = false;
    let hasHowToSchema = false;
    let hasArticleSchema = false;
    let hasOrganizationSchema = false;
    let hasSpeakableSchema = false;
    let hasBreadcrumbs = false;

    schemaScripts.each((_, el) => {
      try {
        const json = JSON.parse($(el).html() ?? "{}");
        // Handle @graph arrays (common in Yoast, RankMath, etc.)
        const items: Record<string, unknown>[] = json["@graph"]
          ? (json["@graph"] as Record<string, unknown>[])
          : Array.isArray(json)
            ? json
            : [json];
        for (const item of items) {
          const type = item["@type"];
          if (type) {
            const typeArr = Array.isArray(type) ? type : [type];
            for (const t of typeArr) {
              if (t) {
                schemaTypes.push(t as string);
                if (t === "FAQPage" || t === "Question") hasFaqSchema = true;
                if (t === "HowTo") hasHowToSchema = true;
                if (t === "Article" || t === "BlogPosting" || t === "NewsArticle") hasArticleSchema = true;
                if (t === "Organization" || t === "LocalBusiness") hasOrganizationSchema = true;
                if (t === "BreadcrumbList") hasBreadcrumbs = true;
              }
            }
          }
          if (item.speakable) hasSpeakableSchema = true;
        }
      } catch {
        // Invalid JSON-LD
      }
    });

    // Also detect breadcrumbs via HTML patterns
    if (!hasBreadcrumbs) {
      hasBreadcrumbs =
        $('[itemtype*="BreadcrumbList"]').length > 0 ||
        $(".breadcrumb, .breadcrumbs, [aria-label='breadcrumb']").length > 0;
    }

    return {
      url,
      path,
      statusCode: response.status,
      title,
      titleLength: title.length,
      metaDescription,
      descriptionLength: metaDescription.length,
      h1,
      h1Count,
      h2Count,
      h3Count,
      wordCount,
      hasSchema: schemaTypes.length > 0,
      schemaTypes,
      hasOgImage: ogImage.length > 0,
      ogTitle,
      ogDescription,
      hasCanonical: canonical.length > 0,
      canonicalUrl: canonical,
      hasRobotsMeta: robotsMeta.length > 0,
      robotsContent: robotsMeta,
      internalLinks,
      externalLinks,
      imageCount: images.length,
      imagesWithoutAlt,
      loadTimeMs,
      hasFaqSchema,
      hasHowToSchema,
      questionCount,
      listCount,
      hasArticleSchema,
      hasOrganizationSchema,
      hasBreadcrumbs,
      hasSpeakableSchema,
      metaKeywords,
      lang,
    };
  } catch (err) {
    console.error(`Failed to crawl ${url}:`, err);
    return null;
  }
}

// ================================================================
// Score Computation
// ================================================================

function computeScores(pages: CrawledPage[]) {
  if (pages.length === 0) {
    return { seoScore: 0, aeoScore: 0, geoScore: 0, croScore: 0, technicalScore: 0, contentScore: 0 };
  }

  const n = pages.length;

  // --- SEO Score (0-100) ---
  // 40% title coverage + 40% description coverage + 20% OG image coverage
  const withGoodTitle = pages.filter((p) => p.titleLength >= 30 && p.titleLength <= 60).length;
  const withGoodDesc = pages.filter((p) => p.descriptionLength >= 70 && p.descriptionLength <= 160).length;
  const withOg = pages.filter((p) => p.hasOgImage).length;
  const seoScore = Math.round(
    ((withGoodTitle / n) * 40) + ((withGoodDesc / n) * 40) + ((withOg / n) * 20)
  );

  // --- Technical Score (0-100) ---
  // 200 status + canonical + h1 single + schema + fast load
  const healthy = pages.filter((p) => p.statusCode === 200).length;
  const withCanonical = pages.filter((p) => p.hasCanonical).length;
  const singleH1 = pages.filter((p) => p.h1Count === 1).length;
  const withSchema = pages.filter((p) => p.hasSchema).length;
  const fastPages = pages.filter((p) => p.loadTimeMs < 3000).length;
  const technicalScore = Math.round(
    ((healthy / n) * 25) + ((withCanonical / n) * 20) + ((singleH1 / n) * 20) + ((withSchema / n) * 20) + ((fastPages / n) * 15)
  );

  // --- Content Score (0-100) ---
  // Word count + headings + lists + images with alt
  const goodContent = pages.filter((p) => p.wordCount >= 300).length;
  const withHeadings = pages.filter((p) => p.h2Count >= 2).length;
  const withLists = pages.filter((p) => p.listCount >= 1).length;
  const goodImages = pages.filter((p) => p.imageCount > 0 && p.imagesWithoutAlt === 0).length;
  const contentScore = Math.round(
    ((goodContent / n) * 30) + ((withHeadings / n) * 25) + ((withLists / n) * 20) + ((goodImages / n) * 25)
  );

  // --- AEO Score (0-100) ---
  // Schema richness + FAQ/HowTo + question headings + speakable + lists
  const withFaq = pages.filter((p) => p.hasFaqSchema).length;
  const withQuestions = pages.filter((p) => p.questionCount >= 2).length;
  const withSpeakable = pages.filter((p) => p.hasSpeakableSchema).length;
  const schemaRich = pages.filter((p) => p.schemaTypes.length >= 2).length;
  const aeoScore = Math.round(
    ((withSchema / n) * 20) + ((withFaq / n) * 20) + ((withQuestions / n) * 20) + ((withSpeakable / n) * 20) + ((schemaRich / n) * 20)
  );

  // --- GEO Score (0-100) ---
  // AI discoverability: schema + OG tags + entity-rich content + breadcrumbs + lang
  const withOrg = pages.filter((p) => p.hasOrganizationSchema).length;
  const withBreadcrumbs = pages.filter((p) => p.hasBreadcrumbs).length;
  const withLang = pages.filter((p) => p.lang.length > 0).length;
  const richContent = pages.filter((p) => p.wordCount >= 500 && p.h2Count >= 3).length;
  const geoScore = Math.round(
    ((withSchema / n) * 20) + ((withOg / n) * 20) + ((richContent / n) * 20) + ((withBreadcrumbs / n) * 20) + ((withLang / n) * 20)
  );

  // --- CRO Score (0-100) ---
  // Fast load + good titles + calls to action (internal links) + no broken pages
  const allHealthy = healthy === n;
  const avgLoadTime = pages.reduce((s, p) => s + p.loadTimeMs, 0) / n;
  const withCtaLinks = pages.filter((p) => p.internalLinks >= 3).length;
  const croScore = Math.round(
    (allHealthy ? 25 : (healthy / n) * 25) +
    (avgLoadTime < 2000 ? 25 : avgLoadTime < 4000 ? 15 : 5) +
    ((withGoodTitle / n) * 25) +
    ((withCtaLinks / n) * 25)
  );

  return { seoScore, aeoScore, geoScore, croScore, technicalScore, contentScore };
}

// ================================================================
// Issue Generation
// ================================================================

function generateIssues(pages: CrawledPage[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  // Missing titles
  const missingTitle = pages.filter((p) => p.titleLength === 0);
  if (missingTitle.length > 0) {
    issues.push({ id: "missing-title", severity: "critical", category: "seo", title: "Missing page titles", description: `${missingTitle.length} page(s) have no <title> tag. Every page needs a unique, descriptive title.`, affectedPages: missingTitle.map((p) => p.path) });
  }

  // Short titles
  const shortTitle = pages.filter((p) => p.titleLength > 0 && p.titleLength < 30);
  if (shortTitle.length > 0) {
    issues.push({ id: "short-title", severity: "warning", category: "seo", title: "Short page titles (<30 chars)", description: `${shortTitle.length} page(s) have titles under 30 characters. Aim for 30-60 characters.`, affectedPages: shortTitle.map((p) => p.path) });
  }

  // Long titles
  const longTitle = pages.filter((p) => p.titleLength > 60);
  if (longTitle.length > 0) {
    issues.push({ id: "long-title", severity: "warning", category: "seo", title: "Long page titles (>60 chars)", description: `${longTitle.length} page(s) have titles over 60 characters. These may be truncated in search results.`, affectedPages: longTitle.map((p) => p.path) });
  }

  // Missing meta descriptions
  const missingDesc = pages.filter((p) => p.descriptionLength === 0);
  if (missingDesc.length > 0) {
    issues.push({ id: "missing-desc", severity: "critical", category: "seo", title: "Missing meta descriptions", description: `${missingDesc.length} page(s) have no meta description. Write compelling descriptions (70-160 chars).`, affectedPages: missingDesc.map((p) => p.path) });
  }

  // Short descriptions
  const shortDesc = pages.filter((p) => p.descriptionLength > 0 && p.descriptionLength < 70);
  if (shortDesc.length > 0) {
    issues.push({ id: "short-desc", severity: "warning", category: "seo", title: "Short meta descriptions (<70 chars)", description: `${shortDesc.length} page(s) have descriptions under 70 characters.`, affectedPages: shortDesc.map((p) => p.path) });
  }

  // Missing OG images
  const missingOg = pages.filter((p) => !p.hasOgImage);
  if (missingOg.length > 0) {
    issues.push({ id: "missing-og-image", severity: "warning", category: "seo", title: "Missing OG images", description: `${missingOg.length} page(s) lack Open Graph images. Add og:image for social sharing.`, affectedPages: missingOg.map((p) => p.path) });
  }

  // Multiple H1 tags
  const multipleH1 = pages.filter((p) => p.h1Count > 1);
  if (multipleH1.length > 0) {
    issues.push({ id: "multiple-h1", severity: "warning", category: "technical", title: "Multiple H1 tags", description: `${multipleH1.length} page(s) have more than one H1 tag. Each page should have exactly one.`, affectedPages: multipleH1.map((p) => p.path) });
  }

  // Missing H1
  const missingH1 = pages.filter((p) => p.h1Count === 0);
  if (missingH1.length > 0) {
    issues.push({ id: "missing-h1", severity: "critical", category: "technical", title: "Missing H1 tag", description: `${missingH1.length} page(s) have no H1 tag. Add a primary heading to each page.`, affectedPages: missingH1.map((p) => p.path) });
  }

  // No structured data
  const noSchema = pages.filter((p) => !p.hasSchema);
  if (noSchema.length > 0) {
    issues.push({ id: "no-schema", severity: "warning", category: "geo", title: "No structured data (JSON-LD)", description: `${noSchema.length} page(s) lack Schema.org markup. Add Article, FAQ, or Organization schema.`, affectedPages: noSchema.map((p) => p.path) });
  }

  // Missing canonical
  const noCanonical = pages.filter((p) => !p.hasCanonical);
  if (noCanonical.length > 0) {
    issues.push({ id: "no-canonical", severity: "info", category: "technical", title: "Missing canonical URL", description: `${noCanonical.length} page(s) don't specify a canonical URL.`, affectedPages: noCanonical.map((p) => p.path) });
  }

  // Thin content
  const thinContent = pages.filter((p) => p.wordCount < 300 && !p.path.includes("login") && !p.path.includes("signup") && !p.path.includes("forgot"));
  if (thinContent.length > 0) {
    issues.push({ id: "thin-content", severity: "warning", category: "content", title: "Thin content (<300 words)", description: `${thinContent.length} page(s) have fewer than 300 words. Consider adding more content.`, affectedPages: thinContent.map((p) => p.path) });
  }

  // Images without alt text
  const badImages = pages.filter((p) => p.imagesWithoutAlt > 0);
  if (badImages.length > 0) {
    const total = badImages.reduce((s, p) => s + p.imagesWithoutAlt, 0);
    issues.push({ id: "img-no-alt", severity: "warning", category: "technical", title: "Images missing alt text", description: `${total} image(s) across ${badImages.length} page(s) lack alt attributes.`, affectedPages: badImages.map((p) => p.path) });
  }

  // Slow pages
  const slowPages = pages.filter((p) => p.loadTimeMs > 3000);
  if (slowPages.length > 0) {
    issues.push({ id: "slow-load", severity: "warning", category: "performance", title: "Slow page load (>3s)", description: `${slowPages.length} page(s) took over 3 seconds to load.`, affectedPages: slowPages.map((p) => p.path) });
  }

  // No FAQ schema (AEO)
  const noFaq = pages.filter((p) => !p.hasFaqSchema && p.questionCount >= 2);
  if (noFaq.length > 0) {
    issues.push({ id: "missing-faq-schema", severity: "info", category: "aeo", title: "Pages with questions but no FAQ schema", description: `${noFaq.length} page(s) have question headings but no FAQPage schema. Add FAQ structured data for rich results.`, affectedPages: noFaq.map((p) => p.path) });
  }

  // No breadcrumbs (GEO)
  const noBreadcrumbs = pages.filter((p) => !p.hasBreadcrumbs && p.path !== "/");
  if (noBreadcrumbs.length > 0) {
    issues.push({ id: "no-breadcrumbs", severity: "info", category: "geo", title: "Missing breadcrumb navigation", description: `${noBreadcrumbs.length} page(s) lack breadcrumb navigation. Add BreadcrumbList schema for better AI discoverability.`, affectedPages: noBreadcrumbs.map((p) => p.path) });
  }

  // No lang attribute
  const noLang = pages.filter((p) => p.lang.length === 0);
  if (noLang.length > 0) {
    issues.push({ id: "no-lang", severity: "info", category: "technical", title: "Missing lang attribute", description: `${noLang.length} page(s) don't specify a language in the <html> tag.`, affectedPages: noLang.map((p) => p.path) });
  }

  // Sort by severity
  const sevOrder = { critical: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}
