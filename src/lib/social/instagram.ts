/**
 * Instagram profile fetcher.
 * Uses Instagram's internal web API endpoint to fetch public profile data.
 * No API key required. May be rate-limited at scale.
 */

import type { SocialFetchResult } from "./types";

const IG_API = "https://i.instagram.com/api/v1/users/web_profile_info/";
const IG_APP_ID = "936619743392459"; // Instagram's web app ID

/**
 * Extract a clean username from various input formats.
 * Handles: @username, https://instagram.com/username, username
 */
function extractUsername(input: string): string {
  const clean = input.trim();

  // Handle URL format
  if (clean.includes("instagram.com")) {
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
 * Fetch an Instagram profile by username or URL.
 */
export async function fetchInstagramProfile(input: string): Promise<SocialFetchResult> {
  const username = extractUsername(input);
  if (!username) {
    return { success: false, error: "Invalid Instagram username." };
  }

  try {
    const res = await fetch(`${IG_API}?username=${encodeURIComponent(username)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-IG-App-ID": IG_APP_ID,
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.instagram.com/",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      if (res.status === 404) return { success: false, error: "Instagram user not found." };
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: "Instagram blocked the request. Please enter stats manually." };
      }
      return { success: false, error: `Instagram API returned ${res.status}.` };
    }

    const json = await res.json();
    const user = json?.data?.user;

    if (!user) {
      return { success: false, error: "Instagram user not found." };
    }

    return {
      success: true,
      data: {
        platform_user_id: user.id || "",
        display_name: user.full_name || username,
        handle: user.username || username,
        avatar_url: user.profile_pic_url_hd || user.profile_pic_url || null,
        bio: user.biography || null,
        followers_count: user.edge_followed_by?.count ?? 0,
        following_count: user.edge_follow?.count ?? 0,
        posts_count: user.edge_owner_to_timeline_media?.count ?? 0,
        engagement_rate: null,
        verified: user.is_verified ?? false,
        country: null,
        extra: {
          is_business: user.is_business_account,
          category: user.category_name,
          external_url: user.external_url,
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Instagram lookup failed: ${err instanceof Error ? err.message : "Unknown error"}. Please enter stats manually.`,
    };
  }
}
