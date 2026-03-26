import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Eye } from "lucide-react";
import { AIVisibilityClient } from "./ai-visibility-client";
import {
  getVisibilityByKeyword,
  getVisibilityStats,
  getVisibilityChecks,
} from "@/lib/dal/ai-visibility";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";

export default async function AIVisibilityPage() {
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
        icon={Eye}
        title="Organization Required"
        description="Set up your organization first to track AI visibility."
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
        icon={Eye}
        title="No Active Project"
        description="Create a project first to track AI visibility."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const [keywordVisibility, stats, allChecks] = await Promise.all([
    getVisibilityByKeyword(project.id),
    getVisibilityStats(project.id),
    getVisibilityChecks(project.id, { limit: 2000 }),
  ]);

  // ------------------------------------------------------------------
  // Period comparisons from visibility checks aggregated by date
  // ------------------------------------------------------------------
  interface DailyVisibilityStat {
    date: string;
    totalChecks: number;
    brandMentionRate: number | null;
    citationRate: number | null;
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

  const dailyVisStats: DailyVisibilityStat[] = Array.from(checksByDate.entries())
    .map(([date, b]) => ({
      date,
      totalChecks: b.total,
      brandMentionRate: b.total > 0 ? (b.mentioned / b.total) * 100 : null,
      citationRate: b.total > 0 ? (b.cited / b.total) * 100 : null,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const visMetrics: MetricDef<DailyVisibilityStat>[] = [
    { label: "Total Checks", getValue: (s) => s.totalChecks, aggregation: "sum" },
    { label: "Brand Mention %", getValue: (s) => s.brandMentionRate, aggregation: "latest" },
    { label: "Citation Rate %", getValue: (s) => s.citationRate, aggregation: "latest" },
  ];

  const visComparisons = computeAllComparisons(dailyVisStats, visMetrics, (s) => s.date);

  return (
    <AIVisibilityClient
      keywordVisibility={keywordVisibility}
      stats={stats}
      projectId={project.id}
      projectDomain={project.domain ?? project.name}
      comparisons={visComparisons}
    />
  );
}
