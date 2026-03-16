import { redirect } from "next/navigation";
import {
  requireAdmin,
  getAdminStats,
  getRecentSignups,
  getRecentAuditLog,
  getAPIUsageStats,
  getBillingOverview,
  getUsageAnalytics,
  getSystemHealth,
} from "@/lib/dal/admin";
import { AdminOverviewClient } from "./overview-client";

export default async function AdminOverviewPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const [stats, recentSignups, recentAuditLog, apiUsage, billing, usage, health] =
    await Promise.all([
      getAdminStats(),
      getRecentSignups(5),
      getRecentAuditLog(8),
      getAPIUsageStats(),
      getBillingOverview(),
      getUsageAnalytics(),
      getSystemHealth(),
    ]);

  return (
    <AdminOverviewClient
      stats={stats}
      recentSignups={recentSignups}
      recentAuditLog={recentAuditLog}
      apiUsage={apiUsage}
      billing={billing}
      usage={usage}
      health={health}
    />
  );
}
