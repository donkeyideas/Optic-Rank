import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

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
      const userMap = new Map(authData.users.map((u) => [u.id, u]));
      for (const profile of profiles) {
        const authUser = userMap.get(profile.id);
        (profile as Record<string, unknown>).email = authUser?.email ?? null;
        (profile as Record<string, unknown>).provider = authUser?.app_metadata?.provider ?? "email";
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
    .select("id, name, plan, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at");

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
    .limit(50);

  return {
    totalOrgs: allOrgs.length,
    paidOrgs,
    planCounts,
    billingEvents: billingEvents ?? [],
    orgs: allOrgs,
  };
}

/**
 * Revenue analytics — MRR, churn, revenue history.
 */
export async function getRevenueAnalytics() {
  const admin = createAdminClient();

  // Plan pricing for MRR calc
  const planPricing: Record<string, number> = {
    starter: 29,
    pro: 79,
    business: 199,
    enterprise: 499,
  };

  const { data: orgs } = await admin
    .from("organizations")
    .select("id, plan, subscription_status, created_at, trial_ends_at, stripe_subscription_id");

  const allOrgs = orgs ?? [];

  // Exclude superadmin orgs from revenue calculations (platform admin, not customers)
  const { data: adminProfiles } = await admin
    .from("profiles")
    .select("organization_id")
    .in("system_role", ["superadmin"]);

  const adminOrgIds = new Set(
    (adminProfiles ?? []).map(p => p.organization_id).filter(Boolean)
  );

  // MRR: sum of monthly prices for active subscriptions (excluding admin orgs)
  let mrr = 0;
  let activeSubscriptions = 0;
  let trialingOrgs = 0;
  let canceledOrgs = 0;
  let pastDueOrgs = 0;

  allOrgs.forEach(o => {
    if (o.subscription_status === "active" && o.plan !== "free" && !adminOrgIds.has(o.id)) {
      mrr += planPricing[o.plan] ?? 0;
      activeSubscriptions++;
    }
    if (o.subscription_status === "trialing") trialingOrgs++;
    if (o.subscription_status === "canceled") canceledOrgs++;
    if (o.subscription_status === "past_due") pastDueOrgs++;
  });

  const arr = mrr * 12;
  const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;

  // Revenue from billing events (actual payments)
  const { data: events } = await admin
    .from("billing_events")
    .select("event_type, amount_cents, currency, created_at")
    .order("created_at", { ascending: true });

  const allEvents = events ?? [];

  // Total revenue from invoice.paid events
  let totalRevenue = 0;
  const monthlyRevenue: Record<string, number> = {};

  allEvents.forEach(ev => {
    if (ev.event_type === "invoice.paid" && ev.amount_cents && ev.amount_cents > 0) {
      totalRevenue += ev.amount_cents;
      const month = ev.created_at.slice(0, 7); // YYYY-MM
      monthlyRevenue[month] = (monthlyRevenue[month] ?? 0) + ev.amount_cents;
    }
  });

  // Churn: orgs that went from active/trialing to canceled
  const churnRate = allOrgs.length > 0
    ? Math.round((canceledOrgs / allOrgs.length) * 100)
    : 0;

  // Trial conversion: active orgs that had a trial
  const totalTrialed = allOrgs.filter(o =>
    o.subscription_status === "active" || o.subscription_status === "trialing" || o.subscription_status === "canceled"
  ).length;
  const trialConversion = totalTrialed > 0
    ? Math.round((activeSubscriptions / totalTrialed) * 100)
    : 0;

  // Revenue by plan (excluding admin orgs)
  const revenueByPlan: Record<string, { count: number; mrr: number }> = {};
  allOrgs.forEach(o => {
    if (o.subscription_status === "active" && o.plan !== "free" && !adminOrgIds.has(o.id)) {
      if (!revenueByPlan[o.plan]) revenueByPlan[o.plan] = { count: 0, mrr: 0 };
      revenueByPlan[o.plan].count++;
      revenueByPlan[o.plan].mrr += planPricing[o.plan] ?? 0;
    }
  });

  return {
    mrr,
    arr,
    arpu: Math.round(arpu * 100) / 100,
    totalRevenue,
    activeSubscriptions,
    trialingOrgs,
    canceledOrgs,
    pastDueOrgs,
    churnRate,
    trialConversion,
    revenueByPlan,
    monthlyRevenue,
  };
}

/**
 * Fetch Stripe subscription details for orgs that have a stripe_subscription_id.
 */
export async function getSubscriptionDetails() {
  const admin = createAdminClient();

  // Plan pricing in cents for fallback when Stripe data unavailable
  const planPricingCents: Record<string, number> = {
    starter: 2900,
    pro: 7900,
    business: 19900,
    enterprise: 49900,
  };

  // Fetch ALL non-free orgs (not just those with stripe_subscription_id)
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, plan, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, created_at")
    .neq("plan", "free");

  if (!orgs || orgs.length === 0) return [];

  // Exclude orgs owned by superadmin (platform admin org, not a customer)
  const { data: adminProfiles } = await admin
    .from("profiles")
    .select("organization_id")
    .in("system_role", ["superadmin"]);

  const adminOrgIds = new Set(
    (adminProfiles ?? []).map(p => p.organization_id).filter(Boolean)
  );

  const paidOrgs = orgs.filter(o => !adminOrgIds.has(o.id));
  if (paidOrgs.length === 0) return [];

  // Split into orgs with and without Stripe subscription IDs
  const withStripe = paidOrgs.filter(o => o.stripe_subscription_id);
  const withoutStripe = paidOrgs.filter(o => !o.stripe_subscription_id);

  type SubDetail = {
    orgId: string;
    orgName: string;
    plan: string;
    status: string;
    amount: number;
    currency: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAt: string | null;
    canceledAt: string | null;
    cancelAtPeriodEnd: boolean;
    created: string;
    trialEnd: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  };

  const details: SubDetail[] = [];

  // Fetch Stripe subscription details in parallel (batch of 5)
  if (withStripe.length > 0) {
    const stripe = getStripe();
    const batchSize = 5;
    for (let i = 0; i < withStripe.length; i += batchSize) {
      const batch = withStripe.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (org) => {
          try {
            const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id!);
            const item = sub.items.data[0];
            // In Clover API, current_period_start/end moved to subscription items
            const periodStart = item?.current_period_start ?? sub.created;
            const periodEnd = item?.current_period_end ?? sub.created;
            return {
              orgId: org.id,
              orgName: org.name,
              plan: org.plan,
              status: sub.status,
              amount: item?.price?.unit_amount ?? 0,
              currency: item?.price?.currency ?? "usd",
              currentPeriodStart: new Date(periodStart * 1000).toISOString(),
              currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
              cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
              canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              created: new Date(sub.created * 1000).toISOString(),
              trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
              stripeCustomerId: org.stripe_customer_id,
              stripeSubscriptionId: org.stripe_subscription_id!,
            } satisfies SubDetail;
          } catch {
            return {
              orgId: org.id,
              orgName: org.name,
              plan: org.plan,
              status: org.subscription_status ?? "unknown",
              amount: planPricingCents[org.plan] ?? 0,
              currency: "usd",
              currentPeriodStart: org.created_at,
              currentPeriodEnd: org.created_at,
              cancelAt: null,
              canceledAt: null,
              cancelAtPeriodEnd: false,
              created: org.created_at,
              trialEnd: org.trial_ends_at,
              stripeCustomerId: org.stripe_customer_id,
              stripeSubscriptionId: org.stripe_subscription_id!,
            } satisfies SubDetail;
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          details.push(result.value);
        }
      }
    }
  }

  // Add paid orgs without Stripe subscription IDs (using plan pricing)
  for (const org of withoutStripe) {
    details.push({
      orgId: org.id,
      orgName: org.name,
      plan: org.plan,
      status: org.subscription_status ?? "active",
      amount: planPricingCents[org.plan] ?? 0,
      currency: "usd",
      currentPeriodStart: org.created_at,
      currentPeriodEnd: org.created_at,
      cancelAt: null,
      canceledAt: null,
      cancelAtPeriodEnd: false,
      created: org.created_at,
      trialEnd: org.trial_ends_at,
      stripeCustomerId: org.stripe_customer_id,
      stripeSubscriptionId: null,
    });
  }

  return details;
}

/**
 * Get recent admin notifications / activity feed.
 */
export async function getAdminNotifications(limit = 30) {
  const admin = createAdminClient();

  // Combine multiple activity sources into a unified feed
  const [signups, billingEvents, auditLog, contacts] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, created_at, organization_id")
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("billing_events")
      .select("id, event_type, amount_cents, currency, organization_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("audit_log")
      .select("id, action, resource_type, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("contact_submissions")
      .select("id, name, email, subject, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  // Get org names for enrichment
  const orgIds = new Set<string>();
  (signups.data ?? []).forEach(s => { if (s.organization_id) orgIds.add(s.organization_id); });
  (billingEvents.data ?? []).forEach(e => { if (e.organization_id) orgIds.add(e.organization_id); });

  const { data: orgData } = orgIds.size > 0
    ? await admin.from("organizations").select("id, name, plan").in("id", [...orgIds])
    : { data: [] };
  const orgMap = new Map((orgData ?? []).map(o => [o.id, o]));

  // Get user names for audit log enrichment
  const userIds = new Set<string>();
  (auditLog.data ?? []).forEach(a => { if (a.user_id) userIds.add(a.user_id); });

  const { data: userData } = userIds.size > 0
    ? await admin.from("profiles").select("id, full_name").in("id", [...userIds])
    : { data: [] };
  const userMap = new Map((userData ?? []).map(u => [u.id, u]));

  type Notification = {
    id: string;
    type: "signup" | "billing" | "audit" | "contact";
    title: string;
    description: string;
    timestamp: string;
    meta?: string;
    contactData?: {
      id: string;
      name: string;
      email: string;
      subject: string | null;
      message: string;
      status: string;
    };
  };

  const notifications: Notification[] = [];

  // Signups
  (signups.data ?? []).forEach(s => {
    const org = s.organization_id ? orgMap.get(s.organization_id) : null;
    notifications.push({
      id: `signup-${s.id}`,
      type: "signup",
      title: "New user signed up",
      description: s.full_name ?? "Unknown user",
      timestamp: s.created_at,
      meta: org?.name ?? undefined,
    });
  });

  // Billing events
  (billingEvents.data ?? []).forEach(e => {
    const org = e.organization_id ? orgMap.get(e.organization_id) : null;
    const amount = e.amount_cents && e.amount_cents > 0
      ? ` — $${(e.amount_cents / 100).toFixed(2)}`
      : "";
    notifications.push({
      id: `billing-${e.id}`,
      type: "billing",
      title: (e.event_type ?? "billing event").replace(/\./g, " ").replace(/_/g, " "),
      description: (org?.name ?? "Unknown org") + amount,
      timestamp: e.created_at,
      meta: org?.plan ?? undefined,
    });
  });

  // Audit log
  (auditLog.data ?? []).forEach(a => {
    const user = a.user_id ? userMap.get(a.user_id) : null;
    notifications.push({
      id: `audit-${a.id}`,
      type: "audit",
      title: a.action ?? "Action",
      description: `${user?.full_name ?? "System"} — ${a.resource_type ?? "resource"}`,
      timestamp: a.created_at,
    });
  });

  // Contact submissions
  (contacts.data ?? []).forEach(c => {
    notifications.push({
      id: `contact-${c.id}`,
      type: "contact",
      title: c.subject || "Contact message",
      description: `${c.name} (${c.email})`,
      timestamp: c.created_at,
      meta: c.status,
      contactData: {
        id: c.id,
        name: c.name,
        email: c.email,
        subject: c.subject,
        message: c.message,
        status: c.status,
      },
    });
  });

  // Sort by timestamp descending
  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return notifications.slice(0, limit);
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

/**
 * Count of unread (status = 'new') contact submissions.
 */
export async function getUnreadContactCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("contact_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
}

export async function getAllContacts(limit = 50, offset = 0) {
  const admin = createAdminClient();
  const { data, count } = await admin
    .from("contact_submissions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data ?? [], count: count ?? 0 };
}

// ─── Investor-Ready Analytics ────────────────────────────────────────────────

/**
 * Growth time-series: monthly cohort data for users, orgs, projects, keywords, audits.
 * Returns both per-month counts and cumulative totals.
 */
export async function getGrowthTimeSeries() {
  const admin = createAdminClient();

  const [profilesRes, orgsRes, projectsRes, keywordsRes, auditsRes] = await Promise.all([
    admin.from("profiles").select("created_at").order("created_at", { ascending: true }),
    admin.from("organizations").select("created_at, plan, subscription_status").order("created_at", { ascending: true }),
    admin.from("projects").select("created_at").order("created_at", { ascending: true }),
    admin.from("keywords").select("created_at").order("created_at", { ascending: true }),
    admin.from("site_audits").select("created_at").order("created_at", { ascending: true }),
  ]);

  function groupByMonth(items: { created_at: string }[]) {
    const monthly: Record<string, number> = {};
    items.forEach(item => {
      const month = item.created_at.slice(0, 7);
      monthly[month] = (monthly[month] ?? 0) + 1;
    });
    const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return sorted.map(([month, count]) => {
      cumulative += count;
      return { month, count, cumulative };
    });
  }

  const allOrgs = orgsRes.data ?? [];
  function orgsByPlanMonthly() {
    const monthly: Record<string, { free: number; paid: number; trialing: number }> = {};
    allOrgs.forEach(org => {
      const month = org.created_at.slice(0, 7);
      if (!monthly[month]) monthly[month] = { free: 0, paid: 0, trialing: 0 };
      if (org.plan === "free") monthly[month].free++;
      else if (org.subscription_status === "trialing") monthly[month].trialing++;
      else monthly[month].paid++;
    });
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, counts]) => ({ month, ...counts }));
  }

  return {
    userGrowth: groupByMonth(profilesRes.data ?? []),
    orgGrowth: groupByMonth(allOrgs),
    projectGrowth: groupByMonth(projectsRes.data ?? []),
    keywordGrowth: groupByMonth(keywordsRes.data ?? []),
    auditGrowth: groupByMonth(auditsRes.data ?? []),
    orgsByPlanMonthly: orgsByPlanMonthly(),
  };
}

/**
 * Investor-grade SaaS metrics: MRR, ARR, ARPU, LTV, churn, conversion, MoM growth.
 * Excludes superadmin orgs from calculations.
 */
export async function getInvestorMetrics() {
  const admin = createAdminClient();

  const { data: plans } = await admin
    .from("pricing_plans")
    .select("plan_key, price_monthly")
    .eq("is_active", true);

  const planPricing: Record<string, number> = {};
  (plans ?? []).forEach(p => { planPricing[p.plan_key] = p.price_monthly ?? 0; });

  const { data: orgs } = await admin
    .from("organizations")
    .select("id, plan, subscription_status, created_at, trial_ends_at");

  const { data: adminProfiles } = await admin
    .from("profiles")
    .select("organization_id")
    .in("system_role", ["superadmin"]);

  const adminOrgIds = new Set(
    (adminProfiles ?? []).map(p => p.organization_id).filter(Boolean)
  );

  const allOrgs = (orgs ?? []).filter(o => !adminOrgIds.has(o.id));
  const paidOrgs = allOrgs.filter(o => o.subscription_status === "active" && o.plan !== "free");
  const freeOrgs = allOrgs.filter(o => o.plan === "free" || o.subscription_status !== "active");
  const trialingOrgs = allOrgs.filter(o => o.subscription_status === "trialing");
  const canceledOrgs = allOrgs.filter(o => o.subscription_status === "canceled");

  const mrr = paidOrgs.reduce((sum, o) => sum + (planPricing[o.plan] ?? 0), 0);
  const arr = mrr * 12;
  const arpu = paidOrgs.length > 0 ? mrr / paidOrgs.length : 0;

  const churnRate = allOrgs.length > 0
    ? (canceledOrgs.length / allOrgs.length) * 100
    : 0;

  const monthlyChurnRate = churnRate / 100;
  const estimatedLTV = monthlyChurnRate > 0 ? arpu / monthlyChurnRate : arpu * 24;

  const everTrialed = allOrgs.filter(
    o => o.trial_ends_at || o.subscription_status === "trialing" || (o.subscription_status === "active" && o.plan !== "free")
  );
  const converted = everTrialed.filter(o => o.subscription_status === "active" && o.plan !== "free");
  const trialConversionRate = everTrialed.length > 0
    ? (converted.length / everTrialed.length) * 100
    : 0;

  const freeToPaidRate = allOrgs.length > 0
    ? (paidOrgs.length / allOrgs.length) * 100
    : 0;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  const thisMonthOrgs = allOrgs.filter(o => o.created_at.slice(0, 7) === thisMonth).length;
  const lastMonthOrgs = allOrgs.filter(o => o.created_at.slice(0, 7) === lastMonth).length;
  const orgGrowthMoM = lastMonthOrgs > 0
    ? ((thisMonthOrgs - lastMonthOrgs) / lastMonthOrgs) * 100
    : thisMonthOrgs > 0 ? 100 : 0;

  return {
    mrr,
    arr,
    arpu: Math.round(arpu * 100) / 100,
    estimatedLTV: Math.round(estimatedLTV),
    totalOrgs: allOrgs.length,
    paidOrgs: paidOrgs.length,
    freeOrgs: freeOrgs.length,
    trialingOrgs: trialingOrgs.length,
    canceledOrgs: canceledOrgs.length,
    churnRate: Math.round(churnRate * 10) / 10,
    trialConversionRate: Math.round(trialConversionRate * 10) / 10,
    freeToPaidRate: Math.round(freeToPaidRate * 10) / 10,
    orgGrowthMoM: Math.round(orgGrowthMoM * 10) / 10,
  };
}
