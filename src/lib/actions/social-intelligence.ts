"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  analyzeGrowth,
  analyzeContentStrategy,
  analyzeHashtags,
  analyzeSocialCompetitors,
  generateSocialInsights,
  generateEarningsForecastAI,
  generateThirtyDayPlanAI,
} from "@/lib/ai/social-analysis";
import { getSocialProfileById, getSocialMetrics, getSocialCompetitors } from "@/lib/dal/social-intelligence";
import { checkPlanLimit } from "@/lib/stripe/plan-gate";
import type { SocialAnalysisType } from "@/types";

const REVALIDATE_PATH = "/dashboard/social-intelligence";

/* ------------------------------------------------------------------
   Add Social Profile (manual stat input)
   ------------------------------------------------------------------ */

export async function addSocialProfile(
  projectId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const platform = formData.get("platform") as string;
  const handle = formData.get("handle") as string;
  const niche = formData.get("niche") as string | null;
  const country = formData.get("country") as string | null;
  const followersCount = parseInt(formData.get("followers_count") as string) || 0;
  const followingCount = parseInt(formData.get("following_count") as string) || 0;
  const postsCount = parseInt(formData.get("posts_count") as string) || 0;
  const engagementRate = parseFloat(formData.get("engagement_rate") as string) || null;
  const displayName = formData.get("display_name") as string | null;
  const bio = formData.get("bio") as string | null;

  if (!handle?.trim()) return { error: "Handle is required." };
  if (!["instagram", "tiktok", "youtube", "twitter", "linkedin"].includes(platform)) {
    return { error: "Invalid platform." };
  }

  // Extract handle from URLs (e.g. https://www.instagram.com/hbomax/?hl=en → hbomax)
  const extractHandle = (raw: string): string => {
    const trimmed = raw.trim().replace(/^@/, "");
    try {
      const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      const hostPatterns: Record<string, RegExp> = {
        instagram: /instagram\.com/,
        tiktok: /tiktok\.com/,
        youtube: /youtube\.com|youtu\.be/,
        twitter: /twitter\.com|x\.com/,
        linkedin: /linkedin\.com/,
      };
      const matchesPlatform = Object.values(hostPatterns).some((r) => r.test(url.hostname));
      if (matchesPlatform) {
        // Get first non-empty path segment (skip /@, /in/, /channel/, /c/)
        const segments = url.pathname.split("/").filter(Boolean);
        const skipPrefixes = ["in", "channel", "c", "user", "company", "showcase"];
        const handleSegment = segments.find((s) => !skipPrefixes.includes(s.toLowerCase()));
        if (handleSegment) return handleSegment.replace(/^@/, "");
      }
    } catch {
      // Not a URL, use as-is
    }
    return trimmed;
  };

  // Check plan limit (superadmin bypass built-in)
  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) return { error: "Organization not found." };

  const planCheck = await checkPlanLimit(profile.organization_id, "social_profiles");
  if (!planCheck.allowed) {
    return { error: `Social profile limit reached (${planCheck.current}/${planCheck.limit}). Upgrade your plan.` };
  }

  const { error } = await supabase.from("social_profiles").insert({
    project_id: projectId,
    platform,
    handle: extractHandle(handle),
    display_name: displayName?.trim() || null,
    bio: bio?.trim() || null,
    niche: niche?.trim() || null,
    country: country?.trim() || null,
    followers_count: followersCount,
    following_count: followingCount,
    posts_count: postsCount,
    engagement_rate: engagementRate,
  });

  if (error) {
    if (error.code === "23505") return { error: "This profile is already being tracked." };
    return { error: error.message };
  }

  // Record initial metric snapshot so day-1 data exists for historical tracking
  const cleanHandle = extractHandle(handle);
  const { data: newProfile } = await supabase
    .from("social_profiles")
    .select("id")
    .eq("project_id", projectId)
    .eq("platform", platform)
    .eq("handle", cleanHandle)
    .maybeSingle();

  if (newProfile) {
    await supabase.from("social_metrics").upsert({
      social_profile_id: newProfile.id,
      date: new Date().toISOString().split("T")[0],
      followers: followersCount,
      following: followingCount,
      posts_count: postsCount,
      engagement_rate: engagementRate,
    }, { onConflict: "social_profile_id,date" });
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

/* ------------------------------------------------------------------
   Update Social Profile (re-enter stats manually)
   ------------------------------------------------------------------ */

export async function updateSocialProfile(
  profileId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const fields = [
    "display_name", "bio", "niche", "country", "handle",
  ] as const;
  for (const field of fields) {
    const val = formData.get(field);
    if (val !== null) updates[field] = (val as string).trim() || null;
  }

  const numFields = [
    "followers_count", "following_count", "posts_count",
  ] as const;
  for (const field of numFields) {
    const val = formData.get(field);
    if (val !== null) updates[field] = parseInt(val as string) || 0;
  }

  const engRate = formData.get("engagement_rate");
  if (engRate !== null) updates.engagement_rate = parseFloat(engRate as string) || null;

  const { error } = await supabase
    .from("social_profiles")
    .update(updates)
    .eq("id", profileId);

  if (error) return { error: error.message };

  // Also record a metric snapshot for today
  const profile = await getSocialProfileById(profileId);
  if (profile) {
    await supabase.from("social_metrics").upsert({
      social_profile_id: profileId,
      date: new Date().toISOString().split("T")[0],
      followers: profile.followers_count,
      following: profile.following_count,
      posts_count: profile.posts_count,
      engagement_rate: profile.engagement_rate,
    }, { onConflict: "social_profile_id,date" });
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

/* ------------------------------------------------------------------
   Remove Social Profile
   ------------------------------------------------------------------ */

export async function removeSocialProfile(
  profileId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("social_profiles")
    .delete()
    .eq("id", profileId);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

/* ------------------------------------------------------------------
   Trigger AI Analysis
   ------------------------------------------------------------------ */

export async function analyzeSocialProfile(
  profileId: string,
  analysisType: SocialAnalysisType
): Promise<{ error: string } | { success: true; result: Record<string, unknown> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const profile = await getSocialProfileById(profileId);
  if (!profile) return { error: "Profile not found." };

  const metrics = await getSocialMetrics(profileId, 30);
  const competitors = await getSocialCompetitors(profileId);

  let result: Record<string, unknown>;
  let provider = "unknown";

  try {
    switch (analysisType) {
      case "growth": {
        const r = await analyzeGrowth(profile, metrics);
        result = { tips: r.tips };
        provider = r.provider;
        break;
      }
      case "content_strategy": {
        const r = await analyzeContentStrategy(profile, metrics);
        result = r.strategy as unknown as Record<string, unknown>;
        provider = r.provider;
        break;
      }
      case "hashtags": {
        const r = await analyzeHashtags(profile, metrics);
        result = { hashtags: r.hashtags };
        provider = r.provider;
        break;
      }
      case "competitors": {
        // Auto-discover competitors if none exist
        let competitorsToAnalyze = competitors;
        if (competitorsToAnalyze.length === 0) {
          const { discoverSocialCompetitors: discover } = await import("@/lib/ai/social-analysis");
          const discovered = await discover(profile);
          if (discovered.competitors.length > 0) {
            const adminDb = createAdminClient();
            for (const comp of discovered.competitors) {
              await adminDb.from("social_competitors").insert({
                social_profile_id: profileId,
                platform: profile.platform,
                handle: comp.handle.replace(/^@/, ""),
                display_name: comp.display_name || null,
                followers_count: comp.followers_estimate || null,
                engagement_rate: comp.engagement_estimate || null,
                niche: comp.niche || null,
              });
            }
            // Re-fetch after inserting
            competitorsToAnalyze = await getSocialCompetitors(profileId);
          }
        }
        const r = await analyzeSocialCompetitors(profile, competitorsToAnalyze);
        result = r.analysis as unknown as Record<string, unknown>;
        provider = r.provider;
        break;
      }
      case "insights": {
        const r = await generateSocialInsights(profile, metrics);
        result = { insights: r.insights };
        provider = r.provider;
        break;
      }
      case "earnings_forecast": {
        const r = await generateEarningsForecastAI(profile, metrics);
        result = r.forecast as unknown as Record<string, unknown>;
        provider = r.provider;
        break;
      }
      case "thirty_day_plan": {
        const r = await generateThirtyDayPlanAI(profile, metrics);
        result = { plan: r.plan };
        provider = r.provider;
        break;
      }
      default:
        return { error: "Invalid analysis type." };
    }
  } catch (err) {
    return { error: `Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}` };
  }

  // Store the analysis result
  const supabase = createAdminClient();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await supabase.from("social_analyses").insert({
    social_profile_id: profileId,
    analysis_type: analysisType,
    result,
    ai_provider: provider,
    expires_at: expiresAt.toISOString(),
  });

  revalidatePath(REVALIDATE_PATH);
  return { success: true, result };
}

/* ------------------------------------------------------------------
   Add Social Competitor
   ------------------------------------------------------------------ */

export async function addSocialCompetitor(
  profileId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const handle = formData.get("handle") as string;
  const displayName = formData.get("display_name") as string | null;
  const followersCount = parseInt(formData.get("followers_count") as string) || null;
  const engagementRate = parseFloat(formData.get("engagement_rate") as string) || null;
  const niche = formData.get("niche") as string | null;

  if (!handle?.trim()) return { error: "Handle is required." };

  // Get the parent profile's platform
  const profile = await getSocialProfileById(profileId);
  if (!profile) return { error: "Profile not found." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("social_competitors").insert({
    social_profile_id: profileId,
    platform: profile.platform,
    handle: handle.trim().replace(/^@/, ""),
    display_name: displayName?.trim() || null,
    followers_count: followersCount,
    engagement_rate: engagementRate,
    niche: niche?.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "This competitor is already being tracked." };
    return { error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

/* ------------------------------------------------------------------
   Remove Social Competitor
   ------------------------------------------------------------------ */

export async function removeSocialCompetitor(
  competitorId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("social_competitors")
    .delete()
    .eq("id", competitorId);

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

/* ------------------------------------------------------------------
   Discover Competitors (AI-powered)
   ------------------------------------------------------------------ */

export async function discoverSocialCompetitors(
  profileId: string
): Promise<{ error: string } | { success: true; added: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const profile = await getSocialProfileById(profileId);
  if (!profile) return { error: "Profile not found." };

  const { discoverSocialCompetitors: discover } = await import("@/lib/ai/social-analysis");
  const { competitors } = await discover(profile);

  if (competitors.length === 0) {
    return { error: "Could not discover competitors. Try adding them manually." };
  }

  const supabase = createAdminClient();
  let added = 0;

  for (const comp of competitors) {
    const { error } = await supabase.from("social_competitors").insert({
      social_profile_id: profileId,
      platform: profile.platform,
      handle: comp.handle.replace(/^@/, ""),
      display_name: comp.display_name || null,
      followers_count: comp.followers_estimate || null,
      engagement_rate: comp.engagement_estimate || null,
      niche: comp.niche || null,
    });
    if (!error) added++;
    // Skip duplicates silently (unique constraint)
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, added };
}

/* ------------------------------------------------------------------
   Lookup Social Profile (auto-populate from platform APIs)
   ------------------------------------------------------------------ */

interface LookupData {
  display_name: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number | null;
  engagement_estimated: boolean;
  country: string | null;
  avatar_url: string | null;
}

/**
 * Estimate engagement rate from industry benchmarks when scraping can't get it.
 * Based on 2024-2025 benchmark data from Rival IQ, Social Insider, Hootsuite.
 *
 * Factors: platform, follower tier, niche (if available).
 * Returns a percentage (e.g. 3.5 means 3.5%).
 */
function estimateEngagementRate(
  platform: string,
  followersCount: number,
  niche?: string | null
): number {
  // Base rates by platform (median across all account sizes)
  const platformBase: Record<string, number> = {
    instagram: 1.85,
    tiktok: 4.25,
    twitter: 0.55,
    linkedin: 2.20,
    youtube: 1.80,
  };

  // Follower tier multipliers (smaller accounts = higher engagement)
  function tierMultiplier(followers: number): number {
    if (followers < 1000) return 2.0;        // Nano
    if (followers < 10000) return 1.5;       // Micro
    if (followers < 50000) return 1.2;       // Small
    if (followers < 100000) return 1.0;      // Mid
    if (followers < 500000) return 0.75;     // Large
    if (followers < 1000000) return 0.55;    // Macro
    return 0.35;                              // Mega/Celebrity
  }

  // Niche adjustments (some niches naturally get more engagement)
  const nicheBoost: Record<string, number> = {
    fitness: 1.15,
    food: 1.12,
    travel: 1.10,
    beauty: 1.08,
    fashion: 1.05,
    gaming: 1.15,
    sports: 1.10,
    education: 1.20,
    pets: 1.25,
    parenting: 1.15,
    tech: 0.90,
    business: 0.85,
    finance: 0.85,
    news: 0.75,
    entertainment: 1.10,
    music: 1.05,
    art: 1.12,
    photography: 1.10,
    health: 1.10,
    comedy: 1.20,
    debate: 1.15,
    basketball: 1.12,
  };

  const base = platformBase[platform] ?? 1.5;
  const tier = tierMultiplier(followersCount);

  let nicheMultiplier = 1.0;
  if (niche) {
    const lowerNiche = niche.toLowerCase();
    for (const [key, boost] of Object.entries(nicheBoost)) {
      if (lowerNiche.includes(key)) {
        nicheMultiplier = boost;
        break;
      }
    }
  }

  // Add slight randomness so estimates don't look identical (±10%)
  const jitter = 0.9 + Math.random() * 0.2;

  const estimated = base * tier * nicheMultiplier * jitter;
  return Math.round(estimated * 100) / 100;
}

export async function lookupSocialProfile(
  platform: string,
  handle: string
): Promise<{ success: true; data: LookupData } | { success: false; error: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated." };

  if (!handle?.trim()) return { success: false, error: "Handle is required." };

  if (platform === "youtube") {
    const { fetchYouTubeProfile, fetchRecentVideoStats } = await import("@/lib/social/youtube");
    const result = await fetchYouTubeProfile(handle);
    if (!result.success) return { success: false, error: result.error };

    // Fetch engagement rate from recent videos
    let engagementRate = result.data.engagement_rate;
    if (result.data.platform_user_id) {
      const videoStats = await fetchRecentVideoStats(result.data.platform_user_id);
      if (videoStats) {
        engagementRate = videoStats.engagement_rate;
      }
    }

    return {
      success: true,
      data: {
        display_name: result.data.display_name,
        bio: result.data.bio,
        followers_count: result.data.followers_count,
        following_count: result.data.following_count,
        posts_count: result.data.posts_count,
        engagement_rate: engagementRate ?? estimateEngagementRate("youtube", result.data.followers_count),
        engagement_estimated: engagementRate == null,
        country: result.data.country,
        avatar_url: result.data.avatar_url,
      },
    };
  }

  // --- All other platforms: fetch + estimate engagement if null ---
  type FetchFn = (h: string) => Promise<import("@/lib/social/types").SocialFetchResult>;
  const fetchers: Record<string, () => Promise<FetchFn>> = {
    instagram: async () => (await import("@/lib/social/instagram")).fetchInstagramProfile,
    tiktok: async () => (await import("@/lib/social/tiktok")).fetchTikTokProfile,
    twitter: async () => (await import("@/lib/social/twitter")).fetchTwitterProfile,
    linkedin: async () => (await import("@/lib/social/linkedin")).fetchLinkedInProfile,
  };

  const fetcherLoader = fetchers[platform];
  if (!fetcherLoader) {
    return { success: false, error: `Unsupported platform: ${platform}. Please enter stats manually.` };
  }

  const fetchProfile = await fetcherLoader();
  const result = await fetchProfile(handle);
  if (!result.success) return { success: false, error: result.error };

  const realRate = result.data.engagement_rate;
  const estimated = realRate == null;
  const finalRate = realRate ?? estimateEngagementRate(platform, result.data.followers_count);

  return {
    success: true,
    data: {
      display_name: result.data.display_name,
      bio: result.data.bio,
      followers_count: result.data.followers_count,
      following_count: result.data.following_count,
      posts_count: result.data.posts_count,
      engagement_rate: finalRate,
      engagement_estimated: estimated,
      country: result.data.country,
      avatar_url: result.data.avatar_url,
    },
  };
}

/* ------------------------------------------------------------------
   Social Goals — Save / Fetch
   ------------------------------------------------------------------ */

export async function saveSocialGoals(
  profileId: string,
  goals: {
    primary_objective: string;
    target_value: number | null;
    target_days: number | null;
    content_niche: string | null;
    monetization_goal: string | null;
    posting_commitment: string | null;
    target_audience: string | null;
    competitive_aspiration: string | null;
  }
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("social_goals")
    .upsert(
      {
        social_profile_id: profileId,
        ...goals,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "social_profile_id" }
    );

  if (error) return { error: error.message };

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
}

/* ------------------------------------------------------------------
   Generate Social Content (AI)
   ------------------------------------------------------------------ */

export async function generateSocialContent(
  profileId: string,
  options: {
    contentType: string;
    topic?: string;
    tone?: string;
    count?: number;
  }
): Promise<{ error: string } | { content: import("@/types").GeneratedContent[] }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const profile = await getSocialProfileById(profileId);
  if (!profile) return { error: "Profile not found." };

  // Fetch goals if available
  const supabase = createAdminClient();
  const { data: goalsData } = await supabase
    .from("social_goals")
    .select("*")
    .eq("social_profile_id", profileId)
    .maybeSingle();

  const { generateSocialContentAI } = await import("@/lib/ai/social-analysis");

  try {
    const result = await generateSocialContentAI(profile, {
      contentType: options.contentType,
      topic: options.topic,
      tone: options.tone || "casual",
      count: options.count || 5,
      goals: goalsData || undefined,
    });

    // Store in social_analyses for history
    await supabase.from("social_analyses").insert({
      social_profile_id: profileId,
      analysis_type: "generated_content",
      result: { items: result.content, contentType: options.contentType, topic: options.topic },
      ai_provider: result.provider,
      expires_at: null, // Generated content doesn't expire
    });

    revalidatePath(REVALIDATE_PATH);
    return { content: result.content };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return { error: msg };
  }
}

/* ------------------------------------------------------------------
   Sync Social Profile (re-fetch from platform API + record snapshot)
   ------------------------------------------------------------------ */

export async function syncSocialProfile(
  profileId: string,
  options?: { skipAuth?: boolean }
): Promise<{ error: string } | { success: true; synced: boolean }> {
  if (!options?.skipAuth) {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return { error: "Not authenticated." };
  }

  const profile = await getSocialProfileById(profileId);
  if (!profile) return { error: "Profile not found." };

  const supabase = createAdminClient();

  let freshData: LookupData | null = null;
  try {
    if (profile.platform === "youtube") {
      const { fetchYouTubeProfile, fetchRecentVideoStats } = await import("@/lib/social/youtube");
      const result = await fetchYouTubeProfile(profile.handle);
      if (result.success) {
        let engRate = result.data.engagement_rate;
        if (result.data.platform_user_id) {
          const stats = await fetchRecentVideoStats(result.data.platform_user_id);
          if (stats) engRate = stats.engagement_rate;
        }
        freshData = {
          display_name: result.data.display_name,
          bio: result.data.bio,
          followers_count: result.data.followers_count,
          following_count: result.data.following_count,
          posts_count: result.data.posts_count,
          engagement_rate: engRate ?? estimateEngagementRate("youtube", result.data.followers_count),
          engagement_estimated: engRate == null,
          country: result.data.country,
          avatar_url: result.data.avatar_url,
        };
      }
    } else {
      type FetchFn = (h: string) => Promise<import("@/lib/social/types").SocialFetchResult>;
      const fetchers: Record<string, () => Promise<FetchFn>> = {
        instagram: async () => (await import("@/lib/social/instagram")).fetchInstagramProfile,
        tiktok: async () => (await import("@/lib/social/tiktok")).fetchTikTokProfile,
        twitter: async () => (await import("@/lib/social/twitter")).fetchTwitterProfile,
        linkedin: async () => (await import("@/lib/social/linkedin")).fetchLinkedInProfile,
      };
      const loader = fetchers[profile.platform];
      if (loader) {
        const fetchFn = await loader();
        const result = await fetchFn(profile.handle);
        if (result.success) {
          const realRate = result.data.engagement_rate;
          freshData = {
            display_name: result.data.display_name,
            bio: result.data.bio,
            followers_count: result.data.followers_count,
            following_count: result.data.following_count,
            posts_count: result.data.posts_count,
            engagement_rate: realRate ?? estimateEngagementRate(profile.platform, result.data.followers_count),
            engagement_estimated: realRate == null,
            country: result.data.country,
            avatar_url: result.data.avatar_url,
          };
        }
      }
    }
  } catch {
    return { success: true, synced: false };
  }

  if (!freshData) return { success: true, synced: false };

  // Update social_profiles row
  await supabase.from("social_profiles").update({
    display_name: freshData.display_name || profile.display_name,
    bio: freshData.bio || profile.bio,
    avatar_url: freshData.avatar_url || profile.avatar_url,
    followers_count: freshData.followers_count,
    following_count: freshData.following_count,
    posts_count: freshData.posts_count,
    engagement_rate: freshData.engagement_rate,
    country: freshData.country || profile.country,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", profileId);

  // Record metric snapshot (upsert on profile+date)
  await supabase.from("social_metrics").upsert({
    social_profile_id: profileId,
    date: new Date().toISOString().split("T")[0],
    followers: freshData.followers_count,
    following: freshData.following_count,
    posts_count: freshData.posts_count,
    engagement_rate: freshData.engagement_rate,
  }, { onConflict: "social_profile_id,date" });

  if (!options?.skipAuth) {
    revalidatePath(REVALIDATE_PATH);
  }

  return { success: true, synced: true };
}

/* ------------------------------------------------------------------
   Sync All Social Profiles (for cron job — no auth)
   ------------------------------------------------------------------ */

export async function syncAllSocialProfiles(): Promise<{
  processed: number;
  synced: number;
  errors: string[];
}> {
  const { getAllSocialProfiles } = await import("@/lib/dal/social-intelligence");
  const profiles = await getAllSocialProfiles();

  let processed = 0;
  let synced = 0;
  const errors: string[] = [];

  for (const profile of profiles) {
    try {
      const result = await syncSocialProfile(profile.id, { skipAuth: true });
      processed++;
      if ("success" in result && result.synced) synced++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      errors.push(`${profile.handle}@${profile.platform}: ${msg}`);
    }
    // Small delay between profiles to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { processed, synced, errors };
}
