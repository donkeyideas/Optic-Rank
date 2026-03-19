export type SocialPlatform = "TWITTER" | "LINKEDIN" | "FACEBOOK" | "INSTAGRAM" | "TIKTOK";
export type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED" | "CANCELLED";
export type ToneType =
  | "informative"
  | "engaging"
  | "promotional"
  | "controversial"
  | "witty"
  | "storytelling"
  | "authoritative"
  | "casual"
  | "inspirational"
  | "data-driven";

export interface SocialMediaPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  status: PostStatus;
  hashtags: string[];
  image_prompt: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedPost {
  platform: SocialPlatform;
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

export const CHAR_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  TIKTOK: 300,
  FACEBOOK: 2000,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
};

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  TWITTER: "Twitter / X",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export const ALL_PLATFORMS: SocialPlatform[] = [
  "TWITTER",
  "LINKEDIN",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
];

export const TONE_OPTIONS: { value: ToneType; label: string; description: string }[] = [
  { value: "engaging", label: "Engaging", description: "Conversational, witty, attention-grabbing" },
  { value: "informative", label: "Informative", description: "Educational, factual, clear explanations" },
  { value: "witty", label: "Witty / Humorous", description: "Clever wordplay, memes, sarcasm" },
  { value: "storytelling", label: "Storytelling", description: "Narrative-driven, personal anecdotes" },
  { value: "authoritative", label: "Authoritative", description: "Expert voice, bold claims, thought leadership" },
  { value: "casual", label: "Casual / Friendly", description: "Relaxed, approachable, like texting a friend" },
  { value: "inspirational", label: "Inspirational", description: "Motivational, uplifting, aspirational" },
  { value: "data-driven", label: "Data-Driven", description: "Stats-heavy, research-backed, numbers-first" },
  { value: "promotional", label: "Promotional", description: "Direct CTA, benefit-focused, sales-oriented" },
  { value: "controversial", label: "Controversial", description: "Hot takes, opinion-driven, debate-starting" },
];

/** Credential field definitions per platform */
export const PLATFORM_CREDENTIALS: Record<
  string,
  { key: string; label: string }[]
> = {
  TWITTER: [
    { key: "twitter_api_key", label: "API Key" },
    { key: "twitter_api_secret", label: "API Secret" },
    { key: "twitter_access_token", label: "Access Token" },
    { key: "twitter_access_token_secret", label: "Access Token Secret" },
  ],
  LINKEDIN: [
    { key: "linkedin_access_token", label: "Access Token" },
    { key: "linkedin_person_urn", label: "Person URN" },
  ],
  FACEBOOK: [
    { key: "facebook_page_token", label: "Page Access Token" },
    { key: "facebook_page_id", label: "Page ID" },
  ],
  INSTAGRAM: [
    { key: "instagram_access_token", label: "Access Token" },
    { key: "instagram_account_id", label: "Account ID" },
  ],
};

export const PLATFORM_GUIDES: Record<string, { url: string; label: string }> = {
  TWITTER: { url: "https://developer.twitter.com/en/portal/dashboard", label: "Twitter Developer Portal" },
  LINKEDIN: { url: "https://www.linkedin.com/developers/apps", label: "LinkedIn Developer Apps" },
  FACEBOOK: { url: "https://developers.facebook.com/apps/", label: "Facebook Developer Apps" },
  INSTAGRAM: { url: "https://developers.facebook.com/docs/instagram-api/", label: "Instagram API Docs" },
};

/** Automation config keys stored in admin_settings */
export const AUTOMATION_KEYS = {
  enabled: "social_auto_enabled",
  platforms: "social_auto_platforms",
  hour: "social_auto_hour",
  topics: "social_auto_topics",
  useDomainContent: "social_auto_use_domain_content",
  requireApproval: "social_auto_require_approval",
} as const;
