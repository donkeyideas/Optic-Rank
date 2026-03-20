import { redirect } from "next/navigation";
import {
  requireAdmin,
  getAdminStats,
  getRecentSignups,
  getRecentAuditLog,
  getAPIUsageStats,
  getBillingOverview,
  getRevenueAnalytics,
  getUsageAnalytics,
  getSystemHealth,
} from "@/lib/dal/admin";
import { AdminOverviewClient } from "./overview-client";

export default async function AdminOverviewPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const [stats, recentSignups, recentAuditLog, apiUsage, billing, revenue, usage, health] =
    await Promise.all([
      getAdminStats().catch(() => ({ totalUsers: 0, totalOrgs: 0, activeProjects: 0, pendingJobs: 0 })),
      getRecentSignups(5).catch(() => []),
      getRecentAuditLog(8).catch(() => []),
      getAPIUsageStats().catch(() => ({ totalCalls: 0, totalCost: 0, successfulCalls: 0, failedCalls: 0, byProvider: {}, dailyCosts: {}, dailyCalls: {} })),
      getBillingOverview().catch(() => ({ totalOrgs: 0, paidOrgs: 0, planCounts: {}, billingEvents: [], orgs: [] })),
      getRevenueAnalytics().catch(() => ({ mrr: 0, arr: 0, arpu: 0, totalRevenue: 0, activeSubscriptions: 0, trialingOrgs: 0, canceledOrgs: 0, pastDueOrgs: 0, churnRate: 0, trialConversion: 0, revenueByPlan: {}, monthlyRevenue: {} })),
      getUsageAnalytics().catch(() => ({ usageRecords: [], totalKeywords: 0, totalBacklinks: 0, totalAudits: 0 })),
      getSystemHealth().catch(() => ({ pendingJobs: 0, processingJobs: 0, failedJobs: 0, completedJobs: 0, recentJobs: [], recentErrors: [] })),
    ]);

  return (
    <AdminOverviewClient
      stats={stats}
      recentSignups={recentSignups}
      recentAuditLog={recentAuditLog}
      apiUsage={apiUsage}
      billing={billing}
      revenue={revenue}
      usage={usage}
      health={health}
    />
  );
}
