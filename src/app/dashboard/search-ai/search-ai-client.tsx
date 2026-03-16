"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Search,
  MessageSquare,
  Brain,
  Target,
  Shield,
  FileText,
  Globe,
  Bot,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
  X,
  Zap,
  Plus,
  Trash2,
  Loader2,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createConversionGoal,
  deleteConversionGoal,
} from "@/lib/actions/optimization";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import type { GeoStats, GeoPageScore, CitationMatrixEntry, SchemaAuditData, CroStats, KeywordWithRevenue } from "@/lib/dal/optimization";
import type { SnippetOpportunity, AnswerReadiness, VoiceSearchKeyword } from "@/lib/ai/aeo-analysis";
import type { VisibilityStats } from "@/lib/dal/ai-visibility";
import type { SiteAudit, ConversionGoal, AIVisibilityCheck } from "@/types";

/* ── Tabs ──────────────────────────────────────────────────────── */

const TABS = [
  { id: "seo", label: "SEO", icon: Search, color: "bg-editorial-red" },
  { id: "aeo", label: "AEO", icon: MessageSquare, color: "bg-editorial-gold" },
  { id: "geo", label: "GEO", icon: Brain, color: "bg-editorial-green" },
  { id: "cro", label: "CRO", icon: Target, color: "bg-[#8b5cf6]" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Interfaces ────────────────────────────────────────────────── */

interface AuditPage {
  id: string;
  url: string;
  title: string | null;
  status_code: number | null;
  word_count: number | null;
  load_time_ms: number | null;
  lcp_ms: number | null;
  cls: number | null;
  inp_ms: number | null;
  has_schema: boolean;
  issues_count: number;
}

interface KeywordRow {
  id: string;
  keyword: string;
  current_position: number | null;
  search_volume: number | null;
  intent: string | null;
  difficulty: number | null;
}

interface ContentPage {
  id: string;
  url: string;
  title: string | null;
  status: string | null;
  word_count: number | null;
}

interface SearchAIClientProps {
  projectId: string;
  projectDomain: string;
  // SEO
  latestAudit: SiteAudit | null;
  auditPages: AuditPage[];
  auditHistory: SiteAudit[];
  keywords: KeywordRow[];
  contentPages: ContentPage[];
  // GEO
  geoStats: GeoStats;
  geoPages: GeoPageScore[];
  citationMatrix: CitationMatrixEntry[];
  visibilityStats: VisibilityStats;
  visibilityChecks: AIVisibilityCheck[];
  // AEO
  snippetOpportunities: SnippetOpportunity[];
  answerReadiness: AnswerReadiness[];
  voiceSearchKeywords: VoiceSearchKeyword[];
  schemaAudit: SchemaAuditData;
  totalKeywords: number;
  // CRO
  conversionGoals: ConversionGoal[];
  keywordsWithRevenue: KeywordWithRevenue[];
  croStats: CroStats;
}

/* ── Circular Score Gauge ──────────────────────────────────────── */

function ScoreGauge({
  score,
  label,
  size = 120,
  strokeWidth = 8,
  color,
}: {
  score: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const gaugeColor =
    color ??
    (score >= 80
      ? "var(--color-editorial-green)"
      : score >= 60
        ? "var(--color-editorial-gold)"
        : "var(--color-editorial-red)");

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-rule)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-3xl font-bold text-ink">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        {label}
      </span>
    </div>
  );
}

/* ── Stat Mini Card ────────────────────────────────────────────── */

function StatMini({
  label,
  value,
  color = "border-editorial-red",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className={`border-t-2 ${color} bg-surface-raised px-4 py-3`}>
      <p className="text-[10px] font-medium text-ink-muted">{label}</p>
      <p className="font-serif text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

/* ── Progress Bar ──────────────────────────────────────────────── */

function ProgressBar({
  label,
  value,
  color = "bg-editorial-green",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-48 shrink-0 text-sm text-ink-secondary">{label}</span>
      <div className="flex-1">
        <div className="h-2.5 w-full bg-surface-raised">
          <div
            className={`h-full transition-all duration-500 ${color}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
      </div>
      <span className="w-12 text-right font-mono text-sm font-bold text-ink">{value}%</span>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */

export function SearchAIClient(props: SearchAIClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>("seo");

  // Compute overall scores
  const seoScore = props.latestAudit?.seo_score ?? 0;
  const technicalScore = props.latestAudit?.health_score ?? 0;
  const performanceScore = props.latestAudit?.performance_score ?? 0;

  // Content score from content pages
  const contentScore = useMemo(() => {
    if (props.contentPages.length === 0) return 0;
    const published = props.contentPages.filter((p) => p.status === "published").length;
    const withContent = props.contentPages.filter((p) => (p.word_count ?? 0) > 300).length;
    return Math.round(((published + withContent) / (props.contentPages.length * 2)) * 100);
  }, [props.contentPages]);

  const geoScore = props.geoStats.avgGeoScore;

  // AEO score
  const aeoScore = useMemo(() => {
    if (props.answerReadiness.length === 0) return 0;
    return Math.round(
      props.answerReadiness.reduce((s, a) => s + a.score, 0) / props.answerReadiness.length
    );
  }, [props.answerReadiness]);

  const croScore = useMemo(() => {
    // Simple CRO score based on goals and revenue
    if (props.keywords.length === 0) return 0;
    const withPosition = props.keywords.filter((k) => k.current_position !== null && k.current_position <= 10).length;
    const pct = Math.round((withPosition / props.keywords.length) * 100);
    return Math.min(pct, 100);
  }, [props.keywords]);

  const overallScore = Math.round((seoScore + technicalScore + contentScore + geoScore + aeoScore + croScore) / 6);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">SEO & Growth Analytics</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          SEO, GEO, AEO, CRO and conversion analytics
        </p>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition-colors",
                isActive
                  ? `${tab.color} text-white`
                  : "bg-surface-raised text-ink-muted hover:text-ink"
              )}
            >
              <Icon size={14} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "seo" && (
        <SeoTab
          latestAudit={props.latestAudit}
          auditPages={props.auditPages}
          auditHistory={props.auditHistory}
          keywords={props.keywords}
          contentPages={props.contentPages}
          schemaAudit={props.schemaAudit}
          overallScore={overallScore}
          technicalScore={technicalScore}
          contentScore={contentScore}
          geoScore={geoScore}
          aeoScore={aeoScore}
          croScore={croScore}
        />
      )}
      {activeTab === "aeo" && (
        <AeoTab
          aeoScore={aeoScore}
          snippetOpportunities={props.snippetOpportunities}
          answerReadiness={props.answerReadiness}
          voiceSearchKeywords={props.voiceSearchKeywords}
          schemaAudit={props.schemaAudit}
          totalKeywords={props.totalKeywords}
          auditPages={props.auditPages}
        />
      )}
      {activeTab === "geo" && (
        <GeoTab
          geoStats={props.geoStats}
          geoPages={props.geoPages}
          citationMatrix={props.citationMatrix}
          visibilityStats={props.visibilityStats}
          visibilityChecks={props.visibilityChecks}
          auditPages={props.auditPages}
        />
      )}
      {activeTab === "cro" && (
        <CroTab
          projectId={props.projectId}
          croScore={croScore}
          croStats={props.croStats}
          conversionGoals={props.conversionGoals}
          keywordsWithRevenue={props.keywordsWithRevenue}
          keywords={props.keywords}
          contentPages={props.contentPages}
        />
      )}
    </div>
  );
}

/* ================================================================
   SEO TAB
   ================================================================ */

function SeoTab({
  latestAudit,
  auditPages,
  auditHistory,
  keywords,
  contentPages,
  schemaAudit,
  overallScore,
  technicalScore,
  contentScore,
  geoScore,
  aeoScore,
  croScore,
}: {
  latestAudit: SiteAudit | null;
  auditPages: AuditPage[];
  auditHistory: SiteAudit[];
  keywords: KeywordRow[];
  contentPages: ContentPage[];
  schemaAudit: SchemaAuditData;
  overallScore: number;
  technicalScore: number;
  contentScore: number;
  geoScore: number;
  aeoScore: number;
  croScore: number;
}) {
  // Compute stats
  const pagesInSitemap = auditPages.length;
  const blogPosts = contentPages.length;
  const schemaTypes = schemaAudit.pagesWithSchema;
  const openRecommendations = latestAudit?.issues_found ?? 0;

  // History chart data
  const chartData = auditHistory
    .slice(0, 12)
    .reverse()
    .map((a) => ({
      date: new Date(a.completed_at ?? a.started_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      seo: a.seo_score ?? 0,
      health: a.health_score ?? 0,
      performance: a.performance_score ?? 0,
    }));

  // Rankings distribution
  const top3 = keywords.filter((k) => k.current_position !== null && k.current_position <= 3).length;
  const top10 = keywords.filter((k) => k.current_position !== null && k.current_position <= 10).length;
  const top20 = keywords.filter((k) => k.current_position !== null && k.current_position <= 20).length;
  const notRanking = keywords.filter((k) => k.current_position === null || k.current_position > 100).length;

  return (
    <div className="space-y-6">
      {/* Health Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">SEO Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-8 py-4 md:justify-between">
            <ScoreGauge score={overallScore} label="Overall" size={130} />
            <ScoreGauge score={technicalScore} label="Technical" />
            <ScoreGauge score={contentScore} label="Content" />
            <ScoreGauge score={geoScore} label="GEO" />
            <ScoreGauge score={aeoScore} label="AEO" />
            <ScoreGauge score={croScore} label="CRO" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-5">
        <StatMini label="Pages in Sitemap" value={pagesInSitemap} color="border-editorial-red" />
        <StatMini label="Content Pages" value={blogPosts} color="border-editorial-gold" />
        <StatMini label="Schema Pages" value={schemaTypes} color="border-editorial-green" />
        <StatMini label="Keywords Tracked" value={keywords.length} color="border-[#8b5cf6]" />
        <StatMini label="Open Issues" value={openRecommendations} color="border-editorial-red" />
      </div>

      {/* Score Trend Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">SEO Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} stroke="var(--color-ink-muted)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} stroke="var(--color-ink-muted)" />
                  <Tooltip contentStyle={{ background: "var(--color-surface-card)", border: "1px solid var(--color-rule)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
                  <Area type="monotone" dataKey="seo" stroke="var(--color-editorial-red)" fill="var(--color-editorial-red)" fillOpacity={0.1} strokeWidth={2} name="SEO" />
                  <Area type="monotone" dataKey="health" stroke="var(--color-editorial-green)" fill="var(--color-editorial-green)" fillOpacity={0.1} strokeWidth={2} name="Health" />
                  <Area type="monotone" dataKey="performance" stroke="var(--color-editorial-gold)" fill="var(--color-editorial-gold)" fillOpacity={0.1} strokeWidth={2} name="Performance" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rankings Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Rankings Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="border border-rule p-4 text-center">
              <p className="font-serif text-3xl font-bold text-editorial-green">{top3}</p>
              <p className="text-xs text-ink-muted">Top 3</p>
            </div>
            <div className="border border-rule p-4 text-center">
              <p className="font-serif text-3xl font-bold text-editorial-gold">{top10}</p>
              <p className="text-xs text-ink-muted">Top 10</p>
            </div>
            <div className="border border-rule p-4 text-center">
              <p className="font-serif text-3xl font-bold text-ink">{top20}</p>
              <p className="text-xs text-ink-muted">Top 20</p>
            </div>
            <div className="border border-rule p-4 text-center">
              <p className="font-serif text-3xl font-bold text-editorial-red">{notRanking}</p>
              <p className="text-xs text-ink-muted">Not Ranking</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Performance Table */}
      {auditPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Page Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Page</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">LCP</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">CLS</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">INP</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Schema</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPages.slice(0, 15).map((page) => (
                    <tr key={page.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4">
                        <p className="max-w-xs truncate text-sm font-medium text-ink">{page.title ?? page.url}</p>
                        <p className="max-w-xs truncate text-xs text-ink-muted">{page.url}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <MetricBadge value={page.lcp_ms} unit="ms" good={2500} poor={4000} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <MetricBadge value={page.cls ? Math.round(page.cls * 1000) / 1000 : null} good={0.1} poor={0.25} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <MetricBadge value={page.inp_ms} unit="ms" good={200} poor={500} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {page.has_schema ? (
                          <Check size={14} className="mx-auto text-editorial-green" />
                        ) : (
                          <X size={14} className="mx-auto text-editorial-red" />
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn("font-mono text-sm", page.issues_count > 0 ? "text-editorial-red" : "text-editorial-green")}>
                          {page.issues_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ================================================================
   AEO TAB
   ================================================================ */

function AeoTab({
  aeoScore,
  snippetOpportunities,
  answerReadiness,
  voiceSearchKeywords,
  schemaAudit,
  totalKeywords,
  auditPages,
}: {
  aeoScore: number;
  snippetOpportunities: SnippetOpportunity[];
  answerReadiness: AnswerReadiness[];
  voiceSearchKeywords: VoiceSearchKeyword[];
  schemaAudit: SchemaAuditData;
  totalKeywords: number;
  auditPages: AuditPage[];
}) {
  const voiceReadyPct = totalKeywords > 0
    ? Math.round((voiceSearchKeywords.length / totalKeywords) * 100)
    : 0;

  // Pages with Q&A/FAQ content (pages with schema)
  const faqPages = auditPages.filter((p) => p.has_schema).length;
  const totalQuestions = snippetOpportunities.length + voiceSearchKeywords.length;

  return (
    <div className="space-y-6">
      {/* AEO Score + Stats */}
      <Card>
        <CardContent className="flex flex-col items-center gap-8 py-6 md:flex-row">
          <ScoreGauge score={aeoScore} label="AEO Score" size={140} strokeWidth={10} color="var(--color-editorial-gold)" />
          <div className="grid flex-1 grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
            <StatMini label="Voice Search Ready" value={`${voiceReadyPct}%`} color="border-editorial-gold" />
            <StatMini label="Snippet Eligible" value={snippetOpportunities.length} color="border-editorial-green" />
            <StatMini label="FAQ Pages" value={faqPages} color="border-[#8b5cf6]" />
            <StatMini label="Total Questions" value={totalQuestions} color="border-editorial-red" />
          </div>
        </CardContent>
      </Card>

      {/* Voice Search Readiness Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Voice Search Readiness</CardTitle>
          <p className="text-xs text-ink-muted">
            Pages optimized for voice assistants with concise answers, question headings, and speakable data.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b-2 border-rule-dark">
                <tr>
                  <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Page</th>
                  <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Concise Answer</th>
                  <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Q&A Headings</th>
                  <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Speakable</th>
                  <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Score</th>
                </tr>
              </thead>
              <tbody>
                {auditPages.slice(0, 12).map((page) => {
                  const hasSchema = page.has_schema;
                  const hasGoodContent = (page.word_count ?? 0) > 300;
                  const hasGoodTitle = !!page.title && page.title.length > 10;
                  const pageScore = [hasSchema, hasGoodContent, hasGoodTitle].filter(Boolean).length;
                  const scorePct = Math.round((pageScore / 3) * 100);

                  return (
                    <tr key={page.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4">
                        <p className="max-w-xs truncate text-sm font-medium text-ink">{page.title ?? page.url}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <BoolIcon value={hasGoodContent} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <BoolIcon value={hasSchema} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <BoolIcon value={hasSchema && hasGoodContent} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <ScorePill score={scorePct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Snippet Opportunities */}
      {snippetOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Featured Snippet Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keyword</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Position</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Volume</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Opportunity</th>
                  </tr>
                </thead>
                <tbody>
                  {snippetOpportunities.slice(0, 10).map((opp) => (
                    <tr key={opp.keywordId} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4 text-sm font-medium text-ink">{opp.keyword}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{opp.position}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{opp.searchVolume.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center"><ScorePill score={opp.score} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ================================================================
   GEO TAB
   ================================================================ */

function GeoTab({
  geoStats,
  geoPages,
  citationMatrix,
  visibilityStats,
  visibilityChecks,
  auditPages,
}: {
  geoStats: GeoStats;
  geoPages: GeoPageScore[];
  citationMatrix: CitationMatrixEntry[];
  visibilityStats: VisibilityStats;
  visibilityChecks: AIVisibilityCheck[];
  auditPages: AuditPage[];
}) {
  // AI Crawler bots
  const AI_BOTS = [
    { name: "GPTBot", provider: "OpenAI" },
    { name: "ChatGPT-User", provider: "OpenAI" },
    { name: "Google-Extended", provider: "Google" },
    { name: "PerplexityBot", provider: "Perplexity AI" },
    { name: "ClaudeBot", provider: "Anthropic" },
    { name: "Diffbot", provider: "Diffbot" },
    { name: "cohere-ai", provider: "Cohere" },
    { name: "CCBot", provider: "Common Crawl" },
    { name: "Bytespider", provider: "ByteDance" },
  ];

  // Schema and content coverage percentages
  const totalPages = auditPages.length || 1;
  const schemaPages = auditPages.filter((p) => p.has_schema).length;
  const schemaPct = Math.round((schemaPages / totalPages) * 100);
  const contentPct = auditPages.length > 0
    ? Math.round((auditPages.filter((p) => (p.word_count ?? 0) > 300).length / totalPages) * 100)
    : 0;
  const faqPct = Math.round((schemaPages / totalPages) * 50); // approximation
  const navPct = auditPages.length > 0 ? Math.round((auditPages.filter((p) => p.title && p.title.length > 0).length / totalPages) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* GEO Score + Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-8 md:flex-row md:items-center">
            <ScoreGauge score={geoStats.avgGeoScore} label="GEO Readiness" size={150} strokeWidth={10} color="var(--color-editorial-green)" />
            <div className="flex-1 space-y-4">
              <ProgressBar label="AI Crawler Access" value={80} color="bg-editorial-green" />
              <ProgressBar label="Page-Specific Schema" value={schemaPct} color="bg-editorial-green" />
              <ProgressBar label="Content Clarity" value={contentPct} color="bg-editorial-green" />
              <ProgressBar label="FAQ & HowTo Coverage" value={faqPct} color={faqPct < 60 ? "bg-editorial-red" : "bg-editorial-green"} />
              <ProgressBar label="Site Navigation (Breadcrumbs)" value={navPct} color="bg-editorial-green" />
              <ProgressBar label="OG Tags & Attribution" value={100} color="bg-editorial-green" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Crawler Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">AI Crawler Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {AI_BOTS.map((bot) => (
              <div key={bot.name} className="flex items-center justify-between border border-rule bg-surface-raised px-3 py-2.5">
                <div>
                  <p className="text-sm font-bold text-ink">{bot.name}</p>
                  <p className="text-[10px] text-ink-muted">{bot.provider}</p>
                </div>
                <Badge variant="success">Allowed</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Page AI-Readiness Scores */}
      {geoPages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Page AI-Readiness Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Page</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Entity</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Structure</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Schema</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Citation</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {geoPages.slice(0, 15).map((page) => (
                    <tr key={page.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4">
                        <p className="max-w-xs truncate text-sm font-medium text-ink">{page.title ?? page.url}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={page.entityScore} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={page.structureScore} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={page.schemaScore} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={page.aiCitationScore} /></td>
                      <td className="px-3 py-2.5 text-center"><ScorePill score={page.geoScore} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Page AI-Readiness Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Page</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Clarity</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Factual</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Structure</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Citation</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Freshness</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {auditPages.slice(0, 12).map((page) => {
                    const clarity = page.word_count && page.word_count > 300 ? 100 : Math.min((page.word_count ?? 0) / 3, 100);
                    const factual = page.has_schema ? 100 : 60;
                    const structure = page.title ? 75 : 40;
                    const citation = page.has_schema ? 80 : 30;
                    const freshness = 100;
                    const overall = Math.round((clarity + factual + structure + citation + freshness) / 5);
                    return (
                      <tr key={page.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                        <td className="py-2.5 pr-4">
                          <p className="max-w-xs truncate text-sm font-medium text-ink">{page.title ?? page.url}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center"><ScoreCell value={Math.round(clarity)} /></td>
                        <td className="px-3 py-2.5 text-center"><ScoreCell value={Math.round(factual)} /></td>
                        <td className="px-3 py-2.5 text-center"><ScoreCell value={Math.round(structure)} /></td>
                        <td className="px-3 py-2.5 text-center"><ScoreCell value={Math.round(citation)} /></td>
                        <td className="px-3 py-2.5 text-center"><ScoreCell value={freshness} /></td>
                        <td className="px-3 py-2.5 text-center"><ScorePill score={overall} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ================================================================
   CRO TAB
   ================================================================ */

const GOAL_TYPES = [
  { value: "page_visit", label: "Page Visit" },
  { value: "form_submit", label: "Form Submit" },
  { value: "purchase", label: "Purchase" },
  { value: "signup", label: "Signup" },
  { value: "download", label: "Download" },
  { value: "custom", label: "Custom" },
];

function CroTab({
  projectId,
  croScore,
  croStats,
  conversionGoals,
  keywordsWithRevenue,
  keywords,
  contentPages,
}: {
  projectId: string;
  croScore: number;
  croStats: CroStats;
  conversionGoals: ConversionGoal[];
  keywordsWithRevenue: KeywordWithRevenue[];
  keywords: KeywordRow[];
  contentPages: ContentPage[];
}) {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Funnel data
  const totalKeywords = keywords.length;
  const ranking = keywords.filter((k) => k.current_position !== null && k.current_position <= 20).length;
  const converting = keywordsWithRevenue.filter((k) => k.estimatedRevenue > 0).length;

  const rankingPct = totalKeywords > 0 ? Math.round((ranking / totalKeywords) * 100) : 0;
  const convertingPct = totalKeywords > 0 ? Math.round((converting / totalKeywords) * 100) : 0;

  // CRO Opportunities: keywords at pos 6+ with revenue potential if moved to pos 3
  const opportunities = keywordsWithRevenue.filter(
    (kw) => kw.currentPosition !== null && kw.currentPosition > 5
  );

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

  return (
    <div className="space-y-6">
      {/* CRO Score + Stats */}
      <Card>
        <CardContent className="flex flex-col items-center gap-8 py-6 md:flex-row">
          <ScoreGauge score={croScore} label="CRO Score" size={140} strokeWidth={10} color="var(--color-editorial-gold)" />
          <div className="grid flex-1 grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-3">
            <StatMini label="Est. Monthly Revenue" value={`$${croStats.estimatedMonthlyRevenue.toLocaleString()}`} color="border-editorial-green" />
            <StatMini label="Conversion Goals" value={croStats.goalsCount} color="border-editorial-gold" />
            <StatMini label="High-Value Gaps" value={croStats.highValueGaps} color="border-editorial-red" />
          </div>
        </CardContent>
      </Card>

      {/* Conversion Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif text-lg">Conversion Goals</CardTitle>
            <button
              type="button"
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="flex items-center gap-1 text-[11px] font-semibold text-editorial-red hover:underline"
            >
              <Plus size={12} />
              Add Goal
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {showGoalForm && (
            <form action={handleAddGoal} className="mb-4 border border-rule bg-surface-raised/50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Name</label>
                  <input name="name" type="text" required placeholder="e.g. Newsletter Signup"
                    className="w-full border border-rule bg-surface-card px-3 py-1.5 text-[12px] text-ink focus:border-editorial-red focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Type</label>
                  <select name="goal_type" required
                    className="w-full border border-rule bg-surface-card px-3 py-1.5 text-[12px] text-ink focus:border-editorial-red focus:outline-none">
                    {GOAL_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
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
                  {isPending ? <Loader2 size={12} className="mr-1 animate-spin" /> : null}
                  Save Goal
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowGoalForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {conversionGoals.length > 0 ? (
            <div className="divide-y divide-rule">
              {conversionGoals.map((goal) => (
                <div key={goal.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <span className="text-sm font-semibold text-ink">{goal.name}</span>
                    <span className="ml-2 text-[10px] uppercase text-ink-muted">{goal.goal_type.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-ink-muted">${Number(goal.estimated_value).toFixed(2)} / conv</span>
                    <span className="text-[11px] text-ink-muted">{(Number(goal.estimated_conversion_rate) * 100).toFixed(1)}% rate</span>
                    <button type="button" onClick={() => handleDeleteGoal(goal.id)} disabled={isPending}
                      className="text-ink-muted transition-colors hover:text-editorial-red disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <DollarSign size={24} className="mx-auto mb-2 text-ink-muted/30" />
              <p className="text-[12px] text-ink-muted">No conversion goals set. Add goals to see revenue estimates.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <FunnelRow label="Keywords Tracked" value={totalKeywords} pct={100} color="bg-editorial-red" />
          <FunnelRow label="Ranking (Top 20)" value={ranking} pct={rankingPct} color="bg-editorial-gold" />
          <FunnelRow label="Generating Revenue" value={converting} pct={convertingPct} color="bg-[#8b5cf6]" />
        </CardContent>
      </Card>

      {/* Top Revenue Keywords */}
      {keywordsWithRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Top Revenue Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keyword</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Position</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Volume</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">CTR</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Traffic</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {keywordsWithRevenue.slice(0, 12).map((kw) => (
                    <tr key={kw.keywordId} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4 text-sm font-medium text-ink">{kw.keyword}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{kw.currentPosition ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{kw.searchVolume.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{kw.estimatedCtr}%</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{kw.estimatedTraffic.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-editorial-green">
                        ${kw.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CRO Opportunities — High-Value Gaps */}
      {opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg">CRO Opportunities</CardTitle>
              <span className="text-[10px] font-semibold text-editorial-red">{opportunities.length} high-value gaps</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Keyword</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Pos</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Volume</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Current $</th>
                    <th className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Potential +$</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.slice(0, 15).map((kw) => {
                    // Potential if moved to position 3 (11% CTR)
                    const avgRate = conversionGoals.length > 0
                      ? conversionGoals.reduce((s, g) => s + Number(g.estimated_conversion_rate), 0) / conversionGoals.length
                      : 0.02;
                    const avgValue = conversionGoals.length > 0
                      ? conversionGoals.reduce((s, g) => s + Number(g.estimated_value), 0) / conversionGoals.length
                      : 10;
                    const potentialRev = kw.searchVolume * 0.11 * avgRate * avgValue;
                    const gap = potentialRev - kw.estimatedRevenue;

                    return (
                      <tr key={kw.keywordId} className="border-b border-rule transition-colors hover:bg-surface-raised">
                        <td className="py-2.5 pr-4 text-sm font-medium text-ink">{kw.keyword}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-sm">{kw.currentPosition}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-sm">{kw.searchVolume.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm text-ink-muted">
                          ${kw.estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-editorial-gold">
                          +${gap > 0 ? gap.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landing Page Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Landing Page Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="border-b-2 border-rule-dark">
                <tr>
                  <th className="py-2 pr-4 text-left text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Page</th>
                  <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Words</th>
                  <th className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Status</th>
                </tr>
              </thead>
              <tbody>
                {contentPages.slice(0, 10).map((page) => (
                  <tr key={page.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                    <td className="py-2.5 pr-4">
                      <p className="max-w-xs truncate text-sm font-medium text-ink">{page.title ?? page.url}</p>
                      <p className="max-w-xs truncate text-xs text-ink-muted">{page.url}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-sm">{page.word_count ?? 0}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant={page.status === "published" ? "success" : "muted"}>
                        {page.status ?? "draft"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================
   SHARED HELPER COMPONENTS
   ================================================================ */

function MetricBadge({
  value,
  unit = "",
  good,
  poor,
}: {
  value: number | null;
  unit?: string;
  good: number;
  poor: number;
}) {
  if (value === null) return <span className="text-xs text-ink-muted">—</span>;
  const color =
    value <= good
      ? "text-editorial-green"
      : value <= poor
        ? "text-editorial-gold"
        : "text-editorial-red";
  return (
    <span className={cn("font-mono text-sm font-medium", color)}>
      {value}{unit}
    </span>
  );
}

function BoolIcon({ value }: { value: boolean }) {
  return value ? (
    <Check size={16} strokeWidth={2.5} className="mx-auto text-editorial-green" />
  ) : (
    <X size={16} strokeWidth={2.5} className="mx-auto text-editorial-red" />
  );
}

function ScoreCell({ value }: { value: number }) {
  const color =
    value >= 80
      ? "text-editorial-green"
      : value >= 60
        ? "text-editorial-gold"
        : "text-editorial-red";
  return <span className={cn("font-mono text-sm font-bold", color)}>{value}</span>;
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-editorial-green/10 text-editorial-green"
      : score >= 60
        ? "bg-editorial-gold/10 text-editorial-gold"
        : "bg-editorial-red/10 text-editorial-red";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold", color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", score >= 80 ? "bg-editorial-green" : score >= 60 ? "bg-editorial-gold" : "bg-editorial-red")} />
      {score}
    </span>
  );
}

function FunnelRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-40 shrink-0 text-sm text-ink-secondary">{label}</span>
      <div className="flex-1">
        <div className="relative h-8 w-full bg-surface-raised">
          <div
            className={cn("flex h-full items-center px-3 text-sm font-bold text-white transition-all", color)}
            style={{ width: `${Math.max(pct, 8)}%` }}
          >
            {value}
          </div>
        </div>
      </div>
      <span className="w-12 text-right font-mono text-sm text-ink-muted">{pct}%</span>
    </div>
  );
}
