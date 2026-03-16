"use client";

import { useState, useTransition } from "react";
import { Globe, Loader2, Play, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runGeoAnalysis } from "@/lib/actions/optimization";
import type { GeoStats, GeoPageScore, CitationMatrixEntry } from "@/lib/dal/optimization";

interface GeoClientProps {
  projectId: string;
  geoStats: GeoStats;
  geoPages: GeoPageScore[];
  citationMatrix: CitationMatrixEntry[];
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-editorial-green";
  if (score >= 40) return "text-editorial-amber";
  return "text-editorial-red";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-editorial-green/10";
  if (score >= 40) return "bg-editorial-amber/10";
  return "bg-editorial-red/10";
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[11px] text-ink-muted">{label}</span>
      <div className="flex-1 h-2 bg-ink/5 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            value >= 70 ? "bg-editorial-green" : value >= 40 ? "bg-editorial-amber" : "bg-editorial-red"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`w-8 text-right text-[11px] font-bold ${scoreColor(value)}`}>
        {value}
      </span>
    </div>
  );
}

export function GeoClient({ projectId, geoStats, geoPages, citationMatrix }: GeoClientProps) {
  const [isPending, startTransition] = useTransition();
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  const handleRunAnalysis = () => {
    startTransition(async () => {
      await runGeoAnalysis(projectId);
      window.location.reload();
    });
  };

  // Group citations by page
  const citationsByPage = new Map<string, CitationMatrixEntry[]>();
  for (const entry of citationMatrix) {
    if (!entry.pageUrl) continue;
    const existing = citationsByPage.get(entry.pageUrl) ?? [];
    existing.push(entry);
    citationsByPage.set(entry.pageUrl, existing);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header + Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-editorial-red" />
          <h2 className="font-serif text-lg font-bold text-ink">
            Generative Engine Optimization
          </h2>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleRunAnalysis}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 size={14} className="mr-1.5 animate-spin" />
          ) : (
            <Play size={14} className="mr-1.5" />
          )}
          {isPending ? "Analyzing..." : "Run GEO Analysis"}
        </Button>
      </div>

      {/* Score Breakdown */}
      {geoStats.pagesScored > 0 && (
        <div className="border border-rule bg-surface-card p-5">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Average Score Breakdown
          </h3>
          <div className="flex flex-col gap-3">
            <ScoreBar label="Entity" value={geoStats.avgEntityScore} />
            <ScoreBar label="Structure" value={geoStats.avgStructureScore} />
            <ScoreBar label="Schema" value={geoStats.avgSchemaScore} />
            <ScoreBar label="AI Citation" value={geoStats.avgCitationScore} />
          </div>
        </div>
      )}

      {/* GEO Readiness by Page */}
      {geoPages.length > 0 ? (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule px-5 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              GEO Readiness by Page
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  <th className="px-4 py-2.5">Page</th>
                  <th className="px-4 py-2.5 text-center">GEO</th>
                  <th className="px-4 py-2.5 text-center hidden sm:table-cell">Entity</th>
                  <th className="px-4 py-2.5 text-center hidden sm:table-cell">Structure</th>
                  <th className="px-4 py-2.5 text-center hidden md:table-cell">Schema</th>
                  <th className="px-4 py-2.5 text-center hidden md:table-cell">Citation</th>
                  <th className="px-4 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {geoPages.map((page) => {
                  const isExpanded = expandedPage === page.id;
                  return (
                    <tr key={page.id} className="group">
                      <td colSpan={7} className="p-0">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedPage(isExpanded ? null : page.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                              setExpandedPage(isExpanded ? null : page.id);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center border-b border-rule transition-colors hover:bg-surface-raised">
                            <div className="flex-1 min-w-0 px-4 py-2.5">
                              <div className="truncate text-[12px] font-semibold text-ink">
                                {page.title ?? page.url}
                              </div>
                              <div className="truncate text-[10px] text-ink-muted">
                                {page.url}
                              </div>
                            </div>
                            <div className={`px-4 py-2.5 text-center text-[13px] font-bold ${scoreColor(page.geoScore)}`}>
                              <span className={`inline-flex h-7 w-7 items-center justify-center ${scoreBg(page.geoScore)}`}>
                                {page.geoScore}
                              </span>
                            </div>
                            <div className={`px-4 py-2.5 text-center text-[12px] font-semibold hidden sm:table-cell ${scoreColor(page.entityScore)}`}>
                              {page.entityScore}
                            </div>
                            <div className={`px-4 py-2.5 text-center text-[12px] font-semibold hidden sm:table-cell ${scoreColor(page.structureScore)}`}>
                              {page.structureScore}
                            </div>
                            <div className={`px-4 py-2.5 text-center text-[12px] font-semibold hidden md:table-cell ${scoreColor(page.schemaScore)}`}>
                              {page.schemaScore}
                            </div>
                            <div className={`px-4 py-2.5 text-center text-[12px] font-semibold hidden md:table-cell ${scoreColor(page.aiCitationScore)}`}>
                              {page.aiCitationScore}
                            </div>
                            <div className="px-4 py-2.5 w-8">
                              {isExpanded ? (
                                <ChevronUp size={14} className="text-ink-muted" />
                              ) : (
                                <ChevronDown size={14} className="text-ink-muted" />
                              )}
                            </div>
                          </div>
                          {isExpanded && page.recommendations.length > 0 && (
                            <div className="border-b border-rule bg-surface-raised/50 px-6 py-3">
                              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted mb-2">
                                Recommendations
                              </div>
                              <div className="flex flex-col gap-1.5">
                                {page.recommendations.map((rec, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <span
                                      className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                                        rec.priority === "high"
                                          ? "bg-editorial-red"
                                          : rec.priority === "medium"
                                            ? "bg-editorial-amber"
                                            : "bg-ink-muted"
                                      }`}
                                    />
                                    <div>
                                      <span className="text-[11px] font-semibold text-ink">
                                        {rec.title}
                                      </span>
                                      <span className="ml-1.5 text-[11px] text-ink-muted">
                                        {rec.description}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border border-rule bg-surface-card px-6 py-10 text-center">
          <Globe size={32} className="mx-auto mb-3 text-ink-muted/30" />
          <p className="text-sm font-semibold text-ink">No GEO scores yet</p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Click &ldquo;Run GEO Analysis&rdquo; to score your content pages for AI engine readiness.
          </p>
        </div>
      )}

      {/* AI Citation Matrix */}
      {citationsByPage.size > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule px-5 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              AI Citation Matrix
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  <th className="px-4 py-2.5">Page</th>
                  <th className="px-4 py-2.5">Keyword</th>
                  <th className="px-4 py-2.5">LLM</th>
                  <th className="px-4 py-2.5 text-center">Cited</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(citationsByPage.entries())
                  .slice(0, 30)
                  .flatMap(([url, entries]) =>
                    entries.map((entry, i) => (
                      <tr key={`${url}-${i}`} className="border-b border-rule last:border-0">
                        <td className="px-4 py-2 text-[11px] text-ink max-w-[200px] truncate">
                          {entry.pageTitle ?? url}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-ink-secondary">
                          {entry.keyword}
                        </td>
                        <td className="px-4 py-2 text-[11px] text-ink-muted capitalize">
                          {entry.llmProvider}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              entry.mentioned ? "bg-editorial-green" : "bg-ink-muted/20"
                            }`}
                          />
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
