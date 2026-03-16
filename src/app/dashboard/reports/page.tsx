import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { FileDown } from "lucide-react";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
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
        icon={FileDown}
        title="Organization Required"
        description="Set up your organization first to generate reports."
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
        icon={FileDown}
        title="No Active Project"
        description="Create a project first to generate reports."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch scheduled reports
  const { data: scheduledReports } = await supabase
    .from("scheduled_reports")
    .select("*")
    .eq("project_id", project.id);

  return (
    <ReportsClient
      scheduledReports={scheduledReports ?? []}
      projectId={project.id}
    />
  );
}
