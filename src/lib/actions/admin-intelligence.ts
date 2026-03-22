"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { aiChat } from "@/lib/ai/ai-provider";
import {
  getAdminStats,
  getInvestorMetrics,
  getAPIUsageStats,
  getSystemHealth,
  getUsageAnalytics,
  getAIUsageByFeature,
} from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

/**
 * Generate platform insights by aggregating all data and sending to AI.
 * Like having a data scientist evaluate everything.
 */
export async function generatePlatformInsights(): Promise<
  { error: string } | { success: true; count: number }
> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  // Collect data from all sources in parallel
  const [stats, investorMetrics, apiUsage, systemHealth, usage, aiUsage] =
    await Promise.all([
      getAdminStats(),
      getInvestorMetrics(),
      getAPIUsageStats(),
      getSystemHealth(),
      getUsageAnalytics(),
      getAIUsageByFeature(30),
    ]);

  const dataSnapshot = {
    stats,
    investorMetrics,
    apiUsage: {
      totalCalls: apiUsage.totalCalls,
      totalCost: apiUsage.totalCost,
      successRate: apiUsage.totalCalls > 0
        ? Math.round((apiUsage.successfulCalls / apiUsage.totalCalls) * 100)
        : 100,
      byProvider: apiUsage.byProvider,
    },
    systemHealth: {
      pendingJobs: systemHealth.pendingJobs,
      failedJobs: systemHealth.failedJobs,
      completedJobs: systemHealth.completedJobs,
    },
    usage,
    aiUsage,
  };

  const prompt = `You are a senior data scientist and SaaS analytics expert evaluating a platform called "Optic Rank" (SEO intelligence platform). Analyze the following real-time platform data and produce structured insights.

## Platform Data Snapshot

### Business Metrics
- Total Users: ${stats.totalUsers}
- Total Organizations: ${stats.totalOrgs}
- Active Projects: ${stats.activeProjects}
- MRR: $${investorMetrics.mrr}
- ARR: $${investorMetrics.arr}
- ARPU: $${investorMetrics.arpu}
- Estimated LTV: $${investorMetrics.estimatedLTV}
- Paid Orgs: ${investorMetrics.paidOrgs} / Free: ${investorMetrics.freeOrgs} / Trialing: ${investorMetrics.trialingOrgs}
- Canceled: ${investorMetrics.canceledOrgs}
- Churn Rate: ${investorMetrics.churnRate}%
- Trial Conversion: ${investorMetrics.trialConversionRate}%
- Free-to-Paid: ${investorMetrics.freeToPaidRate}%
- MoM Growth: ${investorMetrics.orgGrowthMoM}%

### System Health
- Pending Jobs: ${systemHealth.pendingJobs}
- Failed Jobs: ${systemHealth.failedJobs}
- Completed Jobs: ${systemHealth.completedJobs}
- Processing Jobs: ${systemHealth.processingJobs}

### API & AI Usage (Last 30 Days)
- Total API Calls: ${apiUsage.totalCalls}
- Total API Cost: $${apiUsage.totalCost.toFixed(4)}
- API Success Rate: ${dataSnapshot.apiUsage.successRate}%
- AI Features Used: ${Object.keys(aiUsage).length}
- Top AI Features: ${Object.entries(aiUsage).sort((a, b) => b[1].calls - a[1].calls).slice(0, 5).map(([f, s]) => `${f} (${s.calls} calls, $${s.cost.toFixed(4)})`).join(", ") || "None yet"}

### Feature Usage
- Total Keywords Tracked: ${usage.totalKeywords}
- Total Backlinks Tracked: ${usage.totalBacklinks}
- Total Site Audits: ${usage.totalAudits}

## Instructions

IMPORTANT: Only analyze the data that is actually provided above. Do NOT fabricate metrics, trends, or issues that aren't evidenced by the numbers. If a metric is 0 or unavailable, acknowledge it honestly rather than inventing analysis.

Respond with a JSON array of insights. Each insight must have:
- "insight_type": one of "health_score", "anomaly", "trend", "recommendation", "prediction", "summary"
- "category": one of "revenue", "engagement", "growth", "churn", "feature_adoption", "system", "ai_usage", "overall"
- "title": short, specific title (max 80 chars)
- "description": detailed analysis (2-4 sentences)
- "severity": one of "critical", "warning", "info", "positive"
- "confidence": 0.0 to 1.0
- "recommendations": array of { "action": string, "impact": "high"|"medium"|"low", "effort": "high"|"medium"|"low" }

Generate exactly 8-12 insights covering:
1. One "health_score" type for overall platform health (0-100 in the description)
2. Revenue analysis
3. User growth analysis
4. Churn/retention analysis
5. Feature adoption
6. System health
7. AI usage patterns
8. Top recommendations

Return ONLY the JSON array, no markdown formatting or explanations.`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 3000,
    timeout: 60000,
    jsonMode: true,
    context: {
      feature: "data_intelligence",
      sub_type: "platform_insights",
      metadata: { trigger: "manual" },
    },
  });

  if (!result?.text) return { error: "AI provider unavailable." };

  // Parse the response
  let insights: Array<{
    insight_type: string;
    category: string;
    title: string;
    description: string;
    severity: string;
    confidence: number;
    recommendations: Array<Record<string, unknown>>;
  }>;

  try {
    const text = result.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(text);
    // Handle both raw arrays and object-wrapped arrays (e.g. {"insights": [...]})
    if (Array.isArray(parsed)) {
      insights = parsed;
    } else if (parsed && typeof parsed === "object") {
      const arrayVal = Object.values(parsed).find((v) => Array.isArray(v));
      if (arrayVal) insights = arrayVal as typeof insights;
      else throw new Error("No array found in response object");
    } else {
      throw new Error("Unexpected response format");
    }
  } catch (e) {
    return { error: `Failed to parse AI response: ${e instanceof Error ? e.message : "unknown"}` };
  }

  // Valid enum values for DB constraints
  const VALID_TYPES = new Set(["health_score", "anomaly", "trend", "recommendation", "prediction", "summary"]);
  const VALID_CATEGORIES = new Set(["revenue", "engagement", "growth", "churn", "feature_adoption", "system", "ai_usage", "overall"]);
  const VALID_SEVERITIES = new Set(["critical", "warning", "info", "positive"]);

  // Deactivate old insights
  const supabase = createAdminClient();
  const { error: deactivateError } = await supabase
    .from("platform_insights")
    .update({ is_active: false })
    .eq("is_active", true);

  if (deactivateError) {
    return { error: `DB deactivate failed: ${deactivateError.message}` };
  }

  // Normalize and validate enum values before insert
  const insightRows = insights
    .filter((i) => i.title && i.description)
    .map((i) => ({
      insight_type: VALID_TYPES.has(i.insight_type) ? i.insight_type : "summary",
      category: VALID_CATEGORIES.has(i.category) ? i.category : "overall",
      title: i.title.slice(0, 200),
      description: i.description,
      severity: VALID_SEVERITIES.has(i.severity) ? i.severity : "info",
      confidence: typeof i.confidence === "number" ? Math.min(Math.max(i.confidence, 0), 1) : 0.8,
      data_snapshot: dataSnapshot,
      recommendations: Array.isArray(i.recommendations) ? i.recommendations : [],
      is_active: true,
      is_dismissed: false,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }));

  if (insightRows.length === 0) {
    return { error: "AI returned no valid insights." };
  }

  const { error: insertError } = await supabase.from("platform_insights").insert(insightRows);

  if (insertError) {
    return { error: `DB insert failed: ${insertError.message}` };
  }

  revalidatePath("/admin/data-intelligence");
  return { success: true, count: insightRows.length };
}

/**
 * Dismiss a single insight.
 */
export async function dismissInsightAction(insightId: string): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  await supabase
    .from("platform_insights")
    .update({ is_dismissed: true })
    .eq("id", insightId);

  revalidatePath("/admin/data-intelligence");
  return { success: true };
}
