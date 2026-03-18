import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Shield } from "lucide-react";
import { SiteAuditClient } from "./site-audit-client";

export default async function SiteAuditPage() {
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
        icon={Shield}
        title="Organization Required"
        description="Set up your organization first to run site audits."
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
        icon={Shield}
        title="No Active Project"
        description="Create a project first to run site audits."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch the latest audit
  const { data: latestAudit } = await supabase
    .from("site_audits")
    .select("*")
    .eq("project_id", project.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch issues and pages only if an audit exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let issues: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pages: any[] = [];

  if (latestAudit) {
    const [issuesRes, pagesRes] = await Promise.all([
      supabase.from("audit_issues").select("*").eq("audit_id", latestAudit.id).not("category", "like", "%-signal"),
      supabase.from("audit_pages").select("*").eq("audit_id", latestAudit.id),
    ]);
    issues = issuesRes.data ?? [];
    // Map load_time_ms (milliseconds) to load_time (seconds) for client compatibility
    pages = (pagesRes.data ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      load_time: p.load_time_ms != null ? (p.load_time_ms as number) / 1000 : null,
    }));
  }

  // Fetch audit history
  const { data: history } = await supabase
    .from("site_audits")
    .select("*")
    .eq("project_id", project.id)
    .order("started_at", { ascending: false })
    .limit(10);

  return (
    <SiteAuditClient
      latestAudit={latestAudit}
      issues={issues ?? []}
      pages={pages ?? []}
      history={history ?? []}
      projectId={project.id}
    />
  );
}
