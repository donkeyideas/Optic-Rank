import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Eye } from "lucide-react";
import { AIVisibilityClient } from "./ai-visibility-client";
import {
  getVisibilityByKeyword,
  getVisibilityStats,
} from "@/lib/dal/ai-visibility";

export default async function AIVisibilityPage() {
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
        icon={Eye}
        title="Organization Required"
        description="Set up your organization first to track AI visibility."
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
        icon={Eye}
        title="No Active Project"
        description="Create a project first to track AI visibility."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const [keywordVisibility, stats] = await Promise.all([
    getVisibilityByKeyword(project.id),
    getVisibilityStats(project.id),
  ]);

  return (
    <AIVisibilityClient
      keywordVisibility={keywordVisibility}
      stats={stats}
      projectId={project.id}
      projectDomain={project.domain ?? project.name}
    />
  );
}
