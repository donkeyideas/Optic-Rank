"use client";

import { MessageSquare, Mic, AlertTriangle, Search, Shield } from "lucide-react";
import type { SnippetOpportunity, AnswerReadiness, ZeroClickRisk, VoiceSearchKeyword } from "@/lib/ai/aeo-analysis";
import type { SchemaAuditData } from "@/lib/dal/optimization";

interface AeoClientProps {
  snippetOpportunities: SnippetOpportunity[];
  answerReadiness: AnswerReadiness[];
  zeroClickRisks: ZeroClickRisk[];
  voiceSearchKeywords: VoiceSearchKeyword[];
  schemaAudit: SchemaAuditData;
}

function intentLabel(intent: string | null) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ink-muted">
      {intent ?? "—"}
    </span>
  );
}

function riskBadge(level: "high" | "medium" | "low") {
  const config = {
    high: "bg-editorial-red/10 text-editorial-red",
    medium: "bg-editorial-amber/10 text-editorial-amber",
    low: "bg-editorial-green/10 text-editorial-green",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase ${config[level]}`}>
      {level}
    </span>
  );
}

export function AeoClient({
  snippetOpportunities,
  answerReadiness,
  zeroClickRisks,
  voiceSearchKeywords,
  schemaAudit,
}: AeoClientProps) {
  const highRiskCount = zeroClickRisks.filter((r) => r.riskLevel === "high").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-editorial-red" />
        <h2 className="font-serif text-lg font-bold text-ink">
          Answer Engine Optimization
        </h2>
      </div>

      {/* Featured Snippet Opportunities */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule px-5 py-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Featured Snippet Opportunities
          </h3>
          <span className="text-[11px] font-semibold text-editorial-red">
            {snippetOpportunities.length} found
          </span>
        </div>
        {snippetOpportunities.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                  <th className="px-4 py-2.5">Keyword</th>
                  <th className="px-4 py-2.5 text-center">Pos</th>
                  <th className="px-4 py-2.5 text-right hidden sm:table-cell">Volume</th>
                  <th className="px-4 py-2.5">Intent</th>
                  <th className="px-4 py-2.5 text-center">Score</th>
                </tr>
              </thead>
              <tbody>
                {snippetOpportunities.slice(0, 20).map((opp) => (
                  <tr key={opp.keywordId} className="border-b border-rule last:border-0">
                    <td className="px-4 py-2.5 text-[12px] font-semibold text-ink">
                      {opp.keyword}
                    </td>
                    <td className="px-4 py-2.5 text-center text-[12px] font-mono text-ink-secondary">
                      {opp.position}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[11px] text-ink-muted hidden sm:table-cell">
                      {opp.searchVolume.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">{intentLabel(opp.intent)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[12px] font-bold ${opp.score >= 70 ? "text-editorial-green" : opp.score >= 40 ? "text-editorial-amber" : "text-editorial-red"}`}>
                        {opp.score}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <Search size={24} className="mx-auto mb-2 text-ink-muted/30" />
            <p className="text-[12px] text-ink-muted">No snippet opportunities found. Try adding more keywords.</p>
          </div>
        )}
      </div>

      {/* Schema Audit Summary */}
      <div className="border border-rule bg-surface-card px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted mb-1">
              Schema Markup Coverage
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl font-bold text-ink">
                {schemaAudit.coveragePct}%
              </span>
              <span className="text-[11px] text-ink-muted">
                {schemaAudit.pagesWithSchema} of {schemaAudit.totalPages} pages
              </span>
            </div>
          </div>
          <a
            href="/dashboard/site-audit"
            className="text-[11px] font-semibold text-editorial-red hover:underline"
          >
            View Full Audit &rarr;
          </a>
        </div>
        {schemaAudit.totalPages > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden bg-ink/5">
            <div
              className={`h-full transition-all ${
                schemaAudit.coveragePct >= 70
                  ? "bg-editorial-green"
                  : schemaAudit.coveragePct >= 40
                    ? "bg-editorial-amber"
                    : "bg-editorial-red"
              }`}
              style={{ width: `${schemaAudit.coveragePct}%` }}
            />
          </div>
        )}
      </div>

      {/* Answer Readiness + Zero-Click Risk side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Answer Readiness */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule px-5 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Answer Readiness
            </h3>
          </div>
          {answerReadiness.length > 0 ? (
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    <th className="px-4 py-2">Keyword</th>
                    <th className="px-4 py-2 text-center">Score</th>
                    <th className="px-4 py-2 text-center">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {answerReadiness.slice(0, 25).map((ar) => (
                    <tr key={ar.keywordId} className="border-b border-rule last:border-0">
                      <td className="px-4 py-2 text-[11px] text-ink">
                        {ar.keyword}
                        {ar.isQuestion && (
                          <span className="ml-1 text-[9px] text-editorial-red font-bold">Q</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`text-[11px] font-bold ${ar.score >= 60 ? "text-editorial-green" : ar.score >= 30 ? "text-editorial-amber" : "text-editorial-red"}`}>
                          {ar.score}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-[11px] font-mono text-ink-muted">
                        {ar.position ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-[12px] text-ink-muted">No keyword data available.</p>
            </div>
          )}
        </div>

        {/* Zero-Click Risk */}
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule px-5 py-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Zero-Click Risk
            </h3>
            {highRiskCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-editorial-red">
                <AlertTriangle size={10} />
                {highRiskCount} high risk
              </span>
            )}
          </div>
          {zeroClickRisks.length > 0 ? (
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-rule text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                    <th className="px-4 py-2">Keyword</th>
                    <th className="px-4 py-2 text-center">Features</th>
                    <th className="px-4 py-2 text-center">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {zeroClickRisks
                    .filter((r) => r.featureCount > 0)
                    .slice(0, 25)
                    .map((risk) => (
                      <tr key={risk.keywordId} className="border-b border-rule last:border-0">
                        <td className="px-4 py-2 text-[11px] text-ink">
                          {risk.keyword}
                        </td>
                        <td className="px-4 py-2 text-center text-[11px] font-mono text-ink-muted">
                          {risk.featureCount}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {riskBadge(risk.riskLevel)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-[12px] text-ink-muted">No SERP feature data available.</p>
            </div>
          )}
        </div>
      </div>

      {/* Voice Search Keywords */}
      {voiceSearchKeywords.length > 0 && (
        <div className="border border-rule bg-surface-card">
          <div className="border-b border-rule px-5 py-3 flex items-center gap-2">
            <Mic size={14} className="text-ink-muted" />
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Voice Search Keywords
            </h3>
            <span className="text-[10px] text-ink-muted">
              ({voiceSearchKeywords.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2 px-5 py-4">
            {voiceSearchKeywords.slice(0, 30).map((vk) => (
              <span
                key={vk.keywordId}
                className="inline-flex items-center gap-1.5 border border-rule bg-surface-raised px-2.5 py-1 text-[11px] text-ink"
              >
                <Shield size={10} className="text-ink-muted" />
                {vk.keyword}
                {vk.searchVolume > 0 && (
                  <span className="text-[9px] text-ink-muted">
                    {vk.searchVolume.toLocaleString()}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
