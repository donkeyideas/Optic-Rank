/**
 * LinkedIn public profile fetcher.
 * Uses LinkedIn's public profile page to extract basic data.
 * No API key required. Only works for public profiles.
 *
 * LinkedIn is the most restrictive platform — they aggressively block
 * non-browser requests. This uses the public Voyager API with guest
 * access which works for profiles with public visibility enabled.
 */

import type { SocialFetchResult } from "./types";

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
 * Fetch a LinkedIn profile by username/slug or URL.
 * Scrapes the public profile page for structured data.
 */
export async function fetchLinkedInProfile(input: string): Promise<SocialFetchResult> {
  const { slug, type } = extractSlug(input);
  if (!slug) {
    return { success: false, error: "Invalid LinkedIn username." };
  }

  try {
    // Try fetching the public profile page
    const profileUrl =
      type === "company"
        ? `https://www.linkedin.com/company/${encodeURIComponent(slug)}/`
        : `https://www.linkedin.com/in/${encodeURIComponent(slug)}/`;

    const res = await fetch(profileUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      if (res.status === 404) return { success: false, error: "LinkedIn profile not found." };
      if (res.status === 999 || res.status === 403) {
        return {
          success: false,
          error: "LinkedIn blocked the request. Please enter stats manually.",
        };
      }
      return { success: false, error: `LinkedIn returned ${res.status}. Please enter stats manually.` };
    }

    const html = await res.text();

    // LinkedIn embeds structured data as JSON-LD
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/
    );

    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);

        // Company page
        if (jsonLd["@type"] === "Organization" || type === "company") {
          const followersMatch = html.match(/(\d[\d,]*)\s*(?:followers|seguidores)/i);
          return {
            success: true,
            data: {
              platform_user_id: "",
              display_name: decodeHtmlEntities(jsonLd.name || slug),
              handle: slug,
              avatar_url: jsonLd.logo?.url || jsonLd.image?.url || null,
              bio: jsonLd.description ? decodeHtmlEntities(jsonLd.description) : null,
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
              avatar_url: jsonLd.image?.contentUrl || null,
              bio: (jsonLd.description || jsonLd.jobTitle) ? decodeHtmlEntities(jsonLd.description || jsonLd.jobTitle) : null,
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
        // JSON-LD parse failed, continue
      }
    }

    // Fallback: try to extract basic data from meta tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/);
    const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    const followersHtmlMatch = html.match(/(\d[\d,]*)\s*(?:followers|seguidores|connections)/i);

    if (titleMatch) {
      const name = titleMatch[1]
        .replace(/\s*[|–-]\s*LinkedIn.*$/i, "")
        .replace(/\s*LinkedIn.*$/i, "")
        .trim();

      return {
        success: true,
        data: {
          platform_user_id: "",
          display_name: decodeHtmlEntities(name || slug),
          handle: slug,
          avatar_url: imgMatch?.[1] || null,
          bio: descMatch?.[1] ? decodeHtmlEntities(descMatch[1]) : null,
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

    // Check if login wall
    if (html.includes("authwall") || html.includes("login") || html.includes("sign-in")) {
      return {
        success: false,
        error: "LinkedIn requires sign-in to view this profile. Please enter stats manually.",
      };
    }

    return {
      success: false,
      error: "Could not extract LinkedIn profile data. The profile may not be public. Please enter stats manually.",
    };
  } catch (err) {
    return {
      success: false,
      error: `LinkedIn lookup failed: ${err instanceof Error ? err.message : "Unknown error"}. Please enter stats manually.`,
    };
  }
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
