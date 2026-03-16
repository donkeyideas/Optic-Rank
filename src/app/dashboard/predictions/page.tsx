import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendingUp } from "lucide-react";
import { PredictionsClient } from "./predictions-client";
import { getPredictions, getPredictionStats } from "@/lib/dal/predictions";

export default async function PredictionsPage() {
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
        icon={TrendingUp}
        title="Organization Required"
        description="Set up your organization first to generate rank predictions."
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
    .single();

  if (!project) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No Active Project"
        description="Create a project first to generate rank predictions."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const [predictions, stats] = await Promise.all([
    getPredictions(project.id),
    getPredictionStats(project.id),
  ]);

  return (
    <PredictionsClient
      predictions={predictions}
      stats={stats}
      projectId={project.id}
    />
  );
}
