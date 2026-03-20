/**
 * Centralized platform-specific terminology, field visibility,
 * hero stat configs, and tab controls for Social Intelligence UI.
 *
 * All platform-awareness lives here — no database changes needed.
 */

import type { SocialPlatform, SocialProfile } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PlatformFieldConfig {
  label: string;
  showInForm: boolean;
  placeholder?: string;
}

export interface PlatformHeroStat {
  label: string;
  getValue: (profile: SocialProfile, extra?: Record<string, unknown>) => string;
  getSubtext?: (profile: SocialProfile, extra?: Record<string, unknown>) => string | undefined;
  highlight?: boolean;
}

export interface PlatformConfig {
  displayName: string;
  fields: {
    followers: PlatformFieldConfig;
    following: PlatformFieldConfig;
    posts: PlatformFieldConfig;
  };
  heroStats: [PlatformHeroStat, PlatformHeroStat, PlatformHeroStat, PlatformHeroStat];
  headlineLabels: {
    totalAudience: string;
    totalContent: string;
  };
  chartTitles: {
    followerGrowth: string;
    engagementRate: string;
  };
  growthTitle: string;
  tabs: {
    hashtags: boolean;
  };
  extraBadges: {
    key: string;
    label: string;
    format?: (value: unknown) => string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Shared hero stat builders                                          */
/* ------------------------------------------------------------------ */

const earningsStat: PlatformHeroStat = {
  label: "Est. Monthly Earnings",
  // Overridden at render time with analysis data
  getValue: () => "—",
  getSubtext: () => "run analysis to project",
};

const engagementStat: PlatformHeroStat = {
  label: "Engagement Rate",
  getValue: (p) => (p.engagement_rate ? `${p.engagement_rate}%` : "—"),
};

/* ------------------------------------------------------------------ */
/*  Platform Configurations                                            */
/* ------------------------------------------------------------------ */

const CONFIGS: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    displayName: "Instagram",
    fields: {
      followers: { label: "Followers", showInForm: true, placeholder: "e.g. 15000" },
      following: { label: "Following", showInForm: true, placeholder: "e.g. 500" },
      posts: { label: "Posts", showInForm: true, placeholder: "e.g. 120" },
    },
    heroStats: [
      { label: "Followers", getValue: (p) => p.followers_count.toLocaleString(), highlight: true },
      engagementStat,
      earningsStat,
      { label: "Avg. Likes/Post", getValue: (p) => p.posts_count.toLocaleString(), getSubtext: () => "total posts" },
    ],
    headlineLabels: { totalAudience: "Total Followers", totalContent: "Total Posts" },
    chartTitles: { followerGrowth: "Follower Growth", engagementRate: "Engagement Rate" },
    growthTitle: "Follower Growth Tips",
    tabs: { hashtags: true },
    extraBadges: [
      { key: "is_business", label: "Business", format: (v) => (v ? "Business Account" : "") },
      { key: "category", label: "Category" },
    ],
  },

  youtube: {
    displayName: "YouTube",
    fields: {
      followers: { label: "Subscribers", showInForm: true, placeholder: "e.g. 50000" },
      following: { label: "Following", showInForm: false },
      posts: { label: "Videos", showInForm: true, placeholder: "e.g. 200" },
    },
    heroStats: [
      { label: "Subscribers", getValue: (p) => p.followers_count.toLocaleString(), highlight: true },
      engagementStat,
      earningsStat,
      {
        label: "Total Views",
        getValue: (_p, extra) => {
          const v = extra?.total_views;
          return typeof v === "number" ? v.toLocaleString() : "—";
        },
        getSubtext: (_p, extra) => (extra?.total_views ? "lifetime" : undefined),
      },
    ],
    headlineLabels: { totalAudience: "Total Subscribers", totalContent: "Total Videos" },
    chartTitles: { followerGrowth: "Subscriber Growth", engagementRate: "Engagement Rate" },
    growthTitle: "Subscriber Growth Tips",
    tabs: { hashtags: true },
    extraBadges: [],
  },

  tiktok: {
    displayName: "TikTok",
    fields: {
      followers: { label: "Followers", showInForm: true, placeholder: "e.g. 25000" },
      following: { label: "Following", showInForm: true, placeholder: "e.g. 300" },
      posts: { label: "Videos", showInForm: true, placeholder: "e.g. 85" },
    },
    heroStats: [
      { label: "Followers", getValue: (p) => p.followers_count.toLocaleString(), highlight: true },
      engagementStat,
      earningsStat,
      {
        label: "Hearts",
        getValue: (_p, extra) => {
          const h = extra?.hearts;
          return typeof h === "number" ? h.toLocaleString() : "—";
        },
        getSubtext: () => "total likes",
      },
    ],
    headlineLabels: { totalAudience: "Total Followers", totalContent: "Total Videos" },
    chartTitles: { followerGrowth: "Follower Growth", engagementRate: "Engagement Rate" },
    growthTitle: "Follower Growth Tips",
    tabs: { hashtags: true },
    extraBadges: [],
  },

  twitter: {
    displayName: "X (Twitter)",
    fields: {
      followers: { label: "Followers", showInForm: true, placeholder: "e.g. 8000" },
      following: { label: "Following", showInForm: true, placeholder: "e.g. 1200" },
      posts: { label: "Tweets", showInForm: true, placeholder: "e.g. 5000" },
    },
    heroStats: [
      { label: "Followers", getValue: (p) => p.followers_count.toLocaleString(), highlight: true },
      engagementStat,
      earningsStat,
      { label: "Total Tweets", getValue: (p) => p.posts_count.toLocaleString() },
    ],
    headlineLabels: { totalAudience: "Total Followers", totalContent: "Total Tweets" },
    chartTitles: { followerGrowth: "Follower Growth", engagementRate: "Engagement Rate" },
    growthTitle: "Follower Growth Tips",
    tabs: { hashtags: true },
    extraBadges: [
      { key: "website", label: "Website" },
    ],
  },

  linkedin: {
    displayName: "LinkedIn",
    fields: {
      followers: { label: "Connections", showInForm: true, placeholder: "e.g. 500" },
      following: { label: "Following", showInForm: false },
      posts: { label: "Posts", showInForm: false },
    },
    heroStats: [
      { label: "Connections", getValue: (p) => p.followers_count.toLocaleString(), highlight: true },
      earningsStat,
      {
        label: "Industry",
        getValue: (_p, extra) => {
          const v = extra?.industry;
          return typeof v === "string" && v ? v : "—";
        },
      },
      {
        label: "Company",
        getValue: (_p, extra) => {
          const v = extra?.works_for;
          return typeof v === "string" && v ? v : "—";
        },
      },
    ],
    headlineLabels: { totalAudience: "Total Connections", totalContent: "Total Content" },
    chartTitles: { followerGrowth: "Connection Growth", engagementRate: "Engagement Rate" },
    growthTitle: "Connection Growth Tips",
    tabs: { hashtags: false },
    extraBadges: [
      { key: "job_title", label: "Title" },
      { key: "works_for", label: "Company" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function getPlatformConfig(platform: SocialPlatform): PlatformConfig {
  return CONFIGS[platform];
}

/**
 * Aggregate headline labels when profiles span multiple platforms.
 * Single platform → platform-specific; mixed → generic.
 */
export function getAggregateLabels(platforms: SocialPlatform[]): {
  audience: string;
  content: string;
} {
  const unique = [...new Set(platforms)];
  if (unique.length === 1) {
    const c = CONFIGS[unique[0]];
    return { audience: c.headlineLabels.totalAudience, content: c.headlineLabels.totalContent };
  }
  return { audience: "Total Audience", content: "Total Content" };
}
