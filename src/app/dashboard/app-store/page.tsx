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
} from "@/lib/dal/app-store";

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
  const [rankings, reviews, competitors, snapshots, versions, topics, localizations] = await Promise.all([
    getAppStoreRankings(listingIds),
    getAppReviews(listingIds),
    getAppStoreCompetitors(listingIds),
    getAppStoreSnapshots(listingIds, 90),
    getAppVersions(listingIds),
    getReviewTopics(listingIds),
    getLocalizations(listingIds),
  ]);

  // Fetch keyword history for all rankings
  const rankingIds = rankings.map((r) => r.id);
  const keywordHistory = await getKeywordHistory(rankingIds, 30);

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
      projectId={project.id}
    />
  );
}
