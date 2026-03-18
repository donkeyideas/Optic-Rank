import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Network } from "lucide-react";
import { EntitiesClient } from "./entities-client";
import { getEntities, getEntityStats, getEntityCoverage } from "@/lib/dal/entities";

export default async function EntitiesPage() {
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
        icon={Network}
        title="Organization Required"
        description="Set up your organization first to extract entities."
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
        icon={Network}
        title="No Active Project"
        description="Create a project first to extract entities."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const [entities, stats, coverage] = await Promise.all([
    getEntities(project.id),
    getEntityStats(project.id),
    getEntityCoverage(project.id),
  ]);

  return (
    <EntitiesClient
      entities={entities}
      stats={stats}
      coverage={coverage}
      projectId={project.id}
    />
  );
}
