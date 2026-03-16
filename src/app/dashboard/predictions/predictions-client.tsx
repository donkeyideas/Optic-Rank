"use client";

import { useState, useTransition } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ArrowUpDown,
  Target,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { PredictionChart } from "@/components/charts/prediction-chart";
import { generatePredictions } from "@/lib/actions/predictions";
import type { PredictionWithKeyword, PredictionStats } from "@/lib/dal/predictions";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface PredictionsClientProps {
  predictions: PredictionWithKeyword[];
  stats: PredictionStats;
  projectId: string;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function directionOf(p: PredictionWithKeyword): "improving" | "declining" | "stable" {
  // Prefer stored direction from AI estimation
  if (p.stored_direction) return p.stored_direction;
  // Fallback: calculate from position diff
  const diff = p.predicted_position - (p.current_position ?? p.predicted_position);
  if (diff <= -2) return "improving";
  if (diff >= 2) return "declining";
  return "stable";
}

function DirectionIcon({ direction }: { direction: "improving" | "declining" | "stable" }) {
  switch (direction) {
    case "improving":
      return <TrendingUp size={14} className="text-editorial-green" />;
    case "declining":
      return <TrendingDown size={14} className="text-editorial-red" />;
    case "stable":
      return <Minus size={14} className="text-ink-muted" />;
  }
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-rule">
        <div
          className={`h-full transition-all ${
            pct >= 70
              ? "bg-editorial-green"
              : pct >= 40
                ? "bg-editorial-gold"
                : "bg-editorial-red"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-ink-muted">
        {pct}%
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function PredictionsClient({
  predictions,
  stats,
  projectId,
}: PredictionsClientProps) {
  const [tab, setTab] = useState<"all" | "improving" | "declining">("all");
  const [sortBy, setSortBy] = useState<"confidence" | "change" | "volume">("confidence");
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  function handleGenerate() {
    setIsGenerating(true);
    setStatusMsg(null);
    startTransition(async () => {
      const result = await generatePredictions(projectId);
      if ("error" in result) {
        setStatusMsg(`Error: ${result.error}`);
      } else {
        setStatusMsg(`Generated ${result.predicted} predictions`);
      }
      setIsGenerating(false);
    });
  }

  // Headline stats
  const headlineStats = [
    {
      label: "Total Predictions",
      value: String(stats.total),
      delta: "Keywords analyzed",
      direction: "neutral" as const,
    },
    {
      label: "Avg Confidence",
      value: `${Math.round(stats.avgConfidence * 100)}%`,
      delta: "Model certainty",
      direction: "neutral" as const,
    },
    {
      label: "Opportunities",
      value: String(stats.improving),
      delta: "Predicted to improve",
      direction: "up" as const,
    },
    {
      label: "At Risk",
      value: String(stats.declining),
      delta: "Predicted to decline",
      direction: stats.declining > 0 ? ("down" as const) : ("neutral" as const),
    },
  ];

  // Filter by tab
  const filtered = predictions.filter((p) => {
    if (tab === "all") return true;
    return directionOf(p) === tab;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "confidence":
        return b.confidence - a.confidence;
      case "change":
        return (
          Math.abs(b.predicted_position - (b.current_position ?? 0)) -
          Math.abs(a.predicted_position - (a.current_position ?? 0))
        );
      case "volume":
        return (b.search_volume ?? 0) - (a.search_volume ?? 0);
      default:
        return 0;
    }
  });

  // Chart data
  const chartData = predictions.map((p) => ({
    keyword: p.keyword.length > 20 ? p.keyword.slice(0, 20) + "..." : p.keyword,
    current: p.current_position ?? 0,
    predicted: p.predicted_position,
    change: p.predicted_position - (p.current_position ?? p.predicted_position),
  }));

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              Predictive SEO Engine
            </h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              AI-powered rank forecasting using historical data and statistical
              models
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isGenerating || isPending}
            onClick={handleGenerate}
          >
            <Sparkles size={14} />
            {isGenerating ? "Generating..." : "Generate Predictions"}
          </Button>
        </div>
        {statusMsg && (
          <div
            className={`border px-4 py-2 text-sm ${
              statusMsg.startsWith("Error")
                ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
                : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
            }`}
          >
            {statusMsg}
          </div>
        )}
        <EmptyState
          icon={TrendingUp}
          title="No Predictions Yet"
          description="Add keywords with rank history data, then generate predictions to forecast future positions."
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
            Predictive SEO Engine
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">
            7-day rank forecasts using linear regression &amp; weighted moving
            averages
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isGenerating || isPending}
          onClick={handleGenerate}
        >
          <Sparkles size={14} />
          {isGenerating ? "Generating..." : "Generate Predictions"}
        </Button>
      </div>

      {statusMsg && (
        <div
          className={`border px-4 py-2 text-sm ${
            statusMsg.startsWith("Error")
              ? "border-editorial-red/30 bg-editorial-red/5 text-editorial-red"
              : "border-editorial-green/30 bg-editorial-green/5 text-editorial-green"
          }`}
        >
          {statusMsg}
        </div>
      )}

      {/* Tabs & Sort */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-4">
        <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          Filter:
        </span>
        {(
          [
            { value: "all", label: "All", icon: <BarChart3 size={11} /> },
            { value: "improving", label: "Opportunities", icon: <Target size={11} /> },
            { value: "declining", label: "At Risk", icon: <AlertTriangle size={11} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
              tab === t.value
                ? "border-editorial-red bg-editorial-red/5 text-editorial-red"
                : "border-rule bg-surface-card text-ink-muted hover:border-rule-dark hover:text-ink"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Sort:
          </span>
          {(["confidence", "change", "volume"] as const).map((s) => (
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
        {/* Predictions Table */}
        <div>
          <ColumnHeader
            title="Rank Predictions"
            subtitle={`${sorted.length} keywords with predictions`}
          />

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-ink">
                  <th className="py-2 text-left font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Keyword
                  </th>
                  <th className="px-2 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Current
                  </th>
                  <th className="px-2 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Predicted
                  </th>
                  <th className="px-2 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Change
                  </th>
                  <th className="px-2 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Confidence
                  </th>
                  <th className="px-2 py-2 text-center font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-ink">
                    Direction
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const direction = directionOf(p);
                  const change =
                    p.predicted_position -
                    (p.current_position ?? p.predicted_position);

                  return (
                    <tr
                      key={p.id}
                      className="border-b border-rule hover:bg-surface-cream/50"
                    >
                      <td className="py-2.5 pr-4">
                        <span className="font-sans text-[13px] font-medium text-ink">
                          {p.keyword}
                        </span>
                        {p.search_volume != null && (
                          <span className="ml-2 font-mono text-[10px] text-ink-muted">
                            {p.search_volume.toLocaleString()} vol
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-sm tabular-nums text-ink">
                        {p.current_position != null ? `#${p.current_position}` : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-sm font-bold tabular-nums text-ink">
                        #{p.predicted_position}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${
                            change < 0
                              ? "text-editorial-green"
                              : change > 0
                                ? "text-editorial-red"
                                : "text-ink-muted"
                          }`}
                        >
                          {change < 0 ? change : change > 0 ? `+${change}` : "0"}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex justify-center">
                          <ConfidenceBar confidence={p.confidence} />
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <DirectionIcon direction={direction} />
                          <Badge
                            variant={
                              direction === "improving"
                                ? "success"
                                : direction === "declining"
                                  ? "danger"
                                  : "muted"
                            }
                          >
                            {direction}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          {/* Chart */}
          <div className="border border-rule bg-surface-card p-4">
            <PredictionChart data={chartData} />
          </div>

          {/* Summary */}
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Prediction Summary
            </span>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-[12px] text-ink-secondary">
                  <TrendingUp size={12} className="text-editorial-green" />
                  Improving
                </span>
                <Badge variant="success">{stats.improving}</Badge>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-[12px] text-ink-secondary">
                  <TrendingDown size={12} className="text-editorial-red" />
                  Declining
                </span>
                <Badge variant="danger">{stats.declining}</Badge>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="flex items-center gap-2 text-[12px] text-ink-secondary">
                  <Minus size={12} className="text-ink-muted" />
                  Stable
                </span>
                <Badge variant="muted">{stats.stable}</Badge>
              </div>
            </div>
            {stats.accuracyRate != null && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Historical Accuracy
                </span>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-ink">
                  {stats.accuracyRate}%
                </p>
                <p className="text-[10px] text-ink-muted">
                  Predictions within 3 positions
                </p>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Actions
            </span>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                disabled={isGenerating || isPending}
                onClick={handleGenerate}
              >
                <Sparkles size={14} />
                {isGenerating ? "Generating..." : "Regenerate Predictions"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
