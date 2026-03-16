import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .single();

  if (!profile?.organization_id) {
    return <NoOrgState />;
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .single();

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
    .select("current_position, previous_position, best_position")
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
    />
  );
}
