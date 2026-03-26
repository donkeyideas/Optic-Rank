import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { CompetitorsClient } from "./competitors-client";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";

export default async function CompetitorsPage() {
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
        description="Set up your organization first to track competitors."
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
        description="Create a project first to track competitors."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch competitors
  const { data: competitors } = await supabase
    .from("competitors")
    .select("*")
    .eq("project_id", project.id);

  // Fetch snapshots for each competitor if any exist
  const competitorIds = (competitors ?? []).map((c) => c.id);
  let snapshots: Array<Record<string, unknown>> = [];
  if (competitorIds.length > 0) {
    const { data: snapshotData } = await supabase
      .from("competitor_snapshots")
      .select("*")
      .in("competitor_id", competitorIds)
      .order("snapshot_date", { ascending: false });
    snapshots = (snapshotData as Array<Record<string, unknown>>) ?? [];
  }

  // ------------------------------------------------------------------
  // Period comparisons from competitor snapshots (aggregated by date)
  // ------------------------------------------------------------------
  interface DailyCompSnapshot {
    date: string;
    avgAuthority: number | null;
    avgTraffic: number | null;
    totalKeywords: number;
    totalBacklinks: number;
  }

  const compSnapshotsByDate = new Map<string, Array<Record<string, unknown>>>();
  for (const s of snapshots) {
    const date = s.snapshot_date as string;
    if (!date) continue;
    const arr = compSnapshotsByDate.get(date) ?? [];
    arr.push(s);
    compSnapshotsByDate.set(date, arr);
  }

  const dailyCompSnapshots: DailyCompSnapshot[] = Array.from(compSnapshotsByDate.entries())
    .map(([date, group]) => {
      const auths = group.map((s) => s.authority_score as number | null).filter((v): v is number => v != null);
      const traffics = group.map((s) => s.organic_traffic as number | null).filter((v): v is number => v != null);
      return {
        date,
        avgAuthority: auths.length > 0 ? auths.reduce((a, b) => a + b, 0) / auths.length : null,
        avgTraffic: traffics.length > 0 ? traffics.reduce((a, b) => a + b, 0) / traffics.length : null,
        totalKeywords: group.reduce((acc, s) => acc + ((s.keywords_count as number) ?? 0), 0),
        totalBacklinks: group.reduce((acc, s) => acc + ((s.backlinks_count as number) ?? 0), 0),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const compMetrics: MetricDef<DailyCompSnapshot>[] = [
    { label: "Avg Authority", getValue: (s) => s.avgAuthority, aggregation: "latest" },
    { label: "Avg Traffic", getValue: (s) => s.avgTraffic, aggregation: "latest" },
    { label: "Total Keywords", getValue: (s) => s.totalKeywords, aggregation: "latest" },
    { label: "Total Backlinks", getValue: (s) => s.totalBacklinks, aggregation: "latest" },
  ];

  const compComparisons = computeAllComparisons(dailyCompSnapshots, compMetrics, (s) => s.date);

  return (
    <CompetitorsClient
      competitors={competitors ?? []}
      snapshots={snapshots}
      projectId={project.id}
      comparisons={compComparisons}
    />
  );
}
