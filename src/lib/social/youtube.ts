/**
 * YouTube Data API v3 client.
 * Fetches channel statistics and recent video metrics.
 * Free tier: 10,000 units/day.
 */

import type { SocialFetchResult } from "./types";

const API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string | null {
  return process.env.YOUTUBE_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY || process.env.PAGESPEED_API_KEY || null;
}

/**
 * Fetch a YouTube channel by handle, username, or channel ID.
 * Accepts: @handle, channel URL, or raw channel ID.
 */
export async function fetchYouTubeProfile(input: string): Promise<SocialFetchResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { success: false, error: "YouTube API key not configured." };
  }

  try {
    const channelData = await resolveChannel(input, apiKey);
    if (!channelData) {
      return { success: false, error: "Channel not found." };
    }

    return {
      success: true,
      data: {
        platform_user_id: channelData.id,
        display_name: channelData.snippet.title,
        handle: channelData.snippet.customUrl || input,
        avatar_url: channelData.snippet.thumbnails?.default?.url || null,
        bio: channelData.snippet.description || null,
        followers_count: parseInt(channelData.statistics.subscriberCount) || 0,
        following_count: 0,
        posts_count: parseInt(channelData.statistics.videoCount) || 0,
        engagement_rate: null, // Calculated from recent videos below
        verified: false,
        country: channelData.snippet.country || null,
        extra: {
          total_views: parseInt(channelData.statistics.viewCount) || 0,
          hidden_subscriber_count: channelData.statistics.hiddenSubscriberCount,
          published_at: channelData.snippet.publishedAt,
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `YouTube API error: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

/**
 * Resolve a YouTube channel from various input formats.
 */
async function resolveChannel(
  input: string,
  apiKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const clean = input.trim().replace(/\/$/, "");
  const parts = "id,snippet,statistics";

  // Try by handle (@username)
  if (clean.startsWith("@")) {
    return fetchChannelByParam(`forHandle=${encodeURIComponent(clean)}`, parts, apiKey);
  }

  // Try URL parsing
  if (clean.includes("youtube.com")) {
    const url = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
    const pathname = url.pathname;

    // /channel/UCxxxxxx
    const channelMatch = pathname.match(/\/channel\/(UC[\w-]+)/);
    if (channelMatch) {
      return fetchChannelByParam(`id=${channelMatch[1]}`, parts, apiKey);
    }

    // /@handle
    const handleMatch = pathname.match(/\/@([\w.-]+)/);
    if (handleMatch) {
      return fetchChannelByParam(`forHandle=${encodeURIComponent(`@${handleMatch[1]}`)}`, parts, apiKey);
    }

    // /c/customname or /user/username
    const customMatch = pathname.match(/\/(c|user)\/([\w.-]+)/);
    if (customMatch) {
      return fetchChannelByParam(`forUsername=${encodeURIComponent(customMatch[2])}`, parts, apiKey);
    }
  }

  // Try as channel ID
  if (clean.startsWith("UC") && clean.length >= 20) {
    return fetchChannelByParam(`id=${clean}`, parts, apiKey);
  }

  // Try as handle without @
  return fetchChannelByParam(`forHandle=${encodeURIComponent(`@${clean}`)}`, parts, apiKey);
}

async function fetchChannelByParam(
  param: string,
  parts: string,
  apiKey: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const url = `${API_BASE}/channels?${param}&part=${parts}&key=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.items?.[0] || null;
}

/**
 * Fetch recent videos for a channel to calculate engagement rate.
 * Returns avg views, likes, comments across last N videos.
 */
export async function fetchRecentVideoStats(
  channelId: string,
  maxVideos: number = 10
): Promise<{
  avg_views: number;
  avg_likes: number;
  avg_comments: number;
  engagement_rate: number;
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    // Step 1: Get recent video IDs via search
    const searchUrl = `${API_BASE}/search?channelId=${channelId}&type=video&order=date&maxResults=${maxVideos}&part=id&key=${apiKey}`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const videoIds = (searchData.items ?? []).map((i: any) => i.id.videoId).filter(Boolean);
    if (videoIds.length === 0) return null;

    // Step 2: Get video statistics
    const statsUrl = `${API_BASE}/videos?id=${videoIds.join(",")}&part=statistics&key=${apiKey}`;
    const statsRes = await fetch(statsUrl, { next: { revalidate: 3600 } });
    if (!statsRes.ok) return null;

    const statsData = await statsRes.json();
    const videos = statsData.items ?? [];
    if (videos.length === 0) return null;

    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const v of videos as any[]) {
      totalViews += parseInt(v.statistics.viewCount) || 0;
      totalLikes += parseInt(v.statistics.likeCount) || 0;
      totalComments += parseInt(v.statistics.commentCount) || 0;
    }

    const count = videos.length;
    const avgViews = totalViews / count;
    const avgLikes = totalLikes / count;
    const avgComments = totalComments / count;

    // Engagement rate = (likes + comments) / views * 100
    const engagementRate = avgViews > 0
      ? ((avgLikes + avgComments) / avgViews) * 100
      : 0;

    return {
      avg_views: Math.round(avgViews),
      avg_likes: Math.round(avgLikes),
      avg_comments: Math.round(avgComments),
      engagement_rate: Math.round(engagementRate * 100) / 100,
    };
  } catch {
    return null;
  }
}
