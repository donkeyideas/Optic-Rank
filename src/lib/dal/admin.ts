import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verify the current user is a superadmin. Returns user ID or null.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (profile?.system_role !== 'superadmin' && profile?.system_role !== 'admin') return null;

  return user.id;
}

/**
 * Admin overview stats — counts from all tables.
 */
export async function getAdminStats() {
  const admin = createAdminClient();

  const [usersRes, orgsRes, projectsRes, jobsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("organizations").select("id", { count: "exact", head: true }),
    admin.from("projects").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    totalUsers: usersRes.count ?? 0,
    totalOrgs: orgsRes.count ?? 0,
    activeProjects: projectsRes.count ?? 0,
    pendingJobs: jobsRes.count ?? 0,
  };
}

/**
 * Recent signups — newest profiles.
 */
export async function getRecentSignups(limit = 5) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, role, created_at, organization_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  // Fetch org details for these profiles
  const orgIds = [...new Set(data.filter(p => p.organization_id).map(p => p.organization_id!))];
  const { data: orgs } = orgIds.length > 0
    ? await admin.from("organizations").select("id, name, plan").in("id", orgIds)
    : { data: [] };

  const orgMap = new Map((orgs ?? []).map(o => [o.id, o]));

  return data.map(p => ({
    id: p.id,
    name: p.full_name ?? "Unknown",
    role: p.role,
    createdAt: p.created_at,
    orgName: p.organization_id ? orgMap.get(p.organization_id)?.name ?? null : null,
    plan: p.organization_id ? orgMap.get(p.organization_id)?.plan ?? "free" : "free",
  }));
}

/**
 * Recent audit log entries.
 */
export async function getRecentAuditLog(limit = 6) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_log")
    .select("id, action, resource_type, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * All users with org info — for admin users page.
 * Enriches profile data with email from auth.users.
 */
export async function getAllUsers(opts?: { search?: string; limit?: number; offset?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("*, organizations(name, plan)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (opts?.search) {
    query = query.or(`full_name.ilike.%${opts.search}%`);
  }
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);

  const { data, count } = await query;
  const profiles = data ?? [];

  // Fetch emails from auth.users via admin API
  if (profiles.length > 0) {
    const { data: authData } = await admin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authData?.users) {
      const emailMap = new Map(authData.users.map((u) => [u.id, u.email]));
      for (const profile of profiles) {
        (profile as Record<string, unknown>).email = emailMap.get(profile.id) ?? null;
      }
    }
  }

  return { data: profiles, count: count ?? 0 };
}

/**
 * All organizations — for admin orgs page.
 */
export async function getAllOrgs(opts?: { search?: string; limit?: number; offset?: number }) {
  const admin = createAdminClient();
  let query = admin
    .from("organizations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (opts?.search) {
    query = query.ilike("name", `%${opts.search}%`);
  }
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit ?? 20) - 1);

  const { data, count } = await query;

  // Get member counts for each org
  if (data && data.length > 0) {
    const orgIds = data.map(o => o.id);
    const { data: profiles } = await admin
      .from("profiles")
      .select("organization_id")
      .in("organization_id", orgIds);

    const memberCounts = new Map<string, number>();
    (profiles ?? []).forEach(p => {
      if (p.organization_id) {
        memberCounts.set(p.organization_id, (memberCounts.get(p.organization_id) ?? 0) + 1);
      }
    });

    // Get project counts
    const { data: projects } = await admin
      .from("projects")
      .select("organization_id")
      .in("organization_id", orgIds);

    const projectCounts = new Map<string, number>();
    (projects ?? []).forEach(p => {
      projectCounts.set(p.organization_id, (projectCounts.get(p.organization_id) ?? 0) + 1);
    });

    return {
      data: data.map(o => ({
        ...o,
        memberCount: memberCounts.get(o.id) ?? 0,
        projectCount: projectCounts.get(o.id) ?? 0,
      })),
      count: count ?? 0,
    };
  }

  return { data: (data ?? []).map(o => ({ ...o, memberCount: 0, projectCount: 0 })), count: count ?? 0 };
}

/**
 * Billing data — organizations with their plan/subscription info.
 */
export async function getBillingOverview() {
  const admin = createAdminClient();

  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, plan, subscription_status, stripe_customer_id, created_at");

  const allOrgs = orgs ?? [];

  const planCounts: Record<string, number> = {};
  let paidOrgs = 0;

  allOrgs.forEach(o => {
    planCounts[o.plan] = (planCounts[o.plan] ?? 0) + 1;
    if (o.plan !== "free") paidOrgs++;
  });

  const { data: billingEvents } = await admin
    .from("billing_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    totalOrgs: allOrgs.length,
    paidOrgs,
    planCounts,
    billingEvents: billingEvents ?? [],
    orgs: allOrgs,
  };
}

/**
 * System health — job queue status.
 */
export async function getSystemHealth() {
  const admin = createAdminClient();

  const [pendingRes, processingRes, failedRes, completedRes] = await Promise.all([
    admin.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "processing"),
    admin.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "failed"),
    admin.from("job_queue").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  const { data: recentJobs } = await admin
    .from("job_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: recentErrors } = await admin
    .from("job_queue")
    .select("*")
    .eq("status", "failed")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    pendingJobs: pendingRes.count ?? 0,
    processingJobs: processingRes.count ?? 0,
    failedJobs: failedRes.count ?? 0,
    completedJobs: completedRes.count ?? 0,
    recentJobs: recentJobs ?? [],
    recentErrors: recentErrors ?? [],
  };
}

/**
 * Usage analytics — from usage_tracking table.
 */
/**
 * Get all platform API configurations.
 */
export async function getAPIConfigs() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_api_configs")
    .select("*")
    .order("display_name", { ascending: true });

  return data ?? [];
}

/**
 * Get API usage stats — total calls, total cost, calls per provider.
 */
export async function getAPIUsageStats() {
  const admin = createAdminClient();

  // Get total calls and cost
  const { data: logs } = await admin
    .from("api_call_log")
    .select("provider, cost_usd, is_success, created_at");

  const allLogs = logs ?? [];

  const totalCalls = allLogs.length;
  const totalCost = allLogs.reduce((sum, l) => sum + (l.cost_usd ?? 0), 0);
  const successfulCalls = allLogs.filter((l) => l.is_success).length;
  const failedCalls = totalCalls - successfulCalls;

  // Group by provider
  const byProvider: Record<string, { calls: number; cost: number; errors: number }> = {};
  for (const log of allLogs) {
    if (!byProvider[log.provider]) {
      byProvider[log.provider] = { calls: 0, cost: 0, errors: 0 };
    }
    byProvider[log.provider].calls++;
    byProvider[log.provider].cost += log.cost_usd ?? 0;
    if (!log.is_success) byProvider[log.provider].errors++;
  }

  // Group by day (last 30 days)
  const dailyCosts: Record<string, number> = {};
  const dailyCalls: Record<string, number> = {};
  for (const log of allLogs) {
    const day = log.created_at?.slice(0, 10) ?? "unknown";
    dailyCosts[day] = (dailyCosts[day] ?? 0) + (log.cost_usd ?? 0);
    dailyCalls[day] = (dailyCalls[day] ?? 0) + 1;
  }

  return {
    totalCalls,
    totalCost,
    successfulCalls,
    failedCalls,
    byProvider,
    dailyCosts,
    dailyCalls,
  };
}

/**
 * Get recent API call log entries.
 */
export async function getAPICallLog(limit = 50) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_call_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

/**
 * Usage analytics — from usage_tracking table.
 */
export async function getUsageAnalytics() {
  const admin = createAdminClient();

  const { data: usage } = await admin
    .from("usage_tracking")
    .select("*")
    .order("period_start", { ascending: false })
    .limit(50);

  // Get total keywords, backlinks, audits across the platform
  const [keywordsRes, backlinksRes, auditsRes] = await Promise.all([
    admin.from("keywords").select("id", { count: "exact", head: true }),
    admin.from("backlinks").select("id", { count: "exact", head: true }),
    admin.from("site_audits").select("id", { count: "exact", head: true }),
  ]);

  return {
    usageRecords: usage ?? [],
    totalKeywords: keywordsRes.count ?? 0,
    totalBacklinks: backlinksRes.count ?? 0,
    totalAudits: auditsRes.count ?? 0,
  };
}

/**
 * Get all pricing plans ordered by display_order.
 */
export async function getPricingPlans() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pricing_plans")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return data ?? [];
}

/**
 * Get all pricing plans including inactive (for admin).
 */
export async function getAllPricingPlans() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pricing_plans")
    .select("*")
    .order("display_order", { ascending: true });

  return data ?? [];
}

/**
 * Get site content for a page.
 */
export async function getSiteContent(page: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_content")
    .select("*")
    .eq("page", page)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return data ?? [];
}

/**
 * Get all site content (for admin).
 */
export async function getAllSiteContent() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_content")
    .select("*")
    .order("page", { ascending: true })
    .order("sort_order", { ascending: true });

  return data ?? [];
}

// ─── Posts (blog + guides) ────────────────────────────────────

export async function getPublishedPosts(
  type: "blog" | "guide",
  limit = 20,
  offset = 0
) {
  const admin = createAdminClient();
  const { data, count } = await admin
    .from("posts")
    .select("*", { count: "exact" })
    .eq("type", type)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data ?? [], count: count ?? 0 };
}

export async function getPostBySlug(slug: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  return data;
}

export async function getAllPosts(
  type: "blog" | "guide",
  limit = 50,
  offset = 0
) {
  const admin = createAdminClient();
  const { data, count } = await admin
    .from("posts")
    .select("*", { count: "exact" })
    .eq("type", type)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data ?? [], count: count ?? 0 };
}

// ─── Changelog ────────────────────────────────────────────────

export async function getPublishedChangelog(limit = 50, offset = 0) {
  const admin = createAdminClient();
  const { data, count } = await admin
    .from("changelog_entries")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data ?? [], count: count ?? 0 };
}

export async function getAllChangelog() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("changelog_entries")
    .select("*")
    .order("published_at", { ascending: false });

  return data ?? [];
}

// ─── Roadmap ──────────────────────────────────────────────────

export async function getPublishedRoadmap() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("roadmap_items")
    .select("*")
    .order("sort_order", { ascending: true });

  return data ?? [];
}

export async function getAllRoadmap() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("roadmap_items")
    .select("*")
    .order("sort_order", { ascending: true });

  return data ?? [];
}

// ─── Jobs ─────────────────────────────────────────────────────

export async function getActiveJobs() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_listings")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAllJobs() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_listings")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

// ─── Contact submissions ──────────────────────────────────────

export async function getAllContacts(limit = 50, offset = 0) {
  const admin = createAdminClient();
  const { data, count } = await admin
    .from("contact_submissions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data ?? [], count: count ?? 0 };
}
