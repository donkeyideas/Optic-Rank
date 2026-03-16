import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Smartphone } from "lucide-react";
import { AppStoreClient } from "./app-store-client";

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
    .single();

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
    .single();

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

  // Fetch app store listings
  const { data: listings } = await supabase
    .from("app_store_listings")
    .select("*")
    .eq("project_id", project.id);

  // Fetch rankings and reviews for each listing
  const listingIds = (listings ?? []).map((l) => l.id);
  let rankings: Array<Record<string, unknown>> = [];
  let reviews: Array<Record<string, unknown>> = [];

  if (listingIds.length > 0) {
    const [rankingsRes, reviewsRes] = await Promise.all([
      supabase
        .from("app_store_rankings")
        .select("*")
        .in("listing_id", listingIds)
        .order("checked_at", { ascending: false }),
      supabase
        .from("app_store_reviews")
        .select("*")
        .in("listing_id", listingIds)
        .order("review_date", { ascending: false })
        .limit(50),
    ]);
    rankings = (rankingsRes.data as Array<Record<string, unknown>>) ?? [];
    reviews = (reviewsRes.data as Array<Record<string, unknown>>) ?? [];
  }

  return (
    <AppStoreClient
      listings={listings ?? []}
      rankings={rankings}
      reviews={reviews}
      projectId={project.id}
    />
  );
}
