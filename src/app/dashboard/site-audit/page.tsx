import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Shield } from "lucide-react";
import { SiteAuditClient } from "./site-audit-client";
import { getScheduledAudit } from "@/lib/actions/site-audit";
import { computeAllComparisons, type MetricDef } from "@/lib/utils/period-comparison";

// Site audits crawl up to 25 pages + call PageSpeed API — needs extended timeout
export const maxDuration = 60;

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
    try {
      const [issuesRes, pagesRes] = await Promise.all([
        supabase
          .from("audit_issues")
          .select("*")
          .eq("audit_id", latestAudit.id)
          .not("category", "like", "%-signal")
          .order("severity", { ascending: true })
          .limit(500),
        supabase
          .from("audit_pages")
          .select("*")
          .eq("audit_id", latestAudit.id)
          .limit(100),
      ]);
      issues = issuesRes.data ?? [];
      // Map load_time_ms (milliseconds) to load_time (seconds) for client compatibility
      pages = (pagesRes.data ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        load_time: p.load_time_ms != null ? (p.load_time_ms as number) / 1000 : null,
      }));
    } catch (err) {
      console.error("[SiteAudit] Failed to fetch audit data:", err);
    }
  }

  // Fetch audit history and scheduled audit in parallel
  const [historyRes, scheduledAudit] = await Promise.all([
    supabase
      .from("site_audits")
      .select("*")
      .eq("project_id", project.id)
      .order("started_at", { ascending: false })
      .limit(10),
    getScheduledAudit(project.id),
  ]);

  const history = historyRes.data;

  // ------------------------------------------------------------------
  // Period comparisons from audit history
  // ------------------------------------------------------------------
  const auditHistory = [...(history ?? [])].reverse(); // oldest first for comparison
  interface AuditPoint {
    date: string;
    health_score: number | null;
    seo_score: number | null;
    performance_score: number | null;
    accessibility_score: number | null;
    issues_found: number | null;
  }
  const auditPoints: AuditPoint[] = auditHistory.map((a) => ({
    date: (a.completed_at ?? a.started_at ?? "").split("T")[0],
    health_score: a.health_score ?? null,
    seo_score: a.seo_score ?? null,
    performance_score: a.performance_score ?? null,
    accessibility_score: a.accessibility_score ?? null,
    issues_found: a.issues_found ?? null,
  }));

  const auditMetrics: MetricDef<AuditPoint>[] = [
    { label: "Health Score", getValue: (a) => a.health_score, aggregation: "latest" },
    { label: "SEO Score", getValue: (a) => a.seo_score, aggregation: "latest" },
    { label: "Performance", getValue: (a) => a.performance_score, aggregation: "latest" },
    { label: "Accessibility", getValue: (a) => a.accessibility_score, aggregation: "latest" },
    { label: "Issues Found", getValue: (a) => a.issues_found, aggregation: "latest", invertDirection: true },
  ];

  const auditComparisons = computeAllComparisons(auditPoints, auditMetrics, (a) => a.date);

  return (
    <SiteAuditClient
      latestAudit={latestAudit}
      issues={issues ?? []}
      pages={pages ?? []}
      history={history ?? []}
      projectId={project.id}
      scheduledAudit={scheduledAudit}
      comparisons={auditComparisons}
    />
  );
}
