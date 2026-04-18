"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Zap,
  FileText,
  Wrench,
  Link2,
  Eye,
  DollarSign,
  Users,
  Gauge,
  ExternalLink,
  Check,
  X,
  Loader2,
  Sparkles,
  AlertTriangle,
  ClipboardCopy,
} from "lucide-react";
import { HeadlineBar, type HeadlineStat } from "@/components/editorial/headline-bar";
import type { Recommendation, RecommendationCategory } from "@/types";
import type { RecommendationStats } from "@/lib/dal/recommendations";
import {
  generateRecommendations,
  dismissRecommendation,
  completeRecommendation,
} from "@/lib/actions/recommendations";
import { useActionProgress } from "@/components/shared/action-progress";

// ── Category config ────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<
  RecommendationCategory,
  { label: string; icon: typeof Lightbulb; color: string }
> = {
  quick_wins: { label: "Quick Wins", icon: Zap, color: "text-editorial-gold" },
  content: { label: "Content", icon: FileText, color: "text-blue-500" },
  technical: { label: "Technical", icon: Wrench, color: "text-editorial-red" },
  backlinks: { label: "Backlinks", icon: Link2, color: "text-purple-500" },
  ai_visibility: { label: "Visibility", icon: Eye, color: "text-cyan-500" },
  revenue: { label: "Revenue", icon: DollarSign, color: "text-editorial-green" },
  competitive: { label: "Competitive", icon: Users, color: "text-orange-500" },
  performance: { label: "Performance", icon: Gauge, color: "text-pink-500" },
};

const IMPACT_STYLES: Record<string, string> = {
  high: "bg-editorial-red/10 text-editorial-red border-editorial-red/30",
  medium: "bg-editorial-gold/10 text-editorial-gold border-editorial-gold/30",
  low: "bg-ink-muted/10 text-ink-muted border-ink-muted/30",
};

const EFFORT_STYLES: Record<string, string> = {
  low: "bg-editorial-green/10 text-editorial-green border-editorial-green/30",
  medium: "bg-editorial-gold/10 text-editorial-gold border-editorial-gold/30",
  high: "bg-editorial-red/10 text-editorial-red border-editorial-red/30",
};

type FilterCategory = "all" | RecommendationCategory;

interface Props {
  projectId: string;
  projectDomain: string;
  recommendations: Recommendation[];
  stats: RecommendationStats;
}

export function RecommendationsClient({
  projectId,
  projectDomain,
  recommendations: initialRecs,
  stats: initialStats,
}: Props) {
  const [recommendations, setRecommendations] = useState(initialRecs);
  const [stats, setStats] = useState(initialStats);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("all");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  // ── Stats for HeadlineBar ─────────────────────────────────────
  const headlineStats: HeadlineStat[] = [
    {
      label: "Active Recommendations",
      value: stats.totalActive,
      delta: stats.totalActive > 0 ? "Actionable" : "None yet",
      direction: stats.totalActive > 0 ? "up" : "neutral",
    },
    {
      label: "High Impact",
      value: stats.highImpactCount,
      delta: stats.highImpactCount > 0 ? "Priority items" : "–",
      direction: stats.highImpactCount > 0 ? "up" : "neutral",
    },
    {
      label: "Quick Wins",
      value: stats.quickWinCount,
      delta: stats.quickWinCount > 0 ? "Low effort" : "–",
      direction: stats.quickWinCount > 0 ? "up" : "neutral",
    },
    {
      label: "Completed",
      value: stats.completedCount,
      delta: stats.lastGeneratedAt
        ? `Last: ${new Date(stats.lastGeneratedAt).toLocaleDateString()}`
        : "Never generated",
      direction: stats.completedCount > 0 ? "up" : "neutral",
    },
  ];

  // ── Filter recommendations ───────────────────────────────────
  const filtered =
    activeCategory === "all"
      ? recommendations
      : recommendations.filter((r) => r.category === activeCategory);

  // ── Generate ─────────────────────────────────────────────────
  function handleGenerate() {
    setError(null);
    runAction(
      {
        title: "Generating Recommendations",
        description: "Analyzing your SEO data and generating actionable recommendations...",
        steps: ["Collecting SEO metrics", "Analyzing keyword performance", "Evaluating site health", "Benchmarking competitors", "Generating action items"],
        estimatedDuration: 30,
      },
      async () => {
        const result = await generateRecommendations(projectId);
        if (!("error" in result)) {
          window.location.reload();
        }
        return result;
      }
    );
  }

  // ── Dismiss ──────────────────────────────────────────────────
  function handleDismiss(id: string) {
    startTransition(async () => {
      const result = await dismissRecommendation(id);
      if ("success" in result) {
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        setStats((prev) => ({ ...prev, totalActive: prev.totalActive - 1 }));
      }
    });
  }

  // ── Complete ─────────────────────────────────────────────────
  function handleComplete(id: string) {
    startTransition(async () => {
      const result = await completeRecommendation(id);
      if ("success" in result) {
        setRecommendations((prev) => prev.filter((r) => r.id !== id));
        setStats((prev) => ({
          ...prev,
          totalActive: prev.totalActive - 1,
          completedCount: prev.completedCount + 1,
        }));
      }
    });
  }

  // ── Category counts for sidebar ──────────────────────────────
  const categoryCounts: Record<string, number> = {};
  for (const r of recommendations) {
    categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1;
  }

  // ── Copy all recommendations ───────────────────────────────
  function handleCopyAll() {
    const lines: string[] = [
      `Smart Recommendations — ${projectDomain}`,
      `Active: ${stats.totalActive} | High Impact: ${stats.highImpactCount} | Quick Wins: ${stats.quickWinCount} | Completed: ${stats.completedCount}`,
      "",
    ];

    for (const rec of recommendations) {
      const cfg = CATEGORY_CONFIG[rec.category];
      lines.push(`[${cfg.label.toUpperCase()}] ${rec.title}  (Impact: ${rec.impact} | Effort: ${rec.effort})`);
      lines.push(`  ${rec.description}`);
      if (rec.expected_result) lines.push(`  Expected: ${rec.expected_result}`);
      if (rec.data_sources.length > 0) lines.push(`  Sources: ${rec.data_sources.join(", ")}`);
      lines.push("");
    }

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Headline Stats */}
      <HeadlineBar stats={headlineStats} />

      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-rule pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink-muted">
            Intelligence Report
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-ink">
            Smart Recommendations
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            AI-powered analysis across all your data for{" "}
            <span className="font-semibold text-ink">{projectDomain}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {recommendations.length > 0 && (
            <button
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 border border-rule px-4 py-2.5 font-sans text-[10px] font-bold uppercase tracking-widest text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink"
            >
              {copied ? <Check size={12} className="text-editorial-green" /> : <ClipboardCopy size={12} />}
              {copied ? "Copied!" : "Copy All"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isActionRunning || isPending}
            className="inline-flex items-center gap-2 bg-editorial-red px-5 py-2.5 font-sans text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-editorial-red/90 disabled:opacity-50"
          >
            <Sparkles size={14} />
            Generate Recommendations
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-editorial-gold" />
        <p className="font-sans text-[11px] leading-relaxed text-ink-secondary">
          <span className="font-semibold text-editorial-gold">Disclaimer:</span>{" "}
          These recommendations are AI-generated estimates based on your current data.
          Actual results may vary based on competition, algorithm changes, market conditions,
          and implementation quality. Nothing is promised or guaranteed.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
          {error}
        </div>
      )}

      {/* Category Filter Tabs */}
      {recommendations.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b border-rule pb-3">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              activeCategory === "all"
                ? "bg-ink text-surface-cream"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            All ({recommendations.length})
          </button>
          {(Object.keys(CATEGORY_CONFIG) as RecommendationCategory[]).map((cat) => {
            const count = categoryCounts[cat] ?? 0;
            if (count === 0) return null;
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                  activeCategory === cat
                    ? "bg-ink text-surface-cream"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                <Icon size={11} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cards (2/3) */}
        <div className="space-y-4 lg:col-span-2">
          {filtered.length === 0 && !isActionRunning && (
            <div className="flex flex-col items-center justify-center border border-rule bg-surface-card py-16 text-center">
              <Lightbulb size={40} className="mb-3 text-ink-muted" />
              <h3 className="font-serif text-lg font-bold text-ink">
                No Recommendations Yet
              </h3>
              <p className="mt-1 max-w-sm text-sm text-ink-secondary">
                Click &quot;Generate Recommendations&quot; to analyze your project data
                and get actionable insights with expected impact estimates.
              </p>
            </div>
          )}

          {filtered.map((rec) => {
            const cfg = CATEGORY_CONFIG[rec.category];
            const Icon = cfg.icon;
            return (
              <article
                key={rec.id}
                className="border border-rule bg-surface-card p-4 transition-colors hover:border-ink/20"
              >
                {/* Top row: category + badges */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-[0.15em] ${cfg.color}`}>
                    <Icon size={10} />
                    {cfg.label}
                  </span>
                  <div className="flex gap-2">
                    <span className={`border px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider ${IMPACT_STYLES[rec.impact]}`}>
                      Impact: {rec.impact}
                    </span>
                    <span className={`border px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider ${EFFORT_STYLES[rec.effort]}`}>
                      Effort: {rec.effort}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="mt-2 font-serif text-base font-bold leading-snug text-ink">
                  {rec.title}
                </h3>

                {/* Description */}
                <p className="mt-1.5 font-sans text-[13px] leading-relaxed text-ink-secondary">
                  {rec.description}
                </p>

                {/* Expected Result */}
                {rec.expected_result && (
                  <div className="mt-3 border-l-2 border-editorial-green bg-editorial-green/5 px-3 py-2">
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-editorial-green">
                      Expected Outcome
                    </span>
                    <p className="mt-0.5 font-sans text-[12px] leading-relaxed text-ink-secondary">
                      {rec.expected_result}
                    </p>
                  </div>
                )}

                {/* Data sources */}
                {rec.data_sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rec.data_sources.map((src) => (
                      <span
                        key={src}
                        className="bg-surface-cream px-1.5 py-0.5 font-mono text-[9px] text-ink-muted dark:bg-surface-card"
                      >
                        {src}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions row */}
                <div className="mt-3 flex items-center gap-2 border-t border-rule pt-3">
                  {rec.linked_page && (
                    <Link
                      href={rec.linked_page}
                      className="inline-flex items-center gap-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-editorial-red transition-colors hover:text-editorial-red/80"
                    >
                      <ExternalLink size={12} />
                      {rec.linked_label ?? "Take Action"}
                    </Link>
                  )}
                  <div className="ml-auto flex gap-3">
                    <button
                      onClick={() => handleComplete(rec.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 font-sans text-[11px] text-editorial-green transition-colors hover:text-editorial-green/80 disabled:opacity-50"
                    >
                      <Check size={12} />
                      Done
                    </button>
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 font-sans text-[11px] text-ink-muted transition-colors hover:text-editorial-red disabled:opacity-50"
                    >
                      <X size={12} />
                      Dismiss
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Sidebar (1/3) */}
        <div className="space-y-4">
          {/* Category Breakdown */}
          <div className="border border-rule bg-surface-card p-4">
            <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Category Breakdown
            </h4>
            <div className="mt-3 space-y-2">
              {(Object.keys(CATEGORY_CONFIG) as RecommendationCategory[]).map((cat) => {
                const count = categoryCounts[cat] ?? 0;
                if (count === 0) return null;
                const cfg = CATEGORY_CONFIG[cat];
                const Icon = cfg.icon;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat === activeCategory ? "all" : cat)}
                    className="flex w-full items-center justify-between py-1 text-left transition-colors hover:text-ink"
                  >
                    <span className={`inline-flex items-center gap-1.5 font-sans text-xs ${cfg.color}`}>
                      <Icon size={12} />
                      {cfg.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-ink">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Impact / Effort Matrix */}
          <div className="border border-rule bg-surface-card p-4">
            <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Impact / Effort Matrix
            </h4>
            <div className="mt-3 grid grid-cols-4 gap-px text-center text-[10px]">
              {/* Header row */}
              <div />
              <div className="py-1 font-bold text-ink-muted">Low</div>
              <div className="py-1 font-bold text-ink-muted">Med</div>
              <div className="py-1 font-bold text-ink-muted">High</div>
              {/* High impact */}
              <div className="py-1 text-left font-bold text-editorial-red">High</div>
              {(["low", "medium", "high"] as const).map((eff) => {
                const count = recommendations.filter(
                  (r) => r.impact === "high" && r.effort === eff
                ).length;
                return (
                  <div
                    key={`high-${eff}`}
                    className={`py-1 font-mono font-bold ${count > 0 ? "text-ink" : "text-ink-muted/30"}`}
                  >
                    {count}
                  </div>
                );
              })}
              {/* Medium impact */}
              <div className="py-1 text-left font-bold text-editorial-gold">Med</div>
              {(["low", "medium", "high"] as const).map((eff) => {
                const count = recommendations.filter(
                  (r) => r.impact === "medium" && r.effort === eff
                ).length;
                return (
                  <div
                    key={`med-${eff}`}
                    className={`py-1 font-mono font-bold ${count > 0 ? "text-ink" : "text-ink-muted/30"}`}
                  >
                    {count}
                  </div>
                );
              })}
              {/* Low impact */}
              <div className="py-1 text-left font-bold text-ink-muted">Low</div>
              {(["low", "medium", "high"] as const).map((eff) => {
                const count = recommendations.filter(
                  (r) => r.impact === "low" && r.effort === eff
                ).length;
                return (
                  <div
                    key={`low-${eff}`}
                    className={`py-1 font-mono font-bold ${count > 0 ? "text-ink" : "text-ink-muted/30"}`}
                  >
                    {count}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] text-ink-muted">
              ← Effort →
            </p>
          </div>

          {/* Priority Legend */}
          <div className="border border-rule bg-surface-card p-4">
            <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              How to Read
            </h4>
            <div className="mt-3 space-y-2 text-[11px] text-ink-secondary">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-2 w-2 shrink-0 bg-editorial-red" />
                <span><strong className="text-ink">High Impact</strong> — Significant effect on rankings, traffic, or revenue</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-2 w-2 shrink-0 bg-editorial-green" />
                <span><strong className="text-ink">Low Effort</strong> — Quick to implement, immediate value</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-2 w-2 shrink-0 bg-editorial-gold" />
                <span><strong className="text-ink">Expected Outcome</strong> — Estimated results if implemented</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Disclaimer */}
      {recommendations.length > 0 && (
        <div className="border-t border-rule pt-4 text-center">
          <p className="font-sans text-[10px] text-ink-muted">
            Recommendations are generated using rule-based heuristics and AI analysis.
            All projections are estimates — actual results depend on implementation,
            competition, and search engine algorithm changes. Nothing is promised or guaranteed.
          </p>
        </div>
      )}
    </div>
  );
}
