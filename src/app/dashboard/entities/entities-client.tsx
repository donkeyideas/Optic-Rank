"use client";

import { useState, useTransition } from "react";
import {
  Network,
  Sparkles,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Users,
  Building2,
  Package,
  MapPin,
  Lightbulb,
  Cpu,
  Calendar,
  Tag,
  HelpCircle,
  Target,
} from "lucide-react";
import { useActionProgress } from "@/components/shared/action-progress";
import { HeadlineBar } from "@/components/editorial/headline-bar";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityCoverageChart } from "@/components/charts/entity-coverage-chart";
import { extractProjectEntities, deleteEntity, runEntityGapAnalysis } from "@/lib/actions/entities";
import type { Entity, EntityType } from "@/types";
import type { EntityStats } from "@/lib/dal/entities";

interface EntitiesClientProps {
  entities: Entity[];
  stats: EntityStats;
  coverage: Array<{
    page_id: string;
    page_title: string;
    page_url: string;
    entity_count: number;
    entity_coverage: number;
  }>;
  projectId: string;
}

const TYPE_ICONS: Record<EntityType, React.ReactNode> = {
  person: <Users size={12} />,
  organization: <Building2 size={12} />,
  product: <Package size={12} />,
  place: <MapPin size={12} />,
  concept: <Lightbulb size={12} />,
  technology: <Cpu size={12} />,
  event: <Calendar size={12} />,
  brand: <Tag size={12} />,
  other: <HelpCircle size={12} />,
};

const TYPE_BADGE_VARIANT: Record<EntityType, "default" | "success" | "warning" | "danger" | "info" | "muted"> = {
  person: "info",
  organization: "default",
  product: "success",
  place: "warning",
  concept: "muted",
  technology: "info",
  event: "warning",
  brand: "success",
  other: "muted",
};

const ALL_TYPES: EntityType[] = [
  "person", "organization", "product", "place", "concept",
  "technology", "event", "brand", "other",
];

export function EntitiesClient({ entities, stats, coverage, projectId }: EntitiesClientProps) {
  const [typeFilter, setTypeFilter] = useState<EntityType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const { runAction, isRunning: isActionRunning } = useActionProgress();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [gapRecs, setGapRecs] = useState<string[]>([]);

  function handleExtract() {
    runAction(
      {
        title: "Extracting Entities",
        description: "Analyzing your content to identify and extract key entities...",
        steps: ["Scanning content pages", "Identifying entities", "Classifying entity types", "Computing relevance scores", "Saving entities"],
        estimatedDuration: 20,
      },
      () => extractProjectEntities(projectId)
    );
  }

  function handleGapAnalysis() {
    runAction(
      {
        title: "Running Entity Gap Analysis",
        description: "Analyzing your entity coverage compared to competitors and industry standards...",
        steps: ["Analyzing current entities", "Comparing with competitors", "Identifying gaps", "Generating recommendations"],
        estimatedDuration: 15,
      },
      async () => {
        const result = await runEntityGapAnalysis(projectId);
        if (!("error" in result)) {
          setGapRecs(result.recommendations);
        }
        return result;
      }
    );
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => { await deleteEntity(id); setDeletingId(null); });
  }

  const headlineStats = [
    { label: "Total Entities", value: String(stats.total), delta: `${Object.keys(stats.byType).length} types`, direction: "neutral" as const },
    { label: "Top Type", value: stats.topType ? stats.topType.charAt(0).toUpperCase() + stats.topType.slice(1) : "—", delta: stats.topType ? `${stats.byType[stats.topType]} entities` : "", direction: "neutral" as const },
    { label: "Avg Relevance", value: String(stats.avgRelevance), delta: "Out of 100", direction: "neutral" as const },
    { label: "Pages Covered", value: String(coverage.filter((c) => c.entity_count > 0).length), delta: `of ${coverage.length} total`, direction: "neutral" as const },
  ];

  const filtered = entities.filter((e) => {
    if (typeFilter !== "all" && e.entity_type !== typeFilter) return false;
    if (searchQuery && !e.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const chartData = coverage.map((c) => ({ page: c.page_title, entities: c.entity_count, coverage: c.entity_coverage }));

  if (entities.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between border-b border-rule pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Entity SEO &amp; Knowledge Graph</h1>
            <p className="mt-1 font-sans text-sm text-ink-secondary">Extract and optimize named entities for semantic SEO and knowledge panel visibility</p>
          </div>
          <Button variant="outline" size="sm" disabled={isActionRunning || isPending} onClick={handleExtract}>
            <Sparkles size={14} />
            Extract Entities
          </Button>
        </div>
        <EmptyState icon={Network} title="No Entities Extracted Yet" description="Add keywords or content pages, then click 'Extract Entities' to discover named entities in your content." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <HeadlineBar stats={headlineStats} />

      {/* Header */}
      <div className="flex items-end justify-between border-b border-rule pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Entity SEO &amp; Knowledge Graph</h1>
          <p className="mt-1 font-sans text-sm text-ink-secondary">{stats.total} entities across {Object.keys(stats.byType).length} types</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={isActionRunning || isPending} onClick={handleGapAnalysis}>
            <Target size={14} />
            Gap Analysis
          </Button>
          <Button variant="outline" size="sm" disabled={isActionRunning || isPending} onClick={handleExtract}>
            <Sparkles size={14} />
            Re-Extract
          </Button>
        </div>
      </div>

      {gapRecs.length > 0 && (
        <div className="border border-editorial-gold/30 bg-editorial-gold/5 p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-gold">Gap Analysis Recommendations</span>
          <ul className="mt-2 flex flex-col gap-1">
            {gapRecs.map((rec, i) => (
              <li key={i} className="font-sans text-[12px] text-ink-secondary">&bull; {rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule pb-4">
        <span className="mr-1 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Type:</span>
        <button type="button" onClick={() => setTypeFilter("all")} className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${typeFilter === "all" ? "border-editorial-red bg-editorial-red/5 text-editorial-red" : "border-rule bg-surface-card text-ink-muted hover:border-rule-dark hover:text-ink"}`}>
          <Filter size={11} /> All
        </button>
        {ALL_TYPES.filter((t) => stats.byType[t]).map((t) => (
          <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${typeFilter === t ? "border-editorial-red bg-editorial-red/5 text-editorial-red" : "border-rule bg-surface-card text-ink-muted hover:border-rule-dark hover:text-ink"}`}>
            {TYPE_ICONS[t]} {t} ({stats.byType[t]})
          </button>
        ))}
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input type="text" placeholder="Search entities..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 border border-rule bg-surface-card pl-8 pr-3 font-sans text-xs text-ink placeholder:text-ink-muted focus:border-editorial-red focus:outline-none" />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <ColumnHeader title="Extracted Entities" subtitle={`${filtered.length} entities`} />
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((entity) => (
              <div key={entity.id} className="group border border-rule bg-surface-card p-4 transition-colors hover:border-rule-dark">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-ink-muted">{TYPE_ICONS[entity.entity_type]}</span>
                    <h3 className="font-serif text-[14px] font-bold text-ink">{entity.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={TYPE_BADGE_VARIANT[entity.entity_type]}>{entity.entity_type}</Badge>
                    <button type="button" className="ml-1 text-ink-muted opacity-0 transition-opacity hover:text-editorial-red group-hover:opacity-100" onClick={() => handleDelete(entity.id)} disabled={isPending && deletingId === entity.id}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {entity.description && (
                  <p className="mt-2 font-sans text-[11px] leading-relaxed text-ink-secondary">
                    {entity.description.startsWith("[GAP]") ? (<><Badge variant="warning" className="mr-1">GAP</Badge>{entity.description.replace("[GAP] ", "")}</>) : entity.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  {entity.relevance_score != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-ink-muted">Relevance</span>
                      <span className={`font-mono text-[11px] font-bold tabular-nums ${Number(entity.relevance_score) >= 70 ? "text-editorial-green" : Number(entity.relevance_score) >= 40 ? "text-editorial-gold" : "text-editorial-red"}`}>{entity.relevance_score}</span>
                    </div>
                  )}
                  {entity.wikipedia_url && (
                    <a href={entity.wikipedia_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-editorial-red">
                      <ExternalLink size={10} /> Wikipedia
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Entity Types</span>
            <div className="mt-3 flex flex-col gap-1.5">
              {ALL_TYPES.filter((t) => stats.byType[t]).map((t) => (
                <div key={t} className="flex items-center justify-between py-1">
                  <span className="flex items-center gap-2 text-[12px] text-ink-secondary">{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</span>
                  <Badge variant={TYPE_BADGE_VARIANT[t]}>{stats.byType[t]}</Badge>
                </div>
              ))}
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="border border-rule bg-surface-card p-4">
              <EntityCoverageChart data={chartData} />
            </div>
          )}

          <div className="border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Actions</span>
            <div className="mt-3 flex flex-col gap-2">
              <Button variant="primary" size="sm" className="w-full justify-center" disabled={isActionRunning || isPending} onClick={handleExtract}>
                <Sparkles size={14} /> Extract Entities
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-center" disabled={isActionRunning || isPending} onClick={handleGapAnalysis}>
                <Target size={14} /> Run Gap Analysis
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
