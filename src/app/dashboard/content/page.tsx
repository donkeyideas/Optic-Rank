import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";
import { ContentClient } from "./content-client";

export default async function ContentPage() {
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
        description="Set up your organization first to manage content."
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
        icon={FileText}
        title="No Active Project"
        description="Create a project first to manage content."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch content pages, briefs, and calendar in parallel
  const [contentPagesRes, contentBriefsRes, calendarRes] = await Promise.all([
    supabase.from("content_pages").select("*").eq("project_id", project.id),
    supabase.from("content_briefs").select("*").eq("project_id", project.id),
    supabase.from("content_calendar").select("*").eq("project_id", project.id).order("target_date", { ascending: true }),
  ]);

  return (
    <ContentClient
      contentPages={contentPagesRes.data ?? []}
      contentBriefs={contentBriefsRes.data ?? []}
      calendarEntries={calendarRes.data ?? []}
      projectId={project.id}
    />
  );
}
