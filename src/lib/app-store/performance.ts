// ────────────────────────────────────────────────────────────
// App Performance Intelligence
// Scans reviews for performance-related complaints, computes
// a health score, and categorises issues by type.
// ────────────────────────────────────────────────────────────

import type { AppReview, ReviewTopic, AppStoreSnapshot } from "@/lib/dal/app-store";

/* ── Category keywords ─────────────────────────────────────── */

export type PerfCategory = "crashes" | "speed" | "battery" | "ui_bugs";

const PERF_KEYWORDS: Record<PerfCategory, string[]> = {
  crashes: [
    "crash", "crashes", "crashing", "force close", "force closes",
    "not opening", "closes itself", "shut down", "shuts down",
    "anr", "unresponsive", "stopped working", "keeps closing",
    "closes randomly", "app died", "won't open", "wont open",
  ],
  speed: [
    "slow", "lag", "laggy", "lagging", "loading", "freeze",
    "freezes", "freezing", "hang", "hangs", "takes forever",
    "stutters", "stuttering", "choppy", "takes long", "too long",
    "sluggish", "latency", "buffering", "not loading",
  ],
  battery: [
    "battery", "drain", "draining", "memory", "ram", "overheating",
    "heats up", "hot", "storage", "space", "heavy", "resource",
    "power", "consuming",
  ],
  ui_bugs: [
    "glitch", "glitchy", "bug", "buggy", "broken", "not working",
    "error", "display", "blank screen", "flicker", "flickering",
    "overlap", "layout", "disappear", "invisible", "won't load",
    "wont load", "white screen", "black screen",
  ],
};

const CATEGORY_LABELS: Record<PerfCategory, string> = {
  crashes: "Crashes",
  speed: "Speed & Loading",
  battery: "Battery & Memory",
  ui_bugs: "UI & Bugs",
};

export { CATEGORY_LABELS };

/* ── Classified review ─────────────────────────────────────── */

export interface PerfReview extends AppReview {
  perfCategories: PerfCategory[];
  matchedKeywords: string[];
}

/* ── Classify reviews ──────────────────────────────────────── */

export function classifyPerformanceReviews(reviews: AppReview[]): PerfReview[] {
  const result: PerfReview[] = [];

  for (const review of reviews) {
    const text = `${review.title ?? ""} ${review.text ?? ""}`.toLowerCase();
    if (!text.trim()) continue;

    const categories = new Set<PerfCategory>();
    const matched: string[] = [];

    for (const [cat, keywords] of Object.entries(PERF_KEYWORDS) as [PerfCategory, string[]][]) {
      for (const kw of keywords) {
        if (text.includes(kw)) {
          categories.add(cat);
          if (!matched.includes(kw)) matched.push(kw);
        }
      }
    }

    if (categories.size > 0) {
      result.push({
        ...review,
        perfCategories: Array.from(categories),
        matchedKeywords: matched,
      });
    }
  }

  return result;
}

/* ── Category breakdown for chart ──────────────────────────── */

export interface PerfBreakdown {
  category: PerfCategory;
  label: string;
  count: number;
}

export function getPerformanceBreakdown(perfReviews: PerfReview[]): PerfBreakdown[] {
  const counts: Record<PerfCategory, number> = { crashes: 0, speed: 0, battery: 0, ui_bugs: 0 };
  for (const r of perfReviews) {
    for (const cat of r.perfCategories) {
      counts[cat]++;
    }
  }
  return (Object.entries(counts) as [PerfCategory, number][]).map(([category, count]) => ({
    category,
    label: CATEGORY_LABELS[category],
    count,
  }));
}

/* ── Performance health score (0-100) ──────────────────────── */

export interface PerformanceScoreResult {
  score: number;
  perfReviewRatio: number;      // 0-1
  ratingTrend: number;          // negative = declining
  bugTopicDensity: number;      // 0-1
  sentimentTrend: number;       // negative = worsening
  /** Individual sub-scores (0-100) before weighting */
  subScores: {
    ratioScore: number;
    trendScore: number;
    bugScore: number;
    sentimentScore: number;
  };
}

export function computePerformanceScore(
  allReviews: AppReview[],
  perfReviews: PerfReview[],
  topics: ReviewTopic[],
  snapshots: AppStoreSnapshot[],
): PerformanceScoreResult {
  // --- 40% weight: perf review ratio (fewer = better) ---
  const perfRatio = allReviews.length > 0 ? perfReviews.length / allReviews.length : 0;
  const ratioScore = Math.max(0, 100 - perfRatio * 400); // 25% perf reviews = 0

  // --- 25% weight: rating trend ---
  const sorted = [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
  let ratingTrend = 0;
  if (sorted.length >= 2) {
    const recent = sorted.slice(-7);
    const older = sorted.slice(0, Math.min(7, sorted.length));
    const avgRecent = recent.reduce((s, r) => s + (r.rating ?? 0), 0) / recent.length;
    const avgOlder = older.reduce((s, r) => s + (r.rating ?? 0), 0) / older.length;
    ratingTrend = avgRecent - avgOlder;
  }
  // +0.5 trend = 100, -0.5 = 0
  const trendScore = Math.max(0, Math.min(100, 50 + ratingTrend * 100));

  // --- 20% weight: bug topic density ---
  const bugTopics = topics.filter((t) => t.category === "bug");
  const bugDensity = topics.length > 0 ? bugTopics.length / topics.length : 0;
  const bugScore = Math.max(0, 100 - bugDensity * 300);

  // --- 15% weight: sentiment trend (more negatives recently = worse) ---
  const reviewsByDate = [...allReviews].sort((a, b) =>
    (a.review_date ?? "").localeCompare(b.review_date ?? "")
  );
  const half = Math.floor(reviewsByDate.length / 2);
  let sentimentTrend = 0;
  if (half > 0) {
    const olderHalf = reviewsByDate.slice(0, half);
    const newerHalf = reviewsByDate.slice(half);
    const sentScore = (r: AppReview[]) => {
      const pos = r.filter((rv) => rv.sentiment === "positive").length;
      return r.length > 0 ? pos / r.length : 0.5;
    };
    sentimentTrend = sentScore(newerHalf) - sentScore(olderHalf);
  }
  const sentimentScore = Math.max(0, Math.min(100, 50 + sentimentTrend * 200));

  const score = Math.round(
    ratioScore * 0.40 +
    trendScore * 0.25 +
    bugScore * 0.20 +
    sentimentScore * 0.15
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    perfReviewRatio: perfRatio,
    ratingTrend,
    bugTopicDensity: bugDensity,
    sentimentTrend,
    subScores: {
      ratioScore: Math.round(ratioScore),
      trendScore: Math.round(trendScore),
      bugScore: Math.round(bugScore),
      sentimentScore: Math.round(sentimentScore),
    },
  };
}
