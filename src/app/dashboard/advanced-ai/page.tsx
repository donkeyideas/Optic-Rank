import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Brain } from "lucide-react";
import { AdvancedAIClient } from "./advanced-ai-client";
import {
  getVisibilityByKeyword,
  getVisibilityStats,
  getVisibilityChecks,
} from "@/lib/dal/ai-visibility";
import { getPredictions, getPredictionStats } from "@/lib/dal/predictions";
import { getEntities, getEntityStats, getEntityCoverage } from "@/lib/dal/entities";
import { getBriefs } from "@/lib/dal/briefs";
import { getAIInsights } from "@/lib/dal/ai-insights";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";

export const maxDuration = 300;

export default async function AdvancedAIPage() {
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
        icon={Brain}
        title="Organization Required"
        description="Set up your organization first to use Advanced AI features."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return (
      <EmptyState
        icon={Brain}
        title="No Active Project"
        description="Create a project first to use Advanced AI features."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const projectDomain = project.domain ?? project.name;

  // Fetch ALL data for all 5 features in parallel
  const [
    keywordVisibility,
    visibilityStats,
    predictions,
    predictionStats,
    entities,
    entityStats,
    entityCoverage,
    briefs,
    insights,
  ] = await Promise.all([
    getVisibilityByKeyword(project.id),
    getVisibilityStats(project.id),
    getPredictions(project.id),
    getPredictionStats(project.id),
    getEntities(project.id),
    getEntityStats(project.id),
    getEntityCoverage(project.id),
    getBriefs(project.id, { limit: 20 }),
    getAIInsights(project.id),
  ]);

  // Compute insight stats
  const activeInsights = insights.filter((i) => !i.is_dismissed);
  const insightStats = {
    activeCount: activeInsights.length,
    totalRevenueImpact: activeInsights.reduce(
      (sum, i) => sum + (i.revenue_impact ?? 0),
      0
    ),
    thisWeekCount: insights.filter(
      (i) => new Date(i.created_at) >= new Date(Date.now() - 7 * 86400000)
    ).length,
    dismissedCount: insights.filter((i) => i.is_dismissed).length,
  };

  // ------------------------------------------------------------------
  // Period comparisons from visibility checks aggregated by date
  // ------------------------------------------------------------------
  const allChecks = await getVisibilityChecks(project.id, { limit: 2000 });

  interface DailyAIStat {
    date: string;
    totalChecks: number;
    brandMentionRate: number | null;
    citationRate: number | null;
    avgConfidence: number | null;
  }

  const checksByDate = new Map<string, { total: number; mentioned: number; cited: number }>();
  for (const c of allChecks) {
    const date = (c.checked_at ?? "").split("T")[0];
    if (!date) continue;
    const bucket = checksByDate.get(date) ?? { total: 0, mentioned: 0, cited: 0 };
    bucket.total++;
    if (c.brand_mentioned) bucket.mentioned++;
    if (c.url_cited) bucket.cited++;
    checksByDate.set(date, bucket);
  }

  const dailyAIStats: DailyAIStat[] = Array.from(checksByDate.entries())
    .map(([date, b]) => ({
      date,
      totalChecks: b.total,
      brandMentionRate: b.total > 0 ? (b.mentioned / b.total) * 100 : null,
      citationRate: b.total > 0 ? (b.cited / b.total) * 100 : null,
      avgConfidence: null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const aiMetrics: MetricDef<DailyAIStat>[] = [
    { label: "Total Checks", getValue: (s) => s.totalChecks, aggregation: "sum" },
    { label: "Brand Mention %", getValue: (s) => s.brandMentionRate, aggregation: "latest" },
    { label: "Citation Rate %", getValue: (s) => s.citationRate, aggregation: "latest" },
  ];

  const aiComparisons = computeAllComparisons(dailyAIStats, aiMetrics, (s) => s.date);

  return (
    <AdvancedAIClient
      projectId={project.id}
      projectDomain={projectDomain}
      keywordVisibility={keywordVisibility}
      visibilityStats={visibilityStats}
      predictions={predictions}
      predictionStats={predictionStats}
      entities={entities}
      entityStats={entityStats}
      entityCoverage={entityCoverage}
      briefs={briefs}
      insights={insights}
      insightStats={insightStats}
      comparisons={aiComparisons}
    />
  );
}
