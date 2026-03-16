import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";
import { AIBriefsClient } from "./ai-briefs-client";
import { getBriefs } from "@/lib/dal/briefs";

export default async function AIBriefsPage() {
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
        icon={FileText}
        title="Organization Required"
        description="Set up your organization first to generate AI briefs."
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
        icon={FileText}
        title="No Active Project"
        description="Create a project first to generate AI briefs."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const briefs = await getBriefs(project.id);

  return (
    <AIBriefsClient
      briefs={briefs}
      projectId={project.id}
      projectDomain={project.domain ?? project.name}
    />
  );
}
