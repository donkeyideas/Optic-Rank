"use client";

import { useState, useTransition, useCallback } from "react";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate, formatDateTime } from "@/lib/utils/format-date";
import {
  Shield,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Gauge,
  Eye,
  Zap,
  Search,
  Lock,
  ExternalLink,
  ClipboardCopy,
  Check,
  Code2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { useActionProgress } from "@/components/shared/action-progress";
import { runSiteAudit } from "@/lib/actions/site-audit";
import type { SiteAudit, AuditIssue, IssueSeverity, IssueCategory } from "@/types";

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface SiteAuditClientProps {
  latestAudit: SiteAudit | null;
  issues: AuditIssue[];
  pages: Array<{
    id: string;
    audit_id: string;
    url: string;
    title?: string | null;
    status_code?: number | null;
    load_time?: number | null;
    issues_count?: number | null;
    [key: string]: unknown;
  }>;
  history: SiteAudit[];
  projectId: string;
}

/* ------------------------------------------------------------------
   Helper Components
   ------------------------------------------------------------------ */

function ScoreCircle({
  score,
  label,
  color,
  size = "lg",
}: {
  score: number | null;
  label: string;
  color: "red" | "green" | "gold" | "blue" | "dark";
  size?: "sm" | "lg";
}) {
  // Show "N/A" when score is null (not measured, e.g. PageSpeed unavailable)
  if (score === null || score === undefined) {
    const sizeClasses = size === "lg"
      ? { container: "h-32 w-32", text: "text-[32px]" }
      : { container: "h-20 w-20", text: "text-[18px]" };
    return (
      <div className="flex flex-col items-center gap-2">
        <div className={`relative flex ${sizeClasses.container} items-center justify-center`}>
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" strokeWidth={size === "lg" ? 4 : 5} className="stroke-rule" />
          </svg>
          <span className={`font-serif ${sizeClasses.text} font-bold leading-none text-ink-muted`}>N/A</span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">{label}</span>
        {size === "sm" && <Progress value={0} color="dark" size="sm" className="w-full" />}
      </div>
    );
  }
  const colorMap = {
    red: "text-editorial-red border-editorial-red",
    green: "text-editorial-green border-editorial-green",
    gold: "text-editorial-gold border-editorial-gold",
    blue: "text-editorial-blue border-editorial-blue",
    dark: "text-ink border-ink",
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  if (size === "lg") {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="4"
              className="stroke-rule"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="4"
              strokeLinecap="square"
              className={`stroke-current ${colorMap[color].split(" ")[0]}`}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: "stroke-dashoffset 0.8s ease-out",
              }}
            />
          </svg>
          <span className={`font-serif text-[42px] font-bold leading-none ${colorMap[color].split(" ")[0]}`}>
            {score}
          </span>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
          {label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="5"
            className="stroke-rule"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="5"
            strokeLinecap="square"
            className={`stroke-current ${colorMap[color].split(" ")[0]}`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: "stroke-dashoffset 0.8s ease-out",
            }}
          />
        </svg>
        <span className={`font-serif text-[24px] font-bold leading-none ${colorMap[color].split(" ")[0]}`}>
          {score}
        </span>
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
        {label}
      </span>
      <Progress value={score} color={color} size="sm" className="w-full" />
    </div>
  );
}

const severityConfig: Record<
  IssueSeverity,
  { label: string; variant: "danger" | "warning" | "info"; icon: typeof AlertCircle; color: string }
> = {
  critical: { label: "Critical", variant: "danger", icon: AlertCircle, color: "text-editorial-red" },
  warning: { label: "Warning", variant: "warning", icon: AlertTriangle, color: "text-editorial-gold" },
  info: { label: "Info", variant: "info", icon: Info, color: "text-editorial-blue" },
};

const categoryConfig: Record<IssueCategory, { label: string; icon: typeof Search }> = {
  seo: { label: "SEO", icon: Search },
  performance: { label: "Performance", icon: Zap },
  accessibility: { label: "Accessibility", icon: Eye },
  content: { label: "Content", icon: FileText },
  security: { label: "Security", icon: Lock },
};

const defaultSeverity = { label: "Info", variant: "info" as const, icon: Info, color: "text-ink-muted" };
const defaultCategory = { label: "Other", icon: Info };

function IssueCard({ issue }: { issue: AuditIssue }) {
  const [expanded, setExpanded] = useState(false);
  const severity = severityConfig[issue.severity] ?? defaultSeverity;
  const category = categoryConfig[issue.category] ?? defaultCategory;
  const SeverityIcon = severity.icon;
  const CategoryIcon = category.icon;

  return (
    <Card className="transition-colors hover:bg-surface-raised/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 shrink-0 ${severity.color}`}>
            <SeverityIcon size={18} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant={severity.variant}>{severity.label}</Badge>
              <Badge variant="muted">
                <CategoryIcon size={10} className="mr-1" />
                {category.label}
              </Badge>
              <span className="text-[10px] font-semibold text-ink-muted">
                {issue.affected_pages} {issue.affected_pages === 1 ? "page" : "pages"} affected
              </span>
            </div>

            <h3 className="font-serif text-[15px] font-bold leading-snug text-ink">
              {issue.title}
            </h3>

            <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
              {issue.description}
            </p>

            {issue.recommendation && (
              <div className="mt-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-red transition-colors hover:text-editorial-red/80"
                >
                  {expanded ? (
                    <ChevronDown size={12} strokeWidth={2.5} />
                  ) : (
                    <ChevronRight size={12} strokeWidth={2.5} />
                  )}
                  Fix Recommendation
                </button>

                {expanded && (
                  <div className="mt-2 border-l-2 border-editorial-red/30 bg-surface-raised pl-3 py-2 pr-3">
                    <p className="text-[12px] leading-relaxed text-ink-secondary">
                      {issue.recommendation}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------
   Main Client Component
   ------------------------------------------------------------------ */

export function SiteAuditClient({
  latestAudit,
  issues,
  pages,
  history,
  projectId,
}: SiteAuditClientProps) {
  const timezone = useTimezone();
  const [categoryFilter, setCategoryFilter] = useState<IssueCategory | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<IssueSeverity | "all">("all");
  const [isPending, startTransition] = useTransition();
  const [auditError, setAuditError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { runAction, isRunning: isActionRunning } = useActionProgress();

  const handleCopyIssues = useCallback(() => {
    const realIssues = issues.filter((i) => !i.rule_id?.startsWith("cwv-metric-"));
    const grouped: Record<string, typeof realIssues> = { critical: [], warning: [], info: [] };
    for (const issue of realIssues) {
      (grouped[issue.severity] ??= []).push(issue);
    }

    const lines: string[] = [
      `Site Audit Report — ${latestAudit?.completed_at ? formatDate(latestAudit.completed_at, timezone) : "N/A"}`,
      `Health: ${latestAudit?.health_score ?? "N/A"} | SEO: ${latestAudit?.seo_score ?? "N/A"} | Performance: ${latestAudit?.performance_score ?? "N/A"} | Accessibility: ${latestAudit?.accessibility_score ?? "N/A"}`,
      `Pages crawled: ${latestAudit?.pages_crawled ?? 0} | Issues found: ${realIssues.length}`,
      "",
    ];

    for (const severity of ["critical", "warning", "info"] as const) {
      const group = grouped[severity];
      if (!group || group.length === 0) continue;
      lines.push(`=== ${severity.toUpperCase()} (${group.length}) ===`);
      for (const issue of group) {
        lines.push(`[${(categoryConfig[issue.category] ?? defaultCategory).label}] ${issue.title}`);
        lines.push(`  ${issue.description}`);
        if (issue.affected_pages > 0) lines.push(`  Pages affected: ${issue.affected_pages}`);
        if (issue.recommendation) lines.push(`  Fix: ${issue.recommendation}`);
        lines.push("");
      }
    }

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [issues, latestAudit]);

  function handleRunAudit() {
    setAuditError(null);
    runAction(
      { title: "Running Site Audit", description: "Crawling pages and analyzing technical SEO issues..." },
      () => runSiteAudit(projectId)
    );
  }

  // If no audit exists at all, show empty state
  if (!latestAudit) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink">Site Audit</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Crawl your site to discover technical SEO issues
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleRunAudit} disabled={isActionRunning || isPending}>
            <RefreshCw size={14} strokeWidth={2.5} />
            Run New Audit
          </Button>
        </div>
        {auditError && (
          <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
            {auditError}
          </div>
        )}
        <EmptyState
          icon={Shield}
          title="No Audits Run Yet"
          description="Click 'Run New Audit' to crawl your site and discover technical SEO issues, performance bottlenecks, and accessibility problems."
          actionLabel="Run New Audit"
          onAction={handleRunAudit}
        />
      </div>
    );
  }

  // Separate CWV metric entries from actual issues
  const cwvMetrics = issues.filter((i) => i.rule_id?.startsWith("cwv-metric-"));
  const realIssues = issues.filter((i) => !i.rule_id?.startsWith("cwv-metric-"));

  const criticalCount = realIssues.filter((i) => i.severity === "critical").length;
  const warningCount = realIssues.filter((i) => i.severity === "warning").length;
  const infoCount = realIssues.filter((i) => i.severity === "info").length;

  const filteredIssues = realIssues.filter((issue) => {
    if (categoryFilter !== "all" && issue.category !== categoryFilter) return false;
    if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
    return true;
  });

  // Parse CWV metrics for display
  const cwvData: Record<string, { title: string; value: number; good: boolean }> = {};
  for (const m of cwvMetrics) {
    const key = m.rule_id.replace("cwv-metric-", "");
    cwvData[key] = {
      title: m.title,
      value: parseFloat(m.description ?? "0"),
      good: (m.recommendation ?? "").startsWith("Good"),
    };
  }

  const fmtDate = (dateStr: string) => formatDateTime(dateStr, timezone);

  const getScoreColor = (score: number): "red" | "green" | "gold" => {
    if (score >= 80) return "green";
    if (score >= 60) return "gold";
    return "red";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Site Audit</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Last audit completed {latestAudit.completed_at ? fmtDate(latestAudit.completed_at) : "N/A"}
            {" "}&middot; {latestAudit.pages_crawled.toLocaleString()} pages crawled
            {" "}&middot; {latestAudit.issues_found} issues found
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleRunAudit} disabled={isPending}>
          <RefreshCw size={14} strokeWidth={2.5} className={isPending ? "animate-spin" : ""} />
          {isPending ? "Running..." : "Run New Audit"}
        </Button>
      </div>

      {auditError && (
        <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
          {auditError}
        </div>
      )}

      {/* SPA / JS-heavy site warning */}
      {latestAudit.is_spa && (
        <div className="flex items-start gap-3 border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3">
          <Code2 size={18} className="mt-0.5 shrink-0 text-editorial-gold" />
          <div>
            <p className="text-sm font-semibold text-ink">
              JavaScript-rendered site detected
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">
              This site uses client-side rendering (React, Next.js, Vue, etc.). Our crawler
              cannot execute JavaScript, so some SEO issues may be false positives &mdash;
              elements like titles, headings, and content that render after JS loads are not
              visible to the HTML crawler. For the most accurate results, use{" "}
              <span className="font-semibold">Google Lighthouse</span> or{" "}
              <span className="font-semibold">PageSpeed Insights</span> which execute JavaScript.
            </p>
          </div>
        </div>
      )}

      {/* Performance/Accessibility not measured warning */}
      {latestAudit.performance_score == null && latestAudit.accessibility_score == null && (
        <div className="flex items-start gap-3 border border-rule bg-surface-raised px-4 py-3">
          <Gauge size={18} className="mt-0.5 shrink-0 text-ink-muted" />
          <p className="text-[13px] leading-relaxed text-ink-secondary">
            <span className="font-semibold text-ink">Performance &amp; Accessibility scores unavailable.</span>{" "}
            Google PageSpeed Insights could not be reached for this site. These scores require
            PageSpeed data to calculate. The SEO and Health scores are based on crawl data only.
          </p>
        </div>
      )}

      {/* Score Cards Row */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCircle
              score={latestAudit.health_score ?? 0}
              label="Health Score"
              color={getScoreColor(latestAudit.health_score ?? 0)}
              size="lg"
            />
            <ScoreCircle
              score={latestAudit.seo_score ?? 0}
              label="SEO Score"
              color={getScoreColor(latestAudit.seo_score ?? 0)}
              size="sm"
            />
            <ScoreCircle
              score={latestAudit.performance_score ?? null}
              label="Performance"
              color={getScoreColor(latestAudit.performance_score ?? 0)}
              size="sm"
            />
            <ScoreCircle
              score={latestAudit.accessibility_score ?? null}
              label="Accessibility"
              color={getScoreColor(latestAudit.accessibility_score ?? 0)}
              size="sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      {Object.keys(cwvData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Core Web Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { key: "lcp", label: "LCP", unit: "s", divisor: 1000, threshold: 2500 },
                { key: "cls", label: "CLS", unit: "", divisor: 1, threshold: 0.1 },
                { key: "fcp", label: "FCP", unit: "s", divisor: 1000, threshold: 1800 },
                { key: "ttfb", label: "TTFB", unit: "ms", divisor: 1, threshold: 800 },
                { key: "tbt", label: "TBT", unit: "ms", divisor: 1, threshold: 200 },
                { key: "si", label: "Speed Index", unit: "s", divisor: 1000, threshold: 3400 },
              ].map(({ key, label, unit, divisor, threshold }) => {
                const metric = cwvData[key];
                if (!metric) return null;
                const displayValue = divisor > 1
                  ? (metric.value / divisor).toFixed(2)
                  : key === "cls" ? metric.value.toFixed(3) : Math.round(metric.value);
                return (
                  <div key={key} className="flex flex-col items-center gap-1 border border-rule p-3">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      {label}
                    </span>
                    <span
                      className={`font-mono text-xl font-bold tabular-nums ${
                        metric.good ? "text-editorial-green" : metric.value > threshold * 1.5 ? "text-editorial-red" : "text-editorial-gold"
                      }`}
                    >
                      {displayValue}
                      <span className="text-sm font-normal text-ink-muted">{unit}</span>
                    </span>
                    <Badge variant={metric.good ? "success" : "warning"}>
                      {metric.good ? "Good" : "Needs Work"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">
            <Shield size={12} className="mr-1.5" />
            Issues
          </TabsTrigger>
          <TabsTrigger value="pages">
            <FileText size={12} className="mr-1.5" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock size={12} className="mr-1.5" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues">
          {realIssues.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Issues Found"
              description={issues.length === 0 ? "Run a site audit to detect issues." : "Your site audit completed with no issues detected. Great job!"}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() =>
                    setSeverityFilter(severityFilter === "critical" ? "all" : "critical")
                  }
                  className={`flex cursor-pointer items-center justify-center gap-2 border p-3 transition-colors ${
                    severityFilter === "critical"
                      ? "border-editorial-red bg-editorial-red/5"
                      : "border-rule bg-surface-card hover:bg-surface-raised"
                  }`}
                >
                  <AlertCircle size={14} className="text-editorial-red" />
                  <span className="font-mono text-lg font-bold tabular-nums text-editorial-red">
                    {criticalCount}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Critical
                  </span>
                </button>
                <button
                  onClick={() =>
                    setSeverityFilter(severityFilter === "warning" ? "all" : "warning")
                  }
                  className={`flex cursor-pointer items-center justify-center gap-2 border p-3 transition-colors ${
                    severityFilter === "warning"
                      ? "border-editorial-gold bg-editorial-gold/5"
                      : "border-rule bg-surface-card hover:bg-surface-raised"
                  }`}
                >
                  <AlertTriangle size={14} className="text-editorial-gold" />
                  <span className="font-mono text-lg font-bold tabular-nums text-editorial-gold">
                    {warningCount}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Warnings
                  </span>
                </button>
                <button
                  onClick={() =>
                    setSeverityFilter(severityFilter === "info" ? "all" : "info")
                  }
                  className={`flex cursor-pointer items-center justify-center gap-2 border p-3 transition-colors ${
                    severityFilter === "info"
                      ? "border-editorial-blue bg-editorial-blue/5"
                      : "border-rule bg-surface-card hover:bg-surface-raised"
                  }`}
                >
                  <Info size={14} className="text-editorial-blue" />
                  <span className="font-mono text-lg font-bold tabular-nums text-editorial-blue">
                    {infoCount}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                    Info
                  </span>
                </button>
              </div>

              {/* Category filter + Copy button */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Category:
                </span>
                {(["all", "seo", "performance", "accessibility", "content", "security"] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`cursor-pointer px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                        categoryFilter === cat
                          ? "bg-ink text-surface-cream"
                          : "bg-surface-raised text-ink-secondary hover:bg-surface-card hover:text-ink"
                      }`}
                    >
                      {cat === "all" ? "All" : categoryConfig[cat].label}
                    </button>
                  ),
                )}
                <button
                  onClick={handleCopyIssues}
                  className="ml-auto flex items-center gap-1.5 border border-rule px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink"
                >
                  {copied ? <Check size={12} className="text-editorial-green" /> : <ClipboardCopy size={12} />}
                  {copied ? "Copied!" : "Copy All Issues"}
                </button>
              </div>

              {/* Issue list */}
              <div className="flex flex-col gap-3">
                {filteredIssues.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <CheckCircle2 size={32} className="text-editorial-green" />
                      <p className="mt-3 font-serif text-lg font-bold text-ink">
                        No Issues Found
                      </p>
                      <p className="mt-1 text-sm text-ink-secondary">
                        No issues match your current filters.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages">
          {pages.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Pages Crawled"
              description="Run a site audit to see crawled page data."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Crawled Pages</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Load Time</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-mono text-xs text-ink">
                          <div className="flex items-center gap-1.5">
                            {page.url}
                            <ExternalLink size={10} className="shrink-0 text-ink-muted" />
                          </div>
                        </TableCell>
                        <TableCell className="font-sans text-sm text-ink-secondary">
                          {page.title ?? "---"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              (page.status_code ?? 0) === 200
                                ? "success"
                                : (page.status_code ?? 0) >= 300 && (page.status_code ?? 0) < 400
                                  ? "warning"
                                  : "danger"
                            }
                          >
                            {page.status_code ?? "---"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {page.load_time != null ? (
                            <span
                              className={`font-mono text-sm ${
                                page.load_time > 2.5
                                  ? "text-editorial-red font-semibold"
                                  : page.load_time > 1.5
                                    ? "text-editorial-gold"
                                    : "text-editorial-green"
                              }`}
                            >
                              {page.load_time.toFixed(1)}s
                            </span>
                          ) : (
                            <span className="text-ink-muted">---</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(page.issues_count ?? 0) > 0 ? (
                            <span className="font-mono text-sm font-semibold text-editorial-red">
                              {page.issues_count}
                            </span>
                          ) : (
                            <CheckCircle2 size={14} className="text-editorial-green" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          {history.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Audit History"
              description="Run your first audit to start building history."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Audit History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>SEO</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>A11y</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((audit) => (
                      <TableRow key={audit.id} className="cursor-pointer">
                        <TableCell className="font-sans text-sm text-ink">
                          {fmtDate(audit.started_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              audit.status === "completed"
                                ? "success"
                                : audit.status === "failed"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {audit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{audit.pages_crawled.toLocaleString()}</TableCell>
                        <TableCell>
                          <span className={audit.issues_found > 50 ? "text-editorial-red font-semibold" : ""}>
                            {audit.issues_found}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              (audit.health_score ?? 0) >= 80
                                ? "text-editorial-green"
                                : (audit.health_score ?? 0) >= 60
                                  ? "text-editorial-gold"
                                  : "text-editorial-red"
                            }`}
                          >
                            {audit.health_score ?? "---"}
                          </span>
                        </TableCell>
                        <TableCell>{audit.seo_score ?? "---"}</TableCell>
                        <TableCell>{audit.performance_score ?? "---"}</TableCell>
                        <TableCell>{audit.accessibility_score ?? "---"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
