"use client";

import { useState, useCallback, type ElementType } from "react";
import {
  Copy, Check, Lightbulb, ArrowRight, Trash2,
} from "lucide-react";

/* ------------------------------------------------------------------
   Shared types
   ------------------------------------------------------------------ */

export interface Recommendation {
  id: string;
  priority: "high" | "medium" | "low";
  category: string;
  icon: ElementType;
  item: string;
  action: string;
  where: string;
  estimatedImpact: string;
  details: string;
}

export interface StrategyCard {
  icon: ElementType;
  iconColor: string;
  title: string;
  bullets: Array<{ bold?: string; text: string }>;
}

export interface StrategyStep {
  step: string;
  title: string;
  desc: string;
}

export interface StrategyDoItem {
  text: string;
}

export interface MetricExplainer {
  label: string;
  desc: string;
  color: string;
}

export interface StrategyContent {
  title: string;
  intro: string;
  cards: StrategyCard[];
  steps: StrategyStep[];
  dos: StrategyDoItem[];
  donts: StrategyDoItem[];
  metrics: MetricExplainer[];
}

/* ------------------------------------------------------------------
   Recommendations Tab
   ------------------------------------------------------------------ */

export function RecommendationsTab({
  recommendations,
  itemLabel = "item",
  emptyMessage = "Add data to generate personalized recommendations.",
}: {
  recommendations: Recommendation[];
  itemLabel?: string;
  emptyMessage?: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyOne = useCallback((rec: Recommendation) => {
    const text = `${itemLabel}: "${rec.item}"\nAction: ${rec.action}\nWhere: ${rec.where}\nEstimated Impact: ${rec.estimatedImpact}\nNote: ${rec.details}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [itemLabel]);

  const copyAll = useCallback(() => {
    const text = recommendations
      .map((r, i) => `${i + 1}. [${r.priority.toUpperCase()}] ${r.category}: "${r.item}"\n   Action: ${r.action}\n   Where: ${r.where}\n   Impact: ${r.estimatedImpact}\n   Note: ${r.details}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId("all");
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, [recommendations]);

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="border-t-2 border-b-2 border-rule-dark px-8 py-6 text-center">
          <h2 className="font-serif text-xl font-bold text-ink">No Recommendations Yet</h2>
          <p className="mt-2 font-sans text-[13px] leading-relaxed text-ink-secondary">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const highCount = recommendations.filter((r) => r.priority === "high").length;
  const medCount = recommendations.filter((r) => r.priority === "medium").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-ink">Recommendations</h2>
          <p className="mt-1 max-w-2xl font-sans text-[13px] text-ink-secondary">
            Personalized actions based on your data. Each recommendation tells you what to do, where to do it, and the estimated impact.
          </p>
        </div>
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 border border-rule px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink transition-colors hover:bg-surface-raised"
        >
          {copiedId === "all" ? <Check size={12} className="text-editorial-green" /> : <Copy size={12} />}
          {copiedId === "all" ? "Copied!" : "Copy All"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-rule bg-surface-card p-3 text-center">
          <div className="font-mono text-2xl font-bold text-ink">{recommendations.length}</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Total Actions</div>
        </div>
        <div className="border border-editorial-red/30 bg-editorial-red/5 p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-red">{highCount}</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">High Priority</div>
        </div>
        <div className="border border-editorial-gold/30 bg-editorial-gold/5 p-3 text-center">
          <div className="font-mono text-2xl font-bold text-editorial-gold">{medCount}</div>
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Medium Priority</div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {recommendations.map((rec) => {
          const Icon = rec.icon;
          const pStyles = { high: "border-l-editorial-red", medium: "border-l-editorial-gold", low: "border-l-ink-muted" };
          const pBadge = { high: "bg-editorial-red/10 text-editorial-red", medium: "bg-editorial-gold/10 text-editorial-gold", low: "bg-ink/10 text-ink-muted" };
          return (
            <div key={rec.id} className={`border border-rule border-l-[3px] ${pStyles[rec.priority]} bg-surface-card`}>
              <div className="flex items-start justify-between gap-3 border-b border-rule/50 px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-surface-raised">
                    <Icon size={16} className="text-ink" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${pBadge[rec.priority]}`}>{rec.priority}</span>
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-ink-muted">{rec.category}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-[13px] font-bold text-ink truncate">{rec.item}</p>
                  </div>
                </div>
                <button onClick={() => copyOne(rec)} className="shrink-0 flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-ink-muted transition-colors hover:text-ink" title="Copy recommendation">
                  {copiedId === rec.id ? <Check size={12} className="text-editorial-green" /> : <Copy size={12} />}
                </button>
              </div>
              <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">What to Do</span>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{rec.action}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-gold">Where to Do It</span>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{rec.where}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">Estimated Impact</span>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{rec.estimatedImpact}</p>
                </div>
              </div>
              <div className="border-t border-rule/50 bg-surface-raised/50 px-5 py-2.5">
                <p className="text-[11px] text-ink-muted"><Lightbulb size={11} className="mr-1 inline" />{rec.details}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Strategy Guide Tab
   ------------------------------------------------------------------ */

export function StrategyGuideTab({ content }: { content: StrategyContent }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="border-b border-rule pb-6">
        <h2 className="font-serif text-xl font-bold text-ink">{content.title}</h2>
        <p className="mt-2 max-w-3xl font-sans text-[13px] leading-relaxed text-ink-secondary">{content.intro}</p>
      </div>

      {/* Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {content.cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="border border-rule bg-surface-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon size={18} className={card.iconColor} />
                <h3 className="font-serif text-base font-bold text-ink">{card.title}</h3>
              </div>
              <ul className="flex flex-col gap-2 text-[13px] text-ink-secondary">
                {card.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={`shrink-0 font-bold ${card.iconColor}`}>&bull;</span>
                    {b.bold ? <span><strong className="text-ink">{b.bold}</strong> &mdash; {b.text}</span> : <span>{b.text}</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Steps */}
      <div className="border border-rule bg-surface-card p-6">
        <h3 className="font-serif text-lg font-bold text-ink mb-4">Step-by-Step Guide</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {content.steps.map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-editorial-red text-[12px] font-bold text-white">{item.step}</div>
              <div>
                <h4 className="font-sans text-[13px] font-bold text-ink">{item.title}</h4>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-secondary">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Do / Don't */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-editorial-green/20 bg-editorial-green/5 p-5">
          <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink mb-3">
            <Lightbulb size={16} className="text-editorial-green" /> Do This
          </h3>
          <ul className="flex flex-col gap-2 text-[12px] text-ink-secondary">
            {content.dos.map((d, i) => (
              <li key={i} className="flex gap-2"><Check size={14} className="shrink-0 text-editorial-green" />{d.text}</li>
            ))}
          </ul>
        </div>
        <div className="border border-editorial-red/20 bg-editorial-red/5 p-5">
          <h3 className="flex items-center gap-2 font-serif text-base font-bold text-ink mb-3">
            <Trash2 size={16} className="text-editorial-red" /> Avoid This
          </h3>
          <ul className="flex flex-col gap-2 text-[12px] text-ink-secondary">
            {content.donts.map((d, i) => (
              <li key={i} className="flex gap-2"><ArrowRight size={14} className="shrink-0 text-editorial-red" />{d.text}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metrics */}
      {content.metrics.length > 0 && (
        <div className="border border-rule bg-surface-card p-6">
          <h3 className="font-serif text-lg font-bold text-ink mb-4">Understanding Your Metrics</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.metrics.map((m) => (
              <div key={m.label} className="flex flex-col gap-1">
                <span className={`text-[11px] font-bold uppercase tracking-[0.1em] ${m.color}`}>{m.label}</span>
                <p className="text-[12px] leading-relaxed text-ink-secondary">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
