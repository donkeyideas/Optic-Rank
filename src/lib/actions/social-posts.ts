"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/ai-provider";
import type {
  SocialPlatform,
  PostStatus,
  ToneType,
  SocialMediaPost,
} from "@/types/social-posts";
import { CHAR_LIMITS, AUTOMATION_KEYS } from "@/types/social-posts";

const REVALIDATE_PATH = "/admin/social-posts";

// ─── CRUD ────────────────────────────────────────────────────

export async function getSocialPosts(filters?: {
  status?: PostStatus | "ALL";
  platform?: SocialPlatform | "ALL";
}): Promise<{ data: SocialMediaPost[]; error?: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { data: [], error: "Not authorized." };

  const supabase = createAdminClient();
  let query = supabase
    .from("social_media_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters?.platform && filters.platform !== "ALL") {
    query = query.eq("platform", filters.platform);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as SocialMediaPost[] };
}

export async function createSocialPost(post: {
  platform: SocialPlatform;
  content: string;
  status?: PostStatus;
  hashtags?: string[];
  image_prompt?: string;
  scheduled_at?: string;
}): Promise<{ error: string } | { success: true; id: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("social_media_posts")
    .insert({
      platform: post.platform,
      content: post.content,
      status: post.status ?? "DRAFT",
      hashtags: post.hashtags ?? [],
      image_prompt: post.image_prompt ?? null,
      scheduled_at: post.scheduled_at ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true, id: data.id };
}

export async function updateSocialPost(
  id: string,
  updates: {
    content?: string;
    status?: PostStatus;
    hashtags?: string[];
    image_prompt?: string;
    scheduled_at?: string | null;
    published_at?: string | null;
  }
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("social_media_posts")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

export async function deleteSocialPost(
  id: string
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("social_media_posts")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

// ─── Bulk Approve ────────────────────────────────────────────

export async function bulkApproveDrafts(): Promise<
  { error: string } | { success: true; count: number }
> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const tomorrow9am = new Date();
  tomorrow9am.setUTCDate(tomorrow9am.getUTCDate() + 1);
  tomorrow9am.setUTCHours(9, 0, 0, 0);

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("social_media_posts")
    .update({
      status: "SCHEDULED",
      scheduled_at: tomorrow9am.toISOString(),
    })
    .eq("status", "DRAFT")
    .select("id");

  if (error) return { error: error.message };
  revalidatePath(REVALIDATE_PATH);
  return { success: true, count: data?.length ?? 0 };
}

// ─── AI Generation ───────────────────────────────────────────

function buildPrompt(
  platform: SocialPlatform,
  topic: string | undefined,
  tone: ToneType
): string {
  const limit = CHAR_LIMITS[platform];
  const toneDesc: Record<ToneType, string> = {
    informative: "educational, factual, structured with clear takeaways — explain a concept or share knowledge",
    engaging: "conversational, hook-driven, attention-grabbing — make people stop scrolling and interact",
    promotional: "direct call-to-action, benefit-focused, urgency-driven — sell a product, feature, or offer",
    controversial: "bold hot take, opinion-driven, debate-starting — challenge the status quo",
    witty: "clever wordplay, dry humor, meme-worthy — make people laugh or smirk while learning something",
    storytelling: "narrative-driven, personal anecdote, emotional arc — tell a short story with a point",
    authoritative: "expert voice, confident assertions, thought leadership — position yourself as the go-to authority",
    casual: "relaxed, friendly, like texting a friend — approachable and low-pressure",
    inspirational: "motivational, uplifting, aspirational — energize and empower the audience",
    "data-driven": "stats-heavy, research-backed, numbers-first — lead with specific data points and percentages",
  };

  const topicLine = topic?.trim()
    ? `TOPIC: ${topic}`
    : "TOPIC: Choose a trending, timely topic relevant to digital marketing, SEO, AI, or tech. Be specific — pick a niche angle, not a generic subject.";

  return `You are a social media expert. Write a ${platform.toLowerCase()} post.

${topicLine}

TONE: ${toneDesc[tone]}

PLATFORM RULES:
- Platform: ${platform}
- STRICT character limit: ${limit} characters (including spaces). Do NOT exceed this.
- Write naturally for this platform's audience and conventions.
${platform === "TWITTER" ? "- Be concise and punchy. Use 1-2 hashtags max." : ""}
${platform === "LINKEDIN" ? "- Be professional. Use line breaks for readability. Include 3-5 hashtags." : ""}
${platform === "FACEBOOK" ? "- Be conversational and relatable. Include 2-3 hashtags." : ""}
${platform === "INSTAGRAM" ? "- Be visual and engaging. Include 5-10 hashtags at the end." : ""}
${platform === "TIKTOK" ? "- Be trendy and casual. Use 2-4 hashtags." : ""}

OUTPUT FORMAT:
Return ONLY the post text. No quotes, no labels, no preamble. Just the raw post content ready to publish.
CRITICAL: Do NOT use any markdown formatting. No ** for bold, no ## for headers, no --- for separators, no * for italics, no backticks for code. Write plain text only.

After the post content, on a new line, add:
---HASHTAGS---
[comma-separated hashtags without # symbol]
---IMAGE_PROMPT---
[A one-sentence image generation prompt describing an ideal accompanying image]`;
}

function parseGeneratedContent(raw: string): {
  content: string;
  hashtags: string[];
  imagePrompt: string;
} {
  let content = raw;
  let hashtags: string[] = [];
  let imagePrompt = "";

  // Extract image prompt
  const imgSplit = content.split("---IMAGE_PROMPT---");
  if (imgSplit.length > 1) {
    imagePrompt = imgSplit[1].trim();
    content = imgSplit[0];
  }

  // Extract hashtags
  const hashSplit = content.split("---HASHTAGS---");
  if (hashSplit.length > 1) {
    const rawTags = hashSplit[1].trim();
    hashtags = rawTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
    content = hashSplit[0];
  }

  // Clean up markdown artifacts
  content = content
    .replace(/```[\s\S]*?```/g, "")           // fenced code blocks
    .replace(/\*\*([^*]+)\*\*/g, "$1")         // **bold** → bold
    .replace(/\*([^*]+)\*/g, "$1")             // *italic* → italic
    .replace(/__([^_]+)__/g, "$1")             // __bold__ → bold
    .replace(/_([^_]+)_/g, "$1")               // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, "")              // ## headers → plain text
    .replace(/^[-*]{3,}\s*$/gm, "")           // --- or *** horizontal rules
    .replace(/^\s*[-*+]\s+/gm, "• ")          // - list items → bullet
    .replace(/^\s*\d+\.\s+/gm, (m) => m)      // keep numbered lists as-is
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // [text](url) → text
    .replace(/`([^`]+)`/g, "$1")               // `code` → code
    .replace(/\n{3,}/g, "\n\n")               // collapse excessive newlines
    .trim();

  return { content, hashtags, imagePrompt };
}

export async function generateSocialPosts(params: {
  topic?: string;
  tone: ToneType;
  platforms: SocialPlatform[];
}): Promise<
  | { error: string }
  | { success: true; posts: SocialMediaPost[]; errors: string[] }
> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const { topic, tone, platforms } = params;
  if (platforms.length === 0) return { error: "Select at least one platform." };

  const supabase = createAdminClient();
  const errors: string[] = [];
  const createdPosts: SocialMediaPost[] = [];

  // Generate in parallel
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      const prompt = buildPrompt(platform, topic, tone);
      const maxTokens =
        platform === "TWITTER" || platform === "TIKTOK" ? 150 : 600;

      const result = await aiChat(prompt, {
        temperature: 0.8,
        maxTokens,
        timeout: 60000,
      });

      if (!result) throw new Error(`AI returned no response for ${platform}`);

      const parsed = parseGeneratedContent(result.text);

      // Save as draft
      const { data, error } = await supabase
        .from("social_media_posts")
        .insert({
          platform,
          content: parsed.content,
          status: "DRAFT",
          hashtags: parsed.hashtags,
          image_prompt: parsed.imagePrompt,
        })
        .select("*")
        .single();

      if (error) throw new Error(`DB error for ${platform}: ${error.message}`);
      return data as SocialMediaPost;
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      createdPosts.push(r.value);
    } else {
      errors.push(r.reason?.message ?? "Unknown generation error");
    }
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, posts: createdPosts, errors };
}

// ─── Publishing ──────────────────────────────────────────────

async function getCredential(key: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value ?? null;
}

async function publishToTwitter(content: string): Promise<void> {
  const [apiKey, apiSecret, accessToken, accessTokenSecret] = await Promise.all(
    [
      getCredential("twitter_api_key"),
      getCredential("twitter_api_secret"),
      getCredential("twitter_access_token"),
      getCredential("twitter_access_token_secret"),
    ]
  );

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Twitter credentials not configured");
  }

  const { TwitterApi } = await import("twitter-api-v2");
  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret: accessTokenSecret,
  });

  const truncated = content.slice(0, 280);
  await client.v2.tweet(truncated);
}

async function publishToLinkedIn(content: string): Promise<void> {
  const [accessToken, personUrn] = await Promise.all([
    getCredential("linkedin_access_token"),
    getCredential("linkedin_person_urn"),
  ]);

  if (!accessToken || !personUrn) {
    throw new Error("LinkedIn credentials not configured");
  }

  const response = await fetch("https://api.linkedin.com/v2/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": "202401",
    },
    body: JSON.stringify({
      author: personUrn,
      commentary: content.slice(0, 3000),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
      },
      lifecycleState: "PUBLISHED",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LinkedIn API error ${response.status}: ${body.slice(0, 200)}`);
  }
}

async function publishToFacebook(content: string): Promise<void> {
  const [pageToken, pageId] = await Promise.all([
    getCredential("facebook_page_token"),
    getCredential("facebook_page_id"),
  ]);

  if (!pageToken || !pageId) {
    throw new Error("Facebook credentials not configured");
  }

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: content.slice(0, 2000),
        access_token: pageToken,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Facebook API error ${response.status}: ${body.slice(0, 200)}`);
  }
}

export async function publishPost(
  id: string
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { data: post, error: fetchErr } = await supabase
    .from("social_media_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !post) return { error: "Post not found." };

  const p = post as SocialMediaPost;

  // Append hashtags to content
  const hashtagStr = p.hashtags.length > 0
    ? "\n\n" + [...new Set(p.hashtags)].map((h) => `#${h}`).join(" ")
    : "";
  const fullContent = p.content + hashtagStr;

  try {
    switch (p.platform) {
      case "TWITTER":
        await publishToTwitter(fullContent);
        break;
      case "LINKEDIN":
        await publishToLinkedIn(fullContent);
        break;
      case "FACEBOOK":
        await publishToFacebook(fullContent);
        break;
      case "INSTAGRAM":
        return { error: "Instagram text-only posts are not supported via API." };
      case "TIKTOK":
        return { error: "TikTok publishing is not yet implemented." };
      default:
        return { error: `Unsupported platform: ${p.platform}` };
    }

    await supabase
      .from("social_media_posts")
      .update({
        status: "PUBLISHED",
        published_at: new Date().toISOString(),
      })
      .eq("id", id);

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    await supabase
      .from("social_media_posts")
      .update({ status: "FAILED" })
      .eq("id", id);

    revalidatePath(REVALIDATE_PATH);
    return { error: `Publishing failed: ${msg}` };
  }
}

// ─── Automation Config ───────────────────────────────────────

export interface AutomationConfig {
  enabled: boolean;
  platforms: SocialPlatform[];
  hour: number;
  topics: string[];
  useDomainContent: boolean;
  requireApproval: boolean;
}

export async function getAutomationConfig(): Promise<AutomationConfig> {
  const supabase = createAdminClient();
  const keys = Object.values(AUTOMATION_KEYS);
  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", keys);

  const map = new Map((data ?? []).map((r) => [r.key, r.value]));

  return {
    enabled: map.get(AUTOMATION_KEYS.enabled) === "true",
    platforms: map.get(AUTOMATION_KEYS.platforms)
      ? (JSON.parse(map.get(AUTOMATION_KEYS.platforms)!) as SocialPlatform[])
      : [],
    hour: parseInt(map.get(AUTOMATION_KEYS.hour) ?? "9", 10),
    topics: map.get(AUTOMATION_KEYS.topics)
      ? (JSON.parse(map.get(AUTOMATION_KEYS.topics)!) as string[])
      : [],
    useDomainContent: map.get(AUTOMATION_KEYS.useDomainContent) === "true",
    requireApproval: map.get(AUTOMATION_KEYS.requireApproval) !== "false",
  };
}

export async function saveAutomationConfig(
  config: AutomationConfig
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const entries: { key: string; value: string }[] = [
    { key: AUTOMATION_KEYS.enabled, value: String(config.enabled) },
    { key: AUTOMATION_KEYS.platforms, value: JSON.stringify(config.platforms) },
    { key: AUTOMATION_KEYS.hour, value: String(config.hour) },
    { key: AUTOMATION_KEYS.topics, value: JSON.stringify(config.topics) },
    { key: AUTOMATION_KEYS.useDomainContent, value: String(config.useDomainContent) },
    { key: AUTOMATION_KEYS.requireApproval, value: String(config.requireApproval) },
  ];

  for (const entry of entries) {
    const { error } = await supabase
      .from("admin_settings")
      .upsert(entry, { onConflict: "key" });
    if (error) return { error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

// ─── Credentials ─────────────────────────────────────────────

export async function getCredentials(): Promise<
  Record<string, string>
> {
  const adminId = await requireAdmin();
  if (!adminId) return {};

  const supabase = createAdminClient();
  const credentialKeys = [
    "twitter_api_key",
    "twitter_api_secret",
    "twitter_access_token",
    "twitter_access_token_secret",
    "linkedin_access_token",
    "linkedin_person_urn",
    "facebook_page_token",
    "facebook_page_id",
    "instagram_access_token",
    "instagram_account_id",
  ];

  const { data } = await supabase
    .from("admin_settings")
    .select("key, value")
    .in("key", credentialKeys);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.key] = row.value;
  }
  return map;
}

export async function saveCredentials(
  creds: Record<string, string>
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();

  for (const [key, value] of Object.entries(creds)) {
    if (!value) continue;
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ key, value }, { onConflict: "key" });
    if (error) return { error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

// ─── Test Connection ─────────────────────────────────────────

export async function testConnection(
  platform: string
): Promise<{ error: string } | { success: true; message: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  try {
    switch (platform) {
      case "TWITTER": {
        const [apiKey, apiSecret, accessToken, accessTokenSecret] =
          await Promise.all([
            getCredential("twitter_api_key"),
            getCredential("twitter_api_secret"),
            getCredential("twitter_access_token"),
            getCredential("twitter_access_token_secret"),
          ]);
        if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
          return { error: "Missing Twitter credentials." };
        }
        const { TwitterApi } = await import("twitter-api-v2");
        const client = new TwitterApi({
          appKey: apiKey,
          appSecret: apiSecret,
          accessToken,
          accessSecret: accessTokenSecret,
        });
        const me = await client.v2.me();
        return { success: true, message: `Connected as @${me.data.username}` };
      }

      case "LINKEDIN": {
        const token = await getCredential("linkedin_access_token");
        if (!token) return { error: "Missing LinkedIn access token." };
        const res = await fetch("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return { error: `LinkedIn API returned ${res.status}` };
        const data = await res.json();
        return {
          success: true,
          message: `Connected as ${data.name || data.sub || "verified"}`,
        };
      }

      case "FACEBOOK": {
        const token = await getCredential("facebook_page_token");
        const pageId = await getCredential("facebook_page_id");
        if (!token || !pageId)
          return { error: "Missing Facebook credentials." };
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}?fields=name&access_token=${token}`
        );
        if (!res.ok) return { error: `Facebook API returned ${res.status}` };
        const data = await res.json();
        return {
          success: true,
          message: `Connected to page: ${data.name || pageId}`,
        };
      }

      case "INSTAGRAM": {
        const token = await getCredential("instagram_access_token");
        const accountId = await getCredential("instagram_account_id");
        if (!token || !accountId)
          return { error: "Missing Instagram credentials." };
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${accountId}?fields=username&access_token=${token}`
        );
        if (!res.ok) return { error: `Instagram API returned ${res.status}` };
        const data = await res.json();
        return {
          success: true,
          message: `Connected as @${data.username || accountId}`,
        };
      }

      default:
        return { error: `Unsupported platform: ${platform}` };
    }
  } catch (err) {
    return {
      error: `Connection test failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
