import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { SocialIntelligenceClient } from "./social-intelligence-client";
import {
  getSocialProfiles,
  getSocialMetrics,
  getAllLatestAnalyses,
  getSocialCompetitors,
  getSocialGoals,
} from "@/lib/dal/social-intelligence";
import { checkPlanLimit } from "@/lib/stripe/plan-gate";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";

export default async function SocialIntelligencePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return (
      <EmptyState
        icon={Users}
        title="Organization Required"
        description="Set up your organization first to use Social Intelligence."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return (
      <EmptyState
        icon={Users}
        title="No Active Project"
        description="Create a project first to track social media profiles."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch all social profiles for the active project
  const socialProfiles = await getSocialProfiles(project.id);

  // Fetch data for all profiles in parallel
  const [allMetrics, allAnalyses, allCompetitors, allGoals] = await Promise.all([
    Promise.all(socialProfiles.map((sp) => getSocialMetrics(sp.id, 180))),
    Promise.all(socialProfiles.map((sp) => getAllLatestAnalyses(sp.id))),
    Promise.all(socialProfiles.map((sp) => getSocialCompetitors(sp.id))),
    Promise.all(socialProfiles.map((sp) => getSocialGoals(sp.id))),
  ]);

  // Build a map of profile ID → data
  const metricsMap: Record<string, Awaited<ReturnType<typeof getSocialMetrics>>> = {};
  const analysesMap: Record<string, Awaited<ReturnType<typeof getAllLatestAnalyses>>> = {};
  const competitorsMap: Record<string, Awaited<ReturnType<typeof getSocialCompetitors>>> = {};
  const goalsMap: Record<string, Awaited<ReturnType<typeof getSocialGoals>>> = {};

  socialProfiles.forEach((sp, i) => {
    metricsMap[sp.id] = allMetrics[i];
    analysesMap[sp.id] = allAnalyses[i];
    competitorsMap[sp.id] = allCompetitors[i];
    goalsMap[sp.id] = allGoals[i];
  });

  // Fetch org limits for plan gating (uses superadmin bypass)
  const planCheck = await checkPlanLimit(profile.organization_id, "social_profiles", 0);

  // ------------------------------------------------------------------
  // Period comparisons from aggregated social metrics across all profiles
  // ------------------------------------------------------------------
  interface DailySocialStat {
    date: string;
    totalFollowers: number;
    avgEngagementRate: number | null;
    totalAvgLikes: number;
    totalAvgViews: number;
  }

  const metricsByDate = new Map<string, { followers: number[]; engagement: number[]; likes: number[]; views: number[] }>();
  for (const metrics of Object.values(metricsMap)) {
    for (const m of metrics) {
      const bucket = metricsByDate.get(m.date) ?? { followers: [], engagement: [], likes: [], views: [] };
      if (m.followers != null) bucket.followers.push(m.followers);
      if (m.engagement_rate != null) bucket.engagement.push(m.engagement_rate);
      if (m.avg_likes != null) bucket.likes.push(m.avg_likes);
      if (m.avg_views != null) bucket.views.push(m.avg_views);
      metricsByDate.set(m.date, bucket);
    }
  }

  const dailySocialStats: DailySocialStat[] = Array.from(metricsByDate.entries())
    .map(([date, b]) => ({
      date,
      totalFollowers: b.followers.reduce((a, v) => a + v, 0),
      avgEngagementRate: b.engagement.length > 0 ? b.engagement.reduce((a, v) => a + v, 0) / b.engagement.length : null,
      totalAvgLikes: b.likes.reduce((a, v) => a + v, 0),
      totalAvgViews: b.views.reduce((a, v) => a + v, 0),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const socialMetrics: MetricDef<DailySocialStat>[] = [
    { label: "Total Followers", getValue: (s) => s.totalFollowers, aggregation: "latest" },
    { label: "Avg Engagement Rate", getValue: (s) => s.avgEngagementRate, aggregation: "latest" },
    { label: "Total Avg Likes", getValue: (s) => s.totalAvgLikes, aggregation: "latest" },
    { label: "Total Avg Views", getValue: (s) => s.totalAvgViews, aggregation: "latest" },
  ];

  const socialComparisons = computeAllComparisons(dailySocialStats, socialMetrics, (s) => s.date);

  return (
    <SocialIntelligenceClient
      profiles={socialProfiles}
      metricsMap={metricsMap}
      analysesMap={analysesMap}
      competitorsMap={competitorsMap}
      goalsMap={goalsMap}
      projectId={project.id}
      maxProfiles={planCheck.limit}
      plan={planCheck.plan}
      comparisons={socialComparisons}
    />
  );
}
