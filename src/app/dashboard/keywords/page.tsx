import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";
import { KeywordsPageClient } from "./keywords-client";

/* ------------------------------------------------------------------
   Empty State Components
   ------------------------------------------------------------------ */

function NoOrgState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Organization Required
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
          You need to create an organization before tracking keywords.
        </p>
      </div>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90"
      >
        Set Up Organization
      </Link>
    </div>
  );
}

function NoProjectState() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20">
      <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          No Active Project
        </h1>
        <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">
          Create a project to start tracking keywords and monitoring rankings.
        </p>
      </div>
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.15em] text-surface-cream transition-colors hover:bg-ink/90"
      >
        Create Your First Project
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------
   Keywords Page (Server Wrapper)
   ------------------------------------------------------------------ */

export default async function KeywordsPage() {
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
    return <NoOrgState />;
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return <NoProjectState />;
  }

  // Fetch initial keywords data (paginated, ordered by position)
  const { data: keywords, count } = await supabase
    .from("keywords")
    .select("*", { count: "exact" })
    .eq("project_id", project.id)
    .order("current_position", { ascending: true, nullsFirst: false })
    .limit(50);

  // Fetch latest SERP features for each keyword
  const keywordIds = (keywords ?? []).map((k) => k.id);
  const serpFeaturesMap = new Map<string, string[]>();
  if (keywordIds.length > 0) {
    const { data: ranks } = await supabase
      .from("keyword_ranks")
      .select("keyword_id, serp_features")
      .in("keyword_id", keywordIds)
      .order("checked_at", { ascending: false });

    // Take only the latest rank per keyword
    for (const rank of ranks ?? []) {
      if (!serpFeaturesMap.has(rank.keyword_id)) {
        serpFeaturesMap.set(rank.keyword_id, rank.serp_features ?? []);
      }
    }
  }

  // Enrich keywords with SERP features
  const enrichedKeywords = (keywords ?? []).map((kw) => ({
    ...kw,
    serp_features: serpFeaturesMap.get(kw.id) ?? [],
  }));

  // Fetch all keywords for aggregate stats (only the columns we need)
  const { data: allKeywords } = await supabase
    .from("keywords")
    .select("id, current_position, previous_position, best_position")
    .eq("project_id", project.id);

  // Compute stats from real data
  const total = count ?? 0;
  const kwData = allKeywords ?? [];

  const top3 = kwData.filter(
    (k) => k.current_position !== null && k.current_position <= 3
  ).length;

  const positions = kwData
    .filter((k) => k.current_position !== null)
    .map((k) => k.current_position!);

  const avgPosition =
    positions.length > 0
      ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
      : "--";

  const keywordsUp = kwData.filter(
    (k) =>
      k.previous_position !== null &&
      k.current_position !== null &&
      k.current_position < k.previous_position
  ).length;

  const keywordsDown = kwData.filter(
    (k) =>
      k.previous_position !== null &&
      k.current_position !== null &&
      k.current_position > k.previous_position
  ).length;

  // ------------------------------------------------------------------
  // Period comparisons from keyword rank history
  // ------------------------------------------------------------------
  interface DailyKeywordStat {
    date: string;
    avgPosition: number | null;
    rankedCount: number;
    top3Count: number;
    top10Count: number;
  }

  const allKwIds = kwData.map((k) => k.id);
  let dailyKeywordStats: DailyKeywordStat[] = [];

  if (allKwIds.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 180);
    const { data: rankRows } = await supabase
      .from("keyword_ranks")
      .select("position, checked_at")
      .in("keyword_id", allKwIds)
      .gte("checked_at", cutoff.toISOString())
      .order("checked_at", { ascending: true });

    const ranksByDate = new Map<string, number[]>();
    for (const row of rankRows ?? []) {
      const date = (row.checked_at as string).split("T")[0];
      const arr = ranksByDate.get(date) ?? [];
      if (row.position != null) arr.push(row.position);
      ranksByDate.set(date, arr);
    }

    dailyKeywordStats = Array.from(ranksByDate.entries())
      .map(([date, pos]) => ({
        date,
        avgPosition: pos.length > 0 ? pos.reduce((a, b) => a + b, 0) / pos.length : null,
        rankedCount: pos.length,
        top3Count: pos.filter((p) => p <= 3).length,
        top10Count: pos.filter((p) => p <= 10).length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  const kwMetrics: MetricDef<DailyKeywordStat>[] = [
    { label: "Avg Position", getValue: (s) => s.avgPosition, aggregation: "latest", invertDirection: true },
    { label: "Keywords Ranked", getValue: (s) => s.rankedCount, aggregation: "latest" },
    { label: "Top 3", getValue: (s) => s.top3Count, aggregation: "latest" },
    { label: "Top 10", getValue: (s) => s.top10Count, aggregation: "latest" },
  ];

  const kwComparisons = computeAllComparisons(dailyKeywordStats, kwMetrics, (s) => s.date);

  return (
    <KeywordsPageClient
      projectId={project.id}
      keywords={enrichedKeywords}
      totalCount={total}
      stats={{
        total,
        top3,
        avgPosition: String(avgPosition),
        keywordsUp,
        keywordsDown,
      }}
      comparisons={kwComparisons}
    />
  );
}
