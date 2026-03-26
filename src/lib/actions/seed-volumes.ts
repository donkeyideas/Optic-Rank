"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardVolumeSnapshot } from "@/types";

/**
 * Seed 4 historical demo volumes for a project so the volume
 * navigator is visible and testable on the dashboard.
 */
export async function seedDemoVolumes(projectId: string): Promise<{
  success: boolean;
  created: number;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Check if volumes already exist
  const { count } = await supabase
    .from("dashboard_volumes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if ((count ?? 0) > 0) {
    return { success: true, created: 0, error: "Volumes already exist" };
  }

  const volumes = buildDemoVolumes(projectId);

  const { error } = await supabase.from("dashboard_volumes").insert(volumes);

  if (error) {
    return { success: false, created: 0, error: error.message };
  }

  return { success: true, created: volumes.length };
}

function weekDates(weeksAgo: number): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

function buildDemoVolumes(projectId: string) {
  // Volume 1: 4 weeks ago
  const w4 = weekDates(4);
  const snap1: DashboardVolumeSnapshot = {
    headlineStats: [
      { label: "Authority", value: 28, delta: "+2", direction: "up" },
      { label: "Traffic", value: "3.2K", delta: "+12%", direction: "up" },
      { label: "Keywords", value: 42, delta: "+5", direction: "up" },
      { label: "Backlinks", value: 187, delta: "+8", direction: "up" },
      { label: "Health", value: 72, delta: "+3", direction: "up" },
      { label: "AI Visibility", value: "18%", delta: "+2%", direction: "up" },
    ],
    healthScore: 72,
    healthCategories: [
      { name: "SEO", value: 74, color: "#27ae60" },
      { name: "Performance", value: 68, color: "#b8860b" },
      { name: "Accessibility", value: 81, color: "#27ae60" },
      { name: "Content", value: 65, color: "#b8860b" },
    ],
    topKeywords: [
      { keyword: "seo intelligence platform", position: 8, previousPosition: 12, searchVolume: 1200, cpc: 4.5, aiVisibility: "3/6" },
      { keyword: "rank tracking software", position: 15, previousPosition: 18, searchVolume: 2400, cpc: 6.2, aiVisibility: "2/6" },
      { keyword: "keyword monitoring tool", position: 11, previousPosition: 14, searchVolume: 880, cpc: 3.8, aiVisibility: "4/6" },
      { keyword: "seo audit tool", position: 22, previousPosition: 25, searchVolume: 3100, cpc: 5.1, aiVisibility: "1/6" },
      { keyword: "backlink analyzer", position: 19, previousPosition: 22, searchVolume: 1600, cpc: 4.0, aiVisibility: "2/6" },
    ],
    competitors: [
      { name: "SEMrush", domain: "semrush.com", authorityScore: 92 },
      { name: "Ahrefs", domain: "ahrefs.com", authorityScore: 89 },
      { name: "Moz", domain: "moz.com", authorityScore: 84 },
    ],
    aiInsights: [
      { type: "opportunity", title: "Featured Snippet Opportunity on 3 Keywords", description: "Your content is well-positioned to capture featured snippets for 'seo intelligence platform', 'keyword monitoring tool', and 'backlink analyzer'.", priority: 1 },
      { type: "alert", title: "Core Web Vitals Degraded", description: "LCP increased by 0.8s this week. Mobile performance score dropped from 72 to 68.", priority: 2 },
    ],
    socialSummary: { totalFollowers: 4200, profileCount: 3, topPlatform: "twitter" },
    croStats: { estimatedMonthlyRevenue: 1800, avgPosition: 15.2, estimatedTraffic: 3200, highValueGaps: 4 },
    aiCommandCenter: { visibilityAvg: 18, predictionImproving: 3, entityAvgRelevance: 42, latestBriefDate: w4.end },
    appStoreListings: [],
  };

  // Volume 2: 3 weeks ago
  const w3 = weekDates(3);
  const snap2: DashboardVolumeSnapshot = {
    headlineStats: [
      { label: "Authority", value: 30, delta: "+2", direction: "up" },
      { label: "Traffic", value: "3.8K", delta: "+18%", direction: "up" },
      { label: "Keywords", value: 48, delta: "+6", direction: "up" },
      { label: "Backlinks", value: 203, delta: "+16", direction: "up" },
      { label: "Health", value: 76, delta: "+4", direction: "up" },
      { label: "AI Visibility", value: "22%", delta: "+4%", direction: "up" },
    ],
    healthScore: 76,
    healthCategories: [
      { name: "SEO", value: 78, color: "#27ae60" },
      { name: "Performance", value: 72, color: "#27ae60" },
      { name: "Accessibility", value: 83, color: "#27ae60" },
      { name: "Content", value: 70, color: "#27ae60" },
    ],
    topKeywords: [
      { keyword: "seo intelligence platform", position: 6, previousPosition: 8, searchVolume: 1200, cpc: 4.5, aiVisibility: "4/6" },
      { keyword: "rank tracking software", position: 12, previousPosition: 15, searchVolume: 2400, cpc: 6.2, aiVisibility: "3/6" },
      { keyword: "keyword monitoring tool", position: 9, previousPosition: 11, searchVolume: 880, cpc: 3.8, aiVisibility: "4/6" },
      { keyword: "seo audit tool", position: 18, previousPosition: 22, searchVolume: 3100, cpc: 5.1, aiVisibility: "2/6" },
      { keyword: "backlink analyzer", position: 16, previousPosition: 19, searchVolume: 1600, cpc: 4.0, aiVisibility: "3/6" },
      { keyword: "ai seo tools", position: 24, previousPosition: null, searchVolume: 720, cpc: 3.2, aiVisibility: "5/6" },
    ],
    competitors: [
      { name: "SEMrush", domain: "semrush.com", authorityScore: 92 },
      { name: "Ahrefs", domain: "ahrefs.com", authorityScore: 89 },
      { name: "Moz", domain: "moz.com", authorityScore: 84 },
    ],
    aiInsights: [
      { type: "win", title: "3 Keywords Moved to Page 1", description: "'seo intelligence platform' jumped to #6, 'keyword monitoring tool' to #9, and 'rank tracking software' to #12.", priority: 1 },
      { type: "opportunity", title: "New Content Gap Found", description: "Competitors rank for 'ai seo tools' — you just entered at #24. Targeted content could move this to page 1.", priority: 2 },
      { type: "prediction", title: "Traffic Projected to Reach 5K by Next Month", description: "Based on ranking improvements and seasonal trends, organic traffic is on track for a 30% increase.", priority: 3 },
    ],
    socialSummary: { totalFollowers: 4650, profileCount: 3, topPlatform: "twitter" },
    croStats: { estimatedMonthlyRevenue: 2400, avgPosition: 13.1, estimatedTraffic: 3800, highValueGaps: 3 },
    aiCommandCenter: { visibilityAvg: 22, predictionImproving: 5, entityAvgRelevance: 48, latestBriefDate: w3.end },
    appStoreListings: [],
  };

  // Volume 3: 2 weeks ago
  const w2 = weekDates(2);
  const snap3: DashboardVolumeSnapshot = {
    headlineStats: [
      { label: "Authority", value: 31, delta: "+1", direction: "up" },
      { label: "Traffic", value: "4.5K", delta: "+18%", direction: "up" },
      { label: "Keywords", value: 53, delta: "+5", direction: "up" },
      { label: "Backlinks", value: 218, delta: "+15", direction: "up" },
      { label: "Health", value: 79, delta: "+3", direction: "up" },
      { label: "AI Visibility", value: "26%", delta: "+4%", direction: "up" },
    ],
    healthScore: 79,
    healthCategories: [
      { name: "SEO", value: 82, color: "#27ae60" },
      { name: "Performance", value: 74, color: "#27ae60" },
      { name: "Accessibility", value: 85, color: "#27ae60" },
      { name: "Content", value: 75, color: "#27ae60" },
    ],
    topKeywords: [
      { keyword: "seo intelligence platform", position: 4, previousPosition: 6, searchVolume: 1200, cpc: 4.5, aiVisibility: "5/6" },
      { keyword: "rank tracking software", position: 10, previousPosition: 12, searchVolume: 2400, cpc: 6.2, aiVisibility: "3/6" },
      { keyword: "keyword monitoring tool", position: 7, previousPosition: 9, searchVolume: 880, cpc: 3.8, aiVisibility: "5/6" },
      { keyword: "seo audit tool", position: 14, previousPosition: 18, searchVolume: 3100, cpc: 5.1, aiVisibility: "3/6" },
      { keyword: "backlink analyzer", position: 13, previousPosition: 16, searchVolume: 1600, cpc: 4.0, aiVisibility: "3/6" },
      { keyword: "ai seo tools", position: 17, previousPosition: 24, searchVolume: 720, cpc: 3.2, aiVisibility: "5/6" },
    ],
    competitors: [
      { name: "SEMrush", domain: "semrush.com", authorityScore: 92 },
      { name: "Ahrefs", domain: "ahrefs.com", authorityScore: 89 },
      { name: "Moz", domain: "moz.com", authorityScore: 84 },
    ],
    aiInsights: [
      { type: "win", title: "Page 1 Domination Growing", description: "'seo intelligence platform' now at #4. Five keywords are now on page 1, up from 3 last week.", priority: 1 },
      { type: "backlinks", title: "High-DA Backlink Acquired", description: "New backlink from a DA-72 industry blog. This contributed to the authority score increase.", priority: 2 },
      { type: "technical", title: "Schema Markup Improved", description: "FAQ and HowTo schema was added to 8 pages, improving rich snippet eligibility.", priority: 3 },
    ],
    socialSummary: { totalFollowers: 5100, profileCount: 3, topPlatform: "twitter" },
    croStats: { estimatedMonthlyRevenue: 3100, avgPosition: 11.4, estimatedTraffic: 4500, highValueGaps: 2 },
    aiCommandCenter: { visibilityAvg: 26, predictionImproving: 6, entityAvgRelevance: 54, latestBriefDate: w2.end },
    appStoreListings: [],
  };

  // Volume 4: 1 week ago (most recent)
  const w1 = weekDates(1);
  const snap4: DashboardVolumeSnapshot = {
    headlineStats: [
      { label: "Authority", value: 33, delta: "+2", direction: "up" },
      { label: "Traffic", value: "5.1K", delta: "+13%", direction: "up" },
      { label: "Keywords", value: 58, delta: "+5", direction: "up" },
      { label: "Backlinks", value: 231, delta: "+13", direction: "up" },
      { label: "Health", value: 82, delta: "+3", direction: "up" },
      { label: "AI Visibility", value: "31%", delta: "+5%", direction: "up" },
    ],
    healthScore: 82,
    healthCategories: [
      { name: "SEO", value: 85, color: "#27ae60" },
      { name: "Performance", value: 77, color: "#27ae60" },
      { name: "Accessibility", value: 87, color: "#27ae60" },
      { name: "Content", value: 78, color: "#27ae60" },
    ],
    topKeywords: [
      { keyword: "seo intelligence platform", position: 3, previousPosition: 4, searchVolume: 1200, cpc: 4.5, aiVisibility: "5/6" },
      { keyword: "rank tracking software", position: 8, previousPosition: 10, searchVolume: 2400, cpc: 6.2, aiVisibility: "4/6" },
      { keyword: "keyword monitoring tool", position: 5, previousPosition: 7, searchVolume: 880, cpc: 3.8, aiVisibility: "5/6" },
      { keyword: "seo audit tool", position: 11, previousPosition: 14, searchVolume: 3100, cpc: 5.1, aiVisibility: "3/6" },
      { keyword: "backlink analyzer", position: 10, previousPosition: 13, searchVolume: 1600, cpc: 4.0, aiVisibility: "4/6" },
      { keyword: "ai seo tools", position: 12, previousPosition: 17, searchVolume: 720, cpc: 3.2, aiVisibility: "6/6" },
    ],
    competitors: [
      { name: "SEMrush", domain: "semrush.com", authorityScore: 92 },
      { name: "Ahrefs", domain: "ahrefs.com", authorityScore: 89 },
      { name: "Moz", domain: "moz.com", authorityScore: 84 },
    ],
    aiInsights: [
      { type: "win", title: "Top 3 Ranking Achieved!", description: "'seo intelligence platform' has reached #3 — your first top-3 ranking. Traffic from this keyword alone is up 45%.", priority: 1 },
      { type: "opportunity", title: "Voice Search Optimization Potential", description: "12 of your keywords match voice search patterns. Optimizing FAQ content could capture this growing segment.", priority: 2 },
      { type: "prediction", title: "Authority Score on Track for 40+ in 6 Weeks", description: "Current link velocity and content improvements project authority score reaching 40 by mid-April.", priority: 3 },
      { type: "content", title: "Content Freshness Alert", description: "5 high-traffic pages haven't been updated in 60+ days. Refreshing them could recover 15% more impressions.", priority: 4 },
    ],
    socialSummary: { totalFollowers: 5800, profileCount: 3, topPlatform: "twitter" },
    croStats: { estimatedMonthlyRevenue: 3800, avgPosition: 9.8, estimatedTraffic: 5100, highValueGaps: 2 },
    aiCommandCenter: { visibilityAvg: 31, predictionImproving: 8, entityAvgRelevance: 60, latestBriefDate: w1.end },
    appStoreListings: [],
  };

  return [
    {
      project_id: projectId,
      volume_number: 1,
      week_start: w4.start,
      week_end: w4.end,
      authority_score: 28,
      organic_traffic: 3200,
      keywords_ranked: 42,
      backlinks_total: 187,
      health_score: 72,
      ai_visibility_avg: 18,
      snapshot: snap1,
    },
    {
      project_id: projectId,
      volume_number: 2,
      week_start: w3.start,
      week_end: w3.end,
      authority_score: 30,
      organic_traffic: 3800,
      keywords_ranked: 48,
      backlinks_total: 203,
      health_score: 76,
      ai_visibility_avg: 22,
      snapshot: snap2,
    },
    {
      project_id: projectId,
      volume_number: 3,
      week_start: w2.start,
      week_end: w2.end,
      authority_score: 31,
      organic_traffic: 4500,
      keywords_ranked: 53,
      backlinks_total: 218,
      health_score: 79,
      ai_visibility_avg: 26,
      snapshot: snap3,
    },
    {
      project_id: projectId,
      volume_number: 4,
      week_start: w1.start,
      week_end: w1.end,
      authority_score: 33,
      organic_traffic: 5100,
      keywords_ranked: 58,
      backlinks_total: 231,
      health_score: 82,
      ai_visibility_avg: 31,
      snapshot: snap4,
    },
  ];
}
