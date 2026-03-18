"use client";

import { useState, useCallback } from "react";
import {
  Search,
  FileText,
  Wrench,
  BarChart3,
  Globe2,
  Lightbulb,
  FlaskConical,
  Check,
  X,
  Copy,
  AlertTriangle,
  Info,
  MessageSquare,
  Brain,
  Target,
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
  LineChart,
  Line,
  Cell,
} from "recharts";
import type { SelfAuditResult, CrawledPage } from "@/lib/crawl/self-audit";
import type {
  GA4Overview,
  GA4PageData,
  GA4TrafficSource,
  GA4DailyData,
} from "@/lib/google/analytics";
import type {
  GSCOverview,
  GSCQuery,
  GSCPage,
  GSCDailyData,
  GSCDevice,
  GSCCountry,
} from "@/lib/google/search-console";

/* ── Tabs ──────────────────────────────────────────────────────── */

const TABS = [
  { id: "overview",      label: "Overview",        icon: BarChart3 },
  { id: "pages",         label: "Pages",           icon: FileText },
  { id: "technical",     label: "Technical",       icon: Wrench },
  { id: "content",       label: "Content",         icon: FileText },
  { id: "traffic",       label: "Traffic",         icon: BarChart3 },
  { id: "geo",           label: "GEO",             icon: Globe2 },
  { id: "search-console",label: "Search Console",  icon: Search },
  { id: "aeo",           label: "AEO",             icon: MessageSquare },
  { id: "cro",           label: "CRO",             icon: Target },
  { id: "recommendations",label: "Recommendations",icon: Lightbulb },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  audit: SelfAuditResult;
  ga4: {
    propertyId: string | null;
    overview: GA4Overview | null;
    pages: GA4PageData[];
    sources: GA4TrafficSource[];
    daily: GA4DailyData[];
    error?: string | null;
  };
  gsc: {
    siteUrl: string | null;
    overview: GSCOverview | null;
    queries: GSCQuery[];
    pages: GSCPage[];
    daily: GSCDailyData[];
    devices: GSCDevice[];
    countries: GSCCountry[];
    error?: string | null;
  };
}

/* ── Helpers ───────────────────────────────────────────────────── */

function ScoreGauge({ label, score, color }: { label: string; score: number; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-rule/30" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="font-mono text-2xl font-bold text-ink">{score}</span>
      <span className="text-[10px] uppercase tracking-widest text-ink-muted">{label}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  const v = severity === "critical" ? "danger" : severity === "warning" ? "warning" : "info";
  return <Badge variant={v}>{severity}</Badge>;
}

function MetaLengthBadge({ length, min, max }: { length: number; min: number; max: number }) {
  if (length === 0) return <Badge variant="danger">Missing</Badge>;
  if (length < min) return <Badge variant="warning">{length} (short)</Badge>;
  if (length > max) return <Badge variant="warning">{length} (long)</Badge>;
  return <Badge variant="success">{length}</Badge>;
}

function BoolBadge({ value, yes = "Yes", no = "No" }: { value: boolean; yes?: string; no?: string }) {
  return value
    ? <Badge variant="success"><Check className="w-3 h-3 mr-0.5" />{yes}</Badge>
    : <Badge variant="danger"><X className="w-3 h-3 mr-0.5" />{no}</Badge>;
}

function ProgressBar({ value, max = 100, color = "bg-editorial-green" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-2 bg-rule/20 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="font-serif text-lg text-ink">{title}</p>
        <p className="mt-2 text-sm text-ink-muted">{description}</p>
      </CardContent>
    </Card>
  );
}

/* ── Main Component ────────────────────────────────────────────── */

export function SearchAIAdminClient({ audit, ga4, gsc }: Props) {
  const [tab, setTab] = useState<TabId>("overview");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  const pages = audit.pages;
  const issues = audit.issues;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Search & AI Analytics</h1>
          <p className="text-sm text-ink-muted">
            Self-audit of {audit.siteUrl} &mdash; {audit.totalPages} pages crawled at{" "}
            {new Date(audit.crawledAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            {ga4.propertyId ? (
              <Badge variant={ga4.error ? "warning" : "success"}>
                {ga4.error ? "GA4 Error" : "GA4 Connected"}
              </Badge>
            ) : (
              <Badge variant="muted">GA4 Not Connected</Badge>
            )}
            {gsc.siteUrl ? (
              <Badge variant={gsc.error ? "warning" : "success"}>
                {gsc.error ? "GSC Error" : "GSC Connected"}
              </Badge>
            ) : (
              <Badge variant="muted">GSC Not Connected</Badge>
            )}
          </div>
          {(ga4.error || gsc.error) && (
            <p className="text-[10px] text-editorial-red max-w-xs text-right">
              {ga4.error || gsc.error}
            </p>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-rule pb-px">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wider whitespace-nowrap transition-colors border-b-2",
                tab === t.id
                  ? "border-ink text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {tab === "overview" && <OverviewTab audit={audit} />}
      {tab === "pages" && <PagesTab pages={pages} />}
      {tab === "technical" && <TechnicalTab pages={pages} />}
      {tab === "content" && <ContentTab pages={pages} />}
      {tab === "traffic" && <TrafficTab ga4={ga4} />}
      {tab === "geo" && <GeoTab pages={pages} geoScore={audit.geoScore} />}
      {tab === "search-console" && <SearchConsoleTab gsc={gsc} />}
      {tab === "aeo" && <AeoTab pages={pages} aeoScore={audit.aeoScore} />}
      {tab === "cro" && <CroTab pages={pages} croScore={audit.croScore} />}
      {tab === "recommendations" && (
        <RecommendationsTab
          issues={issues}
          severityFilter={severityFilter}
          setSeverityFilter={setSeverityFilter}
        />
      )}
    </div>
  );
}

/* ================================================================
   TAB 1: Overview
   ================================================================ */

function OverviewTab({ audit }: { audit: SelfAuditResult }) {
  const radarData = [
    { subject: "SEO", score: audit.seoScore },
    { subject: "Technical", score: audit.technicalScore },
    { subject: "Content", score: audit.contentScore },
    { subject: "AEO", score: audit.aeoScore },
    { subject: "GEO", score: audit.geoScore },
    { subject: "CRO", score: audit.croScore },
  ];

  const criticals = audit.issues.filter((i) => i.severity === "critical").length;
  const warnings = audit.issues.filter((i) => i.severity === "warning").length;
  const infos = audit.issues.filter((i) => i.severity === "info").length;

  return (
    <div className="space-y-6">
      {/* Score Gauges */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <ScoreGauge label="SEO" score={audit.seoScore} color="#27ae60" />
        <ScoreGauge label="Technical" score={audit.technicalScore} color="#2980b9" />
        <ScoreGauge label="Content" score={audit.contentScore} color="#8e44ad" />
        <ScoreGauge label="AEO" score={audit.aeoScore} color="#d35400" />
        <ScoreGauge label="GEO" score={audit.geoScore} color="#16a085" />
        <ScoreGauge label="CRO" score={audit.croScore} color="#c0392b" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Score Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" stroke="#666" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#999" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                <Radar dataKey="score" stroke="#27ae60" fill="#27ae60" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Issue Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Health Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-rule rounded">
              <span className="text-sm text-ink">Pages Crawled</span>
              <span className="font-mono font-bold text-ink">{audit.totalPages}</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-editorial-red/30 bg-editorial-red/5 rounded">
              <span className="text-sm text-editorial-red">Critical Issues</span>
              <span className="font-mono font-bold text-editorial-red">{criticals}</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-editorial-gold/30 bg-editorial-gold/5 rounded">
              <span className="text-sm text-editorial-gold">Warnings</span>
              <span className="font-mono font-bold text-editorial-gold">{warnings}</span>
            </div>
            <div className="flex items-center justify-between p-3 border border-editorial-blue/30 bg-editorial-blue/5 rounded">
              <span className="text-sm text-editorial-blue">Info</span>
              <span className="font-mono font-bold text-editorial-blue">{infos}</span>
            </div>

            <div className="pt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-ink-muted">Quick Wins</p>
              {audit.issues.filter((i) => i.severity === "critical").slice(0, 3).map((issue) => (
                <div key={issue.id} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-editorial-red shrink-0" />
                  <span className="text-ink">{issue.title}</span>
                </div>
              ))}
              {criticals === 0 && (
                <p className="text-sm text-editorial-green flex items-center gap-1">
                  <Check className="w-4 h-4" /> No critical issues found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================
   TAB 2: Pages
   ================================================================ */

function PagesTab({ pages }: { pages: CrawledPage[] }) {
  if (pages.length === 0) return <EmptyState title="No Pages Crawled" description="The self-crawler didn't find any pages." />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">Page Meta Audit</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Path</th>
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Status</th>
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Title</th>
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Meta Desc</th>
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">H1</th>
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Schema</th>
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">OG Image</th>
              <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Load Time</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.path} className="border-b border-rule/50">
                <td className="py-2 font-mono text-xs text-ink">{p.path}</td>
                <td className="py-2">
                  <Badge variant={p.statusCode === 200 ? "success" : "danger"}>{p.statusCode}</Badge>
                </td>
                <td className="py-2">
                  <MetaLengthBadge length={p.titleLength} min={30} max={60} />
                </td>
                <td className="py-2">
                  <MetaLengthBadge length={p.descriptionLength} min={70} max={160} />
                </td>
                <td className="py-2">
                  <Badge variant={p.h1Count === 1 ? "success" : p.h1Count === 0 ? "danger" : "warning"}>
                    {p.h1Count} H1{p.h1Count !== 1 ? "s" : ""}
                  </Badge>
                </td>
                <td className="py-2">
                  <BoolBadge value={p.hasSchema} yes={p.schemaTypes.join(", ")} no="None" />
                </td>
                <td className="py-2">
                  <BoolBadge value={p.hasOgImage} />
                </td>
                <td className="py-2">
                  <Badge variant={p.loadTimeMs < 2000 ? "success" : p.loadTimeMs < 4000 ? "warning" : "danger"}>
                    {(p.loadTimeMs / 1000).toFixed(1)}s
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

/* ================================================================
   TAB 3: Technical
   ================================================================ */

function TechnicalTab({ pages }: { pages: CrawledPage[] }) {
  const n = pages.length || 1;
  const checks = [
    { label: "200 Status Codes", count: pages.filter((p) => p.statusCode === 200).length, total: n },
    { label: "Single H1 Tag", count: pages.filter((p) => p.h1Count === 1).length, total: n },
    { label: "Canonical URL Set", count: pages.filter((p) => p.hasCanonical).length, total: n },
    { label: "Structured Data", count: pages.filter((p) => p.hasSchema).length, total: n },
    { label: "OG Image Present", count: pages.filter((p) => p.hasOgImage).length, total: n },
    { label: "Lang Attribute Set", count: pages.filter((p) => p.lang.length > 0).length, total: n },
    { label: "Fast Load (<3s)", count: pages.filter((p) => p.loadTimeMs < 3000).length, total: n },
    { label: "All Images Have Alt", count: pages.filter((p) => p.imagesWithoutAlt === 0).length, total: n },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-lg">Technical Health Checks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checks.map((c) => {
          const pct = Math.round((c.count / c.total) * 100);
          const color = pct === 100 ? "bg-editorial-green" : pct >= 70 ? "bg-editorial-gold" : "bg-editorial-red";
          return (
            <div key={c.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink">{c.label}</span>
                <span className="font-mono text-ink-muted">{c.count}/{c.total} ({pct}%)</span>
              </div>
              <ProgressBar value={c.count} max={c.total} color={color} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ================================================================
   TAB 4: Content
   ================================================================ */

function ContentTab({ pages }: { pages: CrawledPage[] }) {
  const chartData = pages.map((p) => ({
    path: p.path,
    words: p.wordCount,
    headings: p.h2Count + p.h3Count,
    lists: p.listCount,
  }));

  return (
    <div className="space-y-6">
      {/* Word Count Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Word Count by Page</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="path" tick={{ fontSize: 10, fill: "#999" }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10, fill: "#999" }} />
              <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #444", color: "#eee" }} />
              <Bar dataKey="words" fill="#2980b9" name="Words" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Content Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Content Signals</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Path</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Words</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">H2s</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">H3s</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Lists</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Images</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Internal Links</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">External Links</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-rule/50">
                  <td className="py-2 font-mono text-xs text-ink">{p.path}</td>
                  <td className="py-2 font-mono text-xs">
                    <Badge variant={p.wordCount >= 300 ? "success" : "warning"}>{p.wordCount}</Badge>
                  </td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.h2Count}</td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.h3Count}</td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.listCount}</td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.imageCount}</td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.internalLinks}</td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.externalLinks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================
   TAB 5: Traffic (GA4)
   ================================================================ */

function TrafficTab({ ga4 }: { ga4: Props["ga4"] }) {
  if (!ga4.propertyId) {
    return (
      <EmptyState
        title="Google Analytics Not Connected"
        description="Set GA4_PROPERTY_ID in your .env.local (and Vercel env vars for production). You can find your Property ID in Google Analytics Admin → Property Settings."
      />
    );
  }

  if (ga4.error) {
    return (
      <EmptyState
        title="Google Analytics Error"
        description={`GA4 Property ID is set (${ga4.propertyId}) but the API returned an error: ${ga4.error}. Check that the service account has Viewer access on this GA4 property.`}
      />
    );
  }

  const overview = ga4.overview;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Sessions", value: overview.totalSessions.toLocaleString() },
            { label: "Users", value: overview.totalUsers.toLocaleString() },
            { label: "Pageviews", value: overview.totalPageviews.toLocaleString() },
            { label: "Avg Duration", value: `${Math.round(overview.avgSessionDuration)}s` },
            { label: "Bounce Rate", value: `${(overview.bounceRate * 100).toFixed(1)}%` },
            { label: "New Users", value: overview.newUsers.toLocaleString() },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="py-4 text-center">
                <p className="font-mono text-xl font-bold text-ink">{s.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-ink-muted mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Daily Traffic Chart */}
      {ga4.daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Daily Traffic (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ga4.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#999" }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: "#999" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #444", color: "#eee" }} />
                <Line type="monotone" dataKey="sessions" stroke="#27ae60" strokeWidth={2} name="Sessions" dot={false} />
                <Line type="monotone" dataKey="pageviews" stroke="#2980b9" strokeWidth={1.5} name="Pageviews" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Pages */}
        {ga4.pages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Top Pages</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rule text-left">
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Path</th>
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Views</th>
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {ga4.pages.slice(0, 10).map((p, i) => (
                    <tr key={i} className="border-b border-rule/50">
                      <td className="py-2 font-mono text-xs text-ink">{p.path}</td>
                      <td className="py-2 font-mono text-xs text-ink-muted">{p.pageviews.toLocaleString()}</td>
                      <td className="py-2 font-mono text-xs text-ink-muted">{p.users.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Traffic Sources */}
        {ga4.sources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Traffic Sources</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rule text-left">
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Source / Medium</th>
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Sessions</th>
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {ga4.sources.slice(0, 10).map((s, i) => (
                    <tr key={i} className="border-b border-rule/50">
                      <td className="py-2 text-xs text-ink">{s.source} / {s.medium}</td>
                      <td className="py-2 font-mono text-xs text-ink-muted">{s.sessions.toLocaleString()}</td>
                      <td className="py-2 font-mono text-xs text-ink-muted">{s.users.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {!overview && ga4.daily.length === 0 && (
        <EmptyState
          title="No GA4 Data Available"
          description="GA4 is connected but no data was returned. Make sure the service account has Viewer access on the GA4 property."
        />
      )}
    </div>
  );
}

/* ================================================================
   TAB 6: GEO (Generative Engine Optimization)
   ================================================================ */

function GeoTab({ pages, geoScore }: { pages: CrawledPage[]; geoScore: number }) {
  const n = pages.length || 1;

  const dimensions = [
    { label: "Schema Markup", value: Math.round((pages.filter((p) => p.hasSchema).length / n) * 100), desc: "Pages with JSON-LD structured data" },
    { label: "OG Tags Present", value: Math.round((pages.filter((p) => p.hasOgImage).length / n) * 100), desc: "Pages with Open Graph metadata" },
    { label: "Rich Content (500+ words)", value: Math.round((pages.filter((p) => p.wordCount >= 500 && p.h2Count >= 3).length / n) * 100), desc: "Pages with substantial, well-structured content" },
    { label: "Breadcrumbs", value: Math.round((pages.filter((p) => p.hasBreadcrumbs).length / n) * 100), desc: "Pages with breadcrumb navigation" },
    { label: "Language Set", value: Math.round((pages.filter((p) => p.lang.length > 0).length / n) * 100), desc: "Pages with lang attribute" },
    { label: "Organization Schema", value: Math.round((pages.filter((p) => p.hasOrganizationSchema).length / n) * 100), desc: "Pages with Organization/LocalBusiness schema" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ScoreGauge label="GEO Score" score={geoScore} color="#16a085" />
        <div className="text-sm text-ink-muted max-w-md">
          GEO measures how well your pages are optimized for AI-powered search engines like ChatGPT, Gemini, and Perplexity.
          Higher scores mean better citability and AI discoverability.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">GEO Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dimensions.map((d) => {
            const color = d.value >= 80 ? "bg-editorial-green" : d.value >= 50 ? "bg-editorial-gold" : "bg-editorial-red";
            return (
              <div key={d.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-ink font-medium">{d.label}</span>
                    <span className="ml-2 text-xs text-ink-muted">{d.desc}</span>
                  </div>
                  <span className="font-mono text-sm text-ink">{d.value}%</span>
                </div>
                <ProgressBar value={d.value} color={color} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Page-level GEO signals */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Page GEO Signals</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Path</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Schema</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">OG Tags</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Breadcrumbs</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Org Schema</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Lang</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-rule/50">
                  <td className="py-2 font-mono text-xs text-ink">{p.path}</td>
                  <td className="py-2"><BoolBadge value={p.hasSchema} /></td>
                  <td className="py-2"><BoolBadge value={p.hasOgImage} /></td>
                  <td className="py-2"><BoolBadge value={p.hasBreadcrumbs} /></td>
                  <td className="py-2"><BoolBadge value={p.hasOrganizationSchema} /></td>
                  <td className="py-2"><BoolBadge value={p.lang.length > 0} yes={p.lang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================
   TAB 7: Search Console
   ================================================================ */

function SearchConsoleTab({ gsc }: { gsc: Props["gsc"] }) {
  if (!gsc.siteUrl) {
    return (
      <EmptyState
        title="Google Search Console Not Connected"
        description="Add your site to Search Console and grant Full access to the service account (optic-rank-seo@optic-rank.iam.gserviceaccount.com). Then set GSC_SITE_URL in .env.local and Vercel env vars (e.g., sc-domain:opticrank.com or https://opticrank.com/)."
      />
    );
  }

  if (gsc.error) {
    return (
      <EmptyState
        title="Google Search Console Error"
        description={`GSC Site URL is set (${gsc.siteUrl}) but the API returned an error: ${gsc.error}. Check that the service account has Full access on this property.`}
      />
    );
  }

  const overview = gsc.overview;

  const DEVICE_LABELS: Record<string, string> = {
    DESKTOP: "Desktop",
    MOBILE: "Mobile",
    TABLET: "Tablet",
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Clicks", value: overview.totalClicks.toLocaleString() },
            { label: "Total Impressions", value: overview.totalImpressions.toLocaleString() },
            { label: "Avg CTR", value: `${(overview.avgCTR * 100).toFixed(2)}%` },
            { label: "Avg Position", value: overview.avgPosition.toFixed(1) },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="py-4 text-center">
                <p className="font-mono text-xl font-bold text-ink">{s.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-ink-muted mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Daily Performance Chart */}
      {gsc.daily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Search Performance (Last 28 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gsc.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#999" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#999" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#999" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #444", color: "#eee" }} />
                <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#27ae60" strokeWidth={2} name="Clicks" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#2980b9" strokeWidth={1.5} name="Impressions" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Queries */}
      {gsc.queries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Top Search Queries</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Query</th>
                  <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Clicks</th>
                  <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Impressions</th>
                  <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">CTR</th>
                  <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Avg Position</th>
                </tr>
              </thead>
              <tbody>
                {gsc.queries.map((q, i) => (
                  <tr key={i} className="border-b border-rule/50">
                    <td className="py-2 text-xs text-ink font-medium">{q.query}</td>
                    <td className="py-2 font-mono text-xs text-ink-muted text-right">{q.clicks.toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs text-ink-muted text-right">{q.impressions.toLocaleString()}</td>
                    <td className="py-2 font-mono text-xs text-ink-muted text-right">{(q.ctr * 100).toFixed(1)}%</td>
                    <td className="py-2 font-mono text-xs text-right">
                      <span className={q.position <= 10 ? "text-editorial-green" : q.position <= 20 ? "text-editorial-gold" : "text-ink-muted"}>
                        {q.position.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Pages */}
        {gsc.pages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Top Pages</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rule text-left">
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Page</th>
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Clicks</th>
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Impr.</th>
                    <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {gsc.pages.slice(0, 15).map((p, i) => (
                    <tr key={i} className="border-b border-rule/50">
                      <td className="py-2 font-mono text-xs text-ink max-w-[200px] truncate">{p.page}</td>
                      <td className="py-2 font-mono text-xs text-ink-muted text-right">{p.clicks.toLocaleString()}</td>
                      <td className="py-2 font-mono text-xs text-ink-muted text-right">{p.impressions.toLocaleString()}</td>
                      <td className="py-2 font-mono text-xs text-right">
                        <span className={p.position <= 10 ? "text-editorial-green" : p.position <= 20 ? "text-editorial-gold" : "text-ink-muted"}>
                          {p.position.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Devices + Countries */}
        <div className="space-y-6">
          {gsc.devices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">By Device</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={gsc.devices.map(d => ({ ...d, device: DEVICE_LABELS[d.device] ?? d.device }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#999" }} />
                    <YAxis dataKey="device" type="category" width={70} tick={{ fontSize: 11, fill: "#ccc" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #444", color: "#eee" }} />
                    <Bar dataKey="clicks" fill="#27ae60" name="Clicks" radius={[0, 4, 4, 0]}>
                      {gsc.devices.map((_, i) => (
                        <Cell key={i} fill={["#27ae60", "#2980b9", "#8e44ad"][i % 3]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {gsc.countries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">Top Countries</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-rule text-left">
                      <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Country</th>
                      <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Clicks</th>
                      <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">Impressions</th>
                      <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gsc.countries.map((c, i) => (
                      <tr key={i} className="border-b border-rule/50">
                        <td className="py-2 text-xs text-ink font-medium uppercase">{c.country}</td>
                        <td className="py-2 font-mono text-xs text-ink-muted text-right">{c.clicks.toLocaleString()}</td>
                        <td className="py-2 font-mono text-xs text-ink-muted text-right">{c.impressions.toLocaleString()}</td>
                        <td className="py-2 font-mono text-xs text-ink-muted text-right">{(c.ctr * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {!overview && gsc.queries.length === 0 && gsc.daily.length === 0 && (
        <EmptyState
          title="No Search Console Data Yet"
          description="Search Console is connected but no data is available yet. It can take a few days for Google to start reporting data for new properties."
        />
      )}
    </div>
  );
}

/* ================================================================
   TAB 8: AEO (Answer Engine Optimization)
   ================================================================ */

function AeoTab({ pages, aeoScore }: { pages: CrawledPage[]; aeoScore: number }) {
  const n = pages.length || 1;

  const dimensions = [
    { label: "Schema Richness", value: Math.round((pages.filter((p) => p.schemaTypes.length >= 2).length / n) * 100) },
    { label: "FAQ Schema", value: Math.round((pages.filter((p) => p.hasFaqSchema).length / n) * 100) },
    { label: "Question Headings", value: Math.round((pages.filter((p) => p.questionCount >= 2).length / n) * 100) },
    { label: "Speakable Content", value: Math.round((pages.filter((p) => p.hasSpeakableSchema).length / n) * 100) },
    { label: "Lists Present", value: Math.round((pages.filter((p) => p.listCount >= 2).length / n) * 100) },
    { label: "HowTo Schema", value: Math.round((pages.filter((p) => p.hasHowToSchema).length / n) * 100) },
  ];

  const radarData = dimensions.map((d) => ({ subject: d.label, value: d.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ScoreGauge label="AEO Score" score={aeoScore} color="#d35400" />
        <div className="text-sm text-ink-muted max-w-md">
          AEO measures how well your content is optimized for featured snippets, People Also Ask,
          knowledge panels, and voice search results.
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">AEO Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" stroke="#666" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#999" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#888" }} />
                <Radar dataKey="value" stroke="#d35400" fill="#d35400" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dimension Bars */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Dimension Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dimensions.map((d) => {
              const color = d.value >= 80 ? "bg-editorial-green" : d.value >= 50 ? "bg-editorial-gold" : "bg-editorial-red";
              return (
                <div key={d.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink">{d.label}</span>
                    <span className="font-mono text-ink-muted">{d.value}%</span>
                  </div>
                  <ProgressBar value={d.value} color={color} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Page-level AEO signals */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Page AEO Signals</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Path</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">FAQ Schema</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">HowTo Schema</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Questions</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Lists</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Speakable</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-rule/50">
                  <td className="py-2 font-mono text-xs text-ink">{p.path}</td>
                  <td className="py-2"><BoolBadge value={p.hasFaqSchema} /></td>
                  <td className="py-2"><BoolBadge value={p.hasHowToSchema} /></td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.questionCount}</td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.listCount}</td>
                  <td className="py-2"><BoolBadge value={p.hasSpeakableSchema} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================
   TAB 9: CRO (Conversion Rate Optimization)
   ================================================================ */

function CroTab({ pages, croScore }: { pages: CrawledPage[]; croScore: number }) {
  const avgLoad = pages.length > 0
    ? Math.round(pages.reduce((s, p) => s + p.loadTimeMs, 0) / pages.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <ScoreGauge label="CRO Score" score={croScore} color="#c0392b" />
        <div className="text-sm text-ink-muted max-w-md">
          CRO measures page performance, user experience signals, and conversion readiness.
          Fast-loading pages with clear CTAs and healthy status codes score higher.
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="font-mono text-xl font-bold text-ink">{avgLoad}ms</p>
            <p className="text-[10px] uppercase tracking-widest text-ink-muted mt-1">Avg Load Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="font-mono text-xl font-bold text-ink">
              {pages.filter((p) => p.statusCode === 200).length}/{pages.length}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-ink-muted mt-1">Healthy Pages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="font-mono text-xl font-bold text-ink">
              {pages.filter((p) => p.internalLinks >= 3).length}/{pages.length}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-ink-muted mt-1">Good CTA Coverage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="font-mono text-xl font-bold text-ink">
              {pages.filter((p) => p.loadTimeMs < 2000).length}/{pages.length}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-ink-muted mt-1">Fast Pages (&lt;2s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Page Load Times */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Page Load Times</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pages.map((p) => ({ path: p.path, ms: p.loadTimeMs }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="path" tick={{ fontSize: 10, fill: "#999" }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10, fill: "#999" }} />
              <Tooltip formatter={(value) => [`${value}ms`, "Load Time"]} contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #444", color: "#eee" }} />
              <Bar dataKey="ms" name="Load Time (ms)">
                {pages.map((p, i) => (
                  <Cell
                    key={i}
                    fill={p.loadTimeMs < 2000 ? "#27ae60" : p.loadTimeMs < 4000 ? "#b8860b" : "#c0392b"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* CRO Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Conversion Signals</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Path</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Load Time</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Status</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Internal Links</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Title OK</th>
                <th className="pb-2 text-[10px] uppercase tracking-widest text-ink-muted font-medium">Meta Desc OK</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.path} className="border-b border-rule/50">
                  <td className="py-2 font-mono text-xs text-ink">{p.path}</td>
                  <td className="py-2">
                    <Badge variant={p.loadTimeMs < 2000 ? "success" : p.loadTimeMs < 4000 ? "warning" : "danger"}>
                      {p.loadTimeMs}ms
                    </Badge>
                  </td>
                  <td className="py-2">
                    <Badge variant={p.statusCode === 200 ? "success" : "danger"}>{p.statusCode}</Badge>
                  </td>
                  <td className="py-2 font-mono text-xs text-ink-muted">{p.internalLinks}</td>
                  <td className="py-2">
                    <BoolBadge value={p.titleLength >= 30 && p.titleLength <= 60} />
                  </td>
                  <td className="py-2">
                    <BoolBadge value={p.descriptionLength >= 70 && p.descriptionLength <= 160} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ================================================================
   TAB 10: Recommendations
   ================================================================ */

function RecommendationsTab({
  issues,
  severityFilter,
  setSeverityFilter,
}: {
  issues: SelfAuditResult["issues"];
  severityFilter: "all" | "critical" | "warning" | "info";
  setSeverityFilter: (f: "all" | "critical" | "warning" | "info") => void;
}) {
  const filtered =
    severityFilter === "all"
      ? issues
      : issues.filter((i) => i.severity === severityFilter);

  const copyIssue = useCallback((issue: SelfAuditResult["issues"][number]) => {
    const text = `[${issue.severity.toUpperCase()}] ${issue.title}\n${issue.description}\nAffected: ${issue.affectedPages.join(", ")}`;
    navigator.clipboard.writeText(text);
  }, []);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-ink-muted">Filter:</span>
        {(["all", "critical", "warning", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setSeverityFilter(f)}
            className={cn(
              "px-3 py-1 text-xs font-medium uppercase tracking-wider rounded transition-colors border",
              severityFilter === f
                ? "bg-ink text-surface-cream border-ink"
                : "bg-transparent text-ink-muted border-rule hover:border-ink"
            )}
          >
            {f} ({f === "all" ? issues.length : issues.filter((i) => i.severity === f).length})
          </button>
        ))}
      </div>

      {/* Issues List */}
      {filtered.length === 0 ? (
        <EmptyState title="No Issues Found" description="All checks passed for this filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => (
            <Card key={issue.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={issue.severity} />
                      <Badge variant="muted">{issue.category}</Badge>
                      <span className="text-sm font-medium text-ink">{issue.title}</span>
                    </div>
                    <p className="text-sm text-ink-muted">{issue.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {issue.affectedPages.map((path) => (
                        <span
                          key={path}
                          className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-raised text-ink-muted rounded"
                        >
                          {path}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => copyIssue(issue)}
                    className="p-1.5 text-ink-muted hover:text-ink transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
