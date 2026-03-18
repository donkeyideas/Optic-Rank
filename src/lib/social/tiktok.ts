/**
 * TikTok public profile fetcher.
 * Uses TikTok's web API to fetch public profile data.
 * No API key required. Only works for public accounts.
 */

import type { SocialFetchResult } from "./types";

/**
 * Extract a clean username from various input formats.
 * Handles: @username, https://tiktok.com/@username, username
 */
function extractUsername(input: string): string {
  const clean = input.trim();

  // Handle URL format
  if (clean.includes("tiktok.com")) {
    try {
      const url = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length > 0) return segments[0].replace(/^@/, "");
    } catch {
      // Not a valid URL, continue
    }
  }

  // Strip @ prefix
  return clean.replace(/^@/, "");
}

/**
 * Fetch a TikTok profile by username or URL.
 * Uses TikTok's web page and extracts the __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON.
 */
export async function fetchTikTokProfile(input: string): Promise<SocialFetchResult> {
  const username = extractUsername(input);
  if (!username) {
    return { success: false, error: "Invalid TikTok username." };
  }

  try {
    // Fetch the TikTok profile page
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      if (res.status === 404) return { success: false, error: "TikTok user not found." };
      return { success: false, error: `TikTok returned ${res.status}.` };
    }

    const html = await res.text();

    // Try to extract data from __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag
    const rehydrationMatch = html.match(
      /<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
    );

    if (rehydrationMatch) {
      try {
        const data = JSON.parse(rehydrationMatch[1]);
        const userModule = data?.__DEFAULT_SCOPE__?.["webapp.user-detail"];
        const userInfo = userModule?.userInfo;

        if (userInfo?.user) {
          const user = userInfo.user;
          const stats = userInfo.stats || {};

          return {
            success: true,
            data: {
              platform_user_id: user.id || "",
              display_name: user.nickname || username,
              handle: user.uniqueId || username,
              avatar_url: user.avatarLarger || user.avatarMedium || user.avatarThumb || null,
              bio: user.signature || null,
              followers_count: stats.followerCount ?? 0,
              following_count: stats.followingCount ?? 0,
              posts_count: stats.videoCount ?? 0,
              engagement_rate: null, // TikTok doesn't expose this directly
              verified: user.verified ?? false,
              country: null,
              extra: {
                hearts: stats.heartCount ?? 0,
                digg_count: stats.diggCount ?? 0,
                is_private: user.privateAccount ?? false,
              },
            },
          };
        }
      } catch {
        // JSON parse failed, try next method
      }
    }

    // Fallback: try SIGI_STATE (older TikTok pages)
    const sigiMatch = html.match(
      /<script[^>]*id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/
    );

    if (sigiMatch) {
      try {
        const data = JSON.parse(sigiMatch[1]);
        const userModule = data?.UserModule;
        const users = userModule?.users;
        const stats = userModule?.stats;

        if (users && Object.keys(users).length > 0) {
          const userId = Object.keys(users)[0];
          const user = users[userId];
          const userStats = stats?.[userId] || {};

          return {
            success: true,
            data: {
              platform_user_id: user.id || userId,
              display_name: user.nickname || username,
              handle: user.uniqueId || username,
              avatar_url: user.avatarLarger || user.avatarMedium || null,
              bio: user.signature || null,
              followers_count: userStats.followerCount ?? 0,
              following_count: userStats.followingCount ?? 0,
              posts_count: userStats.videoCount ?? 0,
              engagement_rate: null,
              verified: user.verified ?? false,
              country: null,
              extra: {
                hearts: userStats.heartCount ?? 0,
                is_private: user.privateAccount ?? false,
              },
            },
          };
        }
      } catch {
        // JSON parse failed
      }
    }

    // If we got HTML but couldn't extract data, the account might be private
    if (html.includes("privateAccount") || html.includes("\"privateAccount\":true")) {
      return {
        success: false,
        error: "This TikTok account is private. Please enter stats manually.",
      };
    }

    return {
      success: false,
      error: "Could not extract TikTok profile data. The account may be private or TikTok blocked the request. Please enter stats manually.",
    };
  } catch (err) {
    return {
      success: false,
      error: `TikTok lookup failed: ${err instanceof Error ? err.message : "Unknown error"}. Please enter stats manually.`,
    };
  }
}
