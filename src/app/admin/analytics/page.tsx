import { redirect } from "next/navigation";
import {
  requireAdmin,
  getInvestorMetrics,
  getGrowthTimeSeries,
  getRevenueAnalytics,
  getAPIUsageStats,
  getAdminStats,
  getUsageAnalytics,
  getBillingOverview,
} from "@/lib/dal/admin";
import { AnalyticsClient } from "./analytics-client";

export default async function AdminAnalyticsPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const [investorMetrics, growth, revenue, apiUsage, stats, usage, billing] =
    await Promise.all([
      getInvestorMetrics(),
      getGrowthTimeSeries(),
      getRevenueAnalytics(),
      getAPIUsageStats(),
      getAdminStats(),
      getUsageAnalytics(),
      getBillingOverview(),
    ]);

  return (
    <AnalyticsClient
      investorMetrics={investorMetrics}
      growth={growth}
      revenue={revenue}
      apiUsage={apiUsage}
      stats={stats}
      usage={usage}
      billing={billing}
    />
  );
}
