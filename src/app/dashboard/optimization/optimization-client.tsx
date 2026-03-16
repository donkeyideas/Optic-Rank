"use client";

import { useState, useTransition, useMemo } from "react";
import {
  DollarSign,
  Target,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createConversionGoal,
  deleteConversionGoal,
} from "@/lib/actions/optimization";
import type { CroStats, KeywordWithRevenue } from "@/lib/dal/optimization";
import type { ConversionGoal } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface OptimizationClientProps {
  projectId: string;
  projectDomain: string;
  conversionGoals: ConversionGoal[];
  keywordsWithRevenue: KeywordWithRevenue[];
  croStats: CroStats;
  keywords: {
    id: string;
    keyword: string;
    current_position: number | null;
    search_volume: number | null;
    intent: string | null;
  }[];
}

/* ------------------------------------------------------------------
   Constants
   ------------------------------------------------------------------ */

const GOAL_TYPES = [
  { value: "page_visit", label: "Page Visit" },
  { value: "form_submit", label: "Form Submit" },
  { value: "purchase", label: "Purchase" },
  { value: "signup", label: "Signup" },
  { value: "download", label: "Download" },
  { value: "custom", label: "Custom" },
];

/* ------------------------------------------------------------------
   Score Gauge
   ------------------------------------------------------------------ */

function ScoreGauge({
  score,
  label,
  size = 120,
  strokeWidth = 8,
}: {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80
      ? "var(--color-editorial-green)"
      : score >= 50
        ? "var(--color-editorial-gold)"
        : "var(--color-editorial-red)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-rule)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-3xl font-bold text-ink">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Funnel Row
   ------------------------------------------------------------------ */

function FunnelRow({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 shrink-0 text-[12px] font-semibold text-ink-secondary">{label}</span>
      <div className="flex-1">
        <div className="relative h-7 w-full bg-surface-raised">
          <div className={cn("flex h-full items-center px-3 text-[11px] font-bold text-white transition-all", color)}
            style={{ width: `${Math.max(pct, 8)}%` }}>
            {value}
          </div>
        </div>
      </div>
      <span className="w-12 text-right font-mono text-[12px] text-ink-muted">{pct}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

export function OptimizationClient({
  projectId,
  projectDomain,
  conversionGoals,
  keywordsWithRevenue,
  croStats,
  keywords,
}: OptimizationClientProps) {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // CRO score
  const croScore = useMemo(() => {
    if (keywords.length === 0) return 0;
    const withPos = keywords.filter((k) => k.current_position !== null && k.current_position <= 10).length;
    return Math.min(Math.round((withPos / keywords.length) * 100), 100);
  }, [keywords]);

  // Funnel
  const totalKw = keywords.length;
  const ranking = keywords.filter((k) => k.current_position !== null && k.current_position <= 20).length;
  const converting = keywordsWithRevenue.filter((k) => k.estimatedRevenue > 0).length;
  const rankingPct = totalKw > 0 ? Math.round((ranking / totalKw) * 100) : 0;
  const convertingPct = totalKw > 0 ? Math.round((converting / totalKw) * 100) : 0;

  // Opportunities: keywords pos 6+ with potential
  const topPerformers = keywordsWithRevenue.filter((kw) => kw.currentPosition !== null && kw.currentPosition <= 5);
  const opportunities = keywordsWithRevenue.filter((kw) => kw.currentPosition !== null && kw.currentPosition > 5);

  const handleAddGoal = (formData: FormData) => {
    startTransition(async () => {
      await createConversionGoal(projectId, formData);
      setShowGoalForm(false);
      window.location.reload();
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    startTransition(async () => {
      await deleteConversionGoal(goalId);
      window.location.reload();
    });
  };

  const headlineStats = [
    {
      label: "Est. Revenue",
      value: croStats.estimatedMonthlyRevenue > 0 ? `$${croStats.estimatedMonthlyRevenue.toLocaleString()}` : "$0",
      delta: "Monthly estimate",
      direction: croStats.estimatedMonthlyRevenue > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Top Performers",
      value: String(topPerformers.length),
      delta: "Position 1–5",
      direction: topPerformers.length > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Opportunities",
      value: String(opportunities.length),
      delta: "Position 6+",
      direction: opportunities.length > 0 ? ("up" as const) : ("neutral" as const),
    },
    {
      label: "Conv. Goals",
      value: String(conversionGoals.length),
      delta: conversionGoals.length > 0 ? "Active" : "None set",
      direction: conversionGoals.length > 0 ? ("up" as const) : ("neutral" as const),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <HeadlineBar stats={headlineStats} />

      {/* Header */}
      <div className="border-b border-rule pb-4">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-editorial-red" />
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Optimization</h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">
              Revenue attribution &amp; conversion rate optimization for{" "}
              <span className="font-semibold">{projectDomain}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Score + Stats Row */}
      <div className="flex flex-col items-center gap-6 border border-rule bg-surface-card p-6 md:flex-row">
        <ScoreGauge score={croScore} label="CRO Score" size={140} strokeWidth={10} />
        <div className="grid flex-1 grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-3">
          <div className="border-t-2 border-editorial-green bg-surface-card px-4 py-3">
            <p className="text-[10px] font-medium text-ink-muted">Est. Monthly Revenue</p>
            <p className="font-serif text-xl font-bold text-ink">${croStats.estimatedMonthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="border-t-2 border-editorial-gold bg-surface-card px-4 py-3">
            <p className="text-[10px] font-medium text-ink-muted">Conversion Goals</p>
            <p className="font-serif text-xl font-bold text-ink">{croStats.goalsCount}</p>
          </div>
          <div className="border-t-2 border-editorial-red bg-surface-card px-4 py-3">
            <p className="text-[10px] font-medium text-ink-muted">High-Value Gaps</p>
            <p className="font-serif text-xl font-bold text-ink">{croStats.highValueGaps}</p>
          </div>
        </div>
      </div>

      {/* Conversion Goals */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule px-5 py-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Conversion Goals</h3>
          <button type="button" onClick={() => setShowGoalForm(!showGoalForm)}
            className="flex items-center gap-1 text-[11px] font-semibold text-editorial-red hover:underline">
            <Plus size={12} /> Add Goal
          </button>
        </div>

        {showGoalForm && (
          <form action={handleAddGoal} className="border-b border-rule bg-surface-raised/50 px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Name</label>
                <input name="name" type="text" required placeholder="e.g. Newsletter Signup"
                  className="w-full border border-rule bg-surface-card px-3 py-1.5 text-[12px] text-ink focus:border-editorial-red focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Type</label>
                <select name="goal_type" required
                  className="w-full border border-rule bg-surface-card px-3 py-1.5 text-[12px] text-ink focus:border-editorial-red focus:outline-none">
                  {GOAL_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Value ($)</label>
                <input name="estimated_value" type="number" step="0.01" defaultValue="10"
                  className="w-full border border-rule bg-surface-card px-3 py-1.5 text-[12px] text-ink focus:border-editorial-red focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Conv. Rate (%)</label>
                <input name="estimated_conversion_rate" type="number" step="0.001" defaultValue="0.02"
                  className="w-full border border-rule bg-surface-card px-3 py-1.5 text-[12px] text-ink focus:border-editorial-red focus:outline-none" />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                {isPending ? <Loader2 size={12} className="mr-1 animate-spin" /> : null} Save Goal
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowGoalForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        {conversionGoals.length > 0 ? (
          <div className="divide-y divide-rule">
            {conversionGoals.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-[12px] font-semibold text-ink">{goal.name}</span>
                  <span className="ml-2 text-[10px] text-ink-muted capitalize">{goal.goal_type.replace("_", " ")}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-ink-muted">${Number(goal.estimated_value).toFixed(2)} / conv</span>
                  <span className="text-[11px] text-ink-muted">{(Number(goal.estimated_conversion_rate) * 100).toFixed(1)}% rate</span>
                  <button type="button" onClick={() => handleDeleteGoal(goal.id)} disabled={isPending}
                    className="text-ink-muted hover:text-editorial-red transition-colors disabled:opacity-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <DollarSign size={24} className="mx-auto mb-2 text-ink-muted/30" />
            <p className="text-[12px] text-ink-muted">No conversion goals set. Add goals to see revenue estimates.</p>
          </div>
        )}
      </div>

      {/* Conversion Funnel */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule px-5 py-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Conversion Funnel</h3>
        </div>
        <div className="space-y-3 px-5 py-4">
          <FunnelRow label="Keywords Tracked" value={totalKw} pct={100} color="bg-editorial-red" />
          <FunnelRow label="Ranking (Top 20)" value={ranking} pct={rankingPct} color="bg-editorial-gold" />
          <FunnelRow label="Generating Revenue" value={converting} pct={convertingPct} color="bg-editorial-green" />
        </div>
      </div>

      {/* Revenue by Keyword */}
      {keywordsWithRevenue.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule px-5 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">Revenue by Keyword</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  <th className="px-4 py-2.5">Keyword</th>
                  <th className="px-4 py-2.5 text-right hidden sm:table-cell">Volume</th>
                  <th className="px-4 py-2.5 text-center">Pos</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">CTR</th>
                  <th className="px-4 py-2.5 text-right hidden md:table-cell">Traffic</th>
                  <th className="px-4 py-2.5 text-right">Est. Rev</th>
                </tr>
              </thead>
              <tbody>
                {keywordsWithRevenue.slice(0, 15).map((kw) => (
                  <tr key={kw.keywordId} className="border-b border-rule last:border-0">
                    <td className="px-4 py-2.5 text-[12px] font-semibold text-ink">{kw.keyword}</td>
                    <td className="px-4 py-2.5 text-right text-[11px] text-ink-muted hidden sm:table-cell">{kw.searchVolume.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center text-[12px] font-mono text-ink-secondary">{kw.currentPosition}</td>
                    <td className="px-4 py-2.5 text-right text-[11px] text-ink-muted hidden md:table-cell">{kw.estimatedCtr}%</td>
                    <td className="px-4 py-2.5 text-right text-[11px] text-ink-muted hidden md:table-cell">{kw.estimatedTraffic.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-[12px] font-bold text-editorial-green">
                      ${kw.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CRO Opportunities */}
      {opportunities.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule px-5 py-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">CRO Opportunities — High-Value Gaps</h3>
            <span className="text-[10px] font-semibold text-editorial-red">{opportunities.length} keywords</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  <th className="px-4 py-2.5">Keyword</th>
                  <th className="px-4 py-2.5 text-right hidden sm:table-cell">Volume</th>
                  <th className="px-4 py-2.5 text-center">Pos</th>
                  <th className="px-4 py-2.5 text-right">Potential +$</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.slice(0, 15).map((kw) => {
                  const avgRate = conversionGoals.length > 0
                    ? conversionGoals.reduce((s, g) => s + Number(g.estimated_conversion_rate), 0) / conversionGoals.length
                    : 0.02;
                  const avgValue = conversionGoals.length > 0
                    ? conversionGoals.reduce((s, g) => s + Number(g.estimated_value), 0) / conversionGoals.length
                    : 10;
                  const potentialRev = kw.searchVolume * 0.11 * avgRate * avgValue;
                  const gap = potentialRev - kw.estimatedRevenue;

                  return (
                    <tr key={kw.keywordId} className="border-b border-rule last:border-0">
                      <td className="px-4 py-2.5 text-[12px] font-semibold text-ink">{kw.keyword}</td>
                      <td className="px-4 py-2.5 text-right text-[11px] text-ink-muted hidden sm:table-cell">{kw.searchVolume.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-center text-[12px] font-mono text-ink-secondary">{kw.currentPosition}</td>
                      <td className="px-4 py-2.5 text-right text-[12px] font-bold text-editorial-amber">
                        +${gap > 0 ? gap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {keywordsWithRevenue.length === 0 && conversionGoals.length === 0 && (
        <div className="border border-rule bg-surface-card px-6 py-10 text-center">
          <DollarSign size={32} className="mx-auto mb-3 text-ink-muted/30" />
          <p className="text-sm font-semibold text-ink">No revenue data yet</p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Add conversion goals and ensure you have keywords with position data to see revenue estimates.
          </p>
        </div>
      )}
    </div>
  );
}
