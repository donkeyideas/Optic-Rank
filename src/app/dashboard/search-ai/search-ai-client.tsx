"use client";

import { useState, useMemo, useTransition } from "react";
import { SortableHeader } from "@/components/editorial/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatShortDate } from "@/lib/utils/format-date";
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
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import type { GeoStats, GeoPageScore, CitationMatrixEntry, SchemaAuditData, CroStats, KeywordWithRevenue } from "@/lib/dal/optimization";
import { RecommendationsTab, StrategyGuideTab } from "@/components/shared/page-guide";
import type { Recommendation, StrategyContent } from "@/components/shared/page-guide";
import type { SnippetOpportunity, AnswerReadiness, VoiceSearchKeyword } from "@/lib/ai/aeo-analysis";
import type { VisibilityStats } from "@/lib/dal/ai-visibility";
import type { SiteAudit, AIVisibilityCheck, ComparisonTimeRange } from "@/types";
import type { GenericPeriodComparison } from "@/lib/utils/period-comparison";
import { PeriodComparisonBar } from "@/components/editorial/period-comparison-bar";
import type { GSCDashboardData } from "@/lib/actions/gsc-dashboard";

/* ── Tabs ──────────────────────────────────────────────────────── */

const TABS = [
  { id: "summary", label: "Summary", icon: BarChart3, color: "bg-editorial-red" },
  { id: "seo", label: "SEO", icon: Search, color: "bg-editorial-red" },
  { id: "aeo", label: "AEO", icon: MessageSquare, color: "bg-editorial-gold" },
  { id: "geo", label: "GEO", icon: Brain, color: "bg-editorial-green" },
  { id: "cro", label: "CRO", icon: Target, color: "bg-[#8b5cf6]" },
  { id: "gsc", label: "Search Console", icon: Globe, color: "bg-[#4285F4]" },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb, color: "bg-editorial-gold" },
  { id: "strategy", label: "Strategy Guide", icon: FileText, color: "bg-editorial-green" },
];

type TabId = "summary" | "seo" | "aeo" | "geo" | "cro" | "gsc" | "recommendations" | "strategy";

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

interface PageSignal {
  url: string;
  signals: Record<string, unknown>;
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
  keywordsWithRevenue: KeywordWithRevenue[];
  croStats: CroStats;
  // Crawl signals
  aeoSignals?: PageSignal[];
  geoSignals?: PageSignal[];
  // GSC
  gscData?: GSCDashboardData | null;
  // Period comparisons
  comparisons: Record<ComparisonTimeRange, GenericPeriodComparison>;
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
  const [activeTab, setActiveTab] = useState<TabId>("summary");

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

  // GEO score: use DB value if available, then signals, then audit pages fallback
  const geoScore = useMemo(() => {
    if (props.geoStats.avgGeoScore > 0) return props.geoStats.avgGeoScore;
    if (props.geoSignals && props.geoSignals.length > 0) {
      const n = props.geoSignals.length || 1;
      const dims = [
        80, // crawler access
        Math.round((props.geoSignals.filter((s) => s.signals.hasSchema === true).length / n) * 100),
        Math.round((props.geoSignals.filter((s) => (s.signals.wordCount as number ?? 0) > 300).length / n) * 100),
        Math.round((props.geoSignals.filter((s) => s.signals.hasOgTags === true).length / n) * 100),
        Math.round((props.geoSignals.filter((s) => s.signals.hasBreadcrumbs === true).length / n) * 100),
        Math.round((props.geoSignals.filter((s) => !!s.signals.lang).length / n) * 100),
      ];
      return Math.round(dims.reduce((s, d) => s + d, 0) / dims.length);
    }
    if (props.auditPages.length === 0) return 0;
    const total = props.auditPages.length || 1;
    const schemaPages = props.auditPages.filter((p) => p.has_schema).length;
    const schemaPct = Math.round((schemaPages / total) * 100);
    const contentPct = Math.round((props.auditPages.filter((p) => (p.word_count ?? 0) > 300).length / total) * 100);
    const navPct = Math.round((props.auditPages.filter((p) => p.title && p.title.length > 0).length / total) * 100);
    const crawlerPct = 80;
    return Math.round((crawlerPct + schemaPct + contentPct + navPct) / 4);
  }, [props.geoStats.avgGeoScore, props.geoSignals, props.auditPages]);

  // AEO score - always computed from page dimensions for consistency
  const aeoScore = useMemo(() => {
    if (props.aeoSignals && props.aeoSignals.length > 0) {
      const n = props.aeoSignals.length || 1;
      const dims = [
        Math.round((props.aeoSignals.filter((s) => (s.signals.schemaRichness as number ?? 0) >= 2).length / n) * 100),
        Math.round((props.aeoSignals.filter((s) => s.signals.hasFaqSchema === true).length / n) * 100),
        Math.round((props.aeoSignals.filter((s) => (s.signals.questionCount as number ?? 0) >= 2).length / n) * 100),
        Math.round((props.aeoSignals.filter((s) => s.signals.hasSpeakableSchema === true).length / n) * 100),
        Math.round((props.aeoSignals.filter((s) => (s.signals.listCount as number ?? 0) >= 2).length / n) * 100),
        Math.round((props.aeoSignals.filter((s) => s.signals.hasHowToSchema === true).length / n) * 100),
      ];
      return Math.round(dims.reduce((s, d) => s + d, 0) / dims.length);
    }
    // Fallback: compute from audit_pages with better proxies
    if (props.auditPages.length === 0) return 0;
    const n = props.auditPages.length || 1;
    const dims = [
      Math.round((props.auditPages.filter((p) => p.has_schema).length / n) * 100),
      Math.round((props.auditPages.filter((p) => p.has_schema).length / n) * 60),
      Math.round((props.auditPages.filter((p) => p.title && p.title.includes("?")).length / n) * 100),
      Math.round((props.auditPages.filter((p) => (p.word_count ?? 0) > 500).length / n) * 40),
      Math.round((props.auditPages.filter((p) => (p.word_count ?? 0) > 300).length / n) * 100),
      Math.round((props.auditPages.filter((p) => p.has_schema && (p.word_count ?? 0) > 300).length / n) * 50),
    ];
    return Math.round(dims.reduce((s, d) => s + d, 0) / dims.length);
  }, [props.aeoSignals, props.auditPages]);

  const croScore = useMemo(() => {
    const kws = props.keywords;
    if (kws.length === 0) return 0;

    // 1. Position quality (0-40): weighted by how close keywords are to page 1
    const ranked = kws.filter((k) => k.current_position != null && k.current_position > 0);
    let positionScore = 0;
    if (ranked.length > 0) {
      const avgPos = ranked.reduce((s, k) => s + k.current_position!, 0) / ranked.length;
      // avg position 1 = 40pts, 10 = 30pts, 20 = 20pts, 50 = 5pts, 100+ = 0
      positionScore = avgPos <= 1 ? 40 : avgPos >= 100 ? 0 : Math.round(40 * (1 - (avgPos - 1) / 99));
    }

    // 2. Keyword coverage (0-20): % of keywords that have a tracked position
    const coverageScore = Math.round((ranked.length / kws.length) * 20);

    // 3. Revenue potential (0-25): based on estimated revenue relative to keyword count
    const rev = props.croStats.estimatedMonthlyRevenue;
    const revenueScore = rev > 0 ? Math.min(25, Math.round(Math.log10(rev + 1) * 10)) : 0;

    // 4. Converting keywords (0-15): % of keywords generating estimated revenue
    const kwConverting = props.keywordsWithRevenue.filter((k) => k.estimatedRevenue > 0).length;
    const convertingScore = kws.length > 0 ? Math.round((kwConverting / kws.length) * 15) : 0;

    return Math.min(100, positionScore + coverageScore + revenueScore + convertingScore);
  }, [props.keywords, props.croStats, props.keywordsWithRevenue]);

  const overallScore = Math.round((seoScore + technicalScore + contentScore + geoScore + aeoScore + croScore) / 6);

  /* ── Recommendations ── */
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];

    // SEO recommendations
    if (props.latestAudit) {
      if (props.latestAudit.health_score != null && props.latestAudit.health_score < 70) {
        recs.push({
          id: "seo-health",
          priority: "high",
          category: "SEO Health",
          icon: Shield,
          item: `Site Health: ${props.latestAudit.health_score}/100`,
          action: "Your site health needs improvement. Fix critical technical issues to establish a strong SEO foundation.",
          where: "Go to the Site Audit page for detailed issue breakdown and fix recommendations.",
          estimatedImpact: "Improving health score to 80+ is a prerequisite for ranking improvements across all channels.",
          details: "Technical SEO is the foundation — AEO, GEO, and CRO optimizations won't help if basic SEO is broken.",
        });
      }
    }

    // AEO recommendations — use computed aeoScore (has fallback logic)
    if (aeoScore > 0 && aeoScore < 70) {
      recs.push({
        id: "aeo-score",
        priority: aeoScore < 40 ? "high" : "medium",
        category: "AEO — Answer Optimization",
        icon: Bot,
        item: `AEO Score: ${aeoScore}/100`,
        action: "Improve your Answer Engine Optimization score. Add structured Q&A content, FAQ schema, and speakable markup to rank in featured snippets and voice search.",
        where: "Check the AEO tab for dimension breakdown and page-level optimization suggestions.",
        estimatedImpact: "Higher AEO scores mean better visibility in featured snippets, People Also Ask, and voice search results.",
        details: "Focus on FAQ schema, question headings, concise definitions, and HowTo markup for the biggest impact.",
      });
    }

    if (props.snippetOpportunities.length > 0) {
      const highOpp = props.snippetOpportunities.filter(s => s.score > 70);
      if (highOpp.length > 0) {
        recs.push({
          id: "aeo-snippets",
          priority: "high",
          category: "AEO — Featured Snippets",
          icon: MessageSquare,
          item: `${highOpp.length} High-Potential Snippet Opportunities`,
          action: "Structure content with clear Q&A format, lists, and tables to capture featured snippets for these queries.",
          where: "Check the AEO tab for specific snippet opportunities and readiness scores.",
          estimatedImpact: "Featured snippets get 8-12% of clicks and position your brand as the authoritative answer.",
          details: "Focus on queries where you already rank in top 10 — these have the highest chance of winning the snippet.",
        });
      }
    }

    if (props.answerReadiness.length > 0) {
      const lowReadiness = props.answerReadiness.filter(a => a.score < 50);
      if (lowReadiness.length > 3) {
        recs.push({
          id: "aeo-readiness",
          priority: "medium",
          category: "AEO — Answer Readiness",
          icon: Bot,
          item: `${lowReadiness.length} Pages with Low Answer Readiness`,
          action: "Improve answer readiness by adding structured Q&A sections, concise definitions, and clear step-by-step instructions.",
          where: "AEO tab — review pages with low readiness scores.",
          estimatedImpact: "Higher answer readiness increases chances of being cited by AI assistants and voice search.",
          details: "AI engines prefer content with clear, authoritative answers near the top of the page.",
        });
      }
    }

    // Voice search
    if (props.voiceSearchKeywords.length > 0) {
      recs.push({
        id: "voice-search",
        priority: "medium",
        category: "AEO — Voice Search",
        icon: MessageSquare,
        item: `${props.voiceSearchKeywords.length} Voice Search Keywords`,
        action: "Optimize for voice search by using conversational language, question phrases, and concise answers.",
        where: "AEO tab — review voice search keywords and adapt your content accordingly.",
        estimatedImpact: "Voice search is growing 20% yearly. Early optimization gives you a significant advantage.",
        details: "Voice queries are typically longer and conversational. Use natural language and FAQ formats.",
      });
    }

    // GEO recommendations — use computed geoScore (has fallback logic), not raw DB value
    if (geoScore < 60) {
      recs.push({
        id: "geo-score",
        priority: "high",
        category: "GEO — AI Visibility",
        icon: Brain,
        item: `GEO Score: ${geoScore}/100`,
        action: "Improve your Generative Engine Optimization score. Structure content to be cited by AI models like ChatGPT, Gemini, and Perplexity.",
        where: "Check the GEO tab for page-level scores and optimization suggestions.",
        estimatedImpact: "AI-powered search is rapidly growing. High GEO scores mean your brand appears in AI-generated answers.",
        details: "Focus on authoritative content, clear entity definitions, and comprehensive topic coverage.",
      });
    }

    if (props.citationMatrix.length > 0) {
      const lowCitation = props.citationMatrix.filter(c => !c.mentioned);
      if (lowCitation.length > 3) {
        recs.push({
          id: "geo-citations",
          priority: "medium",
          category: "GEO — Citations",
          icon: Globe,
          item: `${lowCitation.length} Topics with Low AI Citations`,
          action: "Create more authoritative, well-structured content for these topics to increase AI citation frequency.",
          where: "GEO tab — review the citation matrix for underperforming topics.",
          estimatedImpact: "Increasing citations in AI responses directly drives qualified traffic from AI-powered search.",
          details: "AI models cite content that is authoritative, well-structured, and provides unique insights.",
        });
      }
    }

    // CRO recommendations
    if (props.croStats.estimatedMonthlyRevenue < 100 && props.keywords.length > 0) {
      recs.push({
        id: "cro-conversion",
        priority: "high",
        category: "CRO — Conversion",
        icon: Target,
        item: `Est. Monthly Revenue: $${props.croStats.estimatedMonthlyRevenue.toLocaleString()}`,
        action: "Improve conversion rates by optimizing CTAs, page layouts, and user experience on high-traffic pages.",
        where: "Check the CRO tab for page-level conversion data and revenue opportunities.",
        estimatedImpact: "Improving conversion rate from 1% to 2% effectively doubles your revenue from existing traffic.",
        details: "Focus on high-traffic, low-converting pages first — these offer the biggest ROI improvements.",
      });
    }

    if (props.keywordsWithRevenue.length > 0) {
      const highRevenue = props.keywordsWithRevenue.filter(k => k.estimatedRevenue > 1000);
      if (highRevenue.length > 0) {
        recs.push({
          id: "cro-revenue",
          priority: "medium",
          category: "CRO — Revenue",
          icon: Zap,
          item: `${highRevenue.length} High-Revenue Keywords`,
          action: "Prioritize ranking improvements for keywords with the highest revenue potential.",
          where: "CRO tab — sort by revenue potential and focus on top opportunities.",
          estimatedImpact: `Top ${highRevenue.length} keywords represent significant monthly revenue potential.`,
          details: "Revenue-focused optimization means prioritizing keywords by business value, not just search volume.",
        });
      }
    }

    // Schema audit
    if (props.schemaAudit && props.schemaAudit.totalPages > 0 && props.schemaAudit.coveragePct < 50) {
      recs.push({
        id: "schema-coverage",
        priority: "medium",
        category: "Technical — Schema",
        icon: FileText,
        item: `Schema Coverage: ${props.schemaAudit.coveragePct}%`,
        action: "Add structured data markup to more pages to improve rich result eligibility across search engines.",
        where: "AEO tab — review the schema audit section for specific recommendations.",
        estimatedImpact: "Proper schema markup increases rich result eligibility by 2-4x and improves click-through rates.",
        details: "Priority schema types: FAQ, HowTo, Article, Product, LocalBusiness, and Organization.",
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [props.latestAudit, props.snippetOpportunities, props.answerReadiness, props.voiceSearchKeywords, geoScore, aeoScore, props.citationMatrix, props.croStats, props.keywordsWithRevenue, props.schemaAudit, props.keywords]);

  /* ── Strategy Guide ── */
  const strategyContent: StrategyContent = useMemo(() => ({
    title: "Search & AI Optimization Strategy Guide",
    intro: "Modern SEO goes beyond traditional search. This guide covers SEO, AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), and CRO (Conversion Rate Optimization) for comprehensive search visibility.",
    cards: [
      {
        icon: Search,
        iconColor: "text-editorial-red",
        title: "SEO Fundamentals",
        bullets: [
          { bold: "Technical foundation", text: "Ensure your site is fast, mobile-friendly, and free of critical errors." },
          { bold: "On-page optimization", text: "Optimize titles, meta descriptions, headings, and content for target keywords." },
          { bold: "Content quality", text: "Create comprehensive, authoritative content that matches search intent." },
        ],
      },
      {
        icon: MessageSquare,
        iconColor: "text-editorial-gold",
        title: "AEO & Voice Search",
        bullets: [
          { bold: "Featured snippets", text: "Structure content for featured snippet capture — use Q&A format, lists, and tables." },
          { bold: "Voice optimization", text: "Target conversational queries and provide concise, direct answers." },
          { bold: "Schema markup", text: "Implement structured data (FAQ, HowTo, Article) for rich result eligibility." },
        ],
      },
      {
        icon: Brain,
        iconColor: "text-editorial-green",
        title: "GEO & CRO",
        bullets: [
          { bold: "AI visibility", text: "Optimize content to be cited by AI models — structure, authority, and clarity matter." },
          { bold: "Conversion optimization", text: "Turn organic traffic into revenue with optimized CTAs and user experience." },
          { bold: "Revenue keywords", text: "Prioritize keyword optimization by business value, not just search volume." },
        ],
      },
    ],
    steps: [
      { step: "1", title: "Audit Your SEO", desc: "Run a technical site audit to establish your baseline scores across SEO, AEO, GEO, and CRO." },
      { step: "2", title: "Fix Technical Issues", desc: "Address critical SEO issues first — they block all other optimization efforts." },
      { step: "3", title: "Optimize for Snippets", desc: "Identify high-potential snippet opportunities and restructure content to capture them." },
      { step: "4", title: "Improve AI Visibility", desc: "Enhance your GEO score by adding authoritative, well-structured content that AI models prefer to cite." },
      { step: "5", title: "Optimize Conversions", desc: "Focus CRO efforts on high-traffic pages with the most revenue potential." },
      { step: "6", title: "Monitor All Channels", desc: "Track performance across SEO, AEO, GEO, and CRO monthly. Adjust strategy based on data." },
    ],
    dos: [
      { text: "Optimize for multiple search channels simultaneously — traditional, voice, and AI-powered search." },
      { text: "Use structured data markup on every page to improve rich result eligibility." },
      { text: "Create content that directly answers questions — AI engines and featured snippets reward this." },
      { text: "Prioritize optimizations by revenue potential, not just traffic volume." },
      { text: "Monitor AI visibility trends — this is the fastest-growing search channel." },
    ],
    donts: [
      { text: "Don't focus only on traditional SEO rankings — AI search is changing how users find information." },
      { text: "Don't ignore voice search — it's growing rapidly and requires different optimization strategies." },
      { text: "Don't optimize for traffic without considering conversion — high traffic with low conversion wastes potential." },
      { text: "Don't skip schema markup — it's a low-effort, high-impact optimization." },
      { text: "Don't treat SEO, AEO, GEO, and CRO as separate silos — they work best as an integrated strategy." },
    ],
    metrics: [
      { label: "SEO Score", desc: "Traditional search engine optimization quality. Measures technical health, on-page factors, and content quality.", color: "text-editorial-red" },
      { label: "AEO Score", desc: "Answer Engine Optimization — how well your content is structured for featured snippets and voice search.", color: "text-editorial-gold" },
      { label: "GEO Score", desc: "Generative Engine Optimization — likelihood of being cited by AI models like ChatGPT and Gemini.", color: "text-editorial-green" },
      { label: "CRO Score", desc: "Conversion Rate Optimization — how effectively your organic traffic converts to business outcomes.", color: "text-ink" },
    ],
  }), []);

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
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
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

      {/* Period Comparisons */}
      <PeriodComparisonBar comparisons={props.comparisons} />

      {/* ── Tab Content ── */}
      {activeTab === "summary" && (
        <SummaryTab
          seoScore={seoScore}
          technicalScore={technicalScore}
          performanceScore={performanceScore}
          contentScore={contentScore}
          geoScore={geoScore}
          aeoScore={aeoScore}
          croScore={croScore}
          overallScore={overallScore}
          latestAudit={props.latestAudit}
          auditPages={props.auditPages}
          auditHistory={props.auditHistory}
          keywords={props.keywords}
          contentPages={props.contentPages}
          schemaAudit={props.schemaAudit}
        />
      )}
      {activeTab === "seo" && (
        <SeoTab
          seoScore={seoScore}
          technicalScore={technicalScore}
          performanceScore={performanceScore}
          latestAudit={props.latestAudit}
          auditPages={props.auditPages}
          keywords={props.keywords}
          contentPages={props.contentPages}
          schemaAudit={props.schemaAudit}
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
          aeoSignals={props.aeoSignals ?? []}
        />
      )}
      {activeTab === "geo" && (
        <GeoTab
          geoScore={geoScore}
          geoStats={props.geoStats}
          geoPages={props.geoPages}
          citationMatrix={props.citationMatrix}
          visibilityStats={props.visibilityStats}
          visibilityChecks={props.visibilityChecks}
          auditPages={props.auditPages}
          geoSignals={props.geoSignals ?? []}
        />
      )}
      {activeTab === "cro" && (
        <CroTab
          croScore={croScore}
          croStats={props.croStats}
          keywordsWithRevenue={props.keywordsWithRevenue}
          keywords={props.keywords}
          contentPages={props.contentPages}
        />
      )}
      {activeTab === "gsc" && (
        <GSCTab gscData={props.gscData ?? null} />
      )}
      {activeTab === "recommendations" && (
        <RecommendationsTab
          recommendations={recommendations}
          itemLabel="item"
          emptyMessage="Run analyses to generate personalized search optimization recommendations."
        />
      )}
      {activeTab === "strategy" && (
        <StrategyGuideTab content={strategyContent} />
      )}
    </div>
  );
}

/* ================================================================
   SUMMARY TAB
   ================================================================ */

function SummaryTab({
  seoScore,
  technicalScore,
  performanceScore,
  contentScore,
  geoScore,
  aeoScore,
  croScore,
  overallScore,
  latestAudit,
  auditPages,
  auditHistory,
  keywords,
  contentPages,
  schemaAudit,
}: {
  seoScore: number;
  technicalScore: number;
  performanceScore: number;
  contentScore: number;
  geoScore: number;
  aeoScore: number;
  croScore: number;
  overallScore: number;
  latestAudit: SiteAudit | null;
  auditPages: AuditPage[];
  auditHistory: SiteAudit[];
  keywords: KeywordRow[];
  contentPages: ContentPage[];
  schemaAudit: SchemaAuditData;
}) {
  const timezone = useTimezone();
  const pagesInSitemap = auditPages.length;
  const blogPosts = contentPages.length;
  const schemaTypes = schemaAudit.pagesWithSchema;
  const openRecommendations = latestAudit?.issues_found ?? 0;

  const chartData = auditHistory
    .slice(0, 12)
    .reverse()
    .map((a) => ({
      date: formatShortDate(a.completed_at ?? a.started_at, timezone),
      seo: a.seo_score ?? 0,
      health: a.health_score ?? 0,
      performance: a.performance_score ?? 0,
    }));

  const top3 = keywords.filter((k) => k.current_position !== null && k.current_position <= 3).length;
  const top10 = keywords.filter((k) => k.current_position !== null && k.current_position <= 10).length;
  const top20 = keywords.filter((k) => k.current_position !== null && k.current_position <= 20).length;
  const notRanking = keywords.filter((k) => k.current_position === null || k.current_position > 100).length;

  return (
    <div className="space-y-6">
      {/* Pillar Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Overall Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-8 py-4 md:justify-between">
            <ScoreGauge score={overallScore} label="Overall" size={130} />
            <ScoreGauge score={seoScore} label="SEO" color="var(--color-editorial-red)" />
            <ScoreGauge score={geoScore} label="GEO" color="var(--color-editorial-green)" />
            <ScoreGauge score={aeoScore} label="AEO" color="var(--color-editorial-gold)" />
            <ScoreGauge score={croScore} label="CRO" color="#8b5cf6" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Strip */}
      <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-5">
        <StatMini label="Pages Crawled" value={pagesInSitemap} color="border-editorial-red" />
        <StatMini label="Content Pages" value={blogPosts} color="border-editorial-gold" />
        <StatMini label="Schema Pages" value={schemaTypes} color="border-editorial-green" />
        <StatMini label="Keywords Tracked" value={keywords.length} color="border-[#8b5cf6]" />
        <StatMini label="Open Issues" value={openRecommendations} color="border-editorial-red" />
      </div>

      {/* Score Trend Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Score Trend</CardTitle>
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

      {/* Quick Pillar Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Technical Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressBar label="Technical Score" value={technicalScore} color="bg-editorial-green" />
            <ProgressBar label="Performance Score" value={performanceScore} color="bg-editorial-gold" />
            <ProgressBar label="Content Score" value={contentScore} color="bg-editorial-red" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Growth Pillars</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressBar label="SEO Score" value={seoScore} color="bg-editorial-red" />
            <ProgressBar label="GEO Score" value={geoScore} color="bg-editorial-green" />
            <ProgressBar label="AEO Score" value={aeoScore} color="bg-editorial-gold" />
            <ProgressBar label="CRO Score" value={croScore} color="bg-[#8b5cf6]" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ================================================================
   SEO TAB
   ================================================================ */

function SeoTab({
  seoScore,
  technicalScore,
  performanceScore,
  latestAudit,
  auditPages,
  keywords,
  contentPages,
  schemaAudit,
}: {
  seoScore: number;
  technicalScore: number;
  performanceScore: number;
  latestAudit: SiteAudit | null;
  auditPages: AuditPage[];
  keywords: KeywordRow[];
  contentPages: ContentPage[];
  schemaAudit: SchemaAuditData;
}) {
  // CWV aggregates (coerce to Number — Supabase returns decimal columns as strings)
  const cwvStats = useMemo(() => {
    const withLcp = auditPages.filter((p) => p.lcp_ms !== null);
    const withCls = auditPages.filter((p) => p.cls !== null);
    const withInp = auditPages.filter((p) => p.inp_ms !== null);
    const avgLcp = withLcp.length > 0 ? Math.round(withLcp.reduce((s, p) => s + Number(p.lcp_ms ?? 0), 0) / withLcp.length) : null;
    const avgCls = withCls.length > 0 ? Math.round(withCls.reduce((s, p) => s + Number(p.cls ?? 0), 0) / withCls.length * 1000) / 1000 : null;
    const avgInp = withInp.length > 0 ? Math.round(withInp.reduce((s, p) => s + Number(p.inp_ms ?? 0), 0) / withInp.length) : null;
    const lcpGood = withLcp.filter((p) => Number(p.lcp_ms ?? 9999) <= 2500).length;
    const clsGood = withCls.filter((p) => Number(p.cls ?? 1) <= 0.1).length;
    const inpGood = withInp.filter((p) => Number(p.inp_ms ?? 9999) <= 200).length;
    return { avgLcp, avgCls, avgInp, lcpGood, clsGood, inpGood, totalLcp: withLcp.length, totalCls: withCls.length, totalInp: withInp.length };
  }, [auditPages]);

  // Content health (status is HTTP status code from audit_pages, e.g. "200")
  const published = contentPages.filter((p) => p.status === "200" || p.status === "published").length;
  const drafts = contentPages.length - published;
  const avgWordCount = contentPages.length > 0
    ? Math.round(contentPages.reduce((s, p) => s + (p.word_count ?? 0), 0) / contentPages.length)
    : 0;
  const thinPages = contentPages.filter((p) => (p.word_count ?? 0) < 300).length;

  // Sorting — Keyword Rankings
  type SeoKwSortKey = "keyword" | "current_position" | "search_volume" | "intent" | "difficulty";
  const { sortKey: seoKwSort, sortDir: seoKwDir, toggleSort: toggleSeoKw, sort: sortSeoKw } = useTableSort<SeoKwSortKey>("current_position", "asc");
  const sortedKeywords = useMemo(
    () => sortSeoKw(keywords, (row, key) => row[key as keyof KeywordRow]),
    [sortSeoKw, keywords]
  );

  // Sorting — Page Performance
  type SeoPageSortKey = "title" | "lcp_ms" | "cls" | "inp_ms" | "has_schema" | "issues_count";
  const { sortKey: seoPageSort, sortDir: seoPageDir, toggleSort: toggleSeoPage, sort: sortSeoPage } = useTableSort<SeoPageSortKey>("issues_count", "desc");
  const sortedAuditPages = useMemo(
    () => sortSeoPage(auditPages, (row, key) => {
      if (key === "title") return row.title ?? row.url;
      if (key === "has_schema") return row.has_schema ? 1 : 0;
      return row[key as keyof AuditPage];
    }),
    [sortSeoPage, auditPages]
  );

  return (
    <div className="space-y-6">
      {/* SEO Scores */}
      <Card>
        <CardContent className="flex flex-col items-center gap-8 py-6 md:flex-row">
          <ScoreGauge score={seoScore} label="SEO Score" size={140} strokeWidth={10} color="var(--color-editorial-red)" />
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
              <StatMini label="Technical" value={technicalScore} color="border-editorial-green" />
              <StatMini label="Performance" value={performanceScore} color="border-editorial-gold" />
              <StatMini label="Schema Coverage" value={`${auditPages.length > 0 ? Math.round((schemaAudit.pagesWithSchema / auditPages.length) * 100) : 0}%`} color="border-[#8b5cf6]" />
              <StatMini label="Open Issues" value={latestAudit?.issues_found ?? 0} color="border-editorial-red" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Core Web Vitals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-rule p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">LCP (Largest Contentful Paint)</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={cn("font-serif text-2xl font-bold", cwvStats.avgLcp !== null && cwvStats.avgLcp <= 2500 ? "text-editorial-green" : cwvStats.avgLcp !== null && cwvStats.avgLcp <= 4000 ? "text-editorial-gold" : "text-editorial-red")}>
                  {cwvStats.avgLcp !== null ? `${cwvStats.avgLcp}ms` : "—"}
                </span>
                <span className="text-xs text-ink-muted">avg</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{cwvStats.lcpGood}/{cwvStats.totalLcp} pages pass (&le;2500ms)</p>
            </div>
            <div className="border border-rule p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">CLS (Cumulative Layout Shift)</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={cn("font-serif text-2xl font-bold", cwvStats.avgCls !== null && cwvStats.avgCls <= 0.1 ? "text-editorial-green" : cwvStats.avgCls !== null && cwvStats.avgCls <= 0.25 ? "text-editorial-gold" : "text-editorial-red")}>
                  {cwvStats.avgCls !== null ? cwvStats.avgCls : "—"}
                </span>
                <span className="text-xs text-ink-muted">avg</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{cwvStats.clsGood}/{cwvStats.totalCls} pages pass (&le;0.1)</p>
            </div>
            <div className="border border-rule p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">INP (Interaction to Next Paint)</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={cn("font-serif text-2xl font-bold", cwvStats.avgInp !== null && cwvStats.avgInp <= 200 ? "text-editorial-green" : cwvStats.avgInp !== null && cwvStats.avgInp <= 500 ? "text-editorial-gold" : "text-editorial-red")}>
                  {cwvStats.avgInp !== null ? `${cwvStats.avgInp}ms` : "—"}
                </span>
                <span className="text-xs text-ink-muted">avg</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">{cwvStats.inpGood}/{cwvStats.totalInp} pages pass (&le;200ms)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Health */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Content Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
            <StatMini label="Published" value={published} color="border-editorial-green" />
            <StatMini label="Drafts" value={drafts} color="border-editorial-gold" />
            <StatMini label="Avg Word Count" value={avgWordCount} color="border-[#8b5cf6]" />
            <StatMini label="Thin Pages (<300w)" value={thinPages} color="border-editorial-red" />
          </div>
        </CardContent>
      </Card>

      {/* Keyword Rankings */}
      {keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Keyword Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <SortableHeader<SeoKwSortKey> label="Keyword" sortKey="keyword" currentSort={seoKwSort} currentDir={seoKwDir} onSort={toggleSeoKw} className="py-2 pr-4" />
                    <SortableHeader<SeoKwSortKey> label="Position" sortKey="current_position" currentSort={seoKwSort} currentDir={seoKwDir} onSort={toggleSeoKw} className="px-3 py-2 text-center" />
                    <SortableHeader<SeoKwSortKey> label="Volume" sortKey="search_volume" currentSort={seoKwSort} currentDir={seoKwDir} onSort={toggleSeoKw} className="px-3 py-2 text-center" />
                    <SortableHeader<SeoKwSortKey> label="Intent" sortKey="intent" currentSort={seoKwSort} currentDir={seoKwDir} onSort={toggleSeoKw} className="px-3 py-2 text-center" />
                    <SortableHeader<SeoKwSortKey> label="Difficulty" sortKey="difficulty" currentSort={seoKwSort} currentDir={seoKwDir} onSort={toggleSeoKw} className="px-3 py-2 text-center" />
                  </tr>
                </thead>
                <tbody>
                  {sortedKeywords.slice(0, 20).map((kw) => (
                    <tr key={kw.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2.5 pr-4 text-sm font-medium text-ink">{kw.keyword}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn(
                          "font-mono text-sm font-bold",
                          kw.current_position !== null && kw.current_position <= 3 ? "text-editorial-green" :
                          kw.current_position !== null && kw.current_position <= 10 ? "text-editorial-gold" :
                          "text-editorial-red"
                        )}>
                          {kw.current_position ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm text-ink-muted">{kw.search_volume?.toLocaleString() ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center">
                        {kw.intent ? (
                          <Badge variant="muted" className="text-[10px]">{kw.intent}</Badge>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {kw.difficulty !== null ? (
                          <span className={cn(
                            "font-mono text-sm",
                            kw.difficulty <= 30 ? "text-editorial-green" :
                            kw.difficulty <= 60 ? "text-editorial-gold" :
                            "text-editorial-red"
                          )}>
                            {kw.difficulty}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <SortableHeader<SeoPageSortKey> label="Page" sortKey="title" currentSort={seoPageSort} currentDir={seoPageDir} onSort={toggleSeoPage} className="py-2 pr-4" />
                    <SortableHeader<SeoPageSortKey> label="LCP" sortKey="lcp_ms" currentSort={seoPageSort} currentDir={seoPageDir} onSort={toggleSeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<SeoPageSortKey> label="CLS" sortKey="cls" currentSort={seoPageSort} currentDir={seoPageDir} onSort={toggleSeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<SeoPageSortKey> label="INP" sortKey="inp_ms" currentSort={seoPageSort} currentDir={seoPageDir} onSort={toggleSeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<SeoPageSortKey> label="Schema" sortKey="has_schema" currentSort={seoPageSort} currentDir={seoPageDir} onSort={toggleSeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<SeoPageSortKey> label="Issues" sortKey="issues_count" currentSort={seoPageSort} currentDir={seoPageDir} onSort={toggleSeoPage} className="px-3 py-2 text-center" />
                  </tr>
                </thead>
                <tbody>
                  {sortedAuditPages.slice(0, 15).map((page) => (
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
  aeoSignals,
}: {
  aeoScore: number;
  snippetOpportunities: SnippetOpportunity[];
  answerReadiness: AnswerReadiness[];
  voiceSearchKeywords: VoiceSearchKeyword[];
  schemaAudit: SchemaAuditData;
  totalKeywords: number;
  auditPages: AuditPage[];
  aeoSignals: PageSignal[];
}) {
  const n = auditPages.length || 1;

  // Build per-page AEO signal lookup
  const signalMap = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const s of aeoSignals) {
      m.set(s.url.replace(/\/$/, ""), s.signals);
    }
    return m;
  }, [aeoSignals]);

  // Compute 6 AEO dimensions from crawl signals (matching admin)
  const dimensions = useMemo(() => {
    if (aeoSignals.length > 0) {
      const total = aeoSignals.length || 1;
      return [
        { label: "Schema Richness", value: Math.round((aeoSignals.filter((s) => (s.signals.schemaRichness as number ?? 0) >= 2).length / total) * 100) },
        { label: "FAQ Schema", value: Math.round((aeoSignals.filter((s) => s.signals.hasFaqSchema === true).length / total) * 100) },
        { label: "Question Headings", value: Math.round((aeoSignals.filter((s) => (s.signals.questionCount as number ?? 0) >= 2).length / total) * 100) },
        { label: "Speakable Content", value: Math.round((aeoSignals.filter((s) => s.signals.hasSpeakableSchema === true).length / total) * 100) },
        { label: "Lists Present", value: Math.round((aeoSignals.filter((s) => (s.signals.listCount as number ?? 0) >= 2).length / total) * 100) },
        { label: "HowTo Schema", value: Math.round((aeoSignals.filter((s) => s.signals.hasHowToSchema === true).length / total) * 100) },
      ];
    }
    // Fallback from audit_pages when no signals available
    return [
      { label: "Schema Richness", value: Math.round((auditPages.filter((p) => p.has_schema).length / n) * 100) },
      { label: "FAQ Schema", value: Math.round((auditPages.filter((p) => p.has_schema).length / n) * 50) },
      { label: "Question Headings", value: 0 },
      { label: "Speakable Content", value: 0 },
      { label: "Lists Present", value: Math.round((auditPages.filter((p) => (p.word_count ?? 0) > 300).length / n) * 100) },
      { label: "HowTo Schema", value: 0 },
    ];
  }, [aeoSignals, auditPages, n]);

  const radarData = dimensions.map((d) => ({ subject: d.label, value: d.value }));

  // AEO score gauge should always match the dimension data for consistency
  const dimensionAvg = Math.round(dimensions.reduce((s, d) => s + d.value, 0) / dimensions.length);
  const computedAeoScore = dimensionAvg;

  const voiceReadyPct = totalKeywords > 0
    ? Math.round((voiceSearchKeywords.length / totalKeywords) * 100)
    : 0;
  const faqPages = aeoSignals.length > 0
    ? aeoSignals.filter((s) => s.signals.hasFaqSchema === true).length
    : auditPages.filter((p) => p.has_schema).length;

  // Sorting — Page AEO Signals
  type AeoPageSortKey = "title" | "faq" | "howto" | "questions" | "lists" | "speakable";
  const { sortKey: aeoPageSort, sortDir: aeoPageDir, toggleSort: toggleAeoPage, sort: sortAeoPage } = useTableSort<AeoPageSortKey>("title", "asc");
  const sortedAeoPages = useMemo(
    () => sortAeoPage(auditPages, (row, key) => {
      if (key === "title") return row.title ?? row.url;
      const sig = signalMap.get(row.url.replace(/\/$/, ""));
      if (key === "faq") return sig ? (sig.hasFaqSchema === true ? 1 : 0) : (row.has_schema ? 1 : 0);
      if (key === "howto") return sig ? (sig.hasHowToSchema === true ? 1 : 0) : 0;
      if (key === "questions") return sig ? (sig.questionCount as number ?? 0) : 0;
      if (key === "lists") return sig ? (sig.listCount as number ?? 0) : 0;
      if (key === "speakable") return sig ? (sig.hasSpeakableSchema === true ? 1 : 0) : 0;
      return null;
    }),
    [sortAeoPage, auditPages, signalMap]
  );

  // Sorting — Snippet Opportunities
  type SnippetSortKey = "keyword" | "position" | "searchVolume" | "score";
  const { sortKey: snippetSort, sortDir: snippetDir, toggleSort: toggleSnippet, sort: sortSnippet } = useTableSort<SnippetSortKey>("score", "desc");
  const sortedSnippets = useMemo(
    () => sortSnippet(snippetOpportunities, (row, key) => row[key as keyof SnippetOpportunity]),
    [sortSnippet, snippetOpportunities]
  );

  return (
    <div className="space-y-6">
      {/* AEO Score + Description */}
      <Card>
        <CardContent className="flex flex-col items-center gap-8 py-6 md:flex-row">
          <ScoreGauge score={computedAeoScore} label="AEO Score" size={140} strokeWidth={10} color="var(--color-editorial-gold)" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-ink-secondary">
              AEO measures how well your content is optimized for featured snippets, People Also Ask,
              knowledge panels, and voice search results.
            </p>
            <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
              <StatMini label="Voice Search Ready" value={`${voiceReadyPct}%`} color="border-editorial-gold" />
              <StatMini label="Snippet Eligible" value={snippetOpportunities.length} color="border-editorial-green" />
              <StatMini label="FAQ Pages" value={faqPages} color="border-[#8b5cf6]" />
              <StatMini label="Pages Analyzed" value={aeoSignals.length || auditPages.length} color="border-editorial-red" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart + Dimension Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">AEO Dimensions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--color-ink-muted)" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-ink-muted)" }} />
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
                  <div className="h-2.5 w-full bg-surface-raised">
                    <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(d.value, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Page AEO Signals Table */}
      {(aeoSignals.length > 0 || auditPages.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Page AEO Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <SortableHeader<AeoPageSortKey> label="Page" sortKey="title" currentSort={aeoPageSort} currentDir={aeoPageDir} onSort={toggleAeoPage} className="py-2 pr-4" />
                    <SortableHeader<AeoPageSortKey> label="FAQ Schema" sortKey="faq" currentSort={aeoPageSort} currentDir={aeoPageDir} onSort={toggleAeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<AeoPageSortKey> label="HowTo Schema" sortKey="howto" currentSort={aeoPageSort} currentDir={aeoPageDir} onSort={toggleAeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<AeoPageSortKey> label="Questions" sortKey="questions" currentSort={aeoPageSort} currentDir={aeoPageDir} onSort={toggleAeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<AeoPageSortKey> label="Lists" sortKey="lists" currentSort={aeoPageSort} currentDir={aeoPageDir} onSort={toggleAeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<AeoPageSortKey> label="Speakable" sortKey="speakable" currentSort={aeoPageSort} currentDir={aeoPageDir} onSort={toggleAeoPage} className="px-3 py-2 text-center" />
                  </tr>
                </thead>
                <tbody>
                  {sortedAeoPages.slice(0, 15).map((page) => {
                    const sig = signalMap.get(page.url.replace(/\/$/, ""));
                    const hasFaq = sig ? sig.hasFaqSchema === true : page.has_schema;
                    const hasHowTo = sig ? sig.hasHowToSchema === true : false;
                    const questions = sig ? (sig.questionCount as number ?? 0) : 0;
                    const lists = sig ? (sig.listCount as number ?? 0) : 0;
                    const speakable = sig ? sig.hasSpeakableSchema === true : false;

                    return (
                      <tr key={page.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                        <td className="py-2.5 pr-4">
                          <p className="max-w-xs truncate text-sm font-medium text-ink">{page.title ?? page.url}</p>
                          <p className="max-w-xs truncate text-[10px] text-ink-muted">{new URL(page.url).pathname}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center"><BoolIcon value={hasFaq} /></td>
                        <td className="px-3 py-2.5 text-center"><BoolIcon value={hasHowTo} /></td>
                        <td className="px-3 py-2.5 text-center font-mono text-xs text-ink-muted">{questions}</td>
                        <td className="px-3 py-2.5 text-center font-mono text-xs text-ink-muted">{lists}</td>
                        <td className="px-3 py-2.5 text-center"><BoolIcon value={speakable} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <SortableHeader<SnippetSortKey> label="Keyword" sortKey="keyword" currentSort={snippetSort} currentDir={snippetDir} onSort={toggleSnippet} className="py-2 pr-4" />
                    <SortableHeader<SnippetSortKey> label="Position" sortKey="position" currentSort={snippetSort} currentDir={snippetDir} onSort={toggleSnippet} className="px-3 py-2 text-center" />
                    <SortableHeader<SnippetSortKey> label="Volume" sortKey="searchVolume" currentSort={snippetSort} currentDir={snippetDir} onSort={toggleSnippet} className="px-3 py-2 text-center" />
                    <SortableHeader<SnippetSortKey> label="Opportunity" sortKey="score" currentSort={snippetSort} currentDir={snippetDir} onSort={toggleSnippet} className="px-3 py-2 text-center" />
                  </tr>
                </thead>
                <tbody>
                  {sortedSnippets.slice(0, 10).map((opp) => (
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
  geoScore,
  geoStats,
  geoPages,
  citationMatrix,
  visibilityStats,
  visibilityChecks,
  auditPages,
  geoSignals,
}: {
  geoScore: number;
  geoStats: GeoStats;
  geoPages: GeoPageScore[];
  citationMatrix: CitationMatrixEntry[];
  visibilityStats: VisibilityStats;
  visibilityChecks: AIVisibilityCheck[];
  auditPages: AuditPage[];
  geoSignals: PageSignal[];
}) {
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

  // Build per-page GEO signal lookup
  const signalMap = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const s of geoSignals) {
      m.set(s.url.replace(/\/$/, ""), s.signals);
    }
    return m;
  }, [geoSignals]);

  const n = geoSignals.length || auditPages.length || 1;

  // GEO dimensions with descriptions (matching admin pattern)
  const dimensions = useMemo(() => {
    if (geoSignals.length > 0) {
      const total = geoSignals.length || 1;
      return [
        { label: "Schema Markup", value: Math.round((geoSignals.filter((s) => s.signals.hasSchema === true).length / total) * 100), desc: "Pages with JSON-LD structured data" },
        { label: "OG Tags Present", value: Math.round((geoSignals.filter((s) => s.signals.hasOgTags === true).length / total) * 100), desc: "Pages with Open Graph metadata" },
        { label: "Rich Content (300+ words)", value: Math.round((geoSignals.filter((s) => (s.signals.wordCount as number ?? 0) > 300).length / total) * 100), desc: "Pages with substantial, well-structured content" },
        { label: "Breadcrumbs", value: Math.round((geoSignals.filter((s) => s.signals.hasBreadcrumbs === true).length / total) * 100), desc: "Pages with breadcrumb navigation" },
        { label: "Language Set", value: Math.round((geoSignals.filter((s) => !!s.signals.lang).length / total) * 100), desc: "Pages with lang attribute" },
        { label: "Organization Schema", value: Math.round((geoSignals.filter((s) => s.signals.hasOrganizationSchema === true || s.signals.hasArticleSchema === true).length / total) * 100), desc: "Pages with Organization/Article schema" },
      ];
    }
    // Fallback from audit_pages
    const total = auditPages.length || 1;
    return [
      { label: "Schema Markup", value: Math.round((auditPages.filter((p) => p.has_schema).length / total) * 100), desc: "Pages with JSON-LD structured data" },
      { label: "OG Tags Present", value: 0, desc: "Pages with Open Graph metadata" },
      { label: "Rich Content (300+ words)", value: Math.round((auditPages.filter((p) => (p.word_count ?? 0) > 300).length / total) * 100), desc: "Pages with substantial, well-structured content" },
      { label: "Breadcrumbs", value: 0, desc: "Pages with breadcrumb navigation" },
      { label: "Language Set", value: 0, desc: "Pages with lang attribute" },
      { label: "Organization Schema", value: 0, desc: "Pages with Organization/Article schema" },
    ];
  }, [geoSignals, auditPages]);

  // Compute crawlability stats
  const crawlStats = useMemo(() => {
    if (geoSignals.length > 0) {
      const total = geoSignals.length || 1;
      const schemaCount = geoSignals.filter((s) => s.signals.hasSchema === true).length;
      const avgWordCount = Math.round(geoSignals.reduce((s, g) => s + ((g.signals.wordCount as number) ?? 0), 0) / total);
      const contentClarity = Math.min(100, Math.round((avgWordCount / 500) * 100));
      const answerability = Math.round(
        (geoSignals.filter((s) => (s.signals.wordCount as number ?? 0) > 300 && s.signals.hasSchema === true).length / total) * 100
      );
      const citation = Math.round(
        (geoSignals.filter((s) => s.signals.hasSchema === true && s.signals.hasCanonical === true).length / total) * 100
      );
      return {
        structuredData: schemaCount === total ? "100%" : `${Math.round((schemaCount / total) * 100)}%`,
        contentClarity,
        answerability,
        citation,
      };
    }
    // Fallback
    const total = auditPages.length || 1;
    const schemaCount = auditPages.filter((p) => p.has_schema).length;
    const avgWordCount = Math.round(auditPages.reduce((s, p) => s + (p.word_count ?? 0), 0) / total);
    return {
      structuredData: `${Math.round((schemaCount / total) * 100)}%`,
      contentClarity: Math.min(100, Math.round((avgWordCount / 500) * 100)),
      answerability: Math.round((auditPages.filter((p) => (p.word_count ?? 0) > 300 && p.has_schema).length / total) * 100),
      citation: Math.round((schemaCount / total) * 100),
    };
  }, [geoSignals, auditPages]);

  // Per-page GEO scores
  const pageGeoScores = useMemo(() => {
    return auditPages.slice(0, 15).map((page) => {
      const sig = signalMap.get(page.url.replace(/\/$/, ""));
      const wordCount = sig ? (sig.wordCount as number ?? 0) : (page.word_count ?? 0);
      const hasSchema = sig ? sig.hasSchema === true : page.has_schema;
      const hasOg = sig ? sig.hasOgTags === true : false;
      const hasBread = sig ? sig.hasBreadcrumbs === true : false;
      const hasCan = sig ? sig.hasCanonical === true : false;
      const hasLang = sig ? !!sig.lang : false;
      const hasOrgSchema = sig ? (sig.hasOrganizationSchema === true || sig.hasArticleSchema === true) : false;

      // Clarity: content quality (word count, title, headings)
      const clarity = Math.min(100, Math.round(
        (wordCount > 300 ? 40 : (wordCount / 300) * 40) +
        (page.title ? 30 : 0) +
        (hasSchema ? 30 : 0)
      ));
      // Answerability: FAQ, questions, structured content
      const answerability = Math.min(100, Math.round(
        (wordCount > 300 ? 30 : 0) +
        (hasSchema ? 35 : 0) +
        (hasBread ? 15 : 0) +
        (hasOg ? 20 : 0)
      ));
      // Citation: how likely AI will cite this page
      const citation = Math.min(100, Math.round(
        (hasSchema ? 30 : 0) +
        (hasCan ? 20 : 0) +
        (hasOg ? 20 : 0) +
        (hasLang ? 15 : 0) +
        (hasOrgSchema ? 15 : 0)
      ));

      // Schema types
      const schemaTypes = sig ? (sig.schemaTypes as string[] ?? []) : (hasSchema ? ["Schema"] : []);

      let path: string;
      try { path = new URL(page.url).pathname; } catch { path = page.url; }

      return {
        id: page.id,
        path,
        title: page.title,
        url: page.url,
        clarity,
        answerability,
        citation,
        schemaTypes,
        hasSchema,
        hasOg,
        hasBread,
        hasCan,
        hasLang,
        hasOrgSchema,
      };
    });
  }, [auditPages, signalMap]);

  // GEO Improvement Suggestions
  const suggestions = useMemo(() => {
    const items: Array<{ title: string; desc: string }> = [];
    for (const pg of pageGeoScores) {
      if (pg.clarity < 50) {
        items.push({
          title: `Low content clarity for AI`,
          desc: `${pg.path} has a content clarity score of ${pg.clarity}/100. Improve by using clear headings, shorter sentences, and structured lists.`,
        });
      }
      if (pg.answerability < 30) {
        items.push({
          title: `Low answerability score`,
          desc: `${pg.path} scores ${pg.answerability}/100 for answerability. Add FAQ sections, question-style headings, and direct answer patterns to improve AI citation potential.`,
        });
      }
      if (!pg.hasSchema) {
        items.push({
          title: `Missing structured data`,
          desc: `${pg.path} has no JSON-LD schema markup. Add Organization, Article, or FAQ schema to improve AI discoverability.`,
        });
      }
    }
    // Site-wide
    const schemaDim = dimensions.find((d) => d.label === "Schema Markup");
    if (schemaDim && schemaDim.value < 50) {
      items.push({
        title: `Low structured data coverage (${schemaDim.value}%)`,
        desc: `Only ${schemaDim.value}% of pages have JSON-LD structured data. AI search engines heavily rely on structured data for citations.`,
      });
    }
    const ogDim = dimensions.find((d) => d.label === "OG Tags Present");
    if (ogDim && ogDim.value < 50) {
      items.push({
        title: `Low Open Graph coverage (${ogDim.value}%)`,
        desc: `Only ${ogDim.value}% of pages have OG tags. Add og:title, og:description, og:image to all pages for better AI and social visibility.`,
      });
    }
    return items.slice(0, 6);
  }, [pageGeoScores, dimensions]);

  // Sorting — Page GEO Signals
  type GeoPageSortKey = "path" | "hasSchema" | "hasOg" | "hasBread" | "hasOrgSchema" | "hasLang";
  const { sortKey: geoPageSort, sortDir: geoPageDir, toggleSort: toggleGeoPage, sort: sortGeoPage } = useTableSort<GeoPageSortKey>("path", "asc");
  const sortedGeoPages = useMemo(
    () => sortGeoPage(pageGeoScores, (row, key) => {
      if (key === "path") return row.path;
      if (key === "hasSchema") return row.hasSchema ? 1 : 0;
      if (key === "hasOg") return row.hasOg ? 1 : 0;
      if (key === "hasBread") return row.hasBread ? 1 : 0;
      if (key === "hasOrgSchema") return row.hasOrgSchema ? 1 : 0;
      if (key === "hasLang") return row.hasLang ? 1 : 0;
      return null;
    }),
    [sortGeoPage, pageGeoScores]
  );

  return (
    <div className="space-y-6">
      {/* GEO Score + Description */}
      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-6 md:flex-row">
          <ScoreGauge score={geoScore} label="GEO Score" size={150} strokeWidth={10} color="var(--color-editorial-green)" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-ink-secondary">
              GEO measures how well your pages are optimized for AI-powered search engines like ChatGPT,
              Gemini, and Perplexity. Higher scores mean better citability and AI discoverability.
            </p>
            {auditPages.length > 0 && (
              <p className="text-[10px] text-ink-muted">Based on {n} crawled page{n !== 1 ? "s" : ""}. Run a new site audit to refresh data.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Crawlability Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">AI Crawlability Assessment</CardTitle>
          <p className="text-xs text-ink-muted">How well your site is optimized for AI/LLM citation and generative search engines.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-4">
            <StatMini label="Structured Data Coverage" value={crawlStats.structuredData} color="border-editorial-green" />
            <StatMini label="Avg Content Clarity" value={crawlStats.contentClarity} color="border-editorial-gold" />
            <StatMini label="Avg Answerability" value={crawlStats.answerability} color="border-[#8b5cf6]" />
            <StatMini label="Avg Citation Worthiness" value={crawlStats.citation} color="border-editorial-red" />
          </div>
        </CardContent>
      </Card>

      {/* GEO Dimensions */}
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
                    <span className="text-sm font-medium text-ink">{d.label}</span>
                    <span className="ml-2 text-xs text-ink-muted">{d.desc}</span>
                  </div>
                  <span className="font-mono text-sm text-ink">{d.value}%</span>
                </div>
                <div className="h-2.5 w-full bg-surface-raised">
                  <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(d.value, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Page GEO Scores */}
      {pageGeoScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Page GEO Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pageGeoScores.map((pg) => (
                <div key={pg.id} className="border border-rule bg-surface-raised p-4">
                  <p className="font-mono text-sm font-bold text-ink">{pg.path}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-6">
                    <span className="text-xs text-ink-muted">
                      Clarity: <span className={cn("font-mono font-bold", pg.clarity >= 80 ? "text-editorial-green" : pg.clarity >= 50 ? "text-editorial-gold" : "text-editorial-red")}>{pg.clarity}</span>
                    </span>
                    <span className="text-xs text-ink-muted">
                      Answer: <span className={cn("font-mono font-bold", pg.answerability >= 80 ? "text-editorial-green" : pg.answerability >= 50 ? "text-editorial-gold" : "text-editorial-red")}>{pg.answerability}</span>
                    </span>
                    <span className="text-xs text-ink-muted">
                      Citation: <span className={cn("font-mono font-bold", pg.citation >= 80 ? "text-editorial-green" : pg.citation >= 50 ? "text-editorial-gold" : "text-editorial-red")}>{pg.citation}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-ink-muted">
                    {pg.schemaTypes.length > 0 && (
                      <span>Schema: {pg.schemaTypes.join(", ")}</span>
                    )}
                    {pg.schemaTypes.length > 0 && <span>|</span>}
                    <span>OG: {pg.hasOg ? "Yes" : "No"}</span>
                    <span>|</span>
                    <span>Breadcrumbs: {pg.hasBread ? "Yes" : "No"}</span>
                    <span>|</span>
                    <span>Lang: {pg.hasLang ? "Yes" : "No"}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page GEO Signals Table */}
      {auditPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">Page GEO Signals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="border-b-2 border-rule-dark">
                  <tr>
                    <SortableHeader<GeoPageSortKey> label="Path" sortKey="path" currentSort={geoPageSort} currentDir={geoPageDir} onSort={toggleGeoPage} className="py-2 pr-4" />
                    <SortableHeader<GeoPageSortKey> label="Schema" sortKey="hasSchema" currentSort={geoPageSort} currentDir={geoPageDir} onSort={toggleGeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<GeoPageSortKey> label="OG Tags" sortKey="hasOg" currentSort={geoPageSort} currentDir={geoPageDir} onSort={toggleGeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<GeoPageSortKey> label="Breadcrumbs" sortKey="hasBread" currentSort={geoPageSort} currentDir={geoPageDir} onSort={toggleGeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<GeoPageSortKey> label="Org Schema" sortKey="hasOrgSchema" currentSort={geoPageSort} currentDir={geoPageDir} onSort={toggleGeoPage} className="px-3 py-2 text-center" />
                    <SortableHeader<GeoPageSortKey> label="Lang" sortKey="hasLang" currentSort={geoPageSort} currentDir={geoPageDir} onSort={toggleGeoPage} className="px-3 py-2 text-center" />
                  </tr>
                </thead>
                <tbody>
                  {sortedGeoPages.map((pg) => (
                    <tr key={pg.id} className="border-b border-rule transition-colors hover:bg-surface-raised">
                      <td className="py-2 pr-4 font-mono text-xs text-ink">{pg.path}</td>
                      <td className="px-3 py-2 text-center"><BoolIcon value={pg.hasSchema} /></td>
                      <td className="px-3 py-2 text-center"><BoolIcon value={pg.hasOg} /></td>
                      <td className="px-3 py-2 text-center"><BoolIcon value={pg.hasBread} /></td>
                      <td className="px-3 py-2 text-center"><BoolIcon value={pg.hasOrgSchema} /></td>
                      <td className="px-3 py-2 text-center"><BoolIcon value={pg.hasLang} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* GEO Improvement Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">GEO Improvement Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-3 border border-rule bg-surface-raised p-4">
                <Badge className="mt-0.5 shrink-0 bg-editorial-gold/20 text-editorial-gold">GEO</Badge>
                <div>
                  <p className="text-sm font-bold text-ink">{s.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ================================================================
   CRO TAB
   ================================================================ */


function CroTab({
  croScore,
  croStats,
  keywordsWithRevenue,
  keywords,
  contentPages,
}: {
  croScore: number;
  croStats: CroStats;
  keywordsWithRevenue: KeywordWithRevenue[];
  keywords: KeywordRow[];
  contentPages: ContentPage[];
}) {
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

  // Sorting — Top Revenue Keywords
  type CroRevSortKey = "keyword" | "currentPosition" | "searchVolume" | "estimatedCtr" | "estimatedTraffic" | "estimatedRevenue";
  const { sortKey: croRevSort, sortDir: croRevDir, toggleSort: toggleCroRev, sort: sortCroRev } = useTableSort<CroRevSortKey>("estimatedRevenue", "desc");
  const sortedRevKeywords = useMemo(
    () => sortCroRev(keywordsWithRevenue, (row, key) => row[key as keyof KeywordWithRevenue]),
    [sortCroRev, keywordsWithRevenue]
  );

  // Sorting — CRO Opportunities
  type CroOppSortKey = "keyword" | "currentPosition" | "searchVolume" | "estimatedRevenue" | "potentialGap";
  const { sortKey: croOppSort, sortDir: croOppDir, toggleSort: toggleCroOpp, sort: sortCroOpp } = useTableSort<CroOppSortKey>("potentialGap", "desc");
  const sortedOpportunities = useMemo(
    () => sortCroOpp(opportunities, (row, key) => {
      if (key === "potentialGap") {
        const potentialRev = row.searchVolume * 0.11 * 0.02 * 10;
        return potentialRev - row.estimatedRevenue;
      }
      return row[key as keyof typeof row] as unknown;
    }),
    [sortCroOpp, opportunities]
  );

  // Sorting — Landing Page Performance
  type CroLandingSortKey = "title" | "word_count" | "status";
  const { sortKey: croLandSort, sortDir: croLandDir, toggleSort: toggleCroLand, sort: sortCroLand } = useTableSort<CroLandingSortKey>("word_count", "desc");
  const sortedLandingPages = useMemo(
    () => sortCroLand(contentPages, (row, key) => {
      if (key === "title") return row.title ?? row.url;
      return row[key as keyof ContentPage];
    }),
    [sortCroLand, contentPages]
  );

  return (
    <div className="space-y-6">
      {/* CRO Score + Stats */}
      <Card>
        <CardContent className="flex flex-col items-center gap-8 py-6 md:flex-row">
          <ScoreGauge score={croScore} label="CRO Score" size={140} strokeWidth={10} color="var(--color-editorial-gold)" />
          <div className="grid flex-1 grid-cols-2 gap-px border border-rule bg-rule md:grid-cols-3">
            <StatMini label="Est. Monthly Revenue" value={`$${croStats.estimatedMonthlyRevenue.toLocaleString()}`} color="border-editorial-green" />
            <StatMini label="Keywords Converting" value={converting} color="border-editorial-gold" />
            <StatMini label="High-Value Gaps" value={croStats.highValueGaps} color="border-editorial-red" />
          </div>
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
                    <SortableHeader<CroRevSortKey> label="Keyword" sortKey="keyword" currentSort={croRevSort} currentDir={croRevDir} onSort={toggleCroRev} className="py-2 pr-4" />
                    <SortableHeader<CroRevSortKey> label="Position" sortKey="currentPosition" currentSort={croRevSort} currentDir={croRevDir} onSort={toggleCroRev} className="px-3 py-2 text-center" />
                    <SortableHeader<CroRevSortKey> label="Volume" sortKey="searchVolume" currentSort={croRevSort} currentDir={croRevDir} onSort={toggleCroRev} className="px-3 py-2 text-center" />
                    <SortableHeader<CroRevSortKey> label="CTR" sortKey="estimatedCtr" currentSort={croRevSort} currentDir={croRevDir} onSort={toggleCroRev} className="px-3 py-2 text-center" />
                    <SortableHeader<CroRevSortKey> label="Traffic" sortKey="estimatedTraffic" currentSort={croRevSort} currentDir={croRevDir} onSort={toggleCroRev} className="px-3 py-2 text-center" />
                    <SortableHeader<CroRevSortKey> label="Est. Revenue" sortKey="estimatedRevenue" currentSort={croRevSort} currentDir={croRevDir} onSort={toggleCroRev} className="px-3 py-2 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedRevKeywords.slice(0, 12).map((kw) => (
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
                    <SortableHeader<CroOppSortKey> label="Keyword" sortKey="keyword" currentSort={croOppSort} currentDir={croOppDir} onSort={toggleCroOpp} className="py-2 pr-4" />
                    <SortableHeader<CroOppSortKey> label="Pos" sortKey="currentPosition" currentSort={croOppSort} currentDir={croOppDir} onSort={toggleCroOpp} className="px-3 py-2 text-center" />
                    <SortableHeader<CroOppSortKey> label="Volume" sortKey="searchVolume" currentSort={croOppSort} currentDir={croOppDir} onSort={toggleCroOpp} className="px-3 py-2 text-center" />
                    <SortableHeader<CroOppSortKey> label="Current $" sortKey="estimatedRevenue" currentSort={croOppSort} currentDir={croOppDir} onSort={toggleCroOpp} className="px-3 py-2 text-right" />
                    <SortableHeader<CroOppSortKey> label="Potential +$" sortKey="potentialGap" currentSort={croOppSort} currentDir={croOppDir} onSort={toggleCroOpp} className="px-3 py-2 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedOpportunities.slice(0, 15).map((kw) => {
                    // Potential if moved to position 3 (11% CTR)
                    const potentialRev = kw.searchVolume * 0.11 * 0.02 * 10;
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
                  <SortableHeader<CroLandingSortKey> label="Page" sortKey="title" currentSort={croLandSort} currentDir={croLandDir} onSort={toggleCroLand} className="py-2 pr-4" />
                  <SortableHeader<CroLandingSortKey> label="Words" sortKey="word_count" currentSort={croLandSort} currentDir={croLandDir} onSort={toggleCroLand} className="px-3 py-2 text-center" />
                  <SortableHeader<CroLandingSortKey> label="Status" sortKey="status" currentSort={croLandSort} currentDir={croLandDir} onSort={toggleCroLand} className="px-3 py-2 text-center" />
                </tr>
              </thead>
              <tbody>
                {sortedLandingPages.slice(0, 10).map((page) => (
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

/* ================================================================
   GSC TAB — Google Search Console Dashboard
   ================================================================ */

function GSCTab({ gscData }: { gscData: GSCDashboardData | null }) {
  if (!gscData || !gscData.connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-14 w-14 items-center justify-center border border-rule bg-surface-raised">
          <Globe size={24} className="text-ink-muted" />
        </div>
        <p className="text-sm font-semibold text-ink">Google Search Console Not Connected</p>
        <p className="max-w-md text-center text-xs text-ink-muted">
          Connect your Google Search Console in Settings → Integrations to see clicks, impressions, top queries, and more.
        </p>
      </div>
    );
  }

  const { overview, topQueries, topPages, dailyData, devices, countries } = gscData;

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const formatDate = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Overview stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Clicks", value: formatNumber(overview?.totalClicks ?? 0), color: "text-[#4285F4]" },
          { label: "Total Impressions", value: formatNumber(overview?.totalImpressions ?? 0), color: "text-editorial-gold" },
          { label: "Avg CTR", value: `${((overview?.avgCTR ?? 0) * 100).toFixed(1)}%`, color: "text-editorial-green" },
          { label: "Avg Position", value: (overview?.avgPosition ?? 0).toFixed(1), color: "text-editorial-red" },
        ].map((stat) => (
          <div key={stat.label} className="border border-rule bg-surface-card p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">{stat.label}</p>
            <p className={cn("mt-1 font-serif text-2xl font-bold", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      {dailyData.length > 0 && (
        <div className="border border-rule bg-surface-card p-5">
          <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Daily Performance (Last 28 Days)
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule, #ddd)" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
                stroke="var(--color-ink-muted, #999)"
              />
              <YAxis
                yAxisId="clicks"
                tickFormatter={formatNumber}
                tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
                stroke="var(--color-ink-muted, #999)"
              />
              <YAxis
                yAxisId="impressions"
                orientation="right"
                tickFormatter={formatNumber}
                tick={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace" }}
                stroke="var(--color-ink-muted, #999)"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 0,
                  border: "1px solid var(--color-rule, #ddd)",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: 11,
                }}
                labelFormatter={(label) => formatDate(String(label))}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                yAxisId="clicks"
                stroke="#4285F4"
                fill="#4285F4"
                fillOpacity={0.1}
                strokeWidth={2}
                name="Clicks"
              />
              <Area
                type="monotone"
                dataKey="impressions"
                yAxisId="impressions"
                stroke="var(--color-editorial-gold, #b8860b)"
                fill="var(--color-editorial-gold, #b8860b)"
                fillOpacity={0.05}
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Impressions"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-5 bg-[#4285F4]" />
              <span className="text-[10px] text-ink-muted">Clicks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-5 border-t-2 border-dashed border-editorial-gold" />
              <span className="text-[10px] text-ink-muted">Impressions</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Queries and Top Pages side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Queries */}
        <div className="border border-rule bg-surface-card p-5">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Top Queries
          </h3>
          {topQueries.length === 0 ? (
            <p className="py-4 text-center text-xs text-ink-muted">No query data available</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-rule-dark">
                    <th className="pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Query</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Clicks</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Impr.</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">CTR</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.slice(0, 25).map((q, i) => (
                    <tr key={i} className="border-b border-rule">
                      <td className="max-w-[200px] truncate py-2 text-[12px] font-medium text-ink">{q.query}</td>
                      <td className="py-2 text-right font-mono text-[12px] font-bold text-ink">{q.clicks.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{formatNumber(q.impressions)}</td>
                      <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{(q.ctr * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Pages */}
        <div className="border border-rule bg-surface-card p-5">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            Top Pages
          </h3>
          {topPages.length === 0 ? (
            <p className="py-4 text-center text-xs text-ink-muted">No page data available</p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-rule-dark">
                    <th className="pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Page</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Clicks</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Impr.</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">CTR</th>
                    <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.slice(0, 25).map((p, i) => (
                    <tr key={i} className="border-b border-rule">
                      <td className="max-w-[200px] truncate py-2 text-[12px] font-medium text-ink" title={p.page}>{p.page}</td>
                      <td className="py-2 text-right font-mono text-[12px] font-bold text-ink">{p.clicks.toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{formatNumber(p.impressions)}</td>
                      <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{(p.ctr * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{p.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Device breakdown and Country breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Devices */}
        {devices.length > 0 && (
          <div className="border border-rule bg-surface-card p-5">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Device Breakdown
            </h3>
            <div className="flex flex-col gap-3">
              {devices.map((d) => {
                const totalClicks = overview?.totalClicks || 1;
                const pct = ((d.clicks / totalClicks) * 100).toFixed(1);
                return (
                  <div key={d.device} className="flex items-center gap-3">
                    <span className="w-20 text-xs font-semibold capitalize text-ink">{d.device}</span>
                    <div className="flex-1 bg-surface-raised">
                      <div
                        className="h-5 bg-[#4285F4] transition-all"
                        style={{ width: `${Math.max(Number(pct), 3)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-[11px] text-ink">{formatNumber(d.clicks)}</span>
                    <span className="w-12 text-right font-mono text-[11px] text-ink-muted">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Countries */}
        {countries.length > 0 && (
          <div className="border border-rule bg-surface-card p-5">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-ink-muted">
              Top Countries
            </h3>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-rule-dark">
                  <th className="pb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Country</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Clicks</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">Impr.</th>
                  <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">CTR</th>
                </tr>
              </thead>
              <tbody>
                {countries.slice(0, 10).map((c, i) => (
                  <tr key={i} className="border-b border-rule">
                    <td className="py-2 text-[12px] font-semibold uppercase text-ink">{c.country}</td>
                    <td className="py-2 text-right font-mono text-[12px] font-bold text-ink">{formatNumber(c.clicks)}</td>
                    <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{formatNumber(c.impressions)}</td>
                    <td className="py-2 text-right font-mono text-[12px] text-ink-secondary">{(c.ctr * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {gscData.lastSynced && (
        <p className="text-center text-[10px] text-ink-muted">
          Last synced: {new Date(gscData.lastSynced).toLocaleString()}
        </p>
      )}
    </div>
  );
}

