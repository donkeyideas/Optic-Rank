/**
 * Normalized social profile data returned by all platform clients.
 * Each platform client (youtube.ts, instagram.ts, etc.) converts
 * platform-specific API responses into this shared shape.
 */

export interface SocialProfileData {
  platform_user_id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number | null;
  verified: boolean;
  country: string | null;
  extra: Record<string, unknown>;
}

export type SocialFetchResult = {
  success: true;
  data: SocialProfileData;
} | {
  success: false;
  error: string;
}
