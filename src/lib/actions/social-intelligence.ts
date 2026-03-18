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
        const skipPrefixes = ["in", "channel", "c", "user"];
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
  country: string | null;
  avatar_url: string | null;
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
        engagement_rate: engagementRate,
        country: result.data.country,
        avatar_url: result.data.avatar_url,
      },
    };
  }

  if (platform === "instagram") {
    const { fetchInstagramProfile } = await import("@/lib/social/instagram");
    const result = await fetchInstagramProfile(handle);
    if (!result.success) return { success: false, error: result.error };

    return {
      success: true,
      data: {
        display_name: result.data.display_name,
        bio: result.data.bio,
        followers_count: result.data.followers_count,
        following_count: result.data.following_count,
        posts_count: result.data.posts_count,
        engagement_rate: result.data.engagement_rate,
        country: result.data.country,
        avatar_url: result.data.avatar_url,
      },
    };
  }

  if (platform === "tiktok") {
    const { fetchTikTokProfile } = await import("@/lib/social/tiktok");
    const result = await fetchTikTokProfile(handle);
    if (!result.success) return { success: false, error: result.error };

    return {
      success: true,
      data: {
        display_name: result.data.display_name,
        bio: result.data.bio,
        followers_count: result.data.followers_count,
        following_count: result.data.following_count,
        posts_count: result.data.posts_count,
        engagement_rate: result.data.engagement_rate,
        country: result.data.country,
        avatar_url: result.data.avatar_url,
      },
    };
  }

  if (platform === "twitter") {
    const { fetchTwitterProfile } = await import("@/lib/social/twitter");
    const result = await fetchTwitterProfile(handle);
    if (!result.success) return { success: false, error: result.error };

    return {
      success: true,
      data: {
        display_name: result.data.display_name,
        bio: result.data.bio,
        followers_count: result.data.followers_count,
        following_count: result.data.following_count,
        posts_count: result.data.posts_count,
        engagement_rate: result.data.engagement_rate,
        country: result.data.country,
        avatar_url: result.data.avatar_url,
      },
    };
  }

  if (platform === "linkedin") {
    const { fetchLinkedInProfile } = await import("@/lib/social/linkedin");
    const result = await fetchLinkedInProfile(handle);
    if (!result.success) return { success: false, error: result.error };

    return {
      success: true,
      data: {
        display_name: result.data.display_name,
        bio: result.data.bio,
        followers_count: result.data.followers_count,
        following_count: result.data.following_count,
        posts_count: result.data.posts_count,
        engagement_rate: result.data.engagement_rate,
        country: result.data.country,
        avatar_url: result.data.avatar_url,
      },
    };
  }

  return {
    success: false,
    error: `Unsupported platform: ${platform}. Please enter stats manually.`,
  };
}
