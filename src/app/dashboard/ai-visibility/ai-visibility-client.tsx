"use client";

import { useState } from "react";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate, formatDate, formatDateTime } from "@/lib/utils/format-date";
import {
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { useActionProgress } from "@/components/shared/action-progress";
import { runVisibilityCheck } from "@/lib/actions/ai-visibility";
import type { KeywordVisibility, VisibilityStats } from "@/lib/dal/ai-visibility";
import type { ComparisonTimeRange } from "@/types";
import type { GenericPeriodComparison } from "@/lib/utils/period-comparison";
import { PeriodComparisonBar } from "@/components/editorial/period-comparison-bar";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface AIVisibilityClientProps {
  keywordVisibility: KeywordVisibility[];
  stats: VisibilityStats;
  projectId: string;
  projectDomain: string;
  comparisons: Record<ComparisonTimeRange, GenericPeriodComparison>;
}

/* ------------------------------------------------------------------
   Constants
   ------------------------------------------------------------------ */

const LLM_PROVIDERS = [
  { id: "all", label: "All" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "gemini", label: "Gemini" },
  { id: "perplexity", label: "Perplexity" },
  { id: "deepseek", label: "DeepSeek" },
];

const PROVIDER_DISPLAY: Record<string, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "text-emerald-600" },
  anthropic: { label: "Anthropic", color: "text-amber-600" },
  gemini: { label: "Gemini", color: "text-blue-500" },
  perplexity: { label: "Perplexity", color: "text-indigo-500" },
  deepseek: { label: "DeepSeek", color: "text-sky-500" },
};

/* ------------------------------------------------------------------
   LLM Status Cell
   ------------------------------------------------------------------ */

function LLMStatusCell({
  mentioned,
  cited,
}: {
  mentioned: boolean | undefined;
  cited: boolean | undefined;
}) {
  if (mentioned === undefined) {
    return <MinusCircle size={14} className="text-ink-muted" />;
  }
  if (mentioned && cited) {
    return <CheckCircle2 size={14} className="text-editorial-green" />;
  }
  if (mentioned) {
    return (
      <div className="h-3 w-3 rounded-full border-2 border-editorial-gold bg-editorial-gold/20" />
    );
  }
  return <XCircle size={14} className="text-editorial-red/60" />;
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function AIVisibilityClient({
  keywordVisibility,
  stats,
  projectId,
  projectDomain,
  comparisons,
}: AIVisibilityClientProps) {
  const timezone = useTimezone();
  const [providerFilter, setProviderFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  function handleRunCheck() {
    runAction(
      {
        title: "Running LLM Visibility Check",
        description: "Checking how AI assistants mention your brand across 5 LLM platforms...",
        steps: ["Querying OpenAI", "Querying Anthropic", "Querying Gemini", "Querying Perplexity", "Querying DeepSeek", "Analyzing results"],
        estimatedDuration: 30,
      },
      () => runVisibilityCheck(projectId)
    );
  }

  // Headline stats
  const headlineStats = [
    {
      label: "Avg Visibility Score",
      value: String(stats.avgScore),
      delta: "Out of 100",
      direction: "neutral" as const,
    },
    {
      label: "Keywords Checked",
      value: String(stats.keywordsChecked),
      delta: `${stats.totalChecks} total checks`,
      direction: "neutral" as const,
    },
    {
      label: "LLMs Tracked",
      value: String(stats.totalLLMs),
      delta: "OpenAI, Anthropic, Gemini, Perplexity, DeepSeek",
      direction: "neutral" as const,
    },
    {
      label: "Last Check",
      value: stats.lastChecked
        ? formatShortDate(stats.lastChecked, timezone)
        : "Never",
      delta: stats.lastChecked
        ? formatDateTime(stats.lastChecked, timezone)
        : "Run your first check",
      direction: "neutral" as const,
    },
  ];

  // Filter keywords
  const filtered = keywordVisibility.filter((kv) => {
    if (searchQuery && !kv.keyword.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Compute provider breakdown from all checks
  const providerBreakdown = LLM_PROVIDERS.filter((p) => p.id !== "all").map((provider) => {
    let mentioned = 0;
    let total = 0;
    for (const kv of keywordVisibility) {
      const check = kv.checks.find((c) => c.llm_provider === provider.id);
      if (check) {
        total++;
        if (check.brand_mentioned) mentioned++;
      }
    }
    return { ...provider, mentioned, total };
  });

  if (keywordVisibility.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              AI Visibility Tracker
            </h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Track how AI assistants mention your brand across ChatGPT, Claude,
              Gemini, Perplexity &amp; DeepSeek
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isActionRunning}
            onClick={handleRunCheck}
          >
            <Eye size={14} />
            Run Visibility Check
          </Button>
        </div>
        <EmptyState
          icon={Eye}
          title="No Visibility Data Yet"
          description="Add keywords and run a visibility check to see how AI assistants mention your brand."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Headline Stats */}
      <HeadlineBar stats={headlineStats} />

      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            AI Visibility Tracker
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            Monitoring <span className="font-semibold">{projectDomain}</span>{" "}
            across 5 AI platforms
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isActionRunning}
          onClick={handleRunCheck}
        >
          <Sparkles size={14} />
          Run Visibility Check
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-4">
        <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Provider:
        </span>
        {LLM_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => setProviderFilter(provider.id)}
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
              providerFilter === provider.id
                ? "border-editorial-red bg-editorial-red/5 text-editorial-red"
                : "border-rule bg-surface-card text-ink-muted hover:border-rule-dark hover:text-ink"
            }`}
          >
            {provider.label}
          </button>
        ))}

        <div className="relative ml-auto">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="text"
            placeholder="Search keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 border border-rule bg-surface-card pl-8 pr-3 font-sans text-xs text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none"
          />
        </div>
      </div>

      {/* Period Comparisons */}
      <PeriodComparisonBar comparisons={comparisons} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Visibility Table */}
        <div>
          <ColumnHeader
            title="Keyword Visibility"
            subtitle={`${filtered.length} keywords tracked`}
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="py-2 text-left font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Keyword
                  </th>
                  <th className="px-2 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Score
                  </th>
                  {(providerFilter === "all"
                    ? LLM_PROVIDERS.filter((p) => p.id !== "all")
                    : LLM_PROVIDERS.filter((p) => p.id === providerFilter)
                  ).map((p) => (
                    <th
                      key={p.id}
                      className="px-2 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink"
                    >
                      {p.label}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-right font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Details
                  </th>
                </tr>
              </thead>
                {filtered.map((kv) => {
                  const isExpanded = expandedRow === kv.keyword_id;
                  const providers =
                    providerFilter === "all"
                      ? LLM_PROVIDERS.filter((p) => p.id !== "all")
                      : LLM_PROVIDERS.filter((p) => p.id === providerFilter);

                  return (
                    <tbody key={kv.keyword_id}>
                      <tr className="border-b border-rule hover:bg-surface-cream/50">
                        <td className="py-2.5 pr-4">
                          <span className="font-sans text-[13px] font-medium text-ink">
                            {kv.keyword}
                          </span>
                          {kv.search_volume != null && (
                            <span className="ml-2 font-mono text-[10px] text-ink-muted">
                              {kv.search_volume.toLocaleString()} vol
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <span
                            className={`font-mono text-sm font-bold tabular-nums ${
                              (kv.ai_visibility_score ?? 0) >= 60
                                ? "text-editorial-green"
                                : (kv.ai_visibility_score ?? 0) >= 30
                                  ? "text-editorial-gold"
                                  : "text-editorial-red"
                            }`}
                          >
                            {kv.ai_visibility_score ?? "—"}
                          </span>
                        </td>
                        {providers.map((p) => {
                          const check = kv.checks.find(
                            (c) => c.llm_provider === p.id
                          );
                          return (
                            <td
                              key={p.id}
                              className="px-2 py-2.5 text-center"
                            >
                              <div className="flex items-center justify-center">
                                <LLMStatusCell
                                  mentioned={check?.brand_mentioned}
                                  cited={check?.url_cited}
                                />
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedRow(
                                isExpanded ? null : kv.keyword_id
                              )
                            }
                            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted hover:text-editorial-red"
                          >
                            {isExpanded ? (
                              <ChevronDown size={12} />
                            ) : (
                              <ChevronRight size={12} />
                            )}
                            View
                          </button>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={providers.length + 3}
                            className="border-b border-rule bg-surface-card/50 px-4 py-4"
                          >
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {kv.checks.map((check) => {
                                const display =
                                  PROVIDER_DISPLAY[check.llm_provider];
                                return (
                                  <div
                                    key={check.id}
                                    className="border border-rule bg-surface-card p-3"
                                  >
                                    <div className="mb-2 flex items-center justify-between">
                                      <span
                                        className={`text-[11px] font-bold uppercase tracking-wider ${display?.color ?? "text-ink"}`}
                                      >
                                        {display?.label ?? check.llm_provider}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        {check.brand_mentioned ? (
                                          <Badge variant="success">
                                            Mentioned
                                          </Badge>
                                        ) : (
                                          <Badge variant="danger">
                                            Not Found
                                          </Badge>
                                        )}
                                        {check.url_cited && (
                                          <Badge variant="info">
                                            URL Cited
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    {check.sentiment && (
                                      <div className="mb-2">
                                        <Badge
                                          variant={
                                            check.sentiment === "positive"
                                              ? "success"
                                              : check.sentiment === "negative"
                                                ? "danger"
                                                : "muted"
                                          }
                                        >
                                          {check.sentiment}
                                        </Badge>
                                      </div>
                                    )}
                                    <p className="font-sans text-[11px] leading-relaxed text-ink-secondary">
                                      {check.response_text
                                        ? (() => {
                                            const clean = check.response_text
                                              .replace(/#{1,6}\s*/g, "")
                                              .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
                                              .replace(/`([^`]+)`/g, "$1")
                                              .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                                              .replace(/^[-*]\s+/gm, "- ")
                                              .trim();
                                            return clean.slice(0, 200) + (clean.length > 200 ? "..." : "");
                                          })()
                                        : "No response data"}
                                    </p>
                                    <p className="mt-2 flex items-center gap-1 font-mono text-[9px] text-ink-muted">
                                      <Clock size={9} />
                                      {formatDate(check.checked_at, timezone)}
                                    </p>
                                  </div>
                                );
                              })}
                              {kv.checks.length === 0 && (
                                <p className="col-span-full text-center text-xs text-ink-muted">
                                  No checks run yet for this keyword.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          {/* Provider Breakdown */}
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Provider Breakdown
            </span>
            <div className="mt-3 flex flex-col gap-2">
              {providerBreakdown.map((p) => {
                const display = PROVIDER_DISPLAY[p.id];
                const pct =
                  p.total > 0 ? Math.round((p.mentioned / p.total) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-semibold ${display?.color ?? "text-ink"}`}
                      >
                        {display?.label ?? p.label}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-ink-secondary">
                        {p.mentioned}/{p.total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full bg-rule">
                      <div
                        className="h-full bg-editorial-green transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Legend
            </span>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                <CheckCircle2 size={14} className="text-editorial-green" />
                Mentioned + URL cited
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                <div className="h-3 w-3 rounded-full border-2 border-editorial-gold bg-editorial-gold/20" />
                Mentioned (no URL)
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                <XCircle size={14} className="text-editorial-red/60" />
                Not mentioned
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                <MinusCircle size={14} className="text-ink-muted" />
                Not checked
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Actions
            </span>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                disabled={isActionRunning}
                onClick={handleRunCheck}
              >
                <Eye size={14} />
                Run Full Check
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
