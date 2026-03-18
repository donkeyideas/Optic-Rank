/**
 * X (Twitter) public profile fetcher.
 * Uses multiple fallback approaches to fetch public profile data:
 * 1. FxTwitter API (most reliable, public proxy)
 * 2. Syndication embed endpoint
 * No API key required. Only works for public accounts.
 */

import type { SocialFetchResult } from "./types";

/**
 * Extract a clean username from various input formats.
 * Handles: @username, https://twitter.com/username, https://x.com/username
 */
function extractUsername(input: string): string {
  const clean = input.trim();

  // Handle URL format
  if (clean.includes("twitter.com") || clean.includes("x.com")) {
    try {
      const url = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
      const segments = url.pathname.split("/").filter(Boolean);
      // Skip known non-username paths
      const skip = ["i", "search", "explore", "home", "notifications", "messages", "settings"];
      const handleSegment = segments.find((s) => !skip.includes(s.toLowerCase()));
      if (handleSegment) return handleSegment.replace(/^@/, "");
    } catch {
      // Not a valid URL, continue
    }
  }

  // Strip @ prefix
  return clean.replace(/^@/, "");
}

/**
 * Fetch an X/Twitter profile by username or URL.
 */
export async function fetchTwitterProfile(input: string): Promise<SocialFetchResult> {
  const username = extractUsername(input);
  if (!username) {
    return { success: false, error: "Invalid X/Twitter username." };
  }

  try {
    // Method 1: Try FxTwitter API (most reliable public proxy)
    const fxResult = await fetchViaFxTwitter(username);
    if (fxResult) return fxResult;

    // Method 2: Try syndication embed
    const syndicationResult = await fetchViaSyndication(username);
    if (syndicationResult) return syndicationResult;

    return {
      success: false,
      error: "Could not fetch X/Twitter profile. The account may be private or suspended. Please enter stats manually.",
    };
  } catch (err) {
    return {
      success: false,
      error: `X/Twitter lookup failed: ${err instanceof Error ? err.message : "Unknown error"}. Please enter stats manually.`,
    };
  }
}

/**
 * Fetch profile data via FxTwitter API (public Twitter proxy).
 * This is the most reliable method for public profiles.
 */
async function fetchViaFxTwitter(username: string): Promise<SocialFetchResult | null> {
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/${encodeURIComponent(username)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      if (res.status === 404) return null;
      return null;
    }

    const json = await res.json();
    const user = json?.user;
    if (!user) return null;

    return {
      success: true,
      data: {
        platform_user_id: user.id || "",
        display_name: user.name || username,
        handle: user.screen_name || username,
        avatar_url: user.avatar_url || null,
        bio: user.description || null,
        followers_count: user.followers ?? 0,
        following_count: user.following ?? 0,
        posts_count: user.tweets ?? 0,
        engagement_rate: null,
        verified: user.verified ?? false,
        country: user.location || null,
        extra: {
          likes: user.likes ?? 0,
          banner_url: user.banner_url,
          joined: user.joined,
          website: user.website,
          is_protected: user.protected ?? false,
        },
      },
    };
  } catch {
    return null;
  }
}

/**
 * Fetch profile data via Twitter's syndication/timeline API.
 */
async function fetchViaSyndication(username: string): Promise<SocialFetchResult | null> {
  try {
    const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(username)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Try to extract follower/following counts from rendered HTML
    const followersMatch = html.match(/(\d[\d,.]*)\s*Followers/i);
    const followingMatch = html.match(/(\d[\d,.]*)\s*Following/i);
    const nameMatch = html.match(/<div[^>]*data-testid="UserName"[^>]*>([^<]+)/);

    if (followersMatch) {
      return {
        success: true,
        data: {
          platform_user_id: "",
          display_name: nameMatch?.[1] || username,
          handle: username,
          avatar_url: null,
          bio: null,
          followers_count: parseFormattedNumber(followersMatch[1]),
          following_count: followingMatch ? parseFormattedNumber(followingMatch[1]) : 0,
          posts_count: 0,
          engagement_rate: null,
          verified: false,
          country: null,
          extra: {},
        },
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse formatted numbers like "1.5M", "12K", "1,234"
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
