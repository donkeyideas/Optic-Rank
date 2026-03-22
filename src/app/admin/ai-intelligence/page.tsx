import { redirect } from "next/navigation";
import {
  requireAdmin,
  getAIInteractions,
  getAIUsageByFeature,
  getAIProviderPerformance,
  getAICostTrend,
} from "@/lib/dal/admin";
import { AIIntelligenceClient } from "./ai-intelligence-client";

export default async function AIIntelligencePage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const [interactions, usageByFeature, providerPerformance, costTrend] =
    await Promise.all([
      getAIInteractions({ limit: 50 }),
      getAIUsageByFeature(30),
      getAIProviderPerformance(30),
      getAICostTrend(30),
    ]);

  return (
    <AIIntelligenceClient
      interactions={interactions}
      usageByFeature={usageByFeature}
      providerPerformance={providerPerformance}
      costTrend={costTrend}
    />
  );
}
