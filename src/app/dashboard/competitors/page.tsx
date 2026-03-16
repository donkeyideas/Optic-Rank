import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { CompetitorsClient } from "./competitors-client";

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
    .single();

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
    .single();

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

  return (
    <CompetitorsClient
      competitors={competitors ?? []}
      snapshots={snapshots}
      projectId={project.id}
    />
  );
}
