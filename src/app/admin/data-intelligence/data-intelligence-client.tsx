"use client";

import { useState, useTransition } from "react";
import {
  Brain,
  RefreshCw,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Cpu,
  BarChart3,
  Zap,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePlatformInsights, dismissInsightAction } from "@/lib/actions/admin-intelligence";
import type { PlatformInsight } from "@/lib/dal/admin";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface DataIntelligenceClientProps {
  insights: PlatformInsight[];
  stats: { totalUsers: number; totalOrgs: number; activeProjects: number; pendingJobs: number };
  investorMetrics: {
    mrr: number; arr: number; arpu: number; estimatedLTV: number;
    totalOrgs: number; paidOrgs: number; freeOrgs: number;
    trialingOrgs: number; canceledOrgs: number;
    churnRate: number; trialConversionRate: number; freeToPaidRate: number; orgGrowthMoM: number;
  };
  apiUsage: {
    totalCalls: number; totalCost: number; successfulCalls: number; failedCalls: number;
    byProvider: Record<string, { calls: number; cost: number; errors: number }>;
  };
  aiUsage: Record<string, { calls: number; tokens: number; cost: number; avg_response_ms: number; success_rate: number }>;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "text-editorial-red", bg: "bg-editorial-red/5", border: "border-editorial-red/30" },
  warning:  { icon: AlertCircle, color: "text-editorial-gold", bg: "bg-editorial-gold/5", border: "border-editorial-gold/30" },
  info:     { icon: Info, color: "text-ink-secondary", bg: "bg-surface-raised", border: "border-rule" },
  positive: { icon: CheckCircle2, color: "text-editorial-green", bg: "bg-editorial-green/5", border: "border-editorial-green/30" },
};

const CATEGORY_ICONS: Record<string, typeof Brain> = {
  revenue: DollarSign,
  engagement: Activity,
  growth: TrendingUp,
  churn: Users,
  feature_adoption: Target,
  system: Cpu,
  ai_usage: Brain,
  overall: BarChart3,
};

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function DataIntelligenceClient({
  insights,
  stats,
  investorMetrics,
  apiUsage,
  aiUsage,
}: DataIntelligenceClientProps) {
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function handleGenerate() {
    setStatusMsg(null);
    startTransition(async () => {
      const result = await generatePlatformInsights();
      if ("error" in result) setStatusMsg(`Error: ${result.error}`);
      else setStatusMsg(`Generated ${result.count} insights.`);
    });
  }

  function handleDismiss(id: string) {
    startTransition(async () => {
      await dismissInsightAction(id);
    });
  }

  // Find health score insight
  const healthInsight = insights.find((i) => i.insight_type === "health_score");
  const healthScoreMatch = healthInsight?.description.match(/(\d{1,3})(?:\/100|\s*out of\s*100)/i);
  const healthScore = healthScoreMatch ? parseInt(healthScoreMatch[1], 10) : null;

  // Group remaining insights by category
  const groupedInsights: Record<string, PlatformInsight[]> = {};
  for (const insight of insights) {
    if (insight.insight_type === "health_score") continue;
    const cat = insight.category;
    if (!groupedInsights[cat]) groupedInsights[cat] = [];
    groupedInsights[cat].push(insight);
  }

  // Sort categories by severity priority
  const categoryOrder = Object.entries(groupedInsights).sort((a, b) => {
    const severityWeight = (s: string) => s === "critical" ? 0 : s === "warning" ? 1 : s === "positive" ? 3 : 2;
    const aMin = Math.min(...a[1].map((i) => severityWeight(i.severity)));
    const bMin = Math.min(...b[1].map((i) => severityWeight(i.severity)));
    return aMin - bMin;
  });

  const totalAICalls = Object.values(aiUsage).reduce((s, f) => s + f.calls, 0);
  const totalAICost = Object.values(aiUsage).reduce((s, f) => s + f.cost, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Data Intelligence</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            AI-powered platform analysis — like having a data scientist evaluate everything.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleGenerate} disabled={isPending}>
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {insights.length > 0 ? "Regenerate Analysis" : "Generate Analysis"}
        </Button>
      </div>

      {statusMsg && (
        <div className={`border px-4 py-2 text-sm ${statusMsg.startsWith("Error") ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red" : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"}`}>
          {statusMsg}
          <button onClick={() => setStatusMsg(null)} className="ml-2 text-xs underline">dismiss</button>
        </div>
      )}

      {/* Platform Health Score (Hero) */}
      {healthInsight && (
        <div className="border-2 border-rule bg-surface-card p-6 text-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Platform Health Score</span>
          <div className="mt-2 flex items-center justify-center gap-3">
            {healthScore != null && (
              <span className={`font-mono text-5xl font-bold ${
                healthScore >= 80 ? "text-editorial-green"
                : healthScore >= 60 ? "text-editorial-gold"
                : "text-editorial-red"
              }`}>
                {healthScore}
              </span>
            )}
            <span className="font-mono text-lg text-ink-muted">/100</span>
          </div>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-secondary">
            {healthInsight.description}
          </p>
        </div>
      )}

      {/* Key Metrics Strip */}
      <div className="grid grid-cols-4 gap-3 md:grid-cols-8">
        {[
          { label: "MRR", value: `$${investorMetrics.mrr}` },
          { label: "Active Users", value: stats.totalUsers.toString() },
          { label: "Churn", value: `${investorMetrics.churnRate}%` },
          { label: "API Cost", value: `$${apiUsage.totalCost.toFixed(2)}` },
          { label: "Avg Response", value: `${Object.values(aiUsage)[0]?.avg_response_ms ?? 0}ms` },
          { label: "AI Calls (30d)", value: totalAICalls.toString() },
          { label: "AI Cost (30d)", value: `$${totalAICost.toFixed(4)}` },
          { label: "Projects", value: stats.activeProjects.toString() },
        ].map((m) => (
          <div key={m.label} className="border border-rule bg-surface-card p-2 text-center">
            <span className="block font-mono text-sm font-bold text-ink">{m.value}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-ink-muted">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Insights Feed */}
      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-rule py-16">
          <Brain size={40} className="mb-4 text-ink-muted" />
          <h3 className="font-serif text-lg font-bold text-ink">No Insights Generated Yet</h3>
          <p className="mt-1 max-w-md text-center text-sm text-ink-secondary">
            Click &quot;Generate Analysis&quot; to have the AI analyze all platform data and produce actionable insights.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {categoryOrder.map(([category, categoryInsights]) => {
            const CategoryIcon = CATEGORY_ICONS[category] || Brain;
            return (
              <div key={category}>
                <div className="mb-3 flex items-center gap-2">
                  <CategoryIcon size={14} className="text-ink-muted" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    {category.replace("_", " ")}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {categoryInsights.map((insight) => {
                    const sev = SEVERITY_CONFIG[insight.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
                    const SevIcon = sev.icon;
                    const recs = insight.recommendations as Array<{ action?: string; impact?: string; effort?: string }>;

                    return (
                      <div key={insight.id} className={`border ${sev.border} ${sev.bg} p-4`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <SevIcon size={16} className={`mt-0.5 shrink-0 ${sev.color}`} />
                            <div>
                              <h4 className="text-sm font-bold text-ink">{insight.title}</h4>
                              <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                                {insight.description}
                              </p>
                              {/* Recommendations */}
                              {recs.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {recs.map((rec, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 border border-rule bg-surface-card px-2 py-0.5 text-[10px] text-ink-secondary">
                                      <Zap size={8} className="text-editorial-gold" />
                                      {rec.action}
                                      {rec.impact && (
                                        <span className={`ml-1 font-bold ${rec.impact === "high" ? "text-editorial-red" : rec.impact === "medium" ? "text-editorial-gold" : "text-ink-muted"}`}>
                                          {rec.impact}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-ink-muted">
                              {Math.round((insight.confidence ?? 0.8) * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDismiss(insight.id)}
                              className="p-1 text-ink-muted transition-colors hover:text-ink"
                              title="Dismiss insight"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generated timestamp */}
      {insights.length > 0 && (
        <p className="text-[10px] text-ink-muted">
          Last generated: {new Date(insights[0].generated_at).toLocaleString()} · {insights.length} insights
        </p>
      )}
    </div>
  );
}
