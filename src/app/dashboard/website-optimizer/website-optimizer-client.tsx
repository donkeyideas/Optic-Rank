"use client";

import { useState, useTransition, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Type,
  Heading1,
  AlignLeft,
  Eye,
  TrendingUp,
  BookOpen,
  Swords,
  LayoutGrid,
  Search,
  Link as LinkIcon,
  AlertTriangle,
  Globe,
  ClipboardCopy,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Save,
  ArrowUpRight,
  FileDown,
} from "lucide-react";
import Link from "next/link";
import { ColumnHeader } from "@/components/editorial/column-header";
import { PageSelector } from "@/components/website-optimizer/page-selector";
import { Button } from "@/components/ui/button";
import { useActionProgress } from "@/components/shared/action-progress";

import {
  scorePageSEO,
  generateTitleTagVariants,
  generateMetaDescriptionVariant,
  generateH1Variant,
  generateFullPageOptimization,
  savePageOptimization,
  exportAllPagesOptimization,
} from "@/lib/actions/website-optimizer";
import type { WebOptimizationGoal } from "@/lib/actions/website-optimizer";

/* ── Recommendation Links ────────────────────────────────────── */

const RECOMMENDATION_LINKS: { pattern: RegExp; href: string; label: string }[] = [
  { pattern: /No keywords tracked|Add keywords in the Keywords section/i, href: "/dashboard/keywords", label: "Go to Keywords" },
  { pattern: /Word count not available|Re-run site audit|re-run the site audit/i, href: "/dashboard/site-audit", label: "Run Site Audit" },
  { pattern: /No structured data|schema markup/i, href: "/dashboard/site-audit", label: "View Site Audit" },
  { pattern: /page load time|Page speed|load time/i, href: "/dashboard/site-audit", label: "View Site Audit" },
  { pattern: /LCP is|Core Web Vitals/i, href: "/dashboard/site-audit", label: "View Site Audit" },
  { pattern: /CLS is|layout shift/i, href: "/dashboard/site-audit", label: "View Site Audit" },
  { pattern: /Thin content|Very thin content/i, href: "/dashboard/content", label: "View Content" },
];

function getRecommendationLink(rec: string): { href: string; label: string } | null {
  for (const { pattern, href, label } of RECOMMENDATION_LINKS) {
    if (pattern.test(rec)) return { href, label };
  }
  return null;
}

/* ── Types ──────────────────────────────────────────────────── */

interface PageData {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number | null;
  loadTimeMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  hasSchema: boolean;
  auditId: string;
  issuesCount: number;
}

interface KeywordData {
  keyword: string;
  position: number | null;
  volume: number | null;
  url: string | null;
}

type FullRecommendation = {
  title: string;
  metaDescription: string;
  h1: string;
  contentBrief: string;
  schemaRecommendation: string;
  internalLinkingSuggestions: string[];
  analysis: string;
  dataSources: { keywords: number; backlinks: number; issues: number };
};

/* ── Constants ───────────────────────────────────────────────── */

const OPTIMIZATION_GOALS: Array<{ id: WebOptimizationGoal; label: string; description: string; icon: typeof Eye }> = [
  { id: "balanced", label: "Balanced", description: "Equal weight across all factors", icon: LayoutGrid },
  { id: "visibility", label: "Visibility", description: "Maximize rankings for tracked keywords", icon: Eye },
  { id: "content_quality", label: "Content", description: "Improve depth, readability, E-E-A-T", icon: BookOpen },
  { id: "conversion", label: "Conversion", description: "Optimize SERP snippet for CTR", icon: TrendingUp },
  { id: "competitive", label: "Competitive", description: "Differentiate from competitors", icon: Swords },
];

/* ── Helpers ─────────────────────────────────────────────────── */

function truncateUrl(url: string, max = 60): string {
  try {
    const u = new URL(url);
    const full = `${u.hostname}${u.pathname}`;
    return full.length > max ? full.slice(0, max) + "…" : full;
  } catch {
    return url.length > max ? url.slice(0, max) + "…" : url;
  }
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs Work";
  if (score >= 20) return "Poor";
  return "Critical";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-editorial-green";
  if (score >= 50) return "text-editorial-gold";
  return "text-editorial-red";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-editorial-green";
  if (score >= 50) return "bg-editorial-gold";
  return "bg-editorial-red";
}

/* ── Component ───────────────────────────────────────────────── */

interface WebsiteOptimizerClientProps {
  projectId: string;
  projectName: string;
  projectDomain: string | null;
  pages: PageData[];
  keywords: KeywordData[];
  optimizationHistory: Record<string, { scoreBefore: number; scoreAfter: number; date: string }>;
}

export function WebsiteOptimizerClient({
  projectId,
  projectName,
  projectDomain,
  pages,
  keywords,
  optimizationHistory,
}: WebsiteOptimizerClientProps) {
  const [selectedUrl, setSelectedUrl] = useState(pages[0]?.url ?? "");
  const [optimizationGoal, setOptimizationGoal] = useState<WebOptimizationGoal>("balanced");
  const [, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const { runAction } = useActionProgress();

  const page = useMemo(() => pages.find((p) => p.url === selectedUrl), [pages, selectedUrl]);

  // Get keywords that rank for this specific page
  const pageKeywords = useMemo(() => {
    if (!page) return [];
    const normalizeUrl = (u: string) => {
      try { return new URL(u).pathname.replace(/\/$/, ""); }
      catch { return u.replace(/\/$/, ""); }
    };
    const targetPath = normalizeUrl(page.url);
    return keywords.filter((k) => k.url && normalizeUrl(k.url) === targetPath);
  }, [page, keywords]);

  // Target keywords (sorted by volume)
  const targetKeywordStrings = useMemo(
    () => pageKeywords.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).map((k) => k.keyword),
    [pageKeywords]
  );

  // Editable metadata state
  const [title, setTitle] = useState(page?.title ?? "");
  const [metaDescription, setMetaDescription] = useState(page?.metaDescription ?? "");
  const [h1, setH1] = useState(page?.h1 ?? "");

  // Track original values for comparison
  const [originalTitle, setOriginalTitle] = useState(page?.title ?? "");
  const [originalMeta, setOriginalMeta] = useState(page?.metaDescription ?? "");
  const [originalH1, setOriginalH1] = useState(page?.h1 ?? "");

  // Live scoring + before/after tracking
  const [liveScore, setLiveScore] = useState<{ score: number; recommendations: string[]; breakdown: Record<string, number> } | null>(null);
  const [originalScore, setOriginalScore] = useState<number | null>(null);
  const originalScoreRef = useRef<boolean>(false); // tracks if we've captured the initial score
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generated variants
  const [titleVariants, setTitleVariants] = useState<Array<{ title: string; score: number; reason: string }>>([]);
  const [generatedMeta, setGeneratedMeta] = useState<string | null>(null);
  const [generatedH1, setGeneratedH1] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Full AI recommendation
  const [recommendation, setRecommendation] = useState<FullRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  // Save state
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Export all pages state
  const [exporting, setExporting] = useState(false);

  // Previous optimization for this page
  const previousOptimization = optimizationHistory[selectedUrl] ?? null;

  // Reset fields when page selection changes
  const handlePageChange = useCallback((newUrl: string) => {
    setSelectedUrl(newUrl);
    const p = pages.find((x) => x.url === newUrl);
    if (p) {
      setTitle(p.title ?? "");
      setMetaDescription(p.metaDescription ?? "");
      setH1(p.h1 ?? "");
      setOriginalTitle(p.title ?? "");
      setOriginalMeta(p.metaDescription ?? "");
      setOriginalH1(p.h1 ?? "");
      setLiveScore(null);
      setOriginalScore(null);
      originalScoreRef.current = false;
      setTitleVariants([]);
      setGeneratedMeta(null);
      setGeneratedH1(null);
      setRecommendation(null);
      setSaved(false);
    }
  }, [pages]);

  // Debounced scoring — captures original score on first calculation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!page) return;
      startTransition(async () => {
        try {
          const allKwStrings = keywords.map((k) => k.keyword);
          const result = await scorePageSEO(
            title, metaDescription, h1, page.url,
            targetKeywordStrings, page.wordCount,
            page.loadTimeMs, page.lcpMs, page.cls, page.hasSchema,
            allKwStrings
          );
          setLiveScore(result);

          // Capture the original score on first calculation only
          if (!originalScoreRef.current) {
            setOriginalScore(result.score);
            originalScoreRef.current = true;
          }
        } catch { /* keep previous */ }
      });
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, metaDescription, h1, page, targetKeywordStrings]);

  // Full recommendation
  function handleGenerateFullRecommendation() {
    if (!page) return;
    setRecLoading(true);
    runAction(
      {
        title: "Generating Page Optimization",
        description: "AI is analyzing keywords, backlinks, and technical data to maximize rankings",
        steps: [
          "Analyzing keyword rankings & visibility data",
          "Evaluating backlink profile",
          "Reviewing technical SEO signals",
          "Generating optimized page recommendation",
        ],
        estimatedDuration: 25,
      },
      () => generateFullPageOptimization(projectId, page.url, title, metaDescription, h1, page.wordCount, optimizationGoal)
    ).then((result) => {
      if (result && "recommendation" in result) setRecommendation(result.recommendation);
      setRecLoading(false);
    });
  }

  function applyRecommendation() {
    if (!recommendation) return;
    setTitle(recommendation.title);
    setMetaDescription(recommendation.metaDescription);
    setH1(recommendation.h1);
  }

  // Save optimization to database
  async function handleSaveOptimization() {
    if (!page || !liveScore) return;
    setSaving(true);
    const result = await savePageOptimization(
      projectId,
      page.url,
      originalScore ?? 0,
      liveScore.score,
      { title: originalTitle, meta: originalMeta, h1: originalH1 },
      { title, meta: metaDescription, h1 },
      optimizationGoal,
      recommendation?.contentBrief,
      liveScore.recommendations
    );
    setSaving(false);
    if ("success" in result) setSaved(true);
  }

  // Individual AI generators
  function handleGenerateTitles() {
    if (!page) return;
    setActionId("titles");
    runAction(
      { title: "Generating Title Variants", description: "AI is crafting SEO-optimized titles", estimatedDuration: 15 },
      () => generateTitleTagVariants(projectId, page.url, title, targetKeywordStrings, optimizationGoal)
    ).then((result) => {
      if (result && "variants" in result) setTitleVariants(result.variants);
      setActionId(null);
    });
  }

  function handleGenerateMeta() {
    if (!page) return;
    setActionId("meta");
    runAction(
      { title: "Generating Meta Description", description: "AI is optimizing for CTR", estimatedDuration: 12 },
      () => generateMetaDescriptionVariant(projectId, page.url, metaDescription, title, optimizationGoal)
    ).then((result) => {
      if (result && "metaDescription" in result) setGeneratedMeta(result.metaDescription);
      setActionId(null);
    });
  }

  function handleGenerateH1() {
    if (!page) return;
    setActionId("h1");
    runAction(
      { title: "Generating H1 Heading", description: "AI is crafting an optimized heading", estimatedDuration: 12 },
      () => generateH1Variant(projectId, page.url, h1, title, optimizationGoal)
    ).then((result) => {
      if (result && "h1" in result) setGeneratedH1(result.h1);
      setActionId(null);
    });
  }

  const copyToClipboard = useCallback((text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Copy all optimized metadata as formatted text for developers
  const copyAllForDeveloper = useCallback(() => {
    const pageUrlDisplay = page?.url ?? selectedUrl;

    let text = `SEO OPTIMIZATION — ${projectName}\n`;
    text += `${"=".repeat(50)}\n\n`;
    text += `Page: ${pageUrlDisplay}\n`;
    text += `Score: ${originalScore ?? "—"} → ${liveScore?.score ?? "—"}/100`;
    if (originalScore != null && liveScore) {
      const delta = liveScore.score - originalScore;
      if (delta > 0) text += ` (+${delta} improvement)`;
    }
    text += `\nGenerated: ${new Date().toLocaleDateString()}\n\n`;

    text += `TITLE TAG\n`;
    text += `${"─".repeat(30)}\n`;
    if (originalTitle && title !== originalTitle) {
      text += `Before:    ${originalTitle}\n`;
      text += `After:     ${title}\n`;
    } else if (title) {
      text += `${title}\n`;
    } else {
      text += `(empty — needs title tag)\n`;
    }
    text += `Characters: ${title.length}/60\n\n`;

    text += `META DESCRIPTION\n`;
    text += `${"─".repeat(30)}\n`;
    if (originalMeta && metaDescription !== originalMeta) {
      text += `Before:    ${originalMeta}\n`;
      text += `After:     ${metaDescription}\n`;
    } else if (metaDescription) {
      text += `${metaDescription}\n`;
    } else {
      text += `(empty — needs meta description)\n`;
    }
    text += `Characters: ${metaDescription.length}/160\n\n`;

    text += `H1 HEADING\n`;
    text += `${"─".repeat(30)}\n`;
    if (originalH1 && h1 !== originalH1) {
      text += `Before:    ${originalH1}\n`;
      text += `After:     ${h1}\n`;
    } else if (h1) {
      text += `${h1}\n`;
    } else {
      text += `(empty — needs H1 heading)\n`;
    }

    if (recommendation?.contentBrief) {
      text += `\n\nCONTENT BRIEF\n`;
      text += `${"─".repeat(30)}\n`;
      text += recommendation.contentBrief;
    }

    if (recommendation?.schemaRecommendation) {
      text += `\n\nSCHEMA MARKUP\n`;
      text += `${"─".repeat(30)}\n`;
      text += recommendation.schemaRecommendation;
    }

    if (recommendation?.internalLinkingSuggestions?.length) {
      text += `\n\nINTERNAL LINKING\n`;
      text += `${"─".repeat(30)}\n`;
      recommendation.internalLinkingSuggestions.forEach((s) => {
        text += `• ${s}\n`;
      });
    }

    if (liveScore && liveScore.recommendations.length > 0) {
      text += `\n\nRECOMMENDATIONS\n`;
      text += `${"─".repeat(30)}\n`;
      liveScore.recommendations.forEach((r) => {
        text += `• ${r}\n`;
      });
    }

    text += `\n\n— Generated by Optic Rank Page Optimizer`;

    void navigator.clipboard.writeText(text);
    setCopiedField("all");
    setTimeout(() => setCopiedField(null), 3000);
  }, [title, metaDescription, h1, originalTitle, originalMeta, originalH1, originalScore, page, selectedUrl, projectName, liveScore, recommendation]);

  // Export all pages — scores every page and copies a combined report
  const handleExportAllPages = useCallback(async () => {
    setExporting(true);
    try {
      const result = await exportAllPagesOptimization(
        projectId,
        pages.map((p) => ({
          url: p.url,
          title: p.title,
          metaDescription: p.metaDescription,
          h1: p.h1,
          wordCount: p.wordCount,
          loadTimeMs: p.loadTimeMs,
          lcpMs: p.lcpMs,
          cls: p.cls,
          hasSchema: p.hasSchema,
        })),
        optimizationGoal
      );
      if ("text" in result) {
        void navigator.clipboard.writeText(result.text);
        setCopiedField("export-all");
        setTimeout(() => setCopiedField(null), 3000);
      }
    } catch { /* ignore */ }
    setExporting(false);
  }, [projectId, pages, optimizationGoal]);

  // Score breakdown bar helper
  const breakdownItems = useMemo(() => {
    if (!liveScore?.breakdown) return [];
    return [
      { label: "Title", value: liveScore.breakdown.title ?? 0, max: 25 },
      { label: "Meta", value: liveScore.breakdown.meta ?? 0, max: 15 },
      { label: "H1", value: liveScore.breakdown.h1 ?? 0, max: 10 },
      { label: "Keywords", value: liveScore.breakdown.keywords ?? 0, max: 20 },
      { label: "Content", value: liveScore.breakdown.content ?? 0, max: 15 },
      { label: "Technical", value: liveScore.breakdown.technical ?? 0, max: 10 },
    ];
  }, [liveScore]);

  // Track what the optimizer CAN vs CANNOT fix
  const cannotFix = useMemo(() => {
    const items: { text: string; href?: string; linkLabel?: string }[] = [];
    if ((page?.wordCount ?? 0) < 300) items.push({ text: "Thin content (add more content to your page)", href: "/dashboard/content", linkLabel: "View Content" });
    if (targetKeywordStrings.length === 0) items.push({ text: "No tracked keywords ranking for this URL", href: "/dashboard/keywords", linkLabel: "Go to Keywords" });
    if (!page?.hasSchema) items.push({ text: "No schema markup (requires code changes)", href: "/dashboard/site-audit", linkLabel: "View Site Audit" });
    if ((page?.loadTimeMs ?? 0) > 3000) items.push({ text: "Slow page load (requires technical optimization)", href: "/dashboard/site-audit", linkLabel: "View Site Audit" });
    return items;
  }, [page, targetKeywordStrings]);

  // Recommended optimization goal based on page analysis
  const recommendedGoal = useMemo((): WebOptimizationGoal => {
    if (!liveScore?.breakdown) return "balanced";
    const b = liveScore.breakdown;

    // Near-miss keywords (positions 4-10) → Visibility has highest ROI
    const nearMissKw = pageKeywords.filter((k) => k.position != null && k.position >= 4 && k.position <= 10);
    if (nearMissKw.length >= 2) return "visibility";

    // Thin content is the biggest gap → Content Quality
    if ((b.content ?? 0) <= 5) return "content_quality";

    // Title/meta missing or weak but content is fine → Conversion (CTR optimization)
    if ((b.title ?? 0) < 15 || (b.meta ?? 0) < 10) return "conversion";

    // Keywords present but placement is poor → Visibility
    if (targetKeywordStrings.length > 0 && (b.keywords ?? 0) < 10) return "visibility";

    // Technical issues dragging score down → Technical
    if ((b.technical ?? 0) < 5) return "technical";

    // Good rankings from competitors → Competitive edge
    if (pageKeywords.length > 5 && pageKeywords.every((k) => (k.position ?? 100) > 10)) return "competitive";

    return "balanced";
  }, [liveScore, pageKeywords, targetKeywordStrings]);

  const recommendedGoalReason = useMemo((): string => {
    if (!liveScore?.breakdown) return "";
    const b = liveScore.breakdown;
    const nearMissKw = pageKeywords.filter((k) => k.position != null && k.position >= 4 && k.position <= 10);
    if (nearMissKw.length >= 2) return `${nearMissKw.length} keywords at positions 4-10 — small push = big traffic gains`;
    if ((b.content ?? 0) <= 5) return "Content is thin — improving depth will unlock the most points";
    if ((b.title ?? 0) < 15 || (b.meta ?? 0) < 10) return "Title/meta need work — optimize your SERP snippet for clicks";
    if (targetKeywordStrings.length > 0 && (b.keywords ?? 0) < 10) return "Keywords aren't placed in key elements — focus on visibility";
    if ((b.technical ?? 0) < 5) return "Technical issues are dragging your score down";
    if (pageKeywords.length > 5 && pageKeywords.every((k) => (k.position ?? 100) > 10)) return "All keywords rank below page 1 — differentiate from competitors";
    return "No single weak area dominates — balanced optimization is best";
  }, [liveScore, pageKeywords, targetKeywordStrings]);

  // Check modifications
  const hasModifications = title !== originalTitle || metaDescription !== originalMeta || h1 !== originalH1;

  // Score improvement
  const scoreDelta = originalScore != null && liveScore ? liveScore.score - originalScore : 0;

  // Count critical issues
  const criticalIssues = useMemo(() => {
    const issues: string[] = [];
    if (!originalTitle) issues.push("Missing title tag");
    if (!originalMeta) issues.push("Missing meta description");
    if (!originalH1) issues.push("Missing H1 heading");
    if ((page?.wordCount ?? 0) < 300) issues.push("Thin content");
    return issues;
  }, [originalTitle, originalMeta, originalH1, page]);

  const maxTitleLen = 60;
  const maxMetaLen = 160;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-rule pb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-ink">Page Optimizer</h2>
          <p className="mt-1 max-w-2xl font-sans text-[13px] text-ink-secondary">
            Optimize any page for higher rankings. Generate AI recommendations, then copy to your developer or CMS.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportAllPages} disabled={exporting || pages.length === 0}>
            {exporting ? <Loader2 size={12} className="animate-spin" /> : copiedField === "export-all" ? <Check size={12} /> : <FileDown size={12} />}
            {exporting ? "Exporting..." : copiedField === "export-all" ? "Copied All!" : `Export All (${pages.length})`}
          </Button>
          {hasModifications && liveScore && (
            <>
              <Button variant="outline" size="sm" onClick={copyAllForDeveloper}>
                {copiedField === "all" ? <Check size={12} /> : <ClipboardCopy size={12} />}
                {copiedField === "all" ? "Copied!" : "Copy for Developer"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveOptimization}
                disabled={saving || saved}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : <Save size={12} />}
                {saving ? "Saving..." : saved ? "Saved" : "Save Optimization"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Page Selector */}
      <PageSelector
        pages={pages.map((p) => ({
          url: p.url,
          title: p.title,
          seoScore: optimizationHistory[p.url]?.scoreAfter ?? null,
        }))}
        selected={selectedUrl}
        onSelect={handlePageChange}
      />

      {/* Current Page Status Bar */}
      {page && (
        <div className="border border-rule bg-surface-card">
          <div className="flex items-center gap-3 border-b border-rule px-4 py-2.5">
            <Globe size={14} className="shrink-0 text-ink-muted" />
            <span className="truncate font-mono text-[11px] text-ink">{page.url}</span>
            {previousOptimization && (
              <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-ink-muted">
                <History size={10} />
                Last optimized: {new Date(previousOptimization.date).toLocaleDateString()} (score: {previousOptimization.scoreBefore} → {previousOptimization.scoreAfter})
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-0 divide-x divide-rule sm:grid-cols-4">
            <div className="px-4 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Title Tag</span>
              {originalTitle ? (
                <p className="mt-0.5 truncate text-[11px] text-ink">{originalTitle}</p>
              ) : (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-editorial-red">
                  <XCircle size={10} /> Missing
                </p>
              )}
            </div>
            <div className="px-4 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Meta Description</span>
              {originalMeta ? (
                <p className="mt-0.5 truncate text-[11px] text-ink">{originalMeta}</p>
              ) : (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-editorial-red">
                  <XCircle size={10} /> Missing
                </p>
              )}
            </div>
            <div className="px-4 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">H1 Heading</span>
              {originalH1 ? (
                <p className="mt-0.5 truncate text-[11px] text-ink">{originalH1}</p>
              ) : (
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-editorial-red">
                  <XCircle size={10} /> Missing
                </p>
              )}
            </div>
            <div className="px-4 py-2.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Content</span>
              <p className={`mt-0.5 text-[11px] ${(page.wordCount ?? 0) < 300 ? "text-editorial-red" : "text-ink"}`}>
                {page.wordCount?.toLocaleString() ?? "0"} words
                {(page.wordCount ?? 0) < 300 && " (thin)"}
              </p>
            </div>
          </div>

          {/* Critical Issues Alert */}
          {criticalIssues.length > 0 && (
            <div className="flex items-start gap-2 border-t border-rule bg-editorial-red/5 px-4 py-2.5">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-editorial-red" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-editorial-red">
                  {criticalIssues.length} Critical Issue{criticalIssues.length > 1 ? "s" : ""}
                </span>
                <p className="text-[11px] text-ink-secondary">
                  {criticalIssues.join(" · ")} — Click <strong className="text-ink">"Generate Full Optimization"</strong> below to fix.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SERP Preview */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule px-4 py-2.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Google Search Preview
            {hasModifications && (
              <span className="ml-2 text-editorial-green">(Showing your edits)</span>
            )}
          </span>
        </div>
        <div className="flex justify-center px-4 py-3">
          <div className="w-full max-w-xl rounded-lg bg-white p-4 shadow-sm">
            <p className="truncate text-[12px] text-[#202124]" style={{ fontFamily: "Arial, sans-serif" }}>
              {truncateUrl(selectedUrl)}
            </p>
            <h3
              className="mt-0.5 cursor-pointer truncate text-[18px] leading-snug text-[#1a0dab] hover:underline"
              style={{ fontFamily: "Arial, sans-serif" }}
            >
              {title || "(No title tag — Google will auto-generate one)"}
            </h3>
            <p
              className="mt-0.5 text-[13px] leading-relaxed text-[#4d5156]"
              style={{ fontFamily: "Arial, sans-serif", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {metaDescription || "(No meta description — Google will pull random text from your page)"}
            </p>
          </div>
        </div>
      </div>

      {/* Optimization Goal Selector */}
      <div className="border border-rule bg-surface-card">
        <div className="border-b border-rule px-4 py-2.5 flex items-center justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Optimization Goal</span>
          {recommendedGoalReason && (
            <span className="text-[9px] text-ink-muted">
              <span className="font-bold text-editorial-green">Recommended:</span>{" "}
              {recommendedGoalReason}
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-0 divide-x divide-rule">
          {OPTIMIZATION_GOALS.map((goal) => {
            const Icon = goal.icon;
            const isActive = optimizationGoal === goal.id;
            const isRecommended = goal.id === recommendedGoal;
            return (
              <button
                key={goal.id}
                onClick={() => setOptimizationGoal(goal.id)}
                className={`relative flex flex-col items-center gap-1.5 px-3 py-3 transition-colors ${
                  isActive
                    ? "bg-editorial-red/10 text-editorial-red"
                    : isRecommended
                      ? "bg-editorial-green/5 text-editorial-green ring-1 ring-inset ring-editorial-green/30"
                      : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                }`}
              >
                {isRecommended && !isActive && (
                  <span className="absolute -top-0.5 right-1 text-[7px] font-bold uppercase tracking-wider text-editorial-green">
                    Best
                  </span>
                )}
                <Icon size={16} className={isActive ? "text-editorial-red" : isRecommended ? "text-editorial-green" : ""} />
                <span className={`text-[10px] font-bold leading-tight ${isActive ? "text-editorial-red" : isRecommended ? "text-editorial-green" : ""}`}>
                  {goal.label}
                </span>
                <span className="hidden text-[9px] leading-tight text-ink-muted sm:block">{goal.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Full Page Optimization */}
      <div className="border border-rule bg-surface-card">
        <div className="flex items-center justify-between border-b border-rule px-4 py-3">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">AI Page Optimizer</span>
            <p className="mt-0.5 text-[11px] text-ink-secondary">
              One-click: AI analyzes keywords, backlinks, and competitors to generate optimized title, meta, H1, content brief, and schema.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleGenerateFullRecommendation} disabled={recLoading}>
            {recLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {recLoading ? "Analyzing..." : "Generate Full Optimization"}
          </Button>
        </div>

        {recommendation && (
          <div className="flex flex-col gap-0">
            {/* Data Sources Strip */}
            <div className="flex items-center gap-4 border-b border-rule px-4 py-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Data Analyzed:</span>
              <div className="flex items-center gap-1">
                <Search size={10} className="text-editorial-green" />
                <span className="font-mono text-[10px] font-bold text-ink">{recommendation.dataSources.keywords}</span>
                <span className="text-[10px] text-ink-muted">keywords</span>
              </div>
              <div className="flex items-center gap-1">
                <LinkIcon size={10} className="text-editorial-green" />
                <span className="font-mono text-[10px] font-bold text-ink">{recommendation.dataSources.backlinks}</span>
                <span className="text-[10px] text-ink-muted">backlinks</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle size={10} className="text-editorial-green" />
                <span className="font-mono text-[10px] font-bold text-ink">{recommendation.dataSources.issues}</span>
                <span className="text-[10px] text-ink-muted">issues</span>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="border-b border-rule px-4 py-3">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-red">AI Strategy</span>
              <p className="mt-1 font-sans text-[12px] leading-relaxed text-ink-secondary">{recommendation.analysis}</p>
            </div>

            {/* Recommended Fields */}
            <div className="grid gap-0 divide-y divide-rule">
              {/* Title */}
              <div className="flex items-start justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommended Title Tag</span>
                  {originalTitle && (
                    <p className="mt-1 truncate text-[11px] text-ink-muted line-through">{originalTitle}</p>
                  )}
                  <p className="mt-0.5 font-serif text-[15px] font-bold text-ink">{recommendation.title}</p>
                  <span className="font-mono text-[10px] text-ink-muted">{recommendation.title.length}/60 chars</span>
                </div>
                <div className="ml-3 flex shrink-0 gap-2">
                  <button onClick={() => copyToClipboard(recommendation.title, "rec-title")} className="text-[10px] text-ink-muted hover:text-ink">
                    {copiedField === "rec-title" ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  <button onClick={() => setTitle(recommendation.title)} className="text-[10px] font-bold text-editorial-red hover:underline">Use</button>
                </div>
              </div>

              {/* Meta Description */}
              <div className="flex items-start justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommended Meta Description</span>
                  {originalMeta && (
                    <p className="mt-1 truncate text-[11px] text-ink-muted line-through">{originalMeta}</p>
                  )}
                  <p className="mt-0.5 font-sans text-sm text-ink">{recommendation.metaDescription}</p>
                  <span className="font-mono text-[10px] text-ink-muted">{recommendation.metaDescription.length}/160 chars</span>
                </div>
                <div className="ml-3 flex shrink-0 gap-2">
                  <button onClick={() => copyToClipboard(recommendation.metaDescription, "rec-meta")} className="text-[10px] text-ink-muted hover:text-ink">
                    {copiedField === "rec-meta" ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  <button onClick={() => setMetaDescription(recommendation.metaDescription)} className="text-[10px] font-bold text-editorial-red hover:underline">Use</button>
                </div>
              </div>

              {/* H1 */}
              <div className="flex items-start justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommended H1</span>
                  {originalH1 && (
                    <p className="mt-1 truncate text-[11px] text-ink-muted line-through">{originalH1}</p>
                  )}
                  <p className="mt-0.5 font-serif text-base font-bold text-ink">{recommendation.h1}</p>
                </div>
                <div className="ml-3 flex shrink-0 gap-2">
                  <button onClick={() => copyToClipboard(recommendation.h1, "rec-h1")} className="text-[10px] text-ink-muted hover:text-ink">
                    {copiedField === "rec-h1" ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                  <button onClick={() => setH1(recommendation.h1)} className="text-[10px] font-bold text-editorial-red hover:underline">Use</button>
                </div>
              </div>

              {/* Content Brief */}
              {recommendation.contentBrief && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Content Brief</span>
                    <button onClick={() => copyToClipboard(recommendation.contentBrief, "brief")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                      {copiedField === "brief" ? <Check size={10} /> : <Copy size={10} />}
                      {copiedField === "brief" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-ink-secondary">{recommendation.contentBrief}</div>
                </div>
              )}

              {/* Schema Recommendation */}
              {recommendation.schemaRecommendation && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Schema Markup</span>
                    <button onClick={() => copyToClipboard(recommendation.schemaRecommendation, "schema")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                      {copiedField === "schema" ? <Check size={10} /> : <Copy size={10} />}
                      {copiedField === "schema" ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1 font-sans text-[11px] leading-relaxed text-ink-secondary">{recommendation.schemaRecommendation}</p>
                </div>
              )}

              {/* Internal Linking */}
              {recommendation.internalLinkingSuggestions.length > 0 && (
                <div className="px-4 py-3">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Internal Linking</span>
                  <ul className="mt-2 flex flex-col gap-1">
                    {recommendation.internalLinkingSuggestions.map((s, i) => (
                      <li key={i} className="font-sans text-[11px] leading-relaxed text-ink-secondary">&bull; {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-rule px-4 py-3">
              <Button variant="primary" size="sm" onClick={applyRecommendation}>
                <CheckCircle2 size={12} />
                Apply Title, Meta & H1 to Editor
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyAllForDeveloper}>
                  {copiedField === "all" ? <Check size={12} /> : <ClipboardCopy size={12} />}
                  {copiedField === "all" ? "Copied!" : "Copy All for Developer"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Editor + Score */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: Editor */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ColumnHeader title="SEO Metadata Editor" subtitle="Edit fields manually or use AI. Changes update the SERP preview and score in real-time." />

          {/* Title Tag */}
          <div className="border border-rule bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={14} className="text-ink-muted" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Title Tag</span>
                <span className={`font-mono text-[10px] ${title.length > maxTitleLen ? "text-editorial-red" : title.length === 0 ? "text-editorial-red" : "text-ink-muted"}`}>
                  {title.length}/{maxTitleLen}
                </span>
                {title.length === 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-editorial-red">
                    <XCircle size={10} /> Missing
                  </span>
                )}
                {title !== originalTitle && title.length > 0 && (
                  <span className="text-[10px] font-bold text-editorial-green">Modified</span>
                )}
              </div>
              <div className="flex gap-2">
                {title.length > 0 && (
                  <button onClick={() => copyToClipboard(title, "title")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                    {copiedField === "title" ? <Check size={10} /> : <Copy size={10} />}
                    {copiedField === "title" ? "Copied" : "Copy"}
                  </button>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateTitles} disabled={actionId === "titles"}>
                  {actionId === "titles" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  AI Variants
                </Button>
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title tag (e.g., Best SEO Tools for Small Business | Brand)"
              className="mt-2 h-10 w-full border border-rule bg-surface-raised px-3 font-serif text-[15px] font-bold text-ink placeholder:text-ink-muted/40 focus:border-editorial-red focus:outline-none"
            />
            {titleVariants.length > 0 && (
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">AI Variants — Click "Use" to apply</span>
                {titleVariants.map((v, i) => (
                  <div key={i} className="flex items-center justify-between border border-rule px-3 py-2 hover:bg-surface-raised">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink">{v.title}</span>
                      <span className="font-mono text-[10px] text-ink-muted">{v.title.length}ch</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-[9px] text-ink-muted sm:inline">{v.reason}</span>
                      <span className={`font-mono text-xs font-bold ${v.score >= 80 ? "text-editorial-green" : v.score >= 60 ? "text-editorial-gold" : "text-editorial-red"}`}>
                        {v.score}
                      </span>
                      <button onClick={() => { setTitle(v.title); setTitleVariants([]); }} className="text-[10px] font-bold text-editorial-red hover:underline">Use</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Meta Description */}
          <div className="border border-rule bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlignLeft size={14} className="text-ink-muted" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Meta Description</span>
                <span className={`font-mono text-[10px] ${metaDescription.length > maxMetaLen ? "text-editorial-red" : metaDescription.length === 0 ? "text-editorial-red" : "text-ink-muted"}`}>
                  {metaDescription.length}/{maxMetaLen}
                </span>
                {metaDescription.length === 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-editorial-red">
                    <XCircle size={10} /> Missing
                  </span>
                )}
                {metaDescription !== originalMeta && metaDescription.length > 0 && (
                  <span className="text-[10px] font-bold text-editorial-green">Modified</span>
                )}
              </div>
              <div className="flex gap-2">
                {metaDescription.length > 0 && (
                  <button onClick={() => copyToClipboard(metaDescription, "meta")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                    {copiedField === "meta" ? <Check size={10} /> : <Copy size={10} />}
                    {copiedField === "meta" ? "Copied" : "Copy"}
                  </button>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateMeta} disabled={actionId === "meta"}>
                  {actionId === "meta" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Generate
                </Button>
              </div>
            </div>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              placeholder="Enter a meta description (e.g., Discover the best SEO tools to boost your rankings. Track keywords, analyze competitors, and grow organic traffic.)"
              className="mt-2 w-full border border-rule bg-surface-raised px-3 py-2 font-sans text-[12px] leading-relaxed text-ink placeholder:text-ink-muted/40 focus:border-editorial-red focus:outline-none"
            />
            {generatedMeta && (
              <div className="mt-2 flex items-center gap-2 border border-editorial-green/30 bg-editorial-green/5 px-3 py-2">
                <span className="flex-1 font-sans text-[12px] text-ink-secondary">{generatedMeta}</span>
                <span className="font-mono text-[10px] text-ink-muted">{generatedMeta.length}ch</span>
                <button onClick={() => { setMetaDescription(generatedMeta); setGeneratedMeta(null); }} className="text-[10px] font-bold text-editorial-red hover:underline">Use</button>
              </div>
            )}
          </div>

          {/* H1 Heading */}
          <div className="border border-rule bg-surface-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heading1 size={14} className="text-ink-muted" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">H1 Heading</span>
                {h1.length === 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-editorial-red">
                    <XCircle size={10} /> Missing
                  </span>
                )}
                {h1 !== originalH1 && h1.length > 0 && (
                  <span className="text-[10px] font-bold text-editorial-green">Modified</span>
                )}
              </div>
              <div className="flex gap-2">
                {h1.length > 0 && (
                  <button onClick={() => copyToClipboard(h1, "h1")} className="flex items-center gap-1 text-[10px] text-ink-muted hover:text-ink">
                    {copiedField === "h1" ? <Check size={10} /> : <Copy size={10} />}
                    {copiedField === "h1" ? "Copied" : "Copy"}
                  </button>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateH1} disabled={actionId === "h1"}>
                  {actionId === "h1" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Generate
                </Button>
              </div>
            </div>
            <input
              type="text"
              value={h1}
              onChange={(e) => setH1(e.target.value)}
              placeholder="Enter an H1 heading (e.g., The SEO Dashboard Built for Growth Teams)"
              className="mt-2 h-10 w-full border border-rule bg-surface-raised px-3 font-serif text-[15px] font-bold text-ink placeholder:text-ink-muted/40 focus:border-editorial-red focus:outline-none"
            />
            {generatedH1 && (
              <div className="mt-2 flex items-center gap-2 border border-editorial-green/30 bg-editorial-green/5 px-3 py-2">
                <span className="flex-1 font-serif text-[14px] font-bold text-ink-secondary">{generatedH1}</span>
                <button onClick={() => { setH1(generatedH1); setGeneratedH1(null); }} className="text-[10px] font-bold text-editorial-red hover:underline">Use</button>
              </div>
            )}
          </div>

          {/* How to Implement */}
          {hasModifications && (
            <div className="border border-editorial-green/30 bg-editorial-green/5 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-editorial-green" />
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-editorial-green">How to Implement</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-editorial-green/20 font-mono text-[10px] font-bold text-editorial-green">1</span>
                  <p className="text-[11px] text-ink-secondary">
                    Click <strong className="text-ink">"Copy for Developer"</strong> or <strong className="text-ink">"Save Optimization"</strong> to preserve your changes.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-editorial-green/20 font-mono text-[10px] font-bold text-editorial-green">2</span>
                  <p className="text-[11px] text-ink-secondary">
                    Share with your developer or paste into your <strong className="text-ink">CMS / page editor</strong> (WordPress, Webflow, Shopify, etc.)
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-editorial-green/20 font-mono text-[10px] font-bold text-editorial-green">3</span>
                  <p className="text-[11px] text-ink-secondary">
                    After publishing, <strong className="text-ink">re-run your site audit</strong> — come back here to see the score improvement.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Score Panel */}
        <div className="flex flex-col gap-4">
          <div className="sticky top-4 border border-rule bg-surface-card p-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Live SEO Score</span>

            {/* Before → After Score Display */}
            <div className="mt-3 text-center">
              {originalScore != null && scoreDelta !== 0 ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="text-center">
                    <span className="block font-mono text-2xl text-ink-muted line-through">{originalScore}</span>
                    <span className="text-[9px] uppercase text-ink-muted">Before</span>
                  </div>
                  <ArrowRight size={16} className="text-ink-muted" />
                  <div className="text-center">
                    <span className={`block font-mono text-5xl font-bold ${getScoreColor(liveScore?.score ?? 0)}`}>
                      {liveScore?.score ?? "—"}
                    </span>
                    <span className="text-[9px] uppercase text-ink-muted">After</span>
                  </div>
                </div>
              ) : (
                <span className={`font-mono text-5xl font-bold ${getScoreColor(liveScore?.score ?? 0)}`}>
                  {liveScore?.score ?? "—"}
                </span>
              )}
              <span className="mt-1 block font-mono text-sm text-ink-muted">/100</span>
              {liveScore && (
                <span className={`mt-1 block text-[10px] font-bold uppercase tracking-widest ${getScoreColor(liveScore.score)}`}>
                  {getScoreLabel(liveScore.score)}
                </span>
              )}
              {scoreDelta > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 bg-editorial-green/10 px-2 py-0.5">
                  <ArrowUpRight size={12} className="text-editorial-green" />
                  <span className="font-mono text-sm font-bold text-editorial-green">+{scoreDelta} points</span>
                </div>
              )}
            </div>

            <div className="mt-4 h-2 w-full overflow-hidden bg-rule">
              <div
                className={`h-full transition-all duration-500 ${getScoreBgColor(liveScore?.score ?? 0)}`}
                style={{ width: `${liveScore?.score ?? 0}%` }}
              />
            </div>

            {/* Score Breakdown */}
            {breakdownItems.length > 0 && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Score Breakdown</span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {breakdownItems.map((item) => {
                    const pct = item.value / item.max;
                    return (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="w-16 text-[10px] text-ink-muted">{item.label}</span>
                        <div className="h-1.5 flex-1 overflow-hidden bg-rule">
                          <div
                            className={`h-full transition-all ${
                              pct >= 0.8 ? "bg-editorial-green"
                              : pct >= 0.5 ? "bg-editorial-gold"
                              : "bg-editorial-red"
                            }`}
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[10px] ${
                          pct >= 0.8 ? "text-editorial-green"
                          : pct >= 0.5 ? "text-editorial-gold"
                          : "text-editorial-red"
                        }`}>
                          {item.value}/{item.max}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* What the Optimizer Can't Fix */}
            {cannotFix.length > 0 && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Needs Other Action</span>
                <p className="mt-1 text-[10px] text-ink-muted">These items need work outside the optimizer:</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {cannotFix.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[10px] text-editorial-gold">
                      <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                      <span className="flex-1">
                        {item.text}
                        {item.href && (
                          <Link href={item.href} className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
                            {item.linkLabel}
                            <ArrowUpRight size={9} />
                          </Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* What to Fix */}
            {liveScore && liveScore.recommendations.length > 0 && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Recommendations</span>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {liveScore.recommendations.map((rec, idx) => {
                    const link = getRecommendationLink(rec);
                    return (
                      <li key={idx} className="flex items-start gap-1.5 font-sans text-[11px] leading-relaxed text-ink-secondary">
                        <ArrowRight size={10} className="mt-0.5 shrink-0 text-editorial-red" />
                        <span className="flex-1">
                          {rec}
                          {link && (
                            <Link href={link.href} className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
                              {link.label}
                              <ArrowUpRight size={9} />
                            </Link>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Keyword Presence Matrix — uses page keywords or all project keywords as fallback */}
            {(targetKeywordStrings.length > 0 || keywords.length > 0) && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Keyword Presence
                  {targetKeywordStrings.length === 0 && keywords.length > 0 && (
                    <span className="ml-1 font-normal normal-case text-ink-muted">(all project keywords)</span>
                  )}
                </span>
                <div className="mt-2 flex flex-col gap-1">
                  {(targetKeywordStrings.length > 0 ? targetKeywordStrings : keywords.map((k) => k.keyword)).slice(0, 15).map((kw) => {
                    const kwLower = kw.toLowerCase();
                    const inTitle = title.toLowerCase().includes(kwLower);
                    const inMeta = metaDescription.toLowerCase().includes(kwLower);
                    const inH1 = h1.toLowerCase().includes(kwLower);
                    let urlPath = "";
                    try { urlPath = new URL(selectedUrl).pathname.toLowerCase(); } catch { urlPath = selectedUrl.toLowerCase(); }
                    const inUrl = urlPath.includes(kwLower.replace(/\s+/g, "-"));
                    return (
                      <div key={kw} className="flex items-center gap-1 border border-rule px-1.5 py-0.5">
                        <span className="flex-1 truncate text-[10px] text-ink">{kw}</span>
                        <span className={`text-[8px] font-bold ${inTitle ? "text-editorial-green" : "text-editorial-red"}`}>T</span>
                        <span className={`text-[8px] font-bold ${inMeta ? "text-editorial-green" : "text-editorial-red"}`}>M</span>
                        <span className={`text-[8px] font-bold ${inH1 ? "text-editorial-green" : "text-editorial-red"}`}>H</span>
                        <span className={`text-[8px] font-bold ${inUrl ? "text-editorial-green" : "text-editorial-red"}`}>U</span>
                      </div>
                    );
                  })}
                </div>
                <span className="mt-1 block text-[9px] text-ink-muted">T=Title M=Meta H=H1 U=URL</span>
              </div>
            )}

            {/* Page Info */}
            {page && (
              <div className="mt-4 border-t border-rule pt-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Page Info</span>
                <div className="mt-2 flex flex-col gap-1 text-[10px] text-ink-muted">
                  <div className="flex justify-between">
                    <span>Word Count</span>
                    <span className={`font-mono ${(page.wordCount ?? 0) < 300 ? "text-editorial-red" : "text-ink"}`}>{page.wordCount?.toLocaleString() ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Load Time</span>
                    <span className={`font-mono ${(page.loadTimeMs ?? 0) > 3000 ? "text-editorial-red" : "text-ink"}`}>{page.loadTimeMs ? `${(page.loadTimeMs / 1000).toFixed(1)}s` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LCP</span>
                    <span className={`font-mono ${(page.lcpMs ?? 0) > 2500 ? "text-editorial-red" : "text-ink"}`}>{page.lcpMs ? `${(page.lcpMs / 1000).toFixed(1)}s` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CLS</span>
                    <span className={`font-mono ${(page.cls ?? 0) > 0.1 ? "text-editorial-red" : "text-ink"}`}>{page.cls?.toFixed(3) ?? "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Schema</span>
                    <span className={`font-mono ${page.hasSchema ? "text-editorial-green" : "text-editorial-red"}`}>
                      {page.hasSchema ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Issues</span>
                    <span className={`font-mono ${page.issuesCount > 0 ? "text-editorial-red" : "text-ink"}`}>{page.issuesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Keywords</span>
                    <span className="font-mono text-ink">{pageKeywords.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
