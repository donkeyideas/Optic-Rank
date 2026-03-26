"use client";

import { useState } from "react";
import {
  Eye,
  TrendingUp,
  Network,
  FileText,
  Sparkles,
  Brain,
  Lightbulb,
  Zap,
} from "lucide-react";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActionProgress } from "@/components/shared/action-progress";
import { AIVisibilityClient } from "@/app/dashboard/ai-visibility/ai-visibility-client";
import { PredictionsClient } from "@/app/dashboard/predictions/predictions-client";
import { EntitiesClient } from "@/app/dashboard/entities/entities-client";
import { AIBriefsClient } from "@/app/dashboard/ai-briefs/ai-briefs-client";
import { AIInsightsClient } from "@/app/dashboard/ai-insights/ai-insights-client";
import { generateInsightsForProject } from "@/lib/actions/insights";
import { runVisibilityCheck } from "@/lib/actions/ai-visibility";
import { generatePredictions } from "@/lib/actions/predictions";
import { extractProjectEntities } from "@/lib/actions/entities";
import { generateBrief } from "@/lib/actions/briefs";
import type { VisibilityStats, KeywordVisibility } from "@/lib/dal/ai-visibility";
import type { PredictionStats, PredictionWithKeyword } from "@/lib/dal/predictions";
import type { EntityStats } from "@/lib/dal/entities";
import type { Entity, AIBrief, AIInsight, ComparisonTimeRange } from "@/types";
import type { GenericPeriodComparison } from "@/lib/utils/period-comparison";
import { PeriodComparisonBar } from "@/components/editorial/period-comparison-bar";

/* ------------------------------------------------------------------
   Tabs
   ------------------------------------------------------------------ */

const TABS = [
  { id: "insights", label: "AI Insights", icon: Lightbulb },
  { id: "visibility", label: "LLM Visibility", icon: Eye },
  { id: "predictions", label: "Predictions", icon: TrendingUp },
  { id: "entities", label: "Entities", icon: Network },
  { id: "briefs", label: "AI Briefs", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface AdvancedAIClientProps {
  projectId: string;
  projectDomain: string;
  // Visibility
  keywordVisibility: KeywordVisibility[];
  visibilityStats: VisibilityStats;
  // Predictions
  predictions: PredictionWithKeyword[];
  predictionStats: PredictionStats;
  // Entities
  entities: Entity[];
  entityStats: EntityStats;
  entityCoverage: Array<{
    page_id: string;
    page_title: string;
    page_url: string;
    entity_count: number;
    entity_coverage: number;
  }>;
  // Briefs
  briefs: AIBrief[];
  // Insights
  insights: AIInsight[];
  insightStats: {
    activeCount: number;
    totalRevenueImpact: number;
    thisWeekCount: number;
    dismissedCount: number;
  };
  // Period comparisons
  comparisons: Record<ComparisonTimeRange, GenericPeriodComparison>;
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AdvancedAIClient({
  projectId,
  projectDomain,
  keywordVisibility,
  visibilityStats,
  predictions,
  predictionStats,
  entities,
  entityStats,
  entityCoverage,
  briefs,
  insights,
  insightStats,
  comparisons,
}: AdvancedAIClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("insights");
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  function handleGenerateAll() {
    runAction(
      {
        title: "Generating All AI Modules",
        description: "Running all 5 AI intelligence modules for your project...",
        steps: [
          "Generating AI Insights",
          "Running LLM Visibility Check",
          "Generating Rank Predictions",
          "Extracting Entities",
          "Generating AI Brief",
          "Finalizing results",
        ],
        estimatedDuration: 90,
      },
      async () => {
        const results: string[] = [];

        const r1 = await generateInsightsForProject(projectId);
        results.push("error" in r1 ? `Insights: ${r1.error}` : `Insights: ${r1.generated} generated`);

        const r2 = await runVisibilityCheck(projectId);
        results.push("error" in r2 ? `Visibility: ${r2.error}` : `Visibility: ${r2.checksRun} checks`);

        const r3 = await generatePredictions(projectId);
        results.push("error" in r3 ? `Predictions: ${r3.error}` : `Predictions: ${r3.predicted} generated`);

        const r4 = await extractProjectEntities(projectId);
        results.push("error" in r4 ? `Entities: ${r4.error}` : `Entities: ${r4.extracted} extracted`);

        const r5 = await generateBrief(projectId, "on_demand");
        results.push("error" in r5 ? `Brief: ${r5.error}` : "Brief: generated");

        return { message: results.join(" · ") };
      }
    );
  }

  const headlineStats = [
    {
      label: "AI Features",
      value: "5",
      delta: "Advanced modules",
      direction: "neutral" as const,
    },
    {
      label: "Primary Engine",
      value: "DeepSeek",
      delta: "AI provider",
      direction: "neutral" as const,
    },
    {
      label: "LLMs Tracked",
      value: "5",
      delta: "OpenAI, Anthropic, Gemini, Perplexity, DeepSeek",
      direction: "neutral" as const,
    },
    {
      label: "Domain",
      value:
        projectDomain.length > 16
          ? projectDomain.slice(0, 16) + "..."
          : projectDomain,
      delta: "Active project",
      direction: "neutral" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Headline Stats */}
      <HeadlineBar stats={headlineStats} />

      {/* Page Header */}
      <div className="border-b border-rule pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Brain size={24} className="text-editorial-red" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-ink">
                Advanced AI
              </h1>
              <p className="mt-1 font-sans text-sm text-ink-secondary">
                AI-powered intelligence modules for{" "}
                <span className="font-semibold">{projectDomain}</span> &mdash;
                insights, visibility tracking, rank predictions, entity
                optimization &amp; automated briefings
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            disabled={isActionRunning}
            onClick={handleGenerateAll}
            className="shrink-0"
          >
            <Zap size={14} />
            Generate All
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-rule overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-4 py-2.5 font-sans text-[12px] font-semibold uppercase tracking-[1.5px] transition-colors",
                "hover:text-editorial-red",
                isActive
                  ? "text-editorial-red after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-editorial-red after:content-['']"
                  : "text-ink-secondary",
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Period Comparisons */}
      <PeriodComparisonBar comparisons={comparisons} />

      {/* Tab Content */}
      <div>
        {activeTab === "insights" && (
          <AIInsightsClient
            insights={insights}
            stats={insightStats}
            projectId={projectId}
          />
        )}
        {activeTab === "visibility" && (
          <AIVisibilityClient
            keywordVisibility={keywordVisibility}
            stats={visibilityStats}
            projectId={projectId}
            projectDomain={projectDomain}
            comparisons={comparisons}
          />
        )}
        {activeTab === "predictions" && (
          <PredictionsClient
            predictions={predictions}
            stats={predictionStats}
            projectId={projectId}
          />
        )}
        {activeTab === "entities" && (
          <EntitiesClient
            entities={entities}
            stats={entityStats}
            coverage={entityCoverage}
            projectId={projectId}
          />
        )}
        {activeTab === "briefs" && (
          <AIBriefsClient
            briefs={briefs}
            projectId={projectId}
            projectDomain={projectDomain}
          />
        )}
      </div>

      {/* Bottom info */}
      <div className="border-t border-rule pt-4">
        <div className="flex items-center gap-2 text-[10px] text-ink-muted">
          <Sparkles size={10} />
          DeepSeek is the default AI provider. You can add your own API keys for OpenAI, Claude, or Gemini in{" "}
          <a
            href="/dashboard/settings"
            className="font-semibold text-editorial-red hover:underline"
          >
            Settings &gt; AI Providers
          </a>
          .
        </div>
      </div>
    </div>
  );
}
