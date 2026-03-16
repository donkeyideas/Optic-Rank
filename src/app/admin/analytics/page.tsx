import { redirect } from "next/navigation";
import { requireAdmin, getUsageAnalytics, getAdminStats } from "@/lib/dal/admin";
import { AnalyticsClient } from "./analytics-client";

export default async function AdminAnalyticsPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const [usage, stats] = await Promise.all([
    getUsageAnalytics(),
    getAdminStats(),
  ]);

  return (
    <AnalyticsClient
      totalUsers={stats.totalUsers}
      totalOrgs={stats.totalOrgs}
      activeProjects={stats.activeProjects}
      totalKeywords={usage.totalKeywords}
      totalBacklinks={usage.totalBacklinks}
      totalAudits={usage.totalAudits}
      usageRecords={usage.usageRecords}
    />
  );
}
