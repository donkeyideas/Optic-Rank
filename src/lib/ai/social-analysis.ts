/**
 * AI-powered social media analysis engine.
 * Uses rule-based logic first, then enhances with aiChat().
 * Generates growth tips, content strategy, hashtags, competitor
 * benchmarking, insights, earnings forecasts, and 30-day plans.
 */

import { aiChat } from "./ai-provider";
import type {
  SocialProfile,
  SocialMetric,
  SocialCompetitor,
  SocialGrowthTip,
  ContentStrategy,
  HashtagRecommendation,
  EarningsForecast,
} from "@/types";

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function buildProfileSummary(profile: SocialProfile, metrics: SocialMetric[]): string {
  const latest = metrics[metrics.length - 1];
  const earliest = metrics[0];
  const growthRate =
    earliest && latest && earliest.followers && latest.followers
      ? (((latest.followers - earliest.followers) / earliest.followers) * 100).toFixed(1)
      : "unknown";

  return [
    `Platform: ${profile.platform}`,
    `Handle: @${profile.handle}`,
    `Followers: ${profile.followers_count.toLocaleString()}`,
    `Following: ${profile.following_count.toLocaleString()}`,
    `Posts: ${profile.posts_count.toLocaleString()}`,
    `Engagement Rate: ${profile.engagement_rate ?? "unknown"}%`,
    `Niche: ${profile.niche || "not specified"}`,
    `Country: ${profile.country || "not specified"}`,
    `Growth Rate (${metrics.length} days): ${growthRate}%`,
    latest?.avg_likes ? `Avg Likes: ${latest.avg_likes}` : null,
    latest?.avg_comments ? `Avg Comments: ${latest.avg_comments}` : null,
    latest?.avg_views ? `Avg Views: ${latest.avg_views}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function safeParse<T>(text: string, fallback: T): T {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------
   1. Growth Tips
   ------------------------------------------------------------------ */

export async function analyzeGrowth(
  profile: SocialProfile,
  metrics: SocialMetric[]
): Promise<{ tips: SocialGrowthTip[]; provider: string }> {
  // Rule-based tips first
  const tips: SocialGrowthTip[] = [];

  if (profile.engagement_rate !== null && profile.engagement_rate < 2) {
    tips.push({
      title: "Boost Engagement with Calls-to-Action",
      description: `Your engagement rate (${profile.engagement_rate}%) is below the ${profile.platform} average. Add questions, polls, or "save this" prompts to every post.`,
      priority: "high",
      estimated_impact: "+30-50% engagement in 2-4 weeks",
      category: "engagement",
    });
  }

  if (profile.posts_count < 50) {
    tips.push({
      title: "Increase Content Volume",
      description: "You have fewer than 50 posts. The algorithm favors consistent creators. Aim for at least 3-5 posts per week to build momentum.",
      priority: "high",
      estimated_impact: "+20-40% reach within 30 days",
      category: "content",
    });
  }

  if (!profile.bio) {
    tips.push({
      title: "Optimize Your Bio",
      description: "Your bio is empty. A clear bio with keywords, a value proposition, and a CTA increases profile visit-to-follow conversion by up to 30%.",
      priority: "medium",
      estimated_impact: "+10-30% follow-through rate",
      category: "profile",
    });
  }

  // AI-enhanced tips
  const prompt = `You are a social media growth strategist specializing in ${profile.platform}.

Analyze this account and provide actionable growth recommendations:
${buildProfileSummary(profile, metrics)}

Return ONLY a JSON array of growth tips (no other text), each with:
- "title": string (action-oriented, e.g. "Post Reels 4x per week")
- "description": string (why this works, 2-3 sentences max)
- "priority": "high" | "medium" | "low"
- "estimated_impact": string (e.g. "+15-25% follower growth in 30 days")
- "category": "content" | "engagement" | "timing" | "profile" | "collaboration"

Return 5-6 tips sorted by priority. Be specific to ${profile.platform}'s current algorithm.`;

  const response = await aiChat(prompt, { temperature: 0.7, maxTokens: 1500 });
  if (response?.text) {
    const aiTips = safeParse<SocialGrowthTip[]>(response.text, []);
    if (aiTips.length > 0) {
      // Merge: rule-based first, then AI tips (deduplicated)
      const existingTitles = new Set(tips.map((t) => t.title.toLowerCase()));
      for (const tip of aiTips) {
        if (!existingTitles.has(tip.title.toLowerCase())) {
          tips.push(tip);
        }
      }
      return { tips, provider: response.provider };
    }
  }

  return { tips, provider: "rules" };
}

/* ------------------------------------------------------------------
   2. Content Strategy
   ------------------------------------------------------------------ */

export async function analyzeContentStrategy(
  profile: SocialProfile,
  metrics: SocialMetric[]
): Promise<{ strategy: ContentStrategy; provider: string }> {
  const prompt = `You are a social media content strategist for ${profile.platform}.

Analyze this account and create a content strategy:
${buildProfileSummary(profile, metrics)}

Return ONLY a JSON object (no other text) with:
{
  "posting_frequency": "string (e.g. '4-5 posts per week')",
  "content_mix": [{"type": "string", "percentage": number}],
  "weekly_schedule": [
    {
      "day": "Monday",
      "best_times": ["9:00 AM", "6:00 PM"],
      "content_types": ["Reel", "Carousel"],
      "theme": "Educational content"
    }
  ],
  "tips": ["string tip 1", "string tip 2"]
}

Be specific to ${profile.platform}. Include all 7 days. Use the niche "${profile.niche || "general"}" to tailor content themes.`;

  const fallback: ContentStrategy = {
    posting_frequency: "3-5 posts per week",
    content_mix: [
      { type: "Short-form video", percentage: 40 },
      { type: "Image/Carousel", percentage: 30 },
      { type: "Story/Ephemeral", percentage: 20 },
      { type: "Text/Poll", percentage: 10 },
    ],
    weekly_schedule: [],
    tips: ["Post consistently at the same times each day.", "Engage with comments within the first hour."],
  };

  const response = await aiChat(prompt, { temperature: 0.7, maxTokens: 2000 });
  if (response?.text) {
    const strategy = safeParse<ContentStrategy>(response.text, fallback);
    return { strategy, provider: response.provider };
  }

  return { strategy: fallback, provider: "rules" };
}

/* ------------------------------------------------------------------
   3. Hashtag Recommendations
   ------------------------------------------------------------------ */

export async function analyzeHashtags(
  profile: SocialProfile,
  metrics: SocialMetric[]
): Promise<{ hashtags: HashtagRecommendation[]; provider: string }> {
  const prompt = `You are a social media hashtag strategist for ${profile.platform}.

Analyze this account and recommend hashtags:
${buildProfileSummary(profile, metrics)}

Return ONLY a JSON array of 15-20 hashtag recommendations (no other text), each with:
- "tag": string (without # prefix)
- "volume": "high" | "medium" | "low"
- "competition": "high" | "medium" | "low"
- "relevance": number (0-100, how relevant to this account's niche)
- "category": string (e.g. "niche", "trending", "community", "brand", "location")

Mix: 5 high-volume, 5 medium-volume, 5-10 low-competition/niche tags. Be specific to "${profile.niche || "general"}" niche on ${profile.platform}.`;

  const response = await aiChat(prompt, { temperature: 0.7, maxTokens: 1500 });
  if (response?.text) {
    const hashtags = safeParse<HashtagRecommendation[]>(response.text, []);
    if (hashtags.length > 0) {
      return { hashtags, provider: response.provider };
    }
  }

  return { hashtags: [], provider: "rules" };
}

/* ------------------------------------------------------------------
   4. Competitor Benchmarking
   ------------------------------------------------------------------ */

export async function analyzeSocialCompetitors(
  profile: SocialProfile,
  competitors: SocialCompetitor[]
): Promise<{
  analysis: {
    summary: string;
    scores: { handle: string; score: number; strengths: string[]; weaknesses: string[] }[];
    recommendations: string[];
  };
  provider: string;
}> {
  const competitorList = competitors
    .map(
      (c) =>
        `@${c.handle}: ${c.followers_count?.toLocaleString() ?? "?"} followers, ${c.engagement_rate ?? "?"}% engagement, niche: ${c.niche || "?"}`
    )
    .join("\n");

  const prompt = `You are a social media competitive analyst for ${profile.platform}.

Your account:
@${profile.handle}: ${profile.followers_count.toLocaleString()} followers, ${profile.engagement_rate ?? "?"}% engagement, niche: ${profile.niche || "general"}

Competitors:
${competitorList || "No competitors added yet. Provide general competitive advice."}

Return ONLY a JSON object (no other text) with:
{
  "summary": "2-3 sentence competitive landscape overview",
  "scores": [
    {"handle": "@example", "score": 75, "strengths": ["string"], "weaknesses": ["string"]}
  ],
  "recommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}

Include the user's account in scores too. Score 0-100 based on followers, engagement, and content quality signals.`;

  const fallback = {
    summary: "Add competitor accounts to get detailed benchmarking analysis.",
    scores: [],
    recommendations: ["Add at least 2-3 competitors in your niche to enable benchmarking."],
  };

  const response = await aiChat(prompt, { temperature: 0.7, maxTokens: 1500 });
  if (response?.text) {
    const analysis = safeParse(response.text, fallback);
    return { analysis, provider: response.provider };
  }

  return { analysis: fallback, provider: "rules" };
}

/* ------------------------------------------------------------------
   4b. Competitor Discovery (AI-suggested)
   ------------------------------------------------------------------ */

export interface DiscoveredCompetitor {
  handle: string;
  display_name: string;
  followers_estimate: number;
  engagement_estimate: number;
  niche: string;
  reason: string;
}

export async function discoverSocialCompetitors(
  profile: SocialProfile
): Promise<{ competitors: DiscoveredCompetitor[]; provider: string }> {
  const prompt = `You are a social media competitive intelligence analyst for ${profile.platform}.

Find real, specific competitor accounts for this creator:
Platform: ${profile.platform}
Handle: @${profile.handle}
Followers: ${profile.followers_count.toLocaleString()}
Engagement Rate: ${profile.engagement_rate ?? "unknown"}%
Niche: ${profile.niche || "general"}
Country: ${profile.country || "not specified"}

Return ONLY a JSON array of 5-8 real ${profile.platform} competitor accounts (no other text). Each competitor should be:
- A REAL account that actually exists on ${profile.platform}
- In a similar niche or content category
- At a comparable or aspirational follower count (0.5x to 5x of this account)
- Mix of direct competitors and aspirational targets

Format:
[
  {
    "handle": "exact_username_no_@",
    "display_name": "Channel/Account Name",
    "followers_estimate": 50000,
    "engagement_estimate": 3.5,
    "niche": "specific niche",
    "reason": "Why this is a relevant competitor (1 sentence)"
  }
]

IMPORTANT: Only suggest accounts you are confident actually exist on ${profile.platform}. Be specific with handles.`;

  const response = await aiChat(prompt, { temperature: 0.7, maxTokens: 1500 });
  if (response?.text) {
    const competitors = safeParse<DiscoveredCompetitor[]>(response.text, []);
    if (competitors.length > 0) {
      return { competitors, provider: response.provider };
    }
  }

  return { competitors: [], provider: "rules" };
}

/* ------------------------------------------------------------------
   5. AI Insights (strategic paragraph)
   ------------------------------------------------------------------ */

export async function generateSocialInsights(
  profile: SocialProfile,
  metrics: SocialMetric[]
): Promise<{ insights: string; provider: string }> {
  const prompt = `You are a senior social media strategist. Write a concise strategic analysis for this ${profile.platform} account.

${buildProfileSummary(profile, metrics)}

Write 3-4 paragraphs covering:
1. Current performance assessment (be honest but constructive)
2. Biggest growth opportunity right now
3. Content strategy recommendation
4. One unconventional tip specific to their niche

Use a professional but approachable tone. Be specific and actionable, not generic. Use markdown formatting (bold, bullet points).`;

  const response = await aiChat(prompt, { temperature: 0.8, maxTokens: 1500 });
  if (response?.text) {
    return { insights: response.text, provider: response.provider };
  }

  return {
    insights: "Add your social media stats to receive AI-powered strategic insights.",
    provider: "rules",
  };
}

/* ------------------------------------------------------------------
   6. Earnings Forecast Engine
   ------------------------------------------------------------------ */

// Platform average CPM rates (USD per 1K views/impressions)
const PLATFORM_CPM: Record<string, { low: number; mid: number; high: number }> = {
  youtube: { low: 3, mid: 7, high: 15 },
  instagram: { low: 2, mid: 5, high: 12 },
  tiktok: { low: 0.02, mid: 0.05, high: 0.1 },
  twitter: { low: 1, mid: 3, high: 8 },
  linkedin: { low: 3, mid: 8, high: 18 },
};

// Niche multipliers for ad revenue
const NICHE_MULTIPLIER: Record<string, number> = {
  finance: 5,
  business: 4,
  tech: 3,
  health: 2.5,
  education: 2.5,
  beauty: 2,
  fitness: 2,
  food: 1.8,
  sports: 1.5,
  travel: 1.5,
  entertainment: 1,
  gaming: 1.2,
  music: 1,
  lifestyle: 1.3,
};

// Premium audience geography multiplier
const GEO_MULTIPLIER: Record<string, number> = {
  us: 1.0,
  uk: 0.9,
  ca: 0.85,
  au: 0.85,
  de: 0.8,
  fr: 0.75,
};

export async function generateEarningsForecastAI(
  profile: SocialProfile,
  metrics: SocialMetric[]
): Promise<{ forecast: EarningsForecast; provider: string }> {
  // Step 1: Compute rule-based factor scores
  const niche = (profile.niche || "general").toLowerCase();
  const nicheMul = NICHE_MULTIPLIER[niche] ?? 1;
  const cpm = PLATFORM_CPM[profile.platform] ?? { low: 1, mid: 3, high: 8 };
  const geo = (profile.country || "").toLowerCase();
  const geoMul = GEO_MULTIPLIER[geo] ?? 0.5;

  const platformAvgEngagement: Record<string, number> = {
    instagram: 3, tiktok: 6, youtube: 4, twitter: 1.5, linkedin: 2,
  };
  const avgEng = platformAvgEngagement[profile.platform] ?? 3;
  const engQuality = profile.engagement_rate
    ? Math.min(100, (profile.engagement_rate / avgEng) * 50)
    : 30;

  // Step 2: AI-enhanced forecast
  const prompt = `You are a social media monetization analyst. Estimate potential earnings for this creator.

${buildProfileSummary(profile, metrics)}

Context (use these for calibration):
- Niche CPM multiplier: ${nicheMul}x
- Platform CPM range: $${cpm.low}-$${cpm.high} per 1K
- Engagement quality score: ${engQuality.toFixed(0)}/100
- Geo multiplier: ${geoMul}

Consider revenue streams: ad revenue/creator fund, brand sponsorships, merchandise, subscriptions/memberships, affiliate marketing.

Return ONLY a JSON object (no other text) with:
{
  "scenarios": {
    "conservative": {"monthly": number, "annual": number},
    "realistic": {"monthly": number, "annual": number},
    "optimistic": {"monthly": number, "annual": number}
  },
  "revenue_sources": [
    {"source": "string", "percentage": number, "estimated_monthly": number}
  ],
  "monetization_factors": [
    {"factor": "string", "score": number (0-100), "description": "string"}
  ],
  "unlock_actions": ["To reach optimistic scenario: ...", "...", "..."],
  "disclaimer": "These projections are estimates based on industry benchmarks and are not guaranteed earnings."
}

Be realistic. Base numbers on actual industry data for ${profile.platform} creators with ${profile.followers_count.toLocaleString()} followers in the ${niche} niche.`;

  // Compute rough rule-based earnings so fallback isn't $0
  const followers = profile.followers_count || 0;
  const baseMonthly = Math.round((followers / 1000) * cpm.mid * nicheMul * geoMul * 0.5);
  const conservativeMonthly = Math.round(baseMonthly * 0.5);
  const realisticMonthly = baseMonthly;
  const optimisticMonthly = Math.round(baseMonthly * 2.5);

  const fallbackForecast: EarningsForecast = {
    scenarios: {
      conservative: { monthly: conservativeMonthly, annual: conservativeMonthly * 12 },
      realistic: { monthly: realisticMonthly, annual: realisticMonthly * 12 },
      optimistic: { monthly: optimisticMonthly, annual: optimisticMonthly * 12 },
    },
    revenue_sources: [
      { source: "Sponsorships", percentage: 50, estimated_monthly: Math.round(realisticMonthly * 0.5) },
      { source: "Ad Revenue / Creator Fund", percentage: 30, estimated_monthly: Math.round(realisticMonthly * 0.3) },
      { source: "Affiliate Marketing", percentage: 20, estimated_monthly: Math.round(realisticMonthly * 0.2) },
    ],
    monetization_factors: [
      { factor: "Niche CPM", score: Math.min(100, nicheMul * 20), description: `${niche} niche has a ${nicheMul}x CPM multiplier` },
      { factor: "Engagement Quality", score: engQuality, description: `${profile.engagement_rate ?? 0}% vs ${avgEng}% platform average` },
      { factor: "Audience Geography", score: geoMul * 100, description: `${profile.country || "Unknown"} audience` },
    ],
    unlock_actions: [
      "Increase posting frequency to build consistent audience engagement",
      "Partner with brands in your niche for sponsored content",
      "Diversify revenue with affiliate links and digital products",
    ],
    disclaimer: "These projections are rule-based estimates (AI analysis unavailable). They are not guaranteed earnings.",
    generated_at: new Date().toISOString(),
  };

  const response = await aiChat(prompt, { temperature: 0.6, maxTokens: 2000, timeout: 90000 });
  if (response?.text) {
    const forecast = safeParse<EarningsForecast>(response.text, fallbackForecast);
    forecast.generated_at = new Date().toISOString();
    if (!forecast.disclaimer) {
      forecast.disclaimer = fallbackForecast.disclaimer;
    }
    return { forecast, provider: response.provider };
  }

  return { forecast: fallbackForecast, provider: "rules" };
}

/* ------------------------------------------------------------------
   7. 30-Day Action Plan
   ------------------------------------------------------------------ */

export async function generateThirtyDayPlanAI(
  profile: SocialProfile,
  metrics: SocialMetric[]
): Promise<{ plan: string; provider: string }> {
  const prompt = `You are a social media coach creating a detailed 30-day growth plan for this ${profile.platform} account.

${buildProfileSummary(profile, metrics)}

Create a day-by-day 30-day action plan. Group by weeks (Week 1-4).

For each week, include:
- Theme/focus for the week
- Specific daily tasks (content to create, engagement activities, profile optimizations)
- Key metrics to track that week
- One "power move" (something unconventional that could go viral or significantly boost growth)

Format in markdown. Be specific to ${profile.platform} and the "${profile.niche || "general"}" niche. Make it actionable — every task should be something the creator can do in 15-60 minutes.`;

  const response = await aiChat(prompt, { temperature: 0.8, maxTokens: 3000, timeout: 120000 });
  if (response?.text) {
    return { plan: response.text, provider: response.provider };
  }

  return {
    plan: "Unable to generate plan. Please ensure your profile stats are filled in and try again.",
    provider: "rules",
  };
}
