import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Smartphone } from "lucide-react";
import { AppStoreClient } from "./app-store-client";
import {
  getAppStoreListings,
  getAppStoreRankings,
  getAppReviews,
  getAppStoreCompetitors,
  getAppStoreSnapshots,
  getAppVersions,
  getKeywordHistory,
  getReviewTopics,
  getLocalizations,
  getVisibilityHistory,
  type AppStoreSnapshot,
} from "@/lib/dal/app-store";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";

export default async function AppStorePage() {
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
        icon={Smartphone}
        title="Organization Required"
        description="Set up your organization first to track app store listings."
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
        icon={Smartphone}
        title="No Active Project"
        description="Create a project first to track app store listings."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch all listings
  const listings = await getAppStoreListings(project.id);
  const listingIds = listings.map((l) => l.id);

  // Fetch all data in parallel
  const [rankings, reviews, competitors, snapshots, versions, topics, localizations, visibilityHistory] = await Promise.all([
    getAppStoreRankings(listingIds),
    getAppReviews(listingIds),
    getAppStoreCompetitors(listingIds),
    getAppStoreSnapshots(listingIds, 90),
    getAppVersions(listingIds),
    getReviewTopics(listingIds),
    getLocalizations(listingIds),
    getVisibilityHistory(listingIds, 90),
  ]);

  // Fetch keyword history for all rankings
  const rankingIds = rankings.map((r) => r.id);
  const keywordHistory = await getKeywordHistory(rankingIds, 30);

  // ------------------------------------------------------------------
  // Period comparisons from app store snapshots (aggregated across listings)
  // ------------------------------------------------------------------
  interface DailyAppSnapshot {
    date: string;
    avgRating: number | null;
    totalReviews: number;
    totalDownloads: number;
    avgAsoScore: number | null;
    avgVisibility: number | null;
  }

  const snapshotsByDate = new Map<string, AppStoreSnapshot[]>();
  for (const s of snapshots) {
    const arr = snapshotsByDate.get(s.snapshot_date) ?? [];
    arr.push(s);
    snapshotsByDate.set(s.snapshot_date, arr);
  }

  const dailyAppSnapshots: DailyAppSnapshot[] = Array.from(snapshotsByDate.entries())
    .map(([date, group]) => {
      const ratings = group.map((s) => s.rating).filter((r): r is number => r != null);
      const asoScores = group.map((s) => s.aso_score).filter((r): r is number => r != null);
      const visScores = group.map((s) => s.visibility_score).filter((r): r is number => r != null);
      return {
        date,
        avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        totalReviews: group.reduce((acc, s) => acc + (s.reviews_count ?? 0), 0),
        totalDownloads: group.reduce((acc, s) => acc + (s.downloads_estimate ?? 0), 0),
        avgAsoScore: asoScores.length > 0 ? asoScores.reduce((a, b) => a + b, 0) / asoScores.length : null,
        avgVisibility: visScores.length > 0 ? visScores.reduce((a, b) => a + b, 0) / visScores.length : null,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const appMetrics: MetricDef<DailyAppSnapshot>[] = [
    { label: "Rating", getValue: (s) => s.avgRating, aggregation: "latest" },
    { label: "Reviews", getValue: (s) => s.totalReviews, aggregation: "latest" },
    { label: "Downloads", getValue: (s) => s.totalDownloads, aggregation: "latest" },
    { label: "ASO Score", getValue: (s) => s.avgAsoScore, aggregation: "latest" },
    { label: "Visibility Score", getValue: (s) => s.avgVisibility, aggregation: "latest" },
  ];

  const appComparisons = computeAllComparisons(dailyAppSnapshots, appMetrics, (s) => s.date);

  return (
    <AppStoreClient
      listings={listings}
      rankings={rankings}
      reviews={reviews}
      competitors={competitors}
      snapshots={snapshots}
      versions={versions}
      keywordHistory={keywordHistory}
      topics={topics}
      localizations={localizations}
      visibilityHistory={visibilityHistory}
      projectId={project.id}
      comparisons={appComparisons}
    />
  );
}
