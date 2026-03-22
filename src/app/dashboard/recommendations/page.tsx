import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Lightbulb } from "lucide-react";
import { RecommendationsClient } from "./recommendations-client";
import { getRecommendations, getRecommendationStats } from "@/lib/dal/recommendations";

export default async function RecommendationsPage() {
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
        icon={Lightbulb}
        title="Organization Required"
        description="Set up your organization first to access Smart Recommendations."
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
        icon={Lightbulb}
        title="No Active Project"
        description="Create a project first to generate recommendations."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const [recommendations, stats] = await Promise.all([
    getRecommendations(project.id),
    getRecommendationStats(project.id),
  ]);

  return (
    <RecommendationsClient
      projectId={project.id}
      projectDomain={project.domain ?? project.name}
      recommendations={recommendations}
      stats={stats}
    />
  );
}
