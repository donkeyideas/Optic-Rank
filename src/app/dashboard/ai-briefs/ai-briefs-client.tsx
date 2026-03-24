"use client";

import { useState, useTransition } from "react";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate, formatDate, formatDateTime } from "@/lib/utils/format-date";
import {
  FileText,
  Sparkles,
  Clock,
  Trash2,
  ChevronRight,
  Calendar,
  Zap,
  BarChart3,
  Link2,
  Eye,
  Wrench,
  Users,
  TrendingUp,
  Network,
  ListChecks,
  BookOpen,
} from "lucide-react";
import { useActionProgress } from "@/components/shared/action-progress";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { generateBrief, deleteBrief } from "@/lib/actions/briefs";
import type { AIBrief, BriefSection } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface AIBriefsClientProps {
  briefs: AIBrief[];
  projectId: string;
  projectDomain: string;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

const SECTION_ICONS: Record<string, React.ReactNode> = {
  summary: <BookOpen size={14} />,
  keywords: <BarChart3 size={14} />,
  rankings: <TrendingUp size={14} />,
  backlinks: <Link2 size={14} />,
  visibility: <Eye size={14} />,
  technical: <Wrench size={14} />,
  competitors: <Users size={14} />,
  predictions: <Zap size={14} />,
  entities: <Network size={14} />,
  actions: <ListChecks size={14} />,
};

const TYPE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  on_demand: "On Demand",
};

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AIBriefsClient({
  briefs,
  projectId,
  projectDomain,
}: AIBriefsClientProps) {
  const timezone = useTimezone();
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(
    briefs[0]?.id ?? null
  );
  const [briefType, setBriefType] = useState<"daily" | "weekly" | "monthly" | "on_demand">("on_demand");
  const [isPending, startTransition] = useTransition();
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  const selectedBrief = briefs.find((b) => b.id === selectedBriefId) ?? null;

  function handleGenerate() {
    runAction(
      {
        title: "Generating AI Brief",
        description: "Creating a comprehensive AI-powered intelligence briefing for your project...",
        steps: ["Gathering keyword data", "Analyzing rankings", "Reviewing backlink profile", "Checking site health", "Compiling intelligence brief"],
        estimatedDuration: 25,
      },
      async () => {
        const result = await generateBrief(projectId, briefType);
        if (!("error" in result)) {
          setSelectedBriefId(result.briefId);
        }
        return result;
      }
    );
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBrief(id);
      if (selectedBriefId === id) {
        setSelectedBriefId(null);
      }
    });
  }

  const headlineStats = [
    {
      label: "Total Briefs",
      value: String(briefs.length),
      delta: "Generated",
      direction: "neutral" as const,
    },
    {
      label: "Latest",
      value: briefs[0]
        ? formatShortDate(briefs[0].created_at, timezone)
        : "None",
      delta: briefs[0] ? TYPE_LABELS[briefs[0].brief_type] : "",
      direction: "neutral" as const,
    },
    {
      label: "AI Provider",
      value: "DeepSeek",
      delta: "Primary engine",
      direction: "neutral" as const,
    },
    {
      label: "Domain",
      value: projectDomain.length > 16 ? projectDomain.slice(0, 16) + "..." : projectDomain,
      delta: "Active project",
      direction: "neutral" as const,
    },
  ];

  if (briefs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              AI Intelligence Briefs
            </h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Comprehensive AI-generated SEO intelligence reports for{" "}
              <span className="font-semibold">{projectDomain}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={briefType}
              onChange={(e) => setBriefType(e.target.value as typeof briefType)}
              className="h-8 border border-rule bg-surface-card px-2 font-sans text-xs text-ink focus:border-editorial-red focus:outline-none"
            >
              <option value="on_demand">On Demand</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              disabled={isActionRunning || isPending}
              onClick={handleGenerate}
            >
              <Sparkles size={14} />
              Generate Brief
            </Button>
          </div>
        </div>
        <EmptyState
          icon={FileText}
          title="No Briefs Generated Yet"
          description="Click 'Generate Brief' to create your first AI-powered SEO intelligence report."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <HeadlineBar stats={headlineStats} />

      {/* Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            AI Intelligence Briefs
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            {briefs.length} briefs generated for{" "}
            <span className="font-semibold">{projectDomain}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={briefType}
            onChange={(e) => setBriefType(e.target.value as typeof briefType)}
            className="h-8 border border-rule bg-surface-card px-2 font-sans text-xs text-ink focus:border-editorial-red focus:outline-none"
          >
            <option value="on_demand">On Demand</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            disabled={isActionRunning || isPending}
            onClick={handleGenerate}
          >
            <Sparkles size={14} />
            Generate Brief
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Brief Content */}
        <div>
          {selectedBrief ? (
            <article className="flex flex-col gap-6">
              {/* Title */}
              <div className="border-b-2 border-ink pb-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="default">{TYPE_LABELS[selectedBrief.brief_type]}</Badge>
                  <span className="font-mono text-[10px] text-ink-muted">
                    {formatDate(selectedBrief.created_at, timezone, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="font-serif text-3xl font-bold leading-tight text-ink">
                  {selectedBrief.title}
                </h2>
                <p className="mt-3 font-serif text-[15px] italic leading-relaxed text-ink-secondary">
                  {selectedBrief.summary}
                </p>
              </div>

              {/* Sections */}
              {(selectedBrief.sections as BriefSection[]).map((section, i) => (
                <section key={i} className="border-b border-rule pb-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-editorial-red">
                      {SECTION_ICONS[section.type] ?? <FileText size={14} />}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-ink">
                      {section.title}
                    </h3>
                  </div>
                  <div className="font-sans text-[13px] leading-relaxed text-ink-secondary whitespace-pre-line">
                    {section.content}
                  </div>
                </section>
              ))}

              {/* Generated by footer */}
              <div className="flex items-center gap-2 border-t border-rule pt-4 text-[10px] text-ink-muted">
                <Sparkles size={10} />
                Generated by {selectedBrief.generated_by} &middot;{" "}
                {formatDateTime(selectedBrief.created_at, timezone)}
              </div>
            </article>
          ) : (
            <div className="flex h-64 items-center justify-center">
              <p className="font-sans text-sm text-ink-muted">
                Select a brief from the sidebar to view
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: Brief History */}
        <aside className="flex flex-col gap-4">
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Brief History
            </span>
            <div className="mt-3 flex flex-col gap-1">
              {briefs.map((brief) => (
                <div
                  key={brief.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBriefId(brief.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedBriefId(brief.id); }}
                  className={`group flex cursor-pointer items-center gap-2 border px-3 py-2.5 text-left transition-colors ${
                    selectedBriefId === brief.id
                      ? "border-editorial-red bg-editorial-red/5"
                      : "border-transparent hover:border-rule hover:bg-surface-cream/50"
                  }`}
                >
                  <ChevronRight
                    size={12}
                    className={
                      selectedBriefId === brief.id
                        ? "text-editorial-red"
                        : "text-ink-muted"
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`truncate font-sans text-[12px] font-medium ${
                        selectedBriefId === brief.id
                          ? "text-editorial-red"
                          : "text-ink"
                      }`}
                    >
                      {brief.title.length > 35
                        ? brief.title.slice(0, 35) + "..."
                        : brief.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono text-[9px] text-ink-muted">
                        <Clock size={9} />
                        {formatShortDate(brief.created_at, timezone)}
                      </span>
                      <Badge
                        variant={
                          brief.brief_type === "on_demand"
                            ? "muted"
                            : brief.brief_type === "weekly"
                              ? "info"
                              : brief.brief_type === "monthly"
                                ? "warning"
                                : "default"
                        }
                      >
                        {TYPE_LABELS[brief.brief_type]}
                      </Badge>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-ink-muted opacity-0 transition-opacity hover:text-editorial-red group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(brief.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Generate New
            </span>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                disabled={isActionRunning || isPending}
                onClick={handleGenerate}
              >
                <Sparkles size={14} />
                Generate Brief
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
