"use client";

import { useState, useTransition } from "react";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Trophy,
  Link2,
  LineChart,
  FileText,
  Wrench,
  X,
  Filter,
  ArrowUpDown,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { useActionProgress } from "@/components/shared/action-progress";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { AIStory } from "@/components/editorial/ai-story";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { dismissInsight, generateInsightsForProject } from "@/lib/actions/insights";
import type { AIInsight, InsightType } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface AIInsightsClientProps {
  insights: AIInsight[];
  stats: {
    activeCount: number;
    totalRevenueImpact: number;
    thisWeekCount: number;
    dismissedCount: number;
  };
  projectId: string;
}

/* ------------------------------------------------------------------
   Type filter configuration
   ------------------------------------------------------------------ */

const typeFilters: { value: InsightType | "all"; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <Filter size={11} /> },
  { value: "opportunity", label: "Opportunity", icon: <TrendingUp size={11} /> },
  { value: "alert", label: "Alert", icon: <AlertTriangle size={11} /> },
  { value: "win", label: "Win", icon: <Trophy size={11} /> },
  { value: "backlinks", label: "Backlinks", icon: <Link2 size={11} /> },
  { value: "prediction", label: "Prediction", icon: <LineChart size={11} /> },
  { value: "content", label: "Content", icon: <FileText size={11} /> },
  { value: "technical", label: "Technical", icon: <Wrench size={11} /> },
];

function typeBadgeVariant(type: InsightType) {
  switch (type) {
    case "opportunity":
      return "success" as const;
    case "alert":
      return "danger" as const;
    case "win":
      return "info" as const;
    case "backlinks":
      return "default" as const;
    case "prediction":
      return "warning" as const;
    case "content":
      return "muted" as const;
    case "technical":
      return "danger" as const;
  }
}

/* ------------------------------------------------------------------
   AI Insights Client Component
   ------------------------------------------------------------------ */

export function AIInsightsClient({
  insights,
  stats,
  projectId,
}: AIInsightsClientProps) {
  const [typeFilter, setTypeFilter] = useState<InsightType | "all">("all");
  const [sortBy, setSortBy] = useState<"priority" | "revenue" | "date">("priority");
  const [isPending, startTransition] = useTransition();
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  function handleDismiss(id: string) {
    setDismissingId(id);
    startTransition(async () => {
      await dismissInsight(id);
      setDismissingId(null);
    });
  }

  // Build headline stats from real data
  const headlineStats = [
    {
      label: "Active Insights",
      value: String(stats.activeCount),
      delta: `${stats.thisWeekCount} this week`,
      direction: "up" as const,
    },
    {
      label: "Revenue Impact",
      value: `$${(stats.totalRevenueImpact / 1000).toFixed(0)}K`,
      delta: "Estimated annual",
      direction: "up" as const,
    },
    {
      label: "This Week",
      value: String(stats.thisWeekCount),
      delta: "New insights",
      direction: "neutral" as const,
    },
    {
      label: "Dismissed",
      value: String(stats.dismissedCount),
      delta: "Total dismissed",
      direction: "neutral" as const,
    },
  ];

  if (insights.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              AI Intelligence Hub
            </h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Machine-learning powered insights, predictions, and recommendations for your SEO strategy
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isActionRunning || isPending}
            onClick={() => {
              runAction(
                {
                  title: "Generating AI Insights",
                  description: "Analyzing your project data to generate intelligent SEO recommendations...",
                  steps: ["Analyzing keyword data", "Reviewing backlink profile", "Checking site health", "Identifying opportunities", "Generating insights"],
                  estimatedDuration: 25,
                },
                () => generateInsightsForProject(projectId)
              );
            }}
          >
            <Sparkles size={14} />
            Generate Insights
          </Button>
        </div>
        <EmptyState
          icon={Brain}
          title="No AI Insights Yet"
          description="Click 'Generate Insights' to analyze your data and receive AI-powered recommendations."
        />
      </div>
    );
  }

  // Filter
  const filtered =
    typeFilter === "all"
      ? insights
      : insights.filter((i) => i.type === typeFilter);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "priority":
        return b.priority - a.priority;
      case "revenue":
        return (b.revenue_impact ?? 0) - (a.revenue_impact ?? 0);
      case "date":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Headline Stats */}
      <HeadlineBar stats={headlineStats} />

      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            AI Intelligence Hub
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            Machine-learning powered insights, predictions, and recommendations for your SEO strategy
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isActionRunning || isPending}
          onClick={() => {
            runAction(
              {
                title: "Generating AI Insights",
                description: "Analyzing your project data to generate intelligent SEO recommendations...",
                steps: ["Analyzing keyword data", "Reviewing backlink profile", "Checking site health", "Identifying opportunities", "Generating insights"],
                estimatedDuration: 25,
              },
              () => generateInsightsForProject(projectId)
            );
          }}
        >
          <Sparkles size={14} />
          Generate Insights
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-4">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted mr-1">
          Type:
        </span>
        {typeFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setTypeFilter(filter.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] border transition-colors ${
              typeFilter === filter.value
                ? "border-editorial-red bg-editorial-red/5 text-editorial-red"
                : "border-rule bg-surface-card text-ink-muted hover:text-ink hover:border-rule-dark"
            }`}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Sort:
          </span>
          {(["priority", "revenue", "date"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortBy(s)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                sortBy === s
                  ? "text-editorial-red"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <ArrowUpDown size={10} />
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Insights List */}
        <div>
          <ColumnHeader
            title="Active Insights"
            subtitle={`${sorted.length} insights matching filter`}
          />
          <div className="flex flex-col">
            {sorted.map((insight, i) => (
              <div key={insight.id} className="relative">
                {/* Revenue impact tag */}
                {insight.revenue_impact != null && insight.revenue_impact > 0 && (
                  <div className="absolute right-0 top-4 flex items-center gap-1 text-[10px] font-semibold text-editorial-green">
                    <DollarSign size={10} />
                    <span className="font-mono tabular-nums">
                      ${(insight.revenue_impact / 1000).toFixed(1)}K
                    </span>
                    <span className="text-ink-muted">/yr</span>
                  </div>
                )}

                <div className="flex items-start gap-3 py-1">
                  <div className="flex-1">
                    <AIStory
                      insight={insight}
                      showBorder={i < sorted.length - 1}
                    />
                  </div>
                </div>

                {/* Dismiss button */}
                {!insight.is_dismissed && (
                  <button
                    type="button"
                    className="absolute right-0 bottom-4 text-ink-muted hover:text-editorial-red transition-colors disabled:opacity-50"
                    title="Dismiss insight"
                    onClick={() => handleDismiss(insight.id)}
                    disabled={isPending && dismissingId === insight.id}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Insight Breakdown */}
        <aside className="flex flex-col gap-6">
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Insight Breakdown
            </span>
            <div className="mt-3 flex flex-col gap-1.5">
              {typeFilters
                .filter((f) => f.value !== "all")
                .map((filter) => {
                  const count = insights.filter((i) => i.type === filter.value).length;
                  return (
                    <div
                      key={filter.value}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="flex items-center gap-2 text-[12px] text-ink-secondary">
                        {filter.icon}
                        {filter.label}
                      </span>
                      <Badge variant={typeBadgeVariant(filter.value as InsightType)}>
                        {count}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
