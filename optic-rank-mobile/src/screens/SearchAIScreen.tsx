import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { stripMarkdown } from "../lib/stripMarkdown";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import KPIBox from "../components/ui/KPIBox";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";
import ScoreRing from "../components/ui/ScoreRing";
import ProgressBar from "../components/ui/ProgressBar";
import FilterPills from "../components/keywords/FilterPills";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import { useKeywords, useKeywordStats } from "../hooks/useKeywords";
import { useLatestAudit, useAuditIssues } from "../hooks/useSiteAudit";
import {
  useVisibilityByKeyword,
  useVisibilityStats,
  useVisibilityChecks,
} from "../hooks/useVisibility";
import { useContentPages, useContentBriefs } from "../hooks/useContent";
import { useActiveProject } from "../hooks/useProjects";
import {
  useRecommendations,
  useSnippetOpportunities,
  useKeywordsWithRevenue,
} from "../hooks/useQueries";
import {
  useRunAudit,
  useRunVisibilityCheck,
  useGenerateRecommendations,
  useDismissRecommendation,
  useCompleteRecommendation,
  useEnrichKeywords,
  useDetectContentDecay,
  useDetectCannibalization,
  useSuggestInternalLinks,
  useGenerateContentBriefs,
} from "../hooks/useMutations";

import type { Keyword } from "../types";
import type { KeywordVisibility } from "../hooks/useVisibility";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = ["Summary", "SEO", "AEO", "GEO", "CRO", "Console", "Recs", "Guide"] as const;
type Tab = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Map SERP feature slugs to readable labels and badge variants */
const SERP_FEATURE_META: Record<
  string,
  { label: string; variant: "red" | "green" | "gold" | "blue" | "dark" | "outline" }
> = {
  featured_snippet: { label: "Featured Snippet", variant: "red" },
  knowledge_panel: { label: "Knowledge Panel", variant: "blue" },
  local_pack: { label: "Local Pack", variant: "green" },
  image_pack: { label: "Image Pack", variant: "gold" },
  video: { label: "Video", variant: "dark" },
  top_stories: { label: "Top Stories", variant: "red" },
  people_also_ask: { label: "People Also Ask", variant: "outline" },
  sitelinks: { label: "Sitelinks", variant: "green" },
  shopping: { label: "Shopping", variant: "gold" },
  reviews: { label: "Reviews", variant: "blue" },
  faq: { label: "FAQ", variant: "outline" },
  twitter: { label: "Twitter", variant: "blue" },
};

function getSerpFeatureMeta(feature: string) {
  return (
    SERP_FEATURE_META[feature] ?? {
      label: feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      variant: "outline" as const,
    }
  );
}

const AI_PROVIDERS = ["openai", "gemini", "anthropic", "perplexity", "deepseek"] as const;

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  anthropic: "Anthropic",
  perplexity: "Perplexity",
  deepseek: "DeepSeek",
};

const RECOMMENDATION_CATEGORIES = [
  "All",
  "Quick Wins",
  "Content",
  "Technical",
  "Backlinks",
  "Visibility",
  "Revenue",
  "Performance",
] as const;
type RecCategoryFilter = (typeof RECOMMENDATION_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Guide content (static)
// ---------------------------------------------------------------------------

interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  tips: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "what-is-search-ai",
    title: "What is Search AI?",
    subtitle: "Understanding modern search intelligence",
    tips: [
      "SEO (Search Engine Optimization) focuses on improving your organic rankings in traditional search engines like Google and Bing.",
      "AEO (Answer Engine Optimization) optimizes your content to appear as direct answers in featured snippets, People Also Ask, and voice search results.",
      "GEO (Generative Engine Optimization) ensures your brand is accurately represented in AI-generated responses from ChatGPT, Gemini, Perplexity, and other LLMs.",
      "CRO (Conversion Rate Optimization) turns your organic traffic into revenue by focusing on high-intent keywords and optimizing landing pages for conversions.",
    ],
  },
  {
    id: "seo-best-practices",
    title: "SEO Best Practices",
    subtitle: "Foundation of search visibility",
    tips: [
      "Optimize title tags to be 50-60 characters with primary keywords front-loaded.",
      "Write unique meta descriptions (150-160 chars) for every page with clear calls to action.",
      "Use heading hierarchy (H1 > H2 > H3) to structure content logically for crawlers.",
      "Ensure fast page load times -- aim for LCP under 2.5s, CLS under 0.1, and FCP under 1.8s.",
      "Build a clean internal linking structure so crawlers can discover all important pages.",
    ],
  },
  {
    id: "aeo-strategy",
    title: "Answer Engine Optimization",
    subtitle: "Win featured snippets and voice search",
    tips: [
      "Structure content to directly answer common questions in your niche using Q&A format.",
      "Add FAQ schema markup (application/ld+json) to pages targeting informational queries.",
      "Target People Also Ask (PAA) questions -- they appear in 65%+ of search results.",
      "Write concise, authoritative answers in 40-50 words for featured snippet targeting.",
    ],
  },
  {
    id: "geo-strategy",
    title: "Visibility",
    subtitle: "Appear in AI-generated search results",
    tips: [
      "Ensure your brand is mentioned accurately across authoritative sources AI models train on.",
      "Publish original research, data, and statistics that AI models can cite as sources.",
      "Maintain consistent brand information (name, facts, offerings) across the web.",
      "Monitor AI visibility across providers (OpenAI, Gemini, Anthropic, Perplexity).",
    ],
  },
  {
    id: "cro-best-practices",
    title: "Conversion Optimization",
    subtitle: "Turn organic traffic into revenue",
    tips: [
      "Focus on transactional and commercial intent keywords that drive revenue.",
      "Calculate estimated monthly value: search volume x CTR x CPC.",
      "Optimize landing pages for high-CPC keywords to maximize return on organic rankings.",
      "Use clear CTAs above the fold on pages ranking for commercial keywords.",
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  return `$${n.toFixed(2)}`;
}

function getScoreStatus(score: number | null): "good" | "warn" | "bad" {
  if (score === null) return "bad";
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function getScoreColor(
  score: number | null,
  colors: { green: string; gold: string; red: string; inkMuted: string }
): string {
  if (score === null) return colors.inkMuted;
  if (score >= 70) return colors.green;
  if (score >= 40) return colors.gold;
  return colors.red;
}

function getPositionColor(
  position: number | null,
  colors: { green: string; gold: string; red: string; inkMuted: string }
): string {
  if (position === null) return colors.inkMuted;
  if (position <= 3) return colors.green;
  if (position <= 10) return colors.gold;
  return colors.red;
}

function normalizeCategory(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function intentLabel(intent: string | null): string {
  if (!intent) return "Unknown";
  return intent.charAt(0).toUpperCase() + intent.slice(1);
}

function intentBadgeVariant(intent: string | null): "red" | "green" | "gold" | "blue" | "outline" {
  switch (intent?.toLowerCase()) {
    case "transactional":
      return "red";
    case "commercial":
      return "gold";
    case "informational":
      return "blue";
    case "navigational":
      return "green";
    default:
      return "outline";
  }
}

function difficultyBadgeVariant(difficulty: number | null): "red" | "green" | "gold" | "outline" {
  if (difficulty === null) return "outline";
  if (difficulty >= 70) return "red";
  if (difficulty >= 40) return "gold";
  return "green";
}

function difficultyLabel(difficulty: number | null): string {
  if (difficulty === null) return "N/A";
  if (difficulty >= 70) return "Hard";
  if (difficulty >= 40) return "Medium";
  return "Easy";
}

/** CTR curve matching the web dashboard */
const CTR_CURVE: Record<number, number> = {
  1: 0.30, 2: 0.15, 3: 0.10, 4: 0.07, 5: 0.053,
  6: 0.038, 7: 0.028, 8: 0.021, 9: 0.017, 10: 0.014,
};

function getPositionCTR(position: number | null): number {
  if (position === null || position > 50) return 0;
  if (position <= 10) return CTR_CURVE[position] ?? 0.01;
  return 0.005;
}

function estimateMonthlyValue(position: number | null, searchVolume: number | null, cpc: number | null): number {
  if (position === null || searchVolume === null || cpc === null) return 0;
  if (position > 50) return 0;
  const ctr = getPositionCTR(position);
  return searchVolume * ctr * cpc;
}

// ---------------------------------------------------------------------------
// Category badge colors (for Recommendations tab)
// ---------------------------------------------------------------------------

const CATEGORY_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  content: { bg: "#2c7be5", text: "#ffffff" },
  technical: { bg: "#8e44ad", text: "#ffffff" },
  backlinks: { bg: "#27ae60", text: "#ffffff" },
  "quick wins": { bg: "rgba(184, 134, 11, 0.15)", text: "#b8860b" },
  quick_wins: { bg: "rgba(184, 134, 11, 0.15)", text: "#b8860b" },
  revenue: { bg: "#c0392b", text: "#ffffff" },
  "ai visibility": { bg: "#00bcd4", text: "#ffffff" },
  ai_visibility: { bg: "#00bcd4", text: "#ffffff" },
  competitive: { bg: "#e67e22", text: "#ffffff" },
  performance: { bg: "#e91e63", text: "#ffffff" },
};

function getCategoryBadgeColor(category: string): { bg: string; text: string } {
  const key = category.toLowerCase().trim();
  return CATEGORY_BADGE_COLORS[key] ?? { bg: "#555555", text: "#ffffff" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SearchAIScreen() {
  const { colors } = useTheme();

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<Tab>("Summary");

  // --- Modal state ---
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, visible: false }));
  }, []);

  // --- Confirm modals ---
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);

  // --- Guide expandable state ---
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // --- Recs filter ---
  const [recsFilter, setRecsFilter] = useState<RecCategoryFilter>("All");

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const {
    data: audit,
    isLoading: auditLoading,
    refetch: refetchAudit,
    isRefetching: isRefetchingAudit,
  } = useLatestAudit(projectId);

  const {
    data: auditIssues,
    refetch: refetchIssues,
    isRefetching: isRefetchingIssues,
  } = useAuditIssues(audit?.id);

  const {
    data: keywordsResult,
    isLoading: keywordsLoading,
    refetch: refetchKeywords,
    isRefetching: isRefetchingKeywords,
  } = useKeywords(projectId, { limit: 100 });

  const {
    data: keywordStats,
    refetch: refetchStats,
    isRefetching: isRefetchingStats,
  } = useKeywordStats(projectId);

  const {
    data: visibilityByKeyword,
    refetch: refetchVisibility,
    isRefetching: isRefetchingVisibility,
  } = useVisibilityByKeyword(projectId);

  const {
    data: visibilityStats,
    refetch: refetchVisStats,
    isRefetching: isRefetchingVisStats,
  } = useVisibilityStats(projectId);

  const {
    data: visibilityChecks,
    refetch: refetchChecks,
    isRefetching: isRefetchingChecks,
  } = useVisibilityChecks(projectId);

  const {
    data: contentPagesResult,
    refetch: refetchContentPages,
    isRefetching: isRefetchingContentPages,
  } = useContentPages(projectId);

  const {
    data: contentBriefs,
    refetch: refetchBriefs,
    isRefetching: isRefetchingBriefs,
  } = useContentBriefs(projectId);

  const {
    data: snippetOpportunities,
    refetch: refetchSnippets,
    isRefetching: isRefetchingSnippets,
  } = useSnippetOpportunities(projectId);

  const {
    data: revenueKeywords,
    refetch: refetchRevenue,
    isRefetching: isRefetchingRevenue,
  } = useKeywordsWithRevenue(projectId);

  const {
    data: recommendations,
    refetch: refetchRecs,
    isRefetching: isRefetchingRecs,
  } = useRecommendations(projectId);

  // --- Mutations ---
  const runAudit = useRunAudit(projectId);
  const runVisibilityCheck = useRunVisibilityCheck(projectId);
  const generateRecs = useGenerateRecommendations(projectId);
  const dismissRec = useDismissRecommendation(projectId);
  const completeRec = useCompleteRecommendation(projectId);
  const enrichKeywords = useEnrichKeywords(projectId);
  const detectDecay = useDetectContentDecay(projectId);
  const detectCannibalization = useDetectCannibalization(projectId);

  // --- Derived data ---
  const keywords = keywordsResult?.data ?? [];
  const visibilityData = visibilityByKeyword ?? [];
  const allIssues = auditIssues ?? [];
  const contentPages = contentPagesResult?.data ?? [];
  const contentPagesCount = contentPagesResult?.count ?? 0;
  const allRecs = (recommendations ?? []) as Array<{
    id: string;
    project_id: string;
    category: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    expected_outcome?: string;
    data_sources?: string[];
    is_dismissed: boolean;
    is_completed?: boolean;
    priority_score: number;
    created_at: string;
  }>;

  // Filter out CWV metric entries and signal entries from real issues
  const { realIssues, cwvMetrics } = useMemo(() => {
    const cwv = allIssues.filter((i) => i.rule_id?.startsWith("cwv-metric-"));
    const real = allIssues.filter(
      (i) =>
        !i.rule_id?.startsWith("cwv-metric-") &&
        i.category !== ("aeo-signal" as any) &&
        i.category !== ("geo-signal" as any)
    );
    return { realIssues: real, cwvMetrics: cwv };
  }, [allIssues]);

  // CWV values extracted from metrics issues
  const cwvData = useMemo(() => {
    const map: Record<string, { value: string; good: boolean }> = {};
    for (const m of cwvMetrics) {
      const key = m.rule_id?.replace("cwv-metric-", "") ?? "";
      const titleVal = m.title?.split(":")?.[1]?.trim() ?? "--";
      const isGood = m.recommendation?.toLowerCase().includes("good") ?? false;
      map[key] = { value: titleVal, good: isGood };
    }
    return {
      lcp: map["lcp"] ?? { value: "--", good: false },
      fid: map["fid"] ?? { value: "--", good: false },
      cls: map["cls"] ?? { value: "--", good: false },
      fcp: map["fcp"] ?? { value: "--", good: false },
    };
  }, [cwvMetrics]);

  // Issue severity counts
  const issueCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let info = 0;
    for (const issue of realIssues) {
      if (issue.severity === "critical") critical++;
      else if (issue.severity === "warning") warning++;
      else info++;
    }
    return { critical, warning, info };
  }, [realIssues]);

  // Top 10 recent issues
  const recentIssues = useMemo(() => {
    return realIssues.slice(0, 10);
  }, [realIssues]);

  // Keywords with SERP features (for AEO)
  const keywordsWithSerpFeatures = useMemo(() => {
    return (snippetOpportunities ?? []).filter(
      (kw: any) => kw.serp_features && kw.serp_features.length > 0
    );
  }, [snippetOpportunities]);

  // Answer readiness score
  const answerReadinessScore = useMemo(() => {
    const withSnippets = keywordsWithSerpFeatures.filter((kw: any) =>
      (kw.serp_features ?? []).includes("featured_snippet")
    );
    const inTop3WithSnippets = withSnippets.filter(
      (kw: any) => kw.current_position !== null && kw.current_position <= 3
    ).length;
    const totalWithSnippets = withSnippets.length;
    if (totalWithSnippets === 0) return 0;
    return Math.round((inTop3WithSnippets / totalWithSnippets) * 100);
  }, [keywordsWithSerpFeatures]);

  // Revenue keywords with estimated value
  const revenueKeywordsWithValue = useMemo(() => {
    return (revenueKeywords ?? [])
      .map((kw: any) => ({
        ...kw,
        estimatedValue: estimateMonthlyValue(kw.current_position, kw.search_volume, kw.cpc),
      }))
      .sort((a: any, b: any) => b.estimatedValue - a.estimatedValue);
  }, [revenueKeywords]);

  // Total estimated monthly value
  const totalEstimatedValue = useMemo(() => {
    return revenueKeywordsWithValue.reduce(
      (sum: number, kw: any) => sum + kw.estimatedValue,
      0
    );
  }, [revenueKeywordsWithValue]);

  // Filtered recommendations
  const filteredRecs = useMemo(() => {
    const active = allRecs.filter((r) => !r.is_completed);
    if (recsFilter === "All") return active;
    return active.filter((r) => normalizeCategory(r.category) === recsFilter);
  }, [allRecs, recsFilter]);

  // Recent visibility checks
  const recentChecks = useMemo(() => {
    return (visibilityChecks ?? []).slice(0, 20);
  }, [visibilityChecks]);

  // Content health metrics
  const contentHealth = useMemo(() => {
    const pagesScored = audit?.pages_crawled ?? 0;
    const decayAlerts = contentPages.filter((p) => p.traffic_trend === "declining").length;
    return { pagesScored, decayAlerts };
  }, [audit, contentPages]);

  // --- Refresh ---
  const isRefreshing =
    isRefetchingKeywords ||
    isRefetchingVisibility ||
    isRefetchingAudit ||
    isRefetchingIssues ||
    isRefetchingStats ||
    isRefetchingVisStats ||
    isRefetchingSnippets ||
    isRefetchingRevenue ||
    isRefetchingRecs ||
    isRefetchingChecks ||
    isRefetchingContentPages ||
    isRefetchingBriefs;

  const handleRefresh = useCallback(() => {
    refetchKeywords();
    refetchVisibility();
    refetchAudit();
    refetchIssues();
    refetchStats();
    refetchVisStats();
    refetchSnippets();
    refetchRevenue();
    refetchRecs();
    refetchChecks();
    refetchContentPages();
    refetchBriefs();
  }, [
    refetchKeywords,
    refetchVisibility,
    refetchAudit,
    refetchIssues,
    refetchStats,
    refetchVisStats,
    refetchSnippets,
    refetchRevenue,
    refetchRecs,
    refetchChecks,
    refetchContentPages,
    refetchBriefs,
  ]);

  // --- Mutation handlers ---

  const handleRunAudit = useCallback(() => {
    setModal({
      visible: true,
      title: "Running Audit",
      message: "Running site audit... This may take a few minutes.",
      variant: "loading",
    });
    runAudit.mutate(undefined, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Audit Complete",
          message: "Site audit completed successfully. Pull down to refresh results.",
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Audit Failed",
          message: error instanceof Error ? error.message : "Failed to run site audit.",
          variant: "error",
        });
      },
    });
  }, [runAudit]);

  const handleRunVisibilityCheck = useCallback(() => {
    setModal({
      visible: true,
      title: "Running Check",
      message: "Running AI visibility check for your keywords...",
      variant: "loading",
    });
    runVisibilityCheck.mutate(undefined, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Check Queued",
          message: "AI visibility check has been queued. Results will appear shortly.",
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Check Failed",
          message: error instanceof Error ? error.message : "Failed to queue visibility check.",
          variant: "error",
        });
      },
    });
  }, [runVisibilityCheck]);

  const handleGenerateRecs = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating",
      message: "Analyzing your SEO data for actionable recommendations...",
      variant: "loading",
    });
    generateRecs.mutate(undefined, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Recommendations Ready",
          message: "AI-powered recommendations have been generated.",
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Generation Failed",
          message: error instanceof Error ? error.message : "Failed to generate recommendations.",
          variant: "error",
        });
      },
    });
  }, [generateRecs]);

  const handleEnrichKeywords = useCallback(() => {
    setModal({
      visible: true,
      title: "Enriching Keywords",
      message: "Fetching search volume, CPC, difficulty, and SERP features...",
      variant: "loading",
    });
    enrichKeywords.mutate(undefined, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Enrichment Complete",
          message: "Keywords have been enriched with latest data.",
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Enrichment Failed",
          message: error instanceof Error ? error.message : "Failed to enrich keywords.",
          variant: "error",
        });
      },
    });
  }, [enrichKeywords]);

  const handleCompleteRec = useCallback(
    (id: string) => {
      completeRec.mutate(id, {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "Done",
            message: "Recommendation marked as completed.",
            variant: "success",
          });
        },
        onError: (error) => {
          setModal({
            visible: true,
            title: "Error",
            message: error instanceof Error ? error.message : "Could not mark as completed.",
            variant: "error",
          });
        },
      });
    },
    [completeRec]
  );

  const handleDismissRec = useCallback(
    (id: string) => {
      dismissRec.mutate(id, {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "Dismissed",
            message: "Recommendation dismissed.",
            variant: "info",
          });
        },
        onError: (error) => {
          setModal({
            visible: true,
            title: "Error",
            message: error instanceof Error ? error.message : "Could not dismiss.",
            variant: "error",
          });
        },
      });
    },
    [dismissRec]
  );

  // --- Loading ---
  if (projectLoading || (keywordsLoading && !keywordsResult) || (auditLoading && !audit)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Search Intelligence" />;

  const healthScore = audit?.health_score ?? 0;
  const aiVisAvg = visibilityStats?.avgScore ?? 0;
  const keywordsTracked = keywordStats?.total ?? 0;

  // =========================================================================
  // TAB 1: Summary
  // =========================================================================
  const renderSummaryTab = () => (
    <>
      {/* 4 KPI cards in 2x2 grid */}
      <View style={styles.section}>
        <SectionLabel text="KEY METRICS" />
        <View style={styles.kpiGrid}>
          <View style={styles.kpiGridItem}>
            <KPIBox
              value={String(healthScore)}
              label="SEO Health"
              deltaType={healthScore >= 80 ? "up" : healthScore >= 60 ? "neutral" : "down"}
            />
          </View>
          <View style={styles.kpiGridItem}>
            <KPIBox
              value={aiVisAvg > 0 ? `${aiVisAvg}%` : "--"}
              label="Visibility"
              deltaType={aiVisAvg >= 70 ? "up" : aiVisAvg >= 40 ? "neutral" : "down"}
            />
          </View>
          <View style={styles.kpiGridItem}>
            <KPIBox
              value={String(contentPagesCount)}
              label="Content Health"
            />
          </View>
          <View style={styles.kpiGridItem}>
            <KPIBox
              value={formatNumber(keywordsTracked)}
              label="Keywords Tracked"
            />
          </View>
        </View>
      </View>

      <Divider />

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionLabel text="QUICK ACTIONS" />
        <View style={styles.quickActionsColumn}>
          <Button
            title={runAudit.isPending ? "Running..." : "Run Site Audit"}
            variant="outline"
            onPress={handleRunAudit}
            disabled={runAudit.isPending}
          />
          <Button
            title={runVisibilityCheck.isPending ? "Running..." : "Run AI Check"}
            variant="outline"
            onPress={handleRunVisibilityCheck}
            disabled={runVisibilityCheck.isPending}
          />
          <Button
            title={generateRecs.isPending ? "Generating..." : "Generate Recommendations"}
            variant="outline"
            onPress={handleGenerateRecs}
            disabled={generateRecs.isPending}
          />
        </View>
      </View>

      <Divider />

      {/* Recent Activity Feed */}
      <View style={styles.section}>
        <SectionLabel text="RECENT ACTIVITY" />

        {/* Last 3 audit issues */}
        {realIssues.length > 0 && (
          <>
            <Text style={[styles.feedLabel, { color: colors.inkMuted }]}>
              LATEST AUDIT ISSUES
            </Text>
            {realIssues.slice(0, 3).map((issue) => (
              <Card key={issue.id} variant="sm">
                <View style={styles.feedRow}>
                  <Badge
                    label={issue.severity}
                    variant={
                      issue.severity === "critical"
                        ? "red"
                        : issue.severity === "warning"
                        ? "gold"
                        : "outline"
                    }
                  />
                  <Text
                    style={[styles.feedText, { color: colors.ink }]}
                    numberOfLines={1}
                  >
                    {issue.title}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Last 3 visibility checks */}
        {recentChecks.length > 0 && (
          <>
            <Text style={[styles.feedLabel, { color: colors.inkMuted, marginTop: 12 }]}>
              LATEST AI CHECKS
            </Text>
            {recentChecks.slice(0, 3).map((check: any, index: number) => (
              <Card key={check.id || index} variant="sm">
                <View style={styles.feedRow}>
                  <Badge
                    label={check.brand_mentioned ? "Mentioned" : "Not Mentioned"}
                    variant={check.brand_mentioned ? "green" : "outline"}
                  />
                  <Text
                    style={[styles.feedText, { color: colors.ink }]}
                    numberOfLines={1}
                  >
                    {PROVIDER_LABELS[check.llm_provider] ?? check.llm_provider} -- {formatDate(check.checked_at)}
                  </Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {realIssues.length === 0 && recentChecks.length === 0 && (
          <EmptyState
            title="No recent activity"
            message="Run an audit or AI visibility check to see activity here."
          />
        )}
      </View>
    </>
  );

  // =========================================================================
  // TAB 2: SEO
  // =========================================================================
  const renderSEOTab = () => (
    <>
      {/* Site Audit Health Score */}
      <View style={styles.section}>
        <SectionLabel text="SITE AUDIT" />
        <Card>
          <View style={styles.scoreRow}>
            <ScoreRing
              score={healthScore}
              size={80}
              status={getScoreStatus(healthScore)}
            />
            <View style={styles.scoreRight}>
              <Text style={[styles.scoreTitle, { color: colors.ink }]}>
                Site Health Score
              </Text>
              <Text style={[styles.scoreSubtitle, { color: colors.inkMuted }]}>
                {audit?.pages_crawled ?? 0} pages crawled
              </Text>
              <Text style={[styles.scoreSubtitle, { color: colors.inkMuted }]}>
                Last audit: {formatDate(audit?.completed_at ?? null)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <Divider />

      {/* Core Web Vitals */}
      <View style={styles.section}>
        <SectionLabel text="CORE WEB VITALS" />
        <View style={styles.cwvRow}>
          <Card variant="sm" style={styles.cwvCard}>
            <Text
              style={[
                styles.cwvValue,
                { color: cwvData.lcp.good ? colors.green : colors.gold },
              ]}
            >
              {cwvData.lcp.value}
            </Text>
            <Text style={[styles.cwvLabel, { color: colors.inkMuted }]}>LCP</Text>
          </Card>
          <Card variant="sm" style={styles.cwvCard}>
            <Text
              style={[
                styles.cwvValue,
                { color: cwvData.fid.good ? colors.green : colors.gold },
              ]}
            >
              {cwvData.fid.value}
            </Text>
            <Text style={[styles.cwvLabel, { color: colors.inkMuted }]}>FID</Text>
          </Card>
          <Card variant="sm" style={styles.cwvCard}>
            <Text
              style={[
                styles.cwvValue,
                { color: cwvData.cls.good ? colors.green : colors.gold },
              ]}
            >
              {cwvData.cls.value}
            </Text>
            <Text style={[styles.cwvLabel, { color: colors.inkMuted }]}>CLS</Text>
          </Card>
        </View>
      </View>

      <Divider />

      {/* Issue Breakdown by Severity */}
      <View style={styles.section}>
        <SectionLabel text="ISSUE BREAKDOWN" />
        <View style={styles.issueCountsRow}>
          <View style={styles.issueCountItem}>
            <KPIBox
              value={String(issueCounts.critical)}
              label="Critical"
              deltaType="down"
            />
          </View>
          <View style={styles.issueCountItem}>
            <KPIBox
              value={String(issueCounts.warning)}
              label="Warning"
              deltaType="neutral"
            />
          </View>
          <View style={styles.issueCountItem}>
            <KPIBox
              value={String(issueCounts.info)}
              label="Info"
              deltaType="up"
            />
          </View>
        </View>
      </View>

      <Divider />

      {/* Recent Issues List (Top 10) */}
      <View style={styles.section}>
        <SectionLabel text="RECENT ISSUES" />
        {recentIssues.length === 0 ? (
          <EmptyState
            title="No issues found"
            message="Run a site audit to discover technical issues."
          />
        ) : (
          recentIssues.map((issue) => (
            <Card key={issue.id} variant="sm">
              <View style={styles.issueBadgeRow}>
                <Badge
                  label={issue.severity}
                  variant={
                    issue.severity === "critical"
                      ? "red"
                      : issue.severity === "warning"
                      ? "gold"
                      : "outline"
                  }
                />
                {issue.category && (
                  <Badge
                    label={normalizeCategory(issue.category)}
                    variant="dark"
                  />
                )}
              </View>
              <Text style={[styles.issueTitle, { color: colors.ink }]}>
                {issue.title}
              </Text>
              {issue.recommendation && (
                <Text
                  style={[styles.issueDescription, { color: colors.inkSecondary }]}
                  numberOfLines={2}
                >
                  {stripMarkdown(issue.recommendation)}
                </Text>
              )}
            </Card>
          ))
        )}
      </View>

      <Divider />

      {/* Run Site Audit Button */}
      <View style={styles.section}>
        <Button
          title={runAudit.isPending ? "Running..." : "Run Site Audit"}
          variant="sm-red"
          onPress={handleRunAudit}
          disabled={runAudit.isPending}
          style={styles.actionButton}
        />
      </View>

      <Divider />

      {/* Content Health Section */}
      <View style={styles.section}>
        <SectionLabel text="CONTENT HEALTH" />
        <Card>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.ink }]}>Pages Tracked</Text>
            <Text style={[styles.statValue, { color: colors.ink }]}>
              {contentPagesCount}
            </Text>
          </View>
          <Divider />
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.ink }]}>Content Decay Alerts</Text>
            <Text
              style={[
                styles.statValue,
                { color: contentHealth.decayAlerts > 0 ? colors.red : colors.green },
              ]}
            >
              {contentHealth.decayAlerts}
            </Text>
          </View>
        </Card>
      </View>
    </>
  );

  // =========================================================================
  // TAB 3: AEO (Answer Engine Optimization)
  // =========================================================================
  const renderAEOTab = () => (
    <>
      {/* Answer Readiness Score */}
      <View style={styles.section}>
        <SectionLabel text="ANSWER READINESS" />
        <Card>
          <View style={styles.scoreRow}>
            <ScoreRing
              score={answerReadinessScore}
              size={72}
              status={getScoreStatus(answerReadinessScore)}
            />
            <View style={styles.scoreRight}>
              <Text style={[styles.scoreTitle, { color: colors.ink }]}>
                Answer Readiness Score
              </Text>
              <Text style={[styles.scoreSubtitle, { color: colors.inkMuted }]}>
                Keywords in positions 1-3 with featured snippets / total with snippets
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <Divider />

      {/* Snippet Opportunities */}
      <View style={styles.section}>
        <SectionLabel text="SNIPPET OPPORTUNITIES" />
        {keywordsWithSerpFeatures.length === 0 ? (
          <EmptyState
            title="No snippet data"
            message="None of your tracked keywords currently trigger SERP features. Enrich keywords to discover opportunities."
          />
        ) : (
          keywordsWithSerpFeatures.slice(0, 20).map((kw: any) => (
            <Card key={kw.id} variant="sm">
              <Text
                style={[styles.serpKeyword, { color: colors.ink }]}
                numberOfLines={1}
              >
                {kw.keyword}
              </Text>
              <View style={styles.serpMetaRow}>
                <Text style={[styles.serpMeta, { color: colors.inkSecondary }]}>
                  Pos: {kw.current_position != null ? `#${kw.current_position}` : "--"}
                </Text>
                <Text style={[styles.serpMeta, { color: colors.inkSecondary }]}>
                  Vol: {formatNumber(kw.search_volume)}
                </Text>
              </View>
              <View style={styles.badgeRow}>
                {(kw.serp_features ?? []).map((feature: string, index: number) => {
                  const meta = getSerpFeatureMeta(feature);
                  return (
                    <Badge
                      key={`${kw.id}-${feature}-${index}`}
                      label={meta.label}
                      variant={meta.variant}
                    />
                  );
                })}
              </View>
            </Card>
          ))
        )}
      </View>

      <Divider />

      {/* Enrich Keywords Button */}
      <View style={styles.section}>
        <Button
          title={enrichKeywords.isPending ? "Enriching..." : "Enrich Keywords"}
          variant="sm-red"
          onPress={handleEnrichKeywords}
          disabled={enrichKeywords.isPending}
          style={styles.actionButton}
        />
      </View>
    </>
  );

  // =========================================================================
  // TAB 4: GEO (Generative Engine Optimization)
  // =========================================================================
  const renderGEOTab = () => {
    const avgScore = visibilityStats?.avgScore ?? 0;
    const totalChecks = visibilityStats?.totalChecks ?? 0;
    const lastChecked = visibilityStats?.lastChecked ?? null;

    return (
      <>
        {/* AI Visibility Score */}
        <View style={styles.section}>
          <SectionLabel text="AI VISIBILITY SCORE" />
          <Card>
            <View style={styles.scoreRow}>
              <ScoreRing
                score={avgScore}
                size={80}
                status={getScoreStatus(avgScore)}
              />
              <View style={styles.scoreRight}>
                <Text style={[styles.scoreTitle, { color: colors.ink }]}>
                  Average AI Visibility
                </Text>
                <Text style={[styles.scoreSubtitle, { color: colors.inkMuted }]}>
                  {totalChecks} total checks | Last: {formatDate(lastChecked)}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <Divider />

        {/* Visibility Checks History */}
        <View style={styles.section}>
          <SectionLabel text="RECENT CHECKS" />
          {recentChecks.length === 0 ? (
            <EmptyState
              title="No checks yet"
              message="Run a visibility check to start tracking how AI engines reference your brand."
            />
          ) : (
            <Card>
              {recentChecks.slice(0, 10).map((check: any, index: number) => (
                <View key={check.id || index}>
                  {index > 0 && <Divider />}
                  <View style={styles.checkRow}>
                    <View style={styles.checkInfo}>
                      <Text
                        style={[styles.checkProvider, { color: colors.ink }]}
                        numberOfLines={1}
                      >
                        {PROVIDER_LABELS[check.llm_provider] ?? check.llm_provider}
                      </Text>
                      <Text style={[styles.checkDate, { color: colors.inkMuted }]}>
                        {formatDate(check.checked_at)}
                      </Text>
                    </View>
                    <Badge
                      label={check.brand_mentioned ? "Mentioned" : "Not Mentioned"}
                      variant={check.brand_mentioned ? "green" : "outline"}
                    />
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>

        <Divider />

        {/* Per-Keyword Visibility */}
        <View style={styles.section}>
          <SectionLabel text="KEYWORD VISIBILITY" />
          {visibilityData.length === 0 ? (
            <EmptyState
              title="No visibility data"
              message="Run a visibility check to see per-keyword AI visibility scores."
            />
          ) : (
            <Card>
              {/* Column headers */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { color: colors.inkMuted, flex: 1 }]}>
                  KEYWORD
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { color: colors.inkMuted, width: 40, textAlign: "center" },
                  ]}
                >
                  POS
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { color: colors.inkMuted, width: 40, textAlign: "center" },
                  ]}
                >
                  AI
                </Text>
                <Text
                  style={[
                    styles.tableHeaderText,
                    { color: colors.inkMuted, width: 50, textAlign: "right" },
                  ]}
                >
                  MENTIONS
                </Text>
              </View>
              <Divider />
              {visibilityData.slice(0, 20).map((kv: KeywordVisibility, index: number) => {
                const aiScore = kv.visibilityScore ?? 0;
                const aiColor = getScoreColor(aiScore, colors);
                return (
                  <View key={kv.keywordId}>
                    {index > 0 && <Divider />}
                    <View style={styles.tableRow}>
                      <Text
                        style={[styles.tableCell, { color: colors.ink, flex: 1 }]}
                        numberOfLines={1}
                      >
                        {kv.keyword}
                      </Text>
                      <Text
                        style={[
                          styles.tableCellMono,
                          {
                            color: colors.inkSecondary,
                            width: 40,
                            textAlign: "center",
                          },
                        ]}
                      >
                        --
                      </Text>
                      <Text
                        style={[
                          styles.tableCellMono,
                          {
                            color: aiColor,
                            width: 40,
                            textAlign: "center",
                          },
                        ]}
                      >
                        {aiScore}
                      </Text>
                      <Text
                        style={[
                          styles.tableCellMono,
                          { color: colors.inkSecondary, width: 50, textAlign: "right" },
                        ]}
                      >
                        {kv.visibilityCount ?? "--"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </View>

        <Divider />

        {/* Run AI Visibility Check Button */}
        <View style={styles.section}>
          <Button
            title={
              runVisibilityCheck.isPending
                ? "Running..."
                : "Run AI Visibility Check"
            }
            variant="sm-red"
            onPress={handleRunVisibilityCheck}
            disabled={runVisibilityCheck.isPending}
            style={styles.actionButton}
          />
        </View>
      </>
    );
  };

  // =========================================================================
  // TAB 5: CRO (Conversion Rate Optimization)
  // =========================================================================
  const renderCROTab = () => (
    <>
      {/* Revenue Potential Summary */}
      <View style={styles.section}>
        <SectionLabel text="REVENUE POTENTIAL" />
        <Card variant="highlighted">
          <Text style={[styles.revenueLabel, { color: colors.inkMuted }]}>
            ESTIMATED MONTHLY VALUE
          </Text>
          <Text style={[styles.revenueValue, { color: colors.green }]}>
            ${totalEstimatedValue.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </Text>
          <Text style={[styles.revenueSubtitle, { color: colors.inkMuted }]}>
            Based on {revenueKeywordsWithValue.length} keywords (volume x CTR x CPC)
          </Text>
        </Card>
      </View>

      <Divider />

      {/* Revenue Keywords */}
      <View style={styles.section}>
        <SectionLabel text="REVENUE KEYWORDS" />
        {revenueKeywordsWithValue.length === 0 ? (
          <EmptyState
            title="No revenue data"
            message="Track keywords with CPC data to see revenue potential. Enrich keywords to fetch CPC data."
          />
        ) : (
          revenueKeywordsWithValue.slice(0, 20).map((kw: any) => (
            <Card key={kw.id} variant="sm">
              <Text
                style={[styles.serpKeyword, { color: colors.ink }]}
                numberOfLines={1}
              >
                {kw.keyword}
              </Text>
              <View style={styles.croMetaRow}>
                <Text style={[styles.croMetaText, { color: colors.inkSecondary }]}>
                  Pos: {kw.current_position != null ? `#${kw.current_position}` : "--"}
                </Text>
                <Text style={[styles.croMetaText, { color: colors.inkSecondary }]}>
                  Vol: {formatNumber(kw.search_volume)}
                </Text>
                <Text style={[styles.croMetaText, { color: colors.gold }]}>
                  CPC: {formatCurrency(kw.cpc)}
                </Text>
                <Text style={[styles.croMetaText, { color: colors.green }]}>
                  Value: ${Math.round(kw.estimatedValue)}
                </Text>
              </View>
              <View style={styles.badgeRow}>
                {kw.intent && (
                  <Badge
                    label={intentLabel(kw.intent)}
                    variant={intentBadgeVariant(kw.intent)}
                  />
                )}
                {kw.difficulty != null && (
                  <Badge
                    label={`${difficultyLabel(kw.difficulty)} (${kw.difficulty})`}
                    variant={difficultyBadgeVariant(kw.difficulty)}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </View>

      <Divider />

      {/* Enrich Keywords Button */}
      <View style={styles.section}>
        <Button
          title={enrichKeywords.isPending ? "Enriching..." : "Enrich Keywords"}
          variant="sm-red"
          onPress={handleEnrichKeywords}
          disabled={enrichKeywords.isPending}
          style={styles.actionButton}
        />
      </View>
    </>
  );

  // =========================================================================
  // TAB 6: Console (Search Console)
  // =========================================================================
  const renderConsoleTab = () => (
    <>
      <View style={styles.section}>
        <SectionLabel text="SEARCH CONSOLE" />
        <EmptyState
          title="Connect Search Console"
          message="Connect Google Search Console on the web dashboard to see search analytics data here."
        />
      </View>

      <Divider />

      {/* Placeholder KPI boxes */}
      <View style={styles.section}>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiGridItem}>
            <KPIBox value="--" label="Clicks" />
          </View>
          <View style={styles.kpiGridItem}>
            <KPIBox value="--" label="Impressions" />
          </View>
          <View style={styles.kpiGridItem}>
            <KPIBox value="--" label="CTR" />
          </View>
          <View style={styles.kpiGridItem}>
            <KPIBox value="--" label="Avg Position" />
          </View>
        </View>
      </View>

      <Divider />

      {/* CTA Card */}
      <View style={styles.section}>
        <Card variant="highlighted">
          <Text style={[styles.consoleCTATitle, { color: colors.ink }]}>
            Connect Google Search Console
          </Text>
          <Text style={[styles.consoleCTAText, { color: colors.inkSecondary }]}>
            Link your GSC account from the web dashboard to unlock clicks,
            impressions, CTR, and average position data for all your pages.
          </Text>
          <View style={styles.consoleCTAUrlBox}>
            <Text style={[styles.consoleCTAUrl, { color: colors.red }]}>
              opticrank.com/dashboard/settings
            </Text>
          </View>
        </Card>
      </View>
    </>
  );

  // =========================================================================
  // TAB 7: Recs (Recommendations)
  // =========================================================================
  const renderRecsTab = () => {
    const activeRecs = allRecs.filter((r) => !r.is_completed);
    const completedCount = allRecs.filter((r) => r.is_completed).length;

    return (
      <>
        {/* Header info */}
        <View style={styles.section}>
          <SectionLabel text="AI RECOMMENDATIONS" />
          <Text style={[styles.sectionDescription, { color: colors.inkMuted }]}>
            {activeRecs.length} active | {completedCount} completed
          </Text>
          <Button
            title={
              generateRecs.isPending ? "Generating..." : "Generate Recommendations"
            }
            variant="sm-red"
            onPress={handleGenerateRecs}
            disabled={generateRecs.isPending}
            style={styles.actionButton}
          />
        </View>

        <Divider />

        {/* Category filter */}
        <View style={styles.filterSection}>
          <FilterPills
            filters={RECOMMENDATION_CATEGORIES as unknown as string[]}
            activeFilter={recsFilter}
            onFilterChange={(f) => setRecsFilter(f as RecCategoryFilter)}
          />
        </View>

        <Divider />

        {/* Recommendations list */}
        <View style={styles.section}>
          <SectionLabel
            text={`${filteredRecs.length} RECOMMENDATION${filteredRecs.length !== 1 ? "S" : ""}`}
          />
          {filteredRecs.length === 0 ? (
            <EmptyState
              title="No recommendations"
              message={
                allRecs.length === 0
                  ? 'Tap "Generate Recommendations" to get AI-powered action items.'
                  : "No recommendations match this filter."
              }
            />
          ) : (
            filteredRecs.map((rec) => {
              const catColor = getCategoryBadgeColor(rec.category);
              return (
                <Card key={rec.id} style={styles.recCard}>
                  {/* Badges */}
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: catColor.bg },
                      ]}
                    >
                      <Text
                        style={[styles.categoryBadgeText, { color: catColor.text }]}
                      >
                        {normalizeCategory(rec.category)}
                      </Text>
                    </View>
                    {rec.impact && (
                      <Badge
                        label={`Impact: ${rec.impact}`}
                        variant={
                          rec.impact?.toLowerCase() === "high"
                            ? "red"
                            : rec.impact?.toLowerCase() === "medium"
                            ? "gold"
                            : "green"
                        }
                      />
                    )}
                    {rec.effort && (
                      <Badge
                        label={`Effort: ${rec.effort}`}
                        variant={
                          rec.effort?.toLowerCase() === "high"
                            ? "red"
                            : rec.effort?.toLowerCase() === "medium"
                            ? "gold"
                            : "green"
                        }
                      />
                    )}
                  </View>

                  {/* Title + description */}
                  <Text style={[styles.recTitle, { color: colors.ink }]}>
                    {rec.title}
                  </Text>
                  <Text style={[styles.recDescription, { color: colors.inkSecondary }]}>
                    {stripMarkdown(rec.description)}
                  </Text>

                  {/* Expected outcome */}
                  {rec.expected_outcome ? (
                    <View
                      style={[
                        styles.outcomeBox,
                        {
                          backgroundColor: "rgba(39, 174, 96, 0.08)",
                          borderColor: colors.green,
                        },
                      ]}
                    >
                      <Text style={[styles.outcomeLabel, { color: colors.green }]}>
                        EXPECTED OUTCOME
                      </Text>
                      <Text style={[styles.outcomeText, { color: colors.ink }]}>
                        {rec.expected_outcome}
                      </Text>
                    </View>
                  ) : null}

                  {/* Action buttons */}
                  <View style={styles.recActionsRow}>
                    <Button
                      title={completeRec.isPending ? "..." : "Done"}
                      variant="sm-primary"
                      onPress={() => handleCompleteRec(rec.id)}
                      disabled={completeRec.isPending || dismissRec.isPending}
                      style={styles.recActionBtn}
                    />
                    <Button
                      title={dismissRec.isPending ? "..." : "Dismiss"}
                      variant="sm-outline"
                      onPress={() => handleDismissRec(rec.id)}
                      disabled={completeRec.isPending || dismissRec.isPending}
                      style={styles.recActionBtn}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </View>
      </>
    );
  };

  // =========================================================================
  // TAB 8: Guide (Strategy Guide)
  // =========================================================================
  const renderGuideTab = () => (
    <>
      <View style={styles.section}>
        <SectionLabel text="STRATEGY GUIDE" />
        <Text style={[styles.sectionDescription, { color: colors.inkMuted }]}>
          Educational resources for SEO, AEO, GEO, and CRO strategies. Tap a section to expand.
        </Text>
      </View>

      {GUIDE_SECTIONS.map((section) => {
        const isExpanded = expandedGuide === section.id;
        return (
          <View key={section.id} style={styles.section}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                setExpandedGuide(isExpanded ? null : section.id)
              }
            >
              <Card
                variant={isExpanded ? "highlighted" : "default"}
                style={styles.guideCard}
              >
                <View style={styles.guideHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.guideTitle, { color: colors.ink }]}>
                      {section.title}
                    </Text>
                    <Text
                      style={[styles.guideSubtitle, { color: colors.inkMuted }]}
                    >
                      {section.subtitle}
                    </Text>
                  </View>
                  <Text style={[styles.guideToggle, { color: colors.inkMuted }]}>
                    {isExpanded ? "\u2212" : "+"}
                  </Text>
                </View>

                {isExpanded && (
                  <View style={styles.guideTips}>
                    <Divider />
                    {section.tips.map((tip, index) => (
                      <View key={index} style={styles.guideTipRow}>
                        <Text style={[styles.guideTipBullet, { color: colors.red }]}>
                          {index + 1}.
                        </Text>
                        <Text
                          style={[styles.guideTipText, { color: colors.inkSecondary }]}
                        >
                          {tip}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          </View>
        );
      })}
    </>
  );

  // =========================================================================
  // Tab dispatcher
  // =========================================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case "Summary":
        return renderSummaryTab();
      case "SEO":
        return renderSEOTab();
      case "AEO":
        return renderAEOTab();
      case "GEO":
        return renderGEOTab();
      case "CRO":
        return renderCROTab();
      case "Console":
        return renderConsoleTab();
      case "Recs":
        return renderRecsTab();
      case "Guide":
        return renderGuideTab();
      default:
        return renderSummaryTab();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            How search engines understand your content
          </Text>
        </View>

        {/* Tab Bar -- horizontal scrollable pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBarScroll, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  isActive && { borderBottomColor: colors.red, borderBottomWidth: 2 },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? colors.ink : colors.inkMuted },
                    isActive && styles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        {renderTabContent()}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* General notification modal */}
      <AppModal
        visible={modal.visible}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        loading={modal.variant === "loading"}
        loadingText={modal.variant === "loading" ? modal.message : undefined}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // -- Header --
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.xl,
  },
  headerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },

  // -- Tab bar (horizontal scroll) --
  tabBarScroll: {
    borderBottomWidth: 1,
    marginTop: spacing.md,
  },
  tabBarContent: {
    paddingHorizontal: spacing.screenPadding,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    fontFamily: fonts.sansBold,
  },

  // -- Sections --
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.lg,
  },
  sectionDescription: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },

  // -- KPI 2x2 grid --
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  kpiGridItem: {
    width: "48%",
    flexGrow: 1,
  },

  // -- Quick actions column --
  quickActionsColumn: {
    gap: 8,
  },

  // -- Feed (Summary activity) --
  feedLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 4,
  },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    flex: 1,
  },

  // -- Score row (shared: Summary, SEO, AEO, GEO) --
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreRight: {
    flex: 1,
  },
  scoreTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
  scoreSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },

  // -- CWV cards --
  cwvRow: {
    flexDirection: "row",
    gap: 8,
  },
  cwvCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  cwvValue: {
    fontSize: fontSize.lg,
    fontFamily: fonts.mono,
    fontWeight: "700",
  },
  cwvLabel: {
    fontSize: fontSize.label,
    fontFamily: fonts.sans,
    textTransform: "uppercase",
    marginTop: 4,
  },

  // -- Issue counts (SEO tab) --
  issueCountsRow: {
    flexDirection: "row",
    gap: 8,
  },
  issueCountItem: {
    flex: 1,
  },

  // -- Issue cards (SEO tab) --
  issueBadgeRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
  },
  issueTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  issueDescription: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 15,
  },

  // -- Stat row --
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  statLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  statValue: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "700",
  },

  // -- SERP features / AEO --
  serpKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    marginBottom: 4,
  },
  serpMetaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  serpMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },

  // -- Table (GEO keyword table) --
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  tableHeaderText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  tableCell: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  tableCellMono: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "700",
  },

  // -- Check row (GEO) --
  checkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  checkInfo: {
    flex: 1,
  },
  checkProvider: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  checkDate: {
    fontFamily: fonts.sans,
    fontSize: 10,
    marginTop: 2,
  },

  // -- CRO revenue --
  revenueLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  revenueValue: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.headline,
  },
  revenueSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },
  croMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  croMetaText: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },

  // -- Console (GSC) --
  consoleCTATitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.md,
    marginBottom: 8,
  },
  consoleCTAText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  consoleCTAUrlBox: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: 8,
  },
  consoleCTAUrl: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "700",
  },

  // -- Recommendations --
  filterSection: {
    paddingHorizontal: spacing.screenPadding,
  },
  recCard: {
    marginBottom: 12,
  },
  categoryBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: fontSize.label,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  recTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.md,
    fontWeight: "700",
    marginBottom: 6,
  },
  recDescription: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginBottom: 10,
  },
  outcomeBox: {
    padding: 12,
    borderLeftWidth: 3,
    marginBottom: 10,
  },
  outcomeLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  outcomeText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  recActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  recActionBtn: {
    flex: 1,
  },

  // -- Guide --
  guideCard: {
    marginBottom: 0,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  guideTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  guideSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  guideToggle: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xxl,
    marginLeft: 12,
  },
  guideTips: {
    marginTop: 12,
  },
  guideTipRow: {
    flexDirection: "row",
    paddingVertical: 6,
    gap: 8,
  },
  guideTipBullet: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    fontWeight: "700",
    width: 20,
  },
  guideTipText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },

  // -- Shared --
  actionButton: {
    width: "auto",
    alignSelf: "flex-start",
  },
  bottomSpacer: {
    height: 100,
  },
});
