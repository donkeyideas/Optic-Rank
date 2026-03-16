/**
 * Self-contained backlink crawler.
 * Discovers backlinks by:
 * 1. Searching the web for pages mentioning the target domain
 * 2. Crawling those pages to extract and verify actual links
 * 3. Scoring linking domains with our own heuristic algorithm
 *
 * NO external API dependencies (Majestic, Moz, etc.)
 */

import { logAPICall } from "@/lib/api/api-logger";

export interface DiscoveredBacklink {
  source_url: string;
  source_domain: string;
  target_url: string;
  anchor_text: string;
  link_type: "dofollow" | "nofollow" | "ugc" | "sponsored";
  domain_authority: number;
  trust_flow: number;
  citation_flow: number;
  context_snippet: string;
}

interface CrawlResult {
  links: DiscoveredBacklink[];
  pageTitle: string;
  outboundLinkCount: number;
}

/**
 * Crawl a single URL and extract all links pointing to the target domain.
 */
export async function crawlPageForBacklinks(
  pageUrl: string,
  targetDomain: string
): Promise<CrawlResult> {
  const links: DiscoveredBacklink[] = [];

  try {
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OpticRankBot/1.0; +https://opticrank.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!response.ok) return { links: [], pageTitle: "", outboundLinkCount: 0 };

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { links: [], pageTitle: "", outboundLinkCount: 0 };
    }

    const html = await response.text();
    const sourceDomain = new URL(pageUrl).hostname.replace(/^www\./, "");
    const normalizedTarget = targetDomain.replace(/^www\./, "").toLowerCase();

    // Skip if source is the target domain itself
    if (sourceDomain.toLowerCase() === normalizedTarget) {
      return { links: [], pageTitle: "", outboundLinkCount: 0 };
    }

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : "";

    // Count all outbound links
    const allLinkMatches = html.match(/<a\s[^>]*href\s*=\s*["'][^"']*["'][^>]*>/gi) ?? [];
    const outboundLinkCount = allLinkMatches.length;

    // Find links pointing to the target domain
    const linkRegex =
      /<a\s([^>]*?)href\s*=\s*["']([^"']*?)["']([^>]*?)>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const preAttrs = match[1] ?? "";
      const href = match[2];
      const postAttrs = match[3] ?? "";
      const innerHtml = match[4] ?? "";

      if (!href) continue;

      // Resolve relative URLs
      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(href, pageUrl).toString();
      } catch {
        continue;
      }

      // Check if link points to target domain
      let linkHost: string;
      try {
        linkHost = new URL(absoluteUrl).hostname.replace(/^www\./, "").toLowerCase();
      } catch {
        continue;
      }

      if (linkHost !== normalizedTarget) continue;

      // Extract anchor text (strip HTML tags)
      const anchorText = innerHtml
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Determine link type from rel attribute
      const allAttrs = preAttrs + " " + postAttrs;
      const relMatch = allAttrs.match(/rel\s*=\s*["']([^"']*)["']/i);
      const rel = relMatch ? relMatch[1].toLowerCase() : "";

      let linkType: "dofollow" | "nofollow" | "ugc" | "sponsored" = "dofollow";
      if (rel.includes("sponsored")) linkType = "sponsored";
      else if (rel.includes("ugc")) linkType = "ugc";
      else if (rel.includes("nofollow")) linkType = "nofollow";

      // Extract surrounding context (text near the link)
      const linkPos = match.index ?? 0;
      const contextStart = Math.max(0, linkPos - 150);
      const contextEnd = Math.min(html.length, linkPos + match[0].length + 150);
      const rawContext = html.slice(contextStart, contextEnd);
      const contextSnippet = rawContext
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

      // Score the linking domain
      const scores = scoreDomain(sourceDomain, pageUrl, outboundLinkCount, html);

      links.push({
        source_url: pageUrl,
        source_domain: sourceDomain,
        target_url: absoluteUrl,
        anchor_text: anchorText || "[no anchor text]",
        link_type: linkType,
        domain_authority: scores.authority,
        trust_flow: scores.trust,
        citation_flow: scores.citation,
        context_snippet: contextSnippet,
      });
    }

    return { links, pageTitle, outboundLinkCount };
  } catch (err) {
    console.error(`[crawler] Error crawling ${pageUrl}:`, err);
    return { links: [], pageTitle: "", outboundLinkCount: 0 };
  }
}

/**
 * Proprietary domain scoring algorithm.
 * Generates DA, Trust Flow, and Citation Flow using heuristic signals.
 * Scale: 0-100.
 */
function scoreDomain(
  domain: string,
  pageUrl: string,
  outboundLinkCount: number,
  html: string
): { authority: number; trust: number; citation: number } {
  let authority = 30; // baseline
  let trust = 30;
  let citation = 25;

  // --- TLD Quality ---
  const premiumTLDs = [".com", ".org", ".net", ".edu", ".gov", ".io", ".co"];
  const spamTLDs = [".xyz", ".top", ".tk", ".ml", ".ga", ".cf", ".gq", ".buzz", ".click"];
  const tld = "." + domain.split(".").pop();

  if ([".edu", ".gov"].includes(tld)) {
    authority += 30;
    trust += 35;
  } else if (premiumTLDs.includes(tld)) {
    authority += 10;
    trust += 10;
  } else if (spamTLDs.includes(tld)) {
    authority -= 20;
    trust -= 25;
  }

  // --- HTTPS ---
  if (pageUrl.startsWith("https://")) {
    authority += 5;
    trust += 5;
  }

  // --- Domain length (shorter = often more established) ---
  const domainParts = domain.replace(/\.[^.]+$/, ""); // remove TLD
  if (domainParts.length <= 8) authority += 8;
  else if (domainParts.length <= 15) authority += 3;
  else if (domainParts.length > 25) authority -= 5;

  // --- Outbound link density (too many = link farm) ---
  if (outboundLinkCount > 200) {
    authority -= 15;
    trust -= 20;
    citation += 10; // high citation = lots of linking
  } else if (outboundLinkCount > 100) {
    authority -= 5;
    trust -= 10;
    citation += 5;
  } else if (outboundLinkCount < 20) {
    trust += 10;
  }

  // --- Page content quality signals ---
  const contentLength = html.replace(/<[^>]*>/g, "").length;
  if (contentLength > 5000) {
    authority += 8;
    trust += 5;
  } else if (contentLength > 2000) {
    authority += 4;
    trust += 2;
  } else if (contentLength < 500) {
    authority -= 10;
    trust -= 10;
  }

  // --- Structured data presence ---
  if (html.includes("application/ld+json") || html.includes("itemtype=")) {
    authority += 5;
    trust += 5;
  }

  // --- Social meta tags (indicates maintained site) ---
  if (html.includes("og:title") || html.includes("twitter:card")) {
    authority += 3;
    trust += 2;
  }

  // --- Known high-authority domain patterns ---
  const highAuthDomains = [
    "wikipedia.org", "github.com", "medium.com", "linkedin.com",
    "twitter.com", "x.com", "reddit.com", "stackoverflow.com",
    "youtube.com", "nytimes.com", "bbc.com", "forbes.com",
    "bloomberg.com", "techcrunch.com", "producthunt.com",
    "crunchbase.com", "trustpilot.com", "g2.com",
  ];
  if (highAuthDomains.some((d) => domain.endsWith(d))) {
    authority += 25;
    trust += 20;
    citation += 15;
  }

  // --- Spam keyword detection ---
  const spamKeywords = [
    "casino", "poker", "gambling", "payday", "loan", "pharma",
    "viagra", "cialis", "porn", "adult", "xxx", "cheap-",
    "buy-cheap", "free-download",
  ];
  const domainLower = domain.toLowerCase();
  const spamHits = spamKeywords.filter((kw) => domainLower.includes(kw));
  if (spamHits.length > 0) {
    authority -= spamHits.length * 15;
    trust -= spamHits.length * 20;
  }

  // Clamp all values to 0-100
  authority = Math.max(0, Math.min(100, authority));
  trust = Math.max(0, Math.min(100, trust));
  citation = Math.max(0, Math.min(100, citation));

  return { authority, trust, citation };
}

/**
 * Build search queries to discover pages linking to a domain.
 * Returns multiple query variants for better coverage.
 */
export function buildDiscoveryQueries(domain: string): string[] {
  const clean = domain.replace(/^www\./, "");
  return [
    `"${clean}" -site:${clean}`,
    `link:${clean}`,
    `inurl:${clean} -site:${clean}`,
    `"${clean}" review`,
    `"${clean}" mentioned`,
    `"${clean}" partner`,
    `"${clean}" featured`,
  ];
}

/**
 * Use AI to discover potential backlink sources for a domain.
 * This is a fallback when no search API is available.
 */
export async function aiDiscoverBacklinkSources(
  domain: string,
  industry: string,
  aiChat: (prompt: string, options?: Record<string, unknown>) => Promise<{ text: string } | null>
): Promise<string[]> {
  const prompt = `You are an SEO expert. Given the website "${domain}" in the "${industry}" industry, suggest 20 real, specific URLs of web pages that might link to or mention this domain. Focus on:
- Industry directories and listings
- Review sites
- Blog posts or articles that mention similar companies
- Partner/integration pages
- Press coverage or news articles
- Social profiles and forum threads

Return ONLY a JSON array of URL strings. No explanations.
Example: ["https://example.com/review-of-site", "https://directory.com/listing"]`;

  try {
    const result = await aiChat(prompt, { temperature: 0.8, maxTokens: 2048 });
    if (!result?.text) return [];

    // Extract JSON array from response
    const jsonMatch = result.text.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];

    const urls = JSON.parse(jsonMatch[0]) as string[];
    return urls.filter((u) => {
      try {
        new URL(u);
        return true;
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/**
 * Use Google Custom Search API to find pages linking to a domain.
 * Returns URLs of pages that potentially link to the target.
 */
export async function searchForBacklinks(
  domain: string,
  apiKey?: string,
  searchEngineId?: string
): Promise<string[]> {
  const queries = buildDiscoveryQueries(domain);
  const urls: string[] = [];

  if (apiKey && searchEngineId) {
    // Use Google Custom Search API
    for (const query of queries.slice(0, 3)) {
      try {
        const params = new URLSearchParams({
          key: apiKey,
          cx: searchEngineId,
          q: query,
          num: "10",
        });
        const start = Date.now();
        const response = await fetch(
          `https://www.googleapis.com/customsearch/v1?${params}`,
          { signal: AbortSignal.timeout(10000) }
        );
        const responseTime = Date.now() - start;
        if (!response.ok) {
          logAPICall({
            provider: "google_search",
            endpoint: "customsearch/v1",
            method: "GET",
            status_code: response.status,
            response_time_ms: responseTime,
            is_success: false,
          });
          continue;
        }
        logAPICall({
          provider: "google_search",
          endpoint: "customsearch/v1",
          method: "GET",
          status_code: 200,
          response_time_ms: responseTime,
          is_success: true,
        });
        const data = await response.json();
        const items = (data.items ?? []) as Array<{ link: string }>;
        for (const item of items) {
          if (item.link && !urls.includes(item.link)) urls.push(item.link);
        }
      } catch {
        continue;
      }
    }
  }

  return urls;
}

/**
 * Discover backlinks through common web directories and platforms.
 * Returns URLs to crawl for potential backlinks.
 */
export function getCommonSourceUrls(domain: string): string[] {
  const clean = domain.replace(/^www\./, "");
  const name = clean.split(".")[0];

  return [
    // Social/professional profiles
    `https://www.linkedin.com/company/${name}`,
    `https://twitter.com/${name}`,
    `https://github.com/${name}`,
    // Business directories
    `https://www.crunchbase.com/organization/${name}`,
    `https://www.producthunt.com/@${name}`,
    // Review sites
    `https://www.trustpilot.com/review/${clean}`,
    `https://www.g2.com/products/${name}/reviews`,
    `https://www.capterra.com/p/${name}`,
    // Web presence
    `https://www.similarweb.com/website/${clean}/`,
    `https://web.archive.org/web/2024/${clean}`,
  ];
}
