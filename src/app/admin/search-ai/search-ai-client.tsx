"use client";

import { useState, useCallback } from "react";
import {
  Search,
  MessageSquare,
  Brain,
  Target,
  FileText,
  Wrench,
  BarChart3,
  Globe2,
  Lightbulb,
  FlaskConical,
  Check,
  X,
  Copy,
  ChevronDown,
  AlertTriangle,
  Info,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type {
  PlatformSeoOverview,
  CmsPageAudit,
  TechnicalCheck,
  ContentAnalysisRow,
  KeywordByIntent,
  PositionBucket,
  GeoPresenceRow,
  SeoRecommendation,
  AeoOverviewData,
  AeoScoreRow,
  GeoScoreRow,
  CroAbTestRow,
} from "@/lib/dal/search-ai";

/* ── Tabs ──────────────────────────────────────────────────────── */

const TABS = [
  { id: "overview",        label: "Overview",        icon: BarChart3 },
  { id: "pages",           label: "Pages",           icon: FileText },
  { id: "technical",       label: "Technical",       icon: Wrench },
  { id: "content",         label: "Content",         icon: FileText },
  { id: "traffic",         label: "Traffic",         icon: BarChart3 },
  { id: "geo",             label: "Geo",             icon: Globe2 },
  { id: "search-console",  label: "Search Console",  icon: Search },
  { id: "aeo",             label: "AEO",             icon: MessageSquare },
  { id: "cro",             label: "CRO",             icon: Target },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  projects: { id: string; name: string; domain: string | null }[];
  overview: PlatformSeoOverview;
  cmsPages: CmsPageAudit[];
  technicalChecks: TechnicalCheck[];
  contentAnalysis: ContentAnalysisRow[];
  keywordsByIntent: KeywordByIntent[];
  positionDistribution: PositionBucket[];
  geoPresence: GeoPresenceRow[];
  recommendations: SeoRecommendation[];
  aeoOverview: AeoOverviewData;
  aeoScores: AeoScoreRow[];
  geoScores: GeoScoreRow[];
  croAbTests: CroAbTestRow[];
}

/* ── Score Gauge ──────────────────────────────────────────────── */

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
        : score >= 40
          ? "var(--color-editorial-gold)"
          : "var(--color-editorial-red)");

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-rule)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={gaugeColor} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-2xl font-bold text-ink">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">{label}</span>
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
      <span className="w-44 shrink-0 text-sm text-ink-secondary">{label}</span>
      <div className="flex-1">
        <div className="h-2.5 w-full bg-surface-raised">
          <div className={cn("h-full transition-all duration-500", color)} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
      </div>
      <span className="w-12 text-right font-mono text-sm font-bold text-ink">{value}%</span>
    </div>
  );
}

/* ── Stat Mini ────────────────────────────────────────────────── */

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
    <div className={cn("border-t-2 bg-surface-raised px-4 py-3", color)}>
      <p className="text-[10px] font-medium text-ink-muted">{label}</p>
      <p className="font-serif text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

/* ── Score helpers ──────────────────────────────────────────────── */

function ScoreCell({ value }: { value: number }) {
  const color = value >= 80 ? "text-editorial-green" : value >= 60 ? "text-editorial-gold" : "text-editorial-red";
  return <span className={cn("font-mono text-sm font-bold", color)}>{value}</span>;
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 80 ? "bg-editorial-green/10 text-editorial-green" : score >= 60 ? "bg-editorial-gold/10 text-editorial-gold" : "bg-editorial-red/10 text-editorial-red";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold", color)}>
      {score}
    </span>
  );
}

function StatusBadge({ status }: { status: "pass" | "warning" | "fail" }) {
  const map = { pass: "success", warning: "warning", fail: "danger" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
}

/* ── Empty State ──────────────────────────────────────────────── */

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-surface-raised p-4">
          <Info size={24} className="text-ink-muted" />
        </div>
        <h3 className="font-serif text-lg font-bold text-ink">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-ink-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

/* ── Table Header Helper ──────────────────────────────────────── */

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("py-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted", className)}>
      {children}
    </th>
  );
}

/* ── CHART COLORS ──────────────────────────────────────────────── */

const COLORS = ["#c0392b", "#b8860b", "#27ae60", "#8b5cf6", "#3b82f6", "#ec4899"];

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export function SearchAIAdminClient(props: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [selectedProject, setSelectedProject] = useState<string>("");

  return (
    <div className="space-y-6">
      {/* Header + Project Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Search & AI Analytics</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Platform-wide SEO, AEO, GEO & CRO analytics — {props.overview.totalProjects} project{props.overview.totalProjects !== 1 ? "s" : ""} tracked
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-ink-muted">Project:</label>
          <div className="relative">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="appearance-none border border-rule bg-surface-card py-1.5 pl-3 pr-8 text-sm text-ink focus:outline-none"
            >
              <option value="">All Projects</option>
              {props.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.domain ? `(${p.domain})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted" />
          </div>
        </div>
      </div>

      {selectedProject && (
        <div className="border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-2 text-xs text-editorial-gold">
          Filtering by project. Data shown is server-fetched for all projects — client filter coming in next iteration. Reload with project scope for accurate per-project data.
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-rule">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                isActive
                  ? "border-editorial-red text-ink"
                  : "border-transparent text-ink-muted hover:text-ink-secondary"
              )}
            >
              <Icon size={13} strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab overview={props.overview} positionDistribution={props.positionDistribution} keywordsByIntent={props.keywordsByIntent} />}
      {activeTab === "pages" && <PagesTab pages={props.cmsPages} />}
      {activeTab === "technical" && <TechnicalTab checks={props.technicalChecks} />}
      {activeTab === "content" && <ContentTab content={props.contentAnalysis} />}
      {activeTab === "traffic" && <TrafficTab />}
      {activeTab === "geo" && <GeoTabContent geoPresence={props.geoPresence} geoScores={props.geoScores} />}
      {activeTab === "search-console" && <SearchConsoleTab />}
      {activeTab === "aeo" && <AeoTab aeoOverview={props.aeoOverview} aeoScores={props.aeoScores} />}
      {activeTab === "cro" && <CroTab croAbTests={props.croAbTests} overview={props.overview} />}
      {activeTab === "recommendations" && <RecommendationsTab recommendations={props.recommendations} />}
    </div>
  );
}

/* ================================================================
   1. OVERVIEW TAB
   ================================================================ */

function OverviewTab({
  overview,
  positionDistribution,
  keywordsByIntent,
}: {
  overview: PlatformSeoOverview;
  positionDistribution: PositionBucket[];
  keywordsByIntent: KeywordByIntent[];
}) {
  const radarData = [
    { subject: "SEO", value: overview.seoScore },
    { subject: "Technical", value: overview.technicalScore },
    { subject: "Content", value: overview.contentScore },
    { subject: "Performance", value: overview.performanceScore },
    { subject: "Schema", value: overview.schemaScore },
    { subject: "GEO", value: overview.geoScore },
    { subject: "AEO", value: overview.aeoScore },
    { subject: "CRO", value: overview.croScore },
  ];

  const hasData = overview.totalKeywords > 0 || overview.totalPages > 0 || overview.totalAudits > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No Data Yet"
        description="Add projects, track keywords, and run site audits to see your SEO analytics here. All scores are computed from real data in your database."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 4 Score Gauges */}
      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Platform Scores</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-8 py-4 md:justify-around">
            <ScoreGauge score={overview.seoScore} label="SEO" size={130} color="var(--color-editorial-red)" />
            <ScoreGauge score={overview.geoScore} label="GEO" size={130} color="var(--color-editorial-green)" />
            <ScoreGauge score={overview.aeoScore} label="AEO" size={130} color="var(--color-editorial-gold)" />
            <ScoreGauge score={overview.croScore} label="CRO" size={130} color="#8b5cf6" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
        <StatMini label="Active Projects" value={overview.totalProjects} color="border-editorial-red" />
        <StatMini label="Keywords Tracked" value={overview.totalKeywords.toLocaleString()} color="border-editorial-gold" />
        <StatMini label="Content Pages" value={overview.totalPages.toLocaleString()} color="border-editorial-green" />
        <StatMini label="Completed Audits" value={overview.totalAudits} color="border-[#8b5cf6]" />
      </div>

      {/* Radar Chart + Technical Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Score Radar</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--color-rule)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--color-ink-muted)" }}
                  />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="var(--color-editorial-red)"
                    fill="var(--color-editorial-red)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Health Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4 py-2">
            <ProgressBar label="Technical Health" value={overview.technicalScore} color={overview.technicalScore >= 80 ? "bg-editorial-green" : overview.technicalScore >= 60 ? "bg-editorial-gold" : "bg-editorial-red"} />
            <ProgressBar label="Content Quality" value={overview.contentScore} color={overview.contentScore >= 80 ? "bg-editorial-green" : overview.contentScore >= 60 ? "bg-editorial-gold" : "bg-editorial-red"} />
            <ProgressBar label="Performance" value={overview.performanceScore} color={overview.performanceScore >= 80 ? "bg-editorial-green" : overview.performanceScore >= 60 ? "bg-editorial-gold" : "bg-editorial-red"} />
            <ProgressBar label="Accessibility" value={overview.accessibilityScore} color={overview.accessibilityScore >= 80 ? "bg-editorial-green" : overview.accessibilityScore >= 60 ? "bg-editorial-gold" : "bg-editorial-red"} />
            <ProgressBar label="Schema Coverage" value={overview.schemaScore} color={overview.schemaScore >= 80 ? "bg-editorial-green" : overview.schemaScore >= 60 ? "bg-editorial-gold" : "bg-editorial-red"} />
          </CardContent>
        </Card>
      </div>

      {/* Position Distribution + Intent Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {positionDistribution.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="font-serif text-lg">Keyword Position Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} stroke="var(--color-ink-muted)" />
                    <YAxis tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} stroke="var(--color-ink-muted)" />
                    <Tooltip contentStyle={{ background: "var(--color-surface-card)", border: "1px solid var(--color-rule)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
                    <Bar dataKey="count" name="Keywords">
                      {positionDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {keywordsByIntent.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="font-serif text-lg">Keywords by Intent</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={keywordsByIntent}
                      dataKey="count"
                      nameKey="intent"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }: PieLabelRenderProps) => `${name ?? ""} ${Math.round((percent ?? 0) * 100)}%`}
                    >
                      {keywordsByIntent.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-surface-card)", border: "1px solid var(--color-rule)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   2. PAGES TAB
   ================================================================ */

function PagesTab({ pages }: { pages: CmsPageAudit[] }) {
  if (pages.length === 0) {
    return (
      <EmptyState
        title="No Page Audit Data"
        description="Run a site audit from the dashboard to analyze your pages' meta titles, descriptions, and schema markup."
      />
    );
  }

  const titleStats = {
    good: pages.filter((p) => p.titleStatus === "good").length,
    short: pages.filter((p) => p.titleStatus === "short").length,
    long: pages.filter((p) => p.titleStatus === "long").length,
    missing: pages.filter((p) => p.titleStatus === "missing").length,
  };

  const descStats = {
    good: pages.filter((p) => p.descriptionStatus === "good").length,
    short: pages.filter((p) => p.descriptionStatus === "short").length,
    long: pages.filter((p) => p.descriptionStatus === "long").length,
    missing: pages.filter((p) => p.descriptionStatus === "missing").length,
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
        <StatMini label="Total Pages" value={pages.length} color="border-editorial-red" />
        <StatMini label="Good Titles" value={titleStats.good} color="border-editorial-green" />
        <StatMini label="Missing Descriptions" value={descStats.missing} color="border-editorial-gold" />
        <StatMini label="With Schema" value={pages.filter((p) => p.hasSchema).length} color="border-[#8b5cf6]" />
      </div>

      {/* Page Table */}
      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">CMS Page SEO Audit</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="border-b-2 border-rule-dark">
                <tr>
                  <Th className="pr-4 text-left">Page</Th>
                  <Th className="px-3 text-center">Title</Th>
                  <Th className="px-3 text-center">Desc</Th>
                  <Th className="px-3 text-center">Schema</Th>
                  <Th className="px-3 text-center">Status</Th>
                  <Th className="px-3 text-center">Issues</Th>
                </tr>
              </thead>
              <tbody>
                {pages.slice(0, 30).map((page) => (
                  <tr key={page.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                    <td className="py-2.5 pr-4">
                      <p className="max-w-xs truncate text-sm font-medium text-ink">{page.title ?? "—"}</p>
                      <p className="max-w-xs truncate text-xs text-ink-muted">{page.url}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <TitleDescBadge status={page.titleStatus} length={page.titleLength} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <TitleDescBadge status={page.descriptionStatus} length={page.descriptionLength} />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {page.hasSchema ? <Check size={14} className="mx-auto text-editorial-green" /> : <X size={14} className="mx-auto text-editorial-red" />}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn("font-mono text-sm", page.statusCode === 200 ? "text-editorial-green" : "text-editorial-red")}>{page.statusCode ?? "?"}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn("font-mono text-sm", page.issuesCount > 0 ? "text-editorial-red" : "text-editorial-green")}>{page.issuesCount}</span>
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

function TitleDescBadge({ status, length }: { status: string; length: number }) {
  const variant = status === "good" ? "success" : status === "missing" ? "danger" : "warning";
  return (
    <Badge variant={variant}>
      {status === "missing" ? "Missing" : `${length}ch`}
    </Badge>
  );
}

/* ================================================================
   3. TECHNICAL TAB
   ================================================================ */

function TechnicalTab({ checks }: { checks: TechnicalCheck[] }) {
  if (checks.length === 0) {
    return (
      <EmptyState
        title="No Technical Audit Data"
        description="Run a site audit to see 8 automated technical SEO checks with pass/warning/fail status."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {checks.map((check) => (
          <Card key={check.id}>
            <CardContent className="flex items-start gap-4 py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <StatusBadge status={check.status} />
                  <h3 className="text-sm font-bold text-ink">{check.name}</h3>
                </div>
                <p className="mt-1 text-xs text-ink-muted">{check.description}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span>{check.value} / {check.total}</span>
                    <span className="font-mono font-bold">{check.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full bg-surface-raised">
                    <div
                      className={cn(
                        "h-full transition-all",
                        check.status === "pass" ? "bg-editorial-green" : check.status === "warning" ? "bg-editorial-gold" : "bg-editorial-red"
                      )}
                      style={{ width: `${check.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   4. CONTENT TAB
   ================================================================ */

function ContentTab({ content }: { content: ContentAnalysisRow[] }) {
  if (content.length === 0) {
    return (
      <EmptyState
        title="No Content Pages"
        description="Add content pages to your project to see freshness analysis, word counts, and entity coverage scores."
      />
    );
  }

  const wordCountData = content
    .filter((c) => c.wordCount !== null)
    .slice(0, 20)
    .map((c) => ({
      name: (c.title ?? c.url).slice(0, 25),
      words: c.wordCount ?? 0,
    }));

  return (
    <div className="space-y-6">
      {/* Word Count Chart */}
      {wordCountData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Content Word Counts</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wordCountData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
                  <XAxis type="number" tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }} stroke="var(--color-ink-muted)" />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9, fontFamily: "var(--font-mono)" }} stroke="var(--color-ink-muted)" />
                  <Tooltip contentStyle={{ background: "var(--color-surface-card)", border: "1px solid var(--color-rule)", fontFamily: "var(--font-mono)", fontSize: 11 }} />
                  <Bar dataKey="words" fill="var(--color-editorial-gold)" name="Words" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Table */}
      <Card>
        <CardHeader><CardTitle className="font-serif text-lg">Content Analysis</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b-2 border-rule-dark">
                <tr>
                  <Th className="pr-4 text-left">Page</Th>
                  <Th className="px-3 text-center">Words</Th>
                  <Th className="px-3 text-center">Content</Th>
                  <Th className="px-3 text-center">Readability</Th>
                  <Th className="px-3 text-center">Freshness</Th>
                  <Th className="px-3 text-center">Entities</Th>
                  <Th className="px-3 text-center">Status</Th>
                </tr>
              </thead>
              <tbody>
                {content.slice(0, 25).map((row) => (
                  <tr key={row.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                    <td className="py-2.5 pr-4">
                      <p className="max-w-xs truncate text-sm font-medium text-ink">{row.title ?? row.url}</p>
                      <p className="max-w-xs truncate text-xs text-ink-muted">{row.url}</p>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-sm">{row.wordCount ?? "—"}</td>
                    <td className="px-3 py-2.5 text-center">{row.contentScore !== null ? <ScoreCell value={Math.round(row.contentScore)} /> : <span className="text-ink-muted">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{row.readabilityScore !== null ? <ScoreCell value={Math.round(row.readabilityScore)} /> : <span className="text-ink-muted">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{row.freshnessScore !== null ? <ScoreCell value={Math.round(row.freshnessScore)} /> : <span className="text-ink-muted">—</span>}</td>
                    <td className="px-3 py-2.5 text-center">{row.entityCoverage !== null ? <ScoreCell value={Math.round(row.entityCoverage)} /> : <span className="text-ink-muted">—</span>}</td>
                    <td className="px-3 py-2.5 text-center"><Badge variant={row.status === "published" ? "success" : "muted"}>{row.status ?? "—"}</Badge></td>
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
   5. TRAFFIC TAB (GA4 Placeholder)
   ================================================================ */

function TrafficTab() {
  return (
    <EmptyState
      title="Google Analytics Integration"
      description="Connect Google Analytics 4 to see real traffic data, sessions, bounce rate, and conversion metrics. This integration requires OAuth setup with Google Cloud Console."
    />
  );
}

/* ================================================================
   6. GEO TAB
   ================================================================ */

function GeoTabContent({
  geoPresence,
  geoScores,
}: {
  geoPresence: GeoPresenceRow[];
  geoScores: GeoScoreRow[];
}) {
  if (geoPresence.length === 0 && geoScores.length === 0) {
    return (
      <EmptyState
        title="No Geographic Data"
        description="Add keywords with location data and run GEO scoring to see geographic presence and AI-readiness scores."
      />
    );
  }

  // Average GEO dimensions
  const avgDimensions = geoScores.length > 0
    ? {
        citability: Math.round(geoScores.reduce((s, g) => s + g.citability, 0) / geoScores.length),
        topicalAuthority: Math.round(geoScores.reduce((s, g) => s + g.topicalAuthority, 0) / geoScores.length),
        sourceCredibility: Math.round(geoScores.reduce((s, g) => s + g.sourceCredibility, 0) / geoScores.length),
        contentFreshness: Math.round(geoScores.reduce((s, g) => s + g.contentFreshness, 0) / geoScores.length),
        semanticClarity: Math.round(geoScores.reduce((s, g) => s + g.semanticClarity, 0) / geoScores.length),
        aiDiscoverability: Math.round(geoScores.reduce((s, g) => s + g.aiDiscoverability, 0) / geoScores.length),
        overall: Math.round(geoScores.reduce((s, g) => s + g.overall, 0) / geoScores.length),
      }
    : null;

  return (
    <div className="space-y-6">
      {/* GEO Score + Dimensions */}
      {avgDimensions && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">GEO Readiness Score</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <ScoreGauge score={avgDimensions.overall} label="GEO Score" size={150} strokeWidth={10} color="var(--color-editorial-green)" />
              <div className="flex-1 space-y-3">
                <ProgressBar label="Citability" value={avgDimensions.citability} color={avgDimensions.citability >= 60 ? "bg-editorial-green" : "bg-editorial-gold"} />
                <ProgressBar label="Topical Authority" value={avgDimensions.topicalAuthority} color={avgDimensions.topicalAuthority >= 60 ? "bg-editorial-green" : "bg-editorial-gold"} />
                <ProgressBar label="Source Credibility" value={avgDimensions.sourceCredibility} color={avgDimensions.sourceCredibility >= 60 ? "bg-editorial-green" : "bg-editorial-gold"} />
                <ProgressBar label="Content Freshness" value={avgDimensions.contentFreshness} color={avgDimensions.contentFreshness >= 60 ? "bg-editorial-green" : "bg-editorial-red"} />
                <ProgressBar label="Semantic Clarity" value={avgDimensions.semanticClarity} color={avgDimensions.semanticClarity >= 60 ? "bg-editorial-green" : "bg-editorial-gold"} />
                <ProgressBar label="AI Discoverability" value={avgDimensions.aiDiscoverability} color={avgDimensions.aiDiscoverability >= 60 ? "bg-editorial-green" : "bg-editorial-gold"} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geographic Presence */}
      {geoPresence.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Geographic Presence</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <Th className="pr-4 text-left">Location</Th>
                    <Th className="px-3 text-center">Keywords</Th>
                    <Th className="px-3 text-center">Avg. Position</Th>
                  </tr>
                </thead>
                <tbody>
                  {geoPresence.map((row) => (
                    <tr key={row.location} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4 text-sm font-medium text-ink">{row.location}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{row.keywordsCount}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{row.avgPosition > 0 ? row.avgPosition : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page GEO Scores */}
      {geoScores.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Page GEO Scores</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <Th className="pr-4 text-left">Page</Th>
                    <Th className="px-3 text-center">Citability</Th>
                    <Th className="px-3 text-center">Authority</Th>
                    <Th className="px-3 text-center">Credibility</Th>
                    <Th className="px-3 text-center">Freshness</Th>
                    <Th className="px-3 text-center">Clarity</Th>
                    <Th className="px-3 text-center">AI Disc.</Th>
                    <Th className="px-3 text-center">Overall</Th>
                  </tr>
                </thead>
                <tbody>
                  {geoScores.slice(0, 20).map((g, i) => (
                    <tr key={i} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4">
                        <p className="max-w-xs truncate text-sm font-medium text-ink">{g.pageTitle ?? g.pageUrl}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={g.citability} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={g.topicalAuthority} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={g.sourceCredibility} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={g.contentFreshness} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={g.semanticClarity} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={g.aiDiscoverability} /></td>
                      <td className="px-3 py-2.5 text-center"><ScorePill score={g.overall} /></td>
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
   7. SEARCH CONSOLE TAB (Placeholder)
   ================================================================ */

function SearchConsoleTab() {
  return (
    <EmptyState
      title="Google Search Console Integration"
      description="Connect Google Search Console to see impressions, clicks, CTR, and position data directly from Google. This requires OAuth setup with Google Cloud Console and Search Console API access."
    />
  );
}

/* ================================================================
   8. AEO TAB
   ================================================================ */

function AeoTab({
  aeoOverview,
  aeoScores,
}: {
  aeoOverview: AeoOverviewData;
  aeoScores: AeoScoreRow[];
}) {
  const hasData = aeoOverview.totalMentions > 0 || aeoScores.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No AEO Data"
        description="Track AI engine mentions by adding entries to the aeo_tracking table, and add content pages to generate AEO readiness scores."
      />
    );
  }

  // Average AEO scores
  const avgScores = aeoScores.length > 0
    ? {
        schemaRichness: Math.round(aeoScores.reduce((s, a) => s + a.schemaRichness, 0) / aeoScores.length),
        faqCoverage: Math.round(aeoScores.reduce((s, a) => s + a.faqCoverage, 0) / aeoScores.length),
        directAnswer: Math.round(aeoScores.reduce((s, a) => s + a.directAnswerReadiness, 0) / aeoScores.length),
        entityMarkup: Math.round(aeoScores.reduce((s, a) => s + a.entityMarkup, 0) / aeoScores.length),
        speakable: Math.round(aeoScores.reduce((s, a) => s + a.speakableContent, 0) / aeoScores.length),
        aiSnippet: Math.round(aeoScores.reduce((s, a) => s + a.aiSnippetCompatibility, 0) / aeoScores.length),
        overall: Math.round(aeoScores.reduce((s, a) => s + a.overall, 0) / aeoScores.length),
      }
    : null;

  const radarData = avgScores
    ? [
        { subject: "Schema", value: avgScores.schemaRichness },
        { subject: "FAQ", value: avgScores.faqCoverage },
        { subject: "Direct Answer", value: avgScores.directAnswer },
        { subject: "Entities", value: avgScores.entityMarkup },
        { subject: "Speakable", value: avgScores.speakable },
        { subject: "AI Snippet", value: avgScores.aiSnippet },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* AEO Score + Radar */}
      {avgScores && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-serif text-lg">AEO Readiness Score</CardTitle></CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-4">
              <ScoreGauge score={avgScores.overall} label="AEO Score" size={140} strokeWidth={10} color="var(--color-editorial-gold)" />
              <div className="w-full space-y-3">
                <ProgressBar label="Schema Richness" value={avgScores.schemaRichness} color="bg-editorial-red" />
                <ProgressBar label="FAQ Coverage" value={avgScores.faqCoverage} color="bg-editorial-gold" />
                <ProgressBar label="Direct Answer" value={avgScores.directAnswer} color="bg-editorial-green" />
                <ProgressBar label="Entity Markup" value={avgScores.entityMarkup} color="bg-[#8b5cf6]" />
                <ProgressBar label="Speakable Content" value={avgScores.speakable} color="bg-[#3b82f6]" />
                <ProgressBar label="AI Snippet" value={avgScores.aiSnippet} color="bg-[#ec4899]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-serif text-lg">AEO Dimensions</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--color-rule)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "var(--color-ink-muted)" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Score" dataKey="value" stroke="var(--color-editorial-gold)" fill="var(--color-editorial-gold)" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Engine Breakdown */}
      {aeoOverview.engineBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">AI Engine Mentions ({aeoOverview.totalMentions} total)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {aeoOverview.engineBreakdown.map((e) => (
                <div key={e.engine} className="border border-rule bg-surface-raised px-4 py-3 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">{e.engine}</p>
                  <p className="mt-1 font-serif text-2xl font-bold text-ink">{e.count}</p>
                  <p className="text-xs text-ink-muted">{e.mentionRate}% of total</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AEO Scores Table */}
      {aeoScores.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Page AEO Scores</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <Th className="pr-4 text-left">Page</Th>
                    <Th className="px-3 text-center">Schema</Th>
                    <Th className="px-3 text-center">FAQ</Th>
                    <Th className="px-3 text-center">Answer</Th>
                    <Th className="px-3 text-center">Entity</Th>
                    <Th className="px-3 text-center">Speakable</Th>
                    <Th className="px-3 text-center">AI Compat</Th>
                    <Th className="px-3 text-center">Overall</Th>
                  </tr>
                </thead>
                <tbody>
                  {aeoScores.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4">
                        <p className="max-w-xs truncate text-sm font-medium text-ink">{row.pageTitle ?? row.pageUrl}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={row.schemaRichness} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={row.faqCoverage} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={row.directAnswerReadiness} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={row.entityMarkup} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={row.speakableContent} /></td>
                      <td className="px-3 py-2.5 text-center"><ScoreCell value={row.aiSnippetCompatibility} /></td>
                      <td className="px-3 py-2.5 text-center"><ScorePill score={row.overall} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Mentions */}
      {aeoOverview.recentMentions.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">Recent AI Mentions</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <Th className="pr-4 text-left">Query</Th>
                    <Th className="px-3 text-center">Engine</Th>
                    <Th className="px-3 text-center">Type</Th>
                    <Th className="px-3 text-left">URL Cited</Th>
                    <Th className="px-3 text-center">Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {aeoOverview.recentMentions.map((m) => (
                    <tr key={m.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4 text-sm font-medium text-ink">{m.query}</td>
                      <td className="px-3 py-2.5 text-center"><Badge variant="muted">{m.aiEngine}</Badge></td>
                      <td className="px-3 py-2.5 text-center"><Badge variant="info">{m.mentionType.replace(/_/g, " ")}</Badge></td>
                      <td className="px-3 py-2.5 text-sm text-ink-muted">{m.urlCited ? <span className="max-w-xs truncate block">{m.urlCited}</span> : "—"}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-ink-muted">{m.trackedDate}</td>
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
   9. CRO TAB
   ================================================================ */

function CroTab({
  croAbTests,
  overview,
}: {
  croAbTests: CroAbTestRow[];
  overview: PlatformSeoOverview;
}) {
  return (
    <div className="space-y-6">
      {/* CRO Score */}
      <Card>
        <CardContent className="flex flex-col items-center gap-8 py-6 md:flex-row">
          <ScoreGauge score={overview.croScore} label="CRO Score" size={140} strokeWidth={10} color="#8b5cf6" />
          <div className="grid flex-1 grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-3">
            <StatMini label="Keywords Tracked" value={overview.totalKeywords.toLocaleString()} color="border-editorial-red" />
            <StatMini label="Content Pages" value={overview.totalPages.toLocaleString()} color="border-editorial-gold" />
            <StatMini label="A/B Tests" value={croAbTests.length} color="border-[#8b5cf6]" />
          </div>
        </CardContent>
      </Card>

      {/* A/B Tests */}
      {croAbTests.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="font-serif text-lg">A/B Tests</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {croAbTests.map((test) => {
                const rateA = test.variantAVisitors > 0 ? (test.variantAConversions / test.variantAVisitors * 100) : 0;
                const rateB = test.variantBVisitors > 0 ? (test.variantBConversions / test.variantBVisitors * 100) : 0;
                return (
                  <div key={test.id} className="border border-rule p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-ink">{test.testName}</h4>
                        <p className="text-xs text-ink-muted">{test.pageUrl}</p>
                      </div>
                      <Badge variant={test.status === "running" ? "success" : test.status === "completed" ? "muted" : "warning"}>
                        {test.status}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div className={cn("border p-3", test.winner === "a" ? "border-editorial-green bg-editorial-green/5" : "border-rule")}>
                        <p className="text-xs font-bold text-ink-muted">{test.variantAName}</p>
                        <p className="font-mono text-lg font-bold text-ink">{rateA.toFixed(1)}%</p>
                        <p className="text-xs text-ink-muted">{test.variantAConversions} / {test.variantAVisitors} visitors</p>
                      </div>
                      <div className={cn("border p-3", test.winner === "b" ? "border-editorial-green bg-editorial-green/5" : "border-rule")}>
                        <p className="text-xs font-bold text-ink-muted">{test.variantBName}</p>
                        <p className="font-mono text-lg font-bold text-ink">{rateB.toFixed(1)}%</p>
                        <p className="text-xs text-ink-muted">{test.variantBConversions} / {test.variantBVisitors} visitors</p>
                      </div>
                    </div>
                    {test.significance > 0 && (
                      <p className="mt-2 text-xs text-ink-muted">Statistical significance: <span className="font-mono font-bold">{test.significance}%</span></p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No A/B Tests"
          description="Create A/B tests in the cro_ab_tests table to track conversion experiments across your pages."
        />
      )}
    </div>
  );
}

/* ================================================================
   10. RECOMMENDATIONS TAB
   ================================================================ */

function RecommendationsTab({
  recommendations,
}: {
  recommendations: SeoRecommendation[];
}) {
  const [filter, setFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ["all", ...new Set(recommendations.map((r) => r.category))];
  const filtered = filter === "all" ? recommendations : recommendations.filter((r) => r.category === filter);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  if (recommendations.length === 0) {
    return (
      <EmptyState
        title="No Recommendations"
        description="Run a site audit and add content to generate actionable SEO recommendations."
      />
    );
  }

  const criticalCount = recommendations.filter((r) => r.severity === "critical").length;
  const warningCount = recommendations.filter((r) => r.severity === "warning").length;
  const infoCount = recommendations.filter((r) => r.severity === "info").length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-px border border-rule bg-rule">
        <StatMini label="Critical" value={criticalCount} color="border-editorial-red" />
        <StatMini label="Warnings" value={warningCount} color="border-editorial-gold" />
        <StatMini label="Info" value={infoCount} color="border-editorial-green" />
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors",
              filter === cat ? "bg-ink text-surface-cream" : "bg-surface-raised text-ink-muted hover:text-ink"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-3">
        {filtered.map((rec) => {
          const borderColor = rec.severity === "critical" ? "border-l-editorial-red" : rec.severity === "warning" ? "border-l-editorial-gold" : "border-l-editorial-green";
          const SevIcon = rec.severity === "critical" ? AlertTriangle : rec.severity === "warning" ? AlertTriangle : Info;

          return (
            <div key={rec.id} className={cn("border border-rule border-l-4 bg-surface-card p-4", borderColor)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <SevIcon
                    size={16}
                    className={cn(
                      "mt-0.5 shrink-0",
                      rec.severity === "critical" ? "text-editorial-red" : rec.severity === "warning" ? "text-editorial-gold" : "text-editorial-green"
                    )}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-ink">{rec.title}</h4>
                      <Badge variant="muted">{rec.category}</Badge>
                      {rec.affectedCount > 0 && (
                        <span className="text-xs text-ink-muted">({rec.affectedCount} affected)</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-secondary">{rec.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(`${rec.title}: ${rec.description}`, rec.id)}
                  className="shrink-0 p-1 text-ink-muted transition-colors hover:text-ink"
                  title="Copy to clipboard"
                >
                  {copiedId === rec.id ? <Check size={14} className="text-editorial-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
