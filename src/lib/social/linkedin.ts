/**
 * LinkedIn public profile fetcher.
 *
 * LinkedIn aggressively blocks non-browser requests. This module uses
 * the self-hosted headless Chrome renderer (via js-renderer) as the
 * primary method, with a basic fetch() fallback.
 */

import type { SocialFetchResult } from "./types";
import { isJsRenderingAvailable, fetchWithJsRendering } from "@/lib/crawl/js-renderer";

/**
 * Decode common HTML entities in scraped text.
 */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}

/**
 * Extract a clean username/slug from various input formats.
 * Handles: username, https://linkedin.com/in/username, linkedin.com/company/name
 */
function extractSlug(input: string): { slug: string; type: "personal" | "company" } {
  const clean = input.trim();

  if (clean.includes("linkedin.com")) {
    try {
      const url = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
      const segments = url.pathname.split("/").filter(Boolean);

      // /company/name or /showcase/name
      if ((segments[0] === "company" || segments[0] === "showcase") && segments[1]) {
        return { slug: segments[1], type: "company" };
      }

      // /in/username
      if (segments[0] === "in" && segments[1]) {
        return { slug: segments[1], type: "personal" };
      }

      // Just take first segment
      if (segments[0]) {
        return { slug: segments[0], type: "personal" };
      }
    } catch {
      // Not a valid URL
    }
  }

  return { slug: clean.replace(/^@/, ""), type: "personal" };
}

/**
 * Build the profile URL from slug and type.
 */
function buildProfileUrl(slug: string, type: "personal" | "company"): string {
  return type === "company"
    ? `https://www.linkedin.com/company/${encodeURIComponent(slug)}/`
    : `https://www.linkedin.com/in/${encodeURIComponent(slug)}/`;
}

/**
 * Extract profile data from HTML (works for both rendered and basic fetch results).
 *
 * NOTE: LinkedIn pages often contain BOTH auth-wall markup AND useful meta/OG tags
 * in the same response. We try all extraction strategies first, and only report
 * the auth-wall error if none of them yielded data.
 */
function extractProfileFromHtml(
  html: string,
  slug: string,
  type: "personal" | "company"
): SocialFetchResult {
  const isAuthWall = html.includes("authwall") || html.includes("sign-in-form");

  // --- Strategy 1: JSON-LD structured data ---
  const jsonLdMatch = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
  );

  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);

      // Company page
      if (jsonLd["@type"] === "Organization" || type === "company") {
        const followersMatch = html.match(/(\d[\d,]*)\s*(?:followers|seguidores)/i);
        const employeesMatch = html.match(/(\d[\d,]*)\s*(?:employees|empleados)/i);
        return {
          success: true,
          data: {
            platform_user_id: "",
            display_name: decodeHtmlEntities(jsonLd.name || slug),
            handle: slug,
            avatar_url: jsonLd.logo?.url || jsonLd.image?.url || extractOgImage(html),
            bio: jsonLd.description ? decodeHtmlEntities(jsonLd.description) : extractMetaDescription(html),
            followers_count: followersMatch ? parseFormattedNumber(followersMatch[1]) : 0,
            following_count: 0,
            posts_count: 0,
            engagement_rate: null,
            verified: false,
            country: null,
            extra: {
              type: "company",
              url: jsonLd.url,
              industry: jsonLd.industry,
              employees: employeesMatch ? parseFormattedNumber(employeesMatch[1]) : null,
            },
          },
        };
      }

      // Personal profile
      if (jsonLd["@type"] === "Person") {
        const connectionsMatch = html.match(/(\d[\d,]*)\s*(?:connections|conexiones)/i);
        const followersMatch = html.match(/(\d[\d,]*)\s*(?:followers|seguidores)/i);

        return {
          success: true,
          data: {
            platform_user_id: "",
            display_name: decodeHtmlEntities(jsonLd.name || slug),
            handle: slug,
            avatar_url: jsonLd.image?.contentUrl || extractOgImage(html),
            bio: (jsonLd.description || jsonLd.jobTitle)
              ? decodeHtmlEntities(jsonLd.description || jsonLd.jobTitle)
              : null,
            followers_count: followersMatch
              ? parseFormattedNumber(followersMatch[1])
              : connectionsMatch
                ? parseFormattedNumber(connectionsMatch[1])
                : 0,
            following_count: 0,
            posts_count: 0,
            engagement_rate: null,
            verified: false,
            country: jsonLd.address?.addressLocality || null,
            extra: {
              type: "personal",
              job_title: jsonLd.jobTitle,
              works_for: jsonLd.worksFor?.name,
              education: jsonLd.alumniOf?.name,
            },
          },
        };
      }
    } catch {
      // JSON-LD parse failed, continue to fallbacks
    }
  }

  // --- Strategy 2: Open Graph + meta tags ---
  const ogTitle = extractOgTag(html, "og:title");
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
  const rawTitle = ogTitle || titleMatch?.[1] || "";
  const name = rawTitle
    .replace(/\s*[|–\-]\s*LinkedIn.*$/i, "")
    .replace(/\s*LinkedIn.*$/i, "")
    .trim();

  if (name && name !== slug) {
    const descMatch = extractMetaDescription(html);
    const followersHtmlMatch = html.match(/(\d[\d,]*)\s*(?:followers|seguidores|connections)/i);

    return {
      success: true,
      data: {
        platform_user_id: "",
        display_name: decodeHtmlEntities(name),
        handle: slug,
        avatar_url: extractOgImage(html),
        bio: descMatch ? decodeHtmlEntities(descMatch) : null,
        followers_count: followersHtmlMatch ? parseFormattedNumber(followersHtmlMatch[1]) : 0,
        following_count: 0,
        posts_count: 0,
        engagement_rate: null,
        verified: false,
        country: null,
        extra: { type },
      },
    };
  }

  // --- Strategy 3: Extract from rendered page content (headless Chrome) ---
  // Look for company/person name in common LinkedIn HTML patterns
  const h1Match = html.match(/<h1[^>]*class="[^"]*(?:top-card-layout__title|text-heading-xlarge)[^"]*"[^>]*>([^<]+)<\/h1>/);
  const subtitleMatch = html.match(/<h2[^>]*class="[^"]*(?:top-card-layout__headline|text-body-medium)[^"]*"[^>]*>([^<]+)<\/h2>/);
  const followersRendered = html.match(/(\d[\d,]*)\s*(?:followers|seguidores|connections)/i);

  if (h1Match) {
    return {
      success: true,
      data: {
        platform_user_id: "",
        display_name: decodeHtmlEntities(h1Match[1].trim()),
        handle: slug,
        avatar_url: extractOgImage(html),
        bio: subtitleMatch ? decodeHtmlEntities(subtitleMatch[1].trim()) : extractMetaDescription(html),
        followers_count: followersRendered ? parseFormattedNumber(followersRendered[1]) : 0,
        following_count: 0,
        posts_count: 0,
        engagement_rate: null,
        verified: false,
        country: null,
        extra: { type },
      },
    };
  }

  if (isAuthWall) {
    return {
      success: false,
      error: "LinkedIn requires sign-in to view this profile. Please enter stats manually.",
    };
  }

  return {
    success: false,
    error: "Could not extract LinkedIn profile data. The profile may not be public. Please enter stats manually.",
  };
}

/**
 * Extract og:image from HTML.
 */
function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
  return match?.[1] || null;
}

/**
 * Extract an Open Graph tag value.
 */
function extractOgTag(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<meta[^>]*property="${escaped}"[^>]*content="([^"]+)"`));
  return match?.[1] || null;
}

/**
 * Extract meta description from HTML.
 */
function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
  return match?.[1] || null;
}

/**
 * Fetch a LinkedIn profile by username/slug or URL.
 *
 * Strategy order:
 * 1. Basic fetch — LinkedIn's static HTML often contains OG/meta tags and
 *    JSON-LD even when JS execution would hit an auth wall. Fast + free.
 * 2. Headless Chrome — Only tried when basic fetch fails to extract data.
 *    JS rendering can sometimes get past auth walls that block basic fetch,
 *    but can also trigger them, so it's a fallback.
 */
export async function fetchLinkedInProfile(input: string): Promise<SocialFetchResult> {
  const { slug, type } = extractSlug(input);
  if (!slug) {
    return { success: false, error: "Invalid LinkedIn username." };
  }

  const profileUrl = buildProfileUrl(slug, type);

  // --- Primary: basic fetch (static HTML often has meta/OG/JSON-LD) ---
  try {
    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "sec-ch-ua": '"Chromium";v="131", "Not_A Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      redirect: "follow",
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const html = await res.text();
      const extracted = extractProfileFromHtml(html, slug, type);
      if (extracted.success) return extracted;
      // Extraction failed (auth wall or no data) — fall through to headless Chrome
    } else if (res.status === 404) {
      return { success: false, error: "LinkedIn profile not found." };
    }
    // For 999, 403, etc. — fall through to headless Chrome
  } catch {
    // Network error — fall through to headless Chrome
  }

  // --- Fallback: Headless Chrome via js-renderer ---
  if (isJsRenderingAvailable()) {
    try {
      const result = await fetchWithJsRendering(profileUrl, {
        waitMs: 3000,
        timeoutMs: 20000,
      });

      if (result && result.html) {
        const extracted = extractProfileFromHtml(result.html, slug, type);
        if (extracted.success) return extracted;
      }
    } catch {
      // Renderer failed
    }
  }

  return {
    success: false,
    error: "LinkedIn blocked the request. Please enter stats manually.",
  };
}

/**
 * Parse formatted numbers like "1,234" or "12K"
 */
function parseFormattedNumber(str: string): number {
  const clean = str.replace(/,/g, "").trim();
  const multipliers: Record<string, number> = { K: 1000, M: 1000000, B: 1000000000 };
  const match = clean.match(/^([\d.]+)\s*([KMB])?$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const mult = match[2] ? multipliers[match[2].toUpperCase()] || 1 : 1;
    return Math.round(num * mult);
  }
  return parseInt(clean) || 0;
}
