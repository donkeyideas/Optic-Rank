import { createAdminClient } from "@/lib/supabase/admin";

export type GatedResource = "projects" | "keywords" | "pages_crawl" | "users";

export interface PlanLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: string;
}

/**
 * Check if an organization has capacity for a given resource.
 * Returns allowed=true if under limit, false if at/over limit.
 */
export async function checkPlanLimit(
  orgId: string,
  resource: GatedResource,
  additionalCount: number = 1
): Promise<PlanLimitResult> {
  const supabase = createAdminClient();

  // Fetch org with plan limits
  const { data: org } = await supabase
    .from("organizations")
    .select("plan, max_projects, max_keywords, max_pages_crawl, max_users")
    .eq("id", orgId)
    .single();

  if (!org) {
    return { allowed: false, current: 0, limit: 0, plan: "unknown" };
  }

  let current = 0;
  let limit = 0;

  switch (resource) {
    case "projects": {
      limit = org.max_projects;
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      current = count ?? 0;
      break;
    }
    case "keywords": {
      limit = org.max_keywords;
      // Count keywords across all projects in org
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", orgId);
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p) => p.id);
        const { count } = await supabase
          .from("keywords")
          .select("id", { count: "exact", head: true })
          .in("project_id", projectIds);
        current = count ?? 0;
      }
      break;
    }
    case "pages_crawl": {
      limit = org.max_pages_crawl;
      // Count total audit pages this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: projects } = await supabase
        .from("projects")
        .select("id")
        .eq("organization_id", orgId);
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p) => p.id);
        const { data: audits } = await supabase
          .from("site_audits")
          .select("id")
          .in("project_id", projectIds)
          .gte("created_at", monthStart.toISOString());
        const auditIds = (audits ?? []).map((a) => a.id);
        if (auditIds.length > 0) {
          const { count } = await supabase
            .from("audit_pages")
            .select("id", { count: "exact", head: true })
            .in("audit_id", auditIds);
          current = count ?? 0;
        }
      }
      break;
    }
    case "users": {
      limit = org.max_users;
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      current = count ?? 0;
      break;
    }
  }

  return {
    allowed: current + additionalCount <= limit,
    current,
    limit,
    plan: org.plan,
  };
}

/**
 * Get current usage summary for all gated resources.
 */
export async function getUsageSummary(
  orgId: string
): Promise<Record<GatedResource, { current: number; limit: number }>> {
  const [projects, keywords, pagesCrawl, users] = await Promise.all([
    checkPlanLimit(orgId, "projects", 0),
    checkPlanLimit(orgId, "keywords", 0),
    checkPlanLimit(orgId, "pages_crawl", 0),
    checkPlanLimit(orgId, "users", 0),
  ]);

  return {
    projects: { current: projects.current, limit: projects.limit },
    keywords: { current: keywords.current, limit: keywords.limit },
    pages_crawl: { current: pagesCrawl.current, limit: pagesCrawl.limit },
    users: { current: users.current, limit: users.limit },
  };
}
