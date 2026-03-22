import { redirect } from "next/navigation";
import {
  requireAdmin,
  getActiveInsights,
  getAdminStats,
  getInvestorMetrics,
  getAPIUsageStats,
  getAIUsageByFeature,
} from "@/lib/dal/admin";
import { DataIntelligenceClient } from "./data-intelligence-client";

export default async function DataIntelligencePage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const [insights, stats, investorMetrics, apiUsage, aiUsage] =
    await Promise.all([
      getActiveInsights(),
      getAdminStats(),
      getInvestorMetrics(),
      getAPIUsageStats(),
      getAIUsageByFeature(30),
    ]);

  return (
    <DataIntelligenceClient
      insights={insights}
      stats={stats}
      investorMetrics={investorMetrics}
      apiUsage={apiUsage}
      aiUsage={aiUsage}
    />
  );
}
