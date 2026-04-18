import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import ProgressBar from "../components/ui/ProgressBar";
import ScoreRing from "../components/ui/ScoreRing";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";

import {
  useGeoStats,
  useGeoScoresByPage,
  useAeoKeywords,
  useSchemaAudit,
  useConversionGoals,
  useKeywordsWithRevenue,
} from "../hooks/useOptimization";
import { useActiveProject } from "../hooks/useProjects";
import { useRunAudit, useRunGeoAnalysis } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";
import { useLatestAudit } from "../hooks/useSiteAudit";
import { useKeywords, useKeywordStats } from "../hooks/useKeywords";
import { useContentPages } from "../hooks/useContent";

import type { GeoPageScore, KeywordWithRevenue } from "../hooks/useOptimization";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["Summary", "SEO", "GEO", "AEO", "CRO"] as const;
type Tab = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreStatus(score: number): "good" | "warn" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function scoreColor(
  score: number,
  colors: { green: string; gold: string; red: string }
): string {
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.gold;
  return colors.red;
}

function intentBadgeVariant(
  intent: string | null
): "blue" | "green" | "gold" | "red" | "outline" {
  switch (intent) {
    case "informational":
      return "blue";
    case "navigational":
      return "green";
    case "transactional":
      return "red";
    case "commercial":
      return "gold";
    default:
      return "outline";
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value}`;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OptimizationScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Summary");

  // -- Modal state --
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  const closeModal = useCallback(
    () => setModal((prev) => ({ ...prev, visible: false })),
    []
  );

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  // --- Mutations ---
  const runAnalysisMutation = useRunAudit(projectId);
  const runGeoMutation = useRunGeoAnalysis(projectId);

  const handleRunAnalysis = useCallback(() => {
    setModal({
      visible: true,
      title: "Run Analysis",
      message: "This will queue a full optimization analysis for your project. Continue?",
      variant: "info",
    });
  }, []);

  const handleConfirmRunAnalysis = useCallback(async () => {
    setModal({
      visible: true,
      title: "Running Analysis",
      message: "Running site audit and GEO analysis...",
      variant: "loading",
    });
    try {
      await runAnalysisMutation.mutateAsync(undefined);
      await runGeoMutation.mutateAsync(undefined);
      setModal({
        visible: true,
        title: "Analysis Complete",
        message: "Site audit and GEO analysis completed. Pull down to refresh.",
        variant: "success",
      });
    } catch (err: any) {
      setModal({
        visible: true,
        title: "Error",
        message: err?.message ?? "Failed to run analysis.",
        variant: "error",
      });
    }
  }, [runAnalysisMutation, runGeoMutation]);

  // --- Summary & SEO data hooks ---
  const { data: latestAudit } = useLatestAudit(projectId);
  const { data: keywordStats } = useKeywordStats(projectId);
  const { data: keywordsResult } = useKeywords(projectId, { limit: 10 });
  const { data: contentResult } = useContentPages(projectId, {});

  const {
    data: geoStats,
    refetch: refetchGeoStats,
    isRefetching: isRefetchingGeoStats,
  } = useGeoStats(projectId);

  const {
    data: geoPages,
    refetch: refetchGeoPages,
    isRefetching: isRefetchingGeoPages,
  } = useGeoScoresByPage(projectId);

  const {
    data: aeoKeywords,
    refetch: refetchAeo,
    isRefetching: isRefetchingAeo,
  } = useAeoKeywords(projectId);

  const {
    data: schemaAudit,
    refetch: refetchSchema,
    isRefetching: isRefetchingSchema,
  } = useSchemaAudit(projectId);

  const {
    data: conversionGoals,
    refetch: refetchGoals,
    isRefetching: isRefetchingGoals,
  } = useConversionGoals(projectId);

  const {
    data: revenueKeywords,
    refetch: refetchRevenue,
    isRefetching: isRefetchingRevenue,
  } = useKeywordsWithRevenue(projectId);

  const isRefreshing =
    isRefetchingGeoStats ||
    isRefetchingGeoPages ||
    isRefetchingAeo ||
    isRefetchingSchema ||
    isRefetchingGoals ||
    isRefetchingRevenue;

  const handleRefresh = useCallback(() => {
    refetchGeoStats();
    refetchGeoPages();
    refetchAeo();
    refetchSchema();
    refetchGoals();
    refetchRevenue();
  }, [
    refetchGeoStats,
    refetchGeoPages,
    refetchAeo,
    refetchSchema,
    refetchGoals,
    refetchRevenue,
  ]);

  // Top revenue keywords (sorted by estimated_revenue desc)
  const topRevenueKeywords = useMemo(() => {
    if (!revenueKeywords) return [];
    return [...revenueKeywords]
      .sort((a, b) => b.estimated_revenue - a.estimated_revenue)
      .slice(0, 10);
  }, [revenueKeywords]);

  // --- Loading ---
  if (projectLoading) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Optimization" />;

  // Determine if the modal is in "confirm" mode for Run Analysis
  const isConfirmModal =
    modal.visible &&
    modal.variant === "info" &&
    modal.title === "Run Analysis";

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
            SEO, GEO, AEO, CRO and conversion analytics
          </Text>
        </View>

        <Divider />

        {/* Run Analysis action */}
        <View style={styles.actionRow}>
          <Button
            title="Run Analysis"
            variant="sm-red"
            onPress={handleRunAnalysis}
            disabled={runAnalysisMutation.isPending}
            style={styles.actionButton}
          />
        </View>

        {/* Tab pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={[
                  styles.pill,
                  {
                    backgroundColor: isActive ? colors.ink : "transparent",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: isActive ? colors.surface : colors.inkSecondary },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        <View style={styles.body}>
          {activeTab === "Summary" && (
            <SummarySection
              latestAudit={latestAudit ?? null}
              geoStats={geoStats ?? null}
            />
          )}

          {activeTab === "SEO" && (
            <SEOSection
              keywordStats={keywordStats ?? null}
              keywords={keywordsResult?.data ?? []}
              contentCount={contentResult?.count ?? 0}
            />
          )}

          {activeTab === "GEO" && (
            <GEOSection
              geoStats={geoStats ?? null}
              geoPages={geoPages ?? []}
            />
          )}

          {activeTab === "AEO" && (
            <AEOSection aeoKeywords={aeoKeywords ?? []} />
          )}

          {activeTab === "CRO" && (
            <CROSection
              schemaAudit={schemaAudit ?? null}
              conversionGoals={conversionGoals ?? []}
              topRevenueKeywords={topRevenueKeywords}
            />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* -- Confirm Run Analysis Modal -- */}
      <AppModal
        visible={isConfirmModal}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        variant="confirm"
        buttons={[
          { label: "Cancel", onPress: closeModal, variant: "outline" },
          { label: "Run", onPress: handleConfirmRunAnalysis, variant: "red" },
        ]}
      />

      {/* -- Feedback Modal (success/error/loading) -- */}
      <AppModal
        visible={modal.visible && !isConfirmModal}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        loading={modal.variant === "loading"}
        loadingText={modal.message}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Summary Section
// ---------------------------------------------------------------------------

interface SummarySectionProps {
  latestAudit: {
    health_score?: number | null;
    seo_score?: number | null;
    performance_score?: number | null;
    accessibility_score?: number | null;
    pages_crawled?: number | null;
    issues_found?: number | null;
  } | null;
  geoStats: {
    avgGeoScore: number;
    totalPages: number;
  } | null;
}

function SummarySection({ latestAudit, geoStats }: SummarySectionProps) {
  const { colors } = useTheme();

  const seoScore = latestAudit?.seo_score ?? 0;
  const technicalScore = latestAudit?.health_score ?? 0;
  const performanceScore = latestAudit?.performance_score ?? 0;
  const contentScore = latestAudit?.accessibility_score ?? 0;

  const hasData = latestAudit != null;

  if (!hasData) {
    return (
      <EmptyState
        title="No Audit Data"
        message="Run an analysis to see your overall scores and optimization summary."
      />
    );
  }

  const scoreCards = [
    { label: "SEO Score", value: seoScore },
    { label: "Technical Score", value: technicalScore },
    { label: "Performance Score", value: performanceScore },
    { label: "Content Score", value: contentScore },
  ];

  return (
    <>
      <SectionLabel text="Overall Scores" />
      <View style={styles.summaryGrid}>
        {scoreCards.map((card) => (
          <View
            key={card.label}
            style={[
              styles.summaryCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ScoreRing
              score={card.value}
              size={56}
              status={scoreStatus(card.value)}
            />
            <Text
              style={[styles.summaryCardLabel, { color: colors.ink }]}
              numberOfLines={2}
            >
              {card.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick stats */}
      <SectionLabel text="Audit Summary" style={styles.sectionSpacing} />
      <Card>
        <View style={styles.summaryStatRow}>
          <Text style={[styles.summaryStatLabel, { color: colors.inkMuted }]}>
            Pages Crawled
          </Text>
          <Text style={[styles.summaryStatValue, { color: colors.ink }]}>
            {latestAudit?.pages_crawled ?? 0}
          </Text>
        </View>
        <View style={styles.summaryStatRow}>
          <Text style={[styles.summaryStatLabel, { color: colors.inkMuted }]}>
            Issues Found
          </Text>
          <Text style={[styles.summaryStatValue, { color: colors.red }]}>
            {latestAudit?.issues_found ?? 0}
          </Text>
        </View>
        {geoStats && geoStats.totalPages > 0 && (
          <View style={styles.summaryStatRow}>
            <Text style={[styles.summaryStatLabel, { color: colors.inkMuted }]}>
              GEO Score (avg)
            </Text>
            <Text
              style={[
                styles.summaryStatValue,
                { color: scoreColor(geoStats.avgGeoScore, colors) },
              ]}
            >
              {geoStats.avgGeoScore}%
            </Text>
          </View>
        )}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// SEO Section
// ---------------------------------------------------------------------------

interface SEOSectionProps {
  keywordStats: {
    total: number;
    top3Count: number;
    top10Count: number;
    avgPosition: number;
    upCount: number;
    downCount: number;
    organicTraffic: number;
    aiVisibilityAvg: number;
  } | null;
  keywords: Array<{
    id: string;
    keyword: string;
    current_position: number | null;
    previous_position: number | null;
    search_volume: number | null;
    intent: string | null;
  }>;
  contentCount: number;
}

function SEOSection({ keywordStats, keywords, contentCount }: SEOSectionProps) {
  const { colors } = useTheme();

  return (
    <>
      {/* Keyword Rankings Summary */}
      <SectionLabel text="Keyword Rankings" />
      {keywordStats && keywordStats.total > 0 ? (
        <>
          <Card>
            <View style={styles.seoStatsGrid}>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.ink }]}>
                  {keywordStats.total}
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  Keywords
                </Text>
              </View>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.green }]}>
                  {keywordStats.top3Count}
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  Top 3
                </Text>
              </View>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.green }]}>
                  {keywordStats.top10Count}
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  Top 10
                </Text>
              </View>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.ink }]}>
                  {keywordStats.avgPosition > 0
                    ? keywordStats.avgPosition.toFixed(1)
                    : "--"}
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  Avg Pos
                </Text>
              </View>
            </View>

            <Divider />

            <View style={styles.seoStatsGrid}>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.green }]}>
                  {keywordStats.upCount}
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  Improved
                </Text>
              </View>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.red }]}>
                  {keywordStats.downCount}
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  Declined
                </Text>
              </View>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.ink }]}>
                  {formatNumber(keywordStats.organicTraffic)}
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  Est. Traffic
                </Text>
              </View>
              <View style={styles.seoStatItem}>
                <Text style={[styles.seoStatValue, { color: colors.ink }]}>
                  {keywordStats.aiVisibilityAvg}%
                </Text>
                <Text style={[styles.seoStatLabel, { color: colors.inkMuted }]}>
                  AI Vis.
                </Text>
              </View>
            </View>
          </Card>

          {/* Top Keywords */}
          <SectionLabel text="Top Keywords" style={styles.sectionSpacing} />
          {keywords.slice(0, 10).map((kw) => {
            const pos = kw.current_position;
            const prev = kw.previous_position;
            const diff = pos != null && prev != null ? prev - pos : null;
            return (
              <Card key={kw.id} variant="sm">
                <View style={styles.seoKwRow}>
                  <View style={styles.seoKwInfo}>
                    <Text
                      style={[styles.seoKwName, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {kw.keyword}
                    </Text>
                    <View style={styles.seoKwMeta}>
                      {kw.intent && (
                        <Badge
                          label={kw.intent}
                          variant={intentBadgeVariant(kw.intent)}
                        />
                      )}
                      <Text style={[styles.seoKwVol, { color: colors.inkMuted }]}>
                        Vol: {formatNumber(kw.search_volume)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.seoKwRight}>
                    <Text
                      style={[
                        styles.seoKwPos,
                        {
                          color:
                            pos != null && pos <= 3
                              ? colors.green
                              : pos != null && pos <= 10
                              ? colors.gold
                              : colors.ink,
                        },
                      ]}
                    >
                      {pos ?? "--"}
                    </Text>
                    {diff != null && diff !== 0 && (
                      <Text
                        style={[
                          styles.seoKwDiff,
                          { color: diff > 0 ? colors.green : colors.red },
                        ]}
                      >
                        {diff > 0 ? `+${diff}` : String(diff)}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      ) : (
        <EmptyState
          title="No Keyword Data"
          message="Add keywords and run a ranking check to see your SEO performance."
        />
      )}

      {/* Content Summary */}
      <SectionLabel text="Content Pages" style={styles.sectionSpacing} />
      <Card variant="sm">
        <View style={styles.seoContentRow}>
          <Text style={[styles.seoContentLabel, { color: colors.inkMuted }]}>
            Tracked Pages
          </Text>
          <Text style={[styles.seoContentValue, { color: colors.ink }]}>
            {contentCount}
          </Text>
        </View>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// GEO Section
// ---------------------------------------------------------------------------

interface GEOSectionProps {
  geoStats: {
    avgGeoScore: number;
    avgEntityScore: number;
    avgStructureScore: number;
    avgSchemaScore: number;
    avgCitationScore: number;
    totalPages: number;
  } | null;
  geoPages: GeoPageScore[];
}

function GEOSection({ geoStats, geoPages }: GEOSectionProps) {
  const { colors } = useTheme();

  if (!geoStats || geoStats.totalPages === 0) {
    return (
      <EmptyState
        title="No GEO Data"
        message="GEO optimization scores will appear here once your pages have been analyzed."
      />
    );
  }

  const subScores = [
    { label: "Entity", value: geoStats.avgEntityScore },
    { label: "Structure", value: geoStats.avgStructureScore },
    { label: "Schema", value: geoStats.avgSchemaScore },
    { label: "Citation", value: geoStats.avgCitationScore },
  ];

  return (
    <>
      {/* Overall GEO score */}
      <SectionLabel text="Overall GEO Score" />
      <Card>
        <View style={styles.scoreRow}>
          <ScoreRing
            score={geoStats.avgGeoScore}
            size={80}
            status={scoreStatus(geoStats.avgGeoScore)}
          />
          <View style={styles.scoreInfo}>
            <Text style={[styles.scoreLabel, { color: colors.ink }]}>
              Generative Engine Optimization
            </Text>
            <Text style={[styles.scoreMeta, { color: colors.inkMuted }]}>
              {geoStats.totalPages} pages analyzed
            </Text>
          </View>
        </View>
      </Card>

      {/* Sub-scores */}
      <SectionLabel text="Sub-Scores" style={styles.sectionSpacing} />
      <Card>
        {subScores.map((sub, index) => (
          <View key={sub.label}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: colors.ink }]}>
                {sub.label}
              </Text>
              <Text style={[styles.barValue, { color: colors.ink }]}>
                {sub.value}%
              </Text>
            </View>
            <ProgressBar
              value={sub.value}
              color={scoreColor(sub.value, colors)}
            />
            {index < subScores.length - 1 && (
              <View style={styles.barSpacer} />
            )}
          </View>
        ))}
      </Card>

      {/* Page-level scores */}
      {geoPages.length > 0 && (
        <>
          <SectionLabel text="Page Scores" style={styles.sectionSpacing} />
          {geoPages.slice(0, 15).map((page) => (
            <Card key={page.id} variant="sm">
              <View style={styles.pageScoreRow}>
                <View style={styles.pageScoreInfo}>
                  <Text
                    style={[styles.pageTitle, { color: colors.ink }]}
                    numberOfLines={1}
                  >
                    {page.content_pages?.title ?? "Untitled"}
                  </Text>
                  <Text
                    style={[styles.pageUrl, { color: colors.inkMuted }]}
                    numberOfLines={1}
                  >
                    {page.content_pages?.url ?? "--"}
                  </Text>
                </View>
                <View style={styles.pageScoreRight}>
                  <Text
                    style={[
                      styles.pageScoreValue,
                      {
                        color: scoreColor(page.geo_score, colors),
                      },
                    ]}
                  >
                    {page.geo_score}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// AEO Section
// ---------------------------------------------------------------------------

interface AEOSectionProps {
  aeoKeywords: Array<{
    id: string;
    keyword: string;
    search_volume: number | null;
    cpc: number | null;
    current_position: number | null;
    intent: string | null;
    ai_visibility_score: number | null;
    ai_visibility_count: string | null;
  }>;
}

function AEOSection({ aeoKeywords }: AEOSectionProps) {
  const { colors } = useTheme();

  if (aeoKeywords.length === 0) {
    return (
      <EmptyState
        title="No AEO Data"
        message="AI Engine Optimization data will appear here once keywords are tracked with AI visibility enabled."
      />
    );
  }

  return (
    <>
      <SectionLabel text="Keywords with AI Visibility" />
      {aeoKeywords.slice(0, 20).map((kw) => {
        const visScore = kw.ai_visibility_score ?? 0;
        const visColor =
          visScore >= 70
            ? colors.green
            : visScore >= 40
            ? colors.gold
            : colors.red;

        return (
          <Card key={kw.id} variant="sm">
            <View style={styles.aeoRow}>
              <View style={styles.aeoInfo}>
                <Text
                  style={[styles.aeoKeyword, { color: colors.ink }]}
                  numberOfLines={1}
                >
                  {kw.keyword}
                </Text>
                <View style={styles.aeoMeta}>
                  {kw.intent && (
                    <Badge
                      label={kw.intent}
                      variant={intentBadgeVariant(kw.intent)}
                    />
                  )}
                  <Text
                    style={[styles.aeoVolume, { color: colors.inkMuted }]}
                  >
                    Vol: {formatNumber(kw.search_volume)}
                  </Text>
                </View>
              </View>
              <View style={styles.aeoRight}>
                <Text style={[styles.aeoVisScore, { color: visColor }]}>
                  {visScore}%
                </Text>
                {kw.ai_visibility_count && (
                  <Text
                    style={[styles.aeoVisCount, { color: colors.inkMuted }]}
                  >
                    {kw.ai_visibility_count}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// CRO Section
// ---------------------------------------------------------------------------

interface CROSectionProps {
  schemaAudit: {
    totalPages: number;
    withSchema: number;
    withoutSchema: number;
    coveragePct: number;
  } | null;
  conversionGoals: Array<{
    id: string;
    name: string;
    goal_type: string;
    estimated_value: number;
    estimated_conversion_rate: number;
  }>;
  topRevenueKeywords: KeywordWithRevenue[];
}

function CROSection({
  schemaAudit,
  conversionGoals,
  topRevenueKeywords,
}: CROSectionProps) {
  const { colors } = useTheme();

  return (
    <>
      {/* Schema coverage stats */}
      <SectionLabel text="Schema Coverage" />
      {schemaAudit && schemaAudit.totalPages > 0 ? (
        <Card>
          <View style={styles.schemaRow}>
            <ScoreRing
              score={schemaAudit.coveragePct}
              size={64}
              status={scoreStatus(schemaAudit.coveragePct)}
            />
            <View style={styles.schemaInfo}>
              <Text style={[styles.schemaLabel, { color: colors.ink }]}>
                Schema Markup Coverage
              </Text>
              <Text style={[styles.schemaMeta, { color: colors.inkMuted }]}>
                {schemaAudit.withSchema}/{schemaAudit.totalPages} pages with
                schema
              </Text>
              <Text style={[styles.schemaMeta, { color: colors.inkMuted }]}>
                {schemaAudit.withoutSchema} pages missing schema
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card variant="sm">
          <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>
            No schema audit data available yet.
          </Text>
        </Card>
      )}

      {/* Conversion goals */}
      <SectionLabel text="Conversion Goals" style={styles.sectionSpacing} />
      {conversionGoals.length === 0 ? (
        <EmptyState
          title="No Goals Defined"
          message="Set up conversion goals to track estimated revenue from organic traffic."
        />
      ) : (
        conversionGoals.map((goal) => (
          <Card key={goal.id} variant="sm">
            <View style={styles.goalRow}>
              <View style={styles.goalInfo}>
                <Text
                  style={[styles.goalName, { color: colors.ink }]}
                  numberOfLines={1}
                >
                  {goal.name}
                </Text>
                <Badge label={goal.goal_type.replace("_", " ")} variant="outline" />
              </View>
              <View style={styles.goalRight}>
                <Text style={[styles.goalValue, { color: colors.green }]}>
                  {formatCurrency(goal.estimated_value)}
                </Text>
                <Text style={[styles.goalRate, { color: colors.inkMuted }]}>
                  {(goal.estimated_conversion_rate * 100).toFixed(1)}% CVR
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Top revenue keywords */}
      {topRevenueKeywords.length > 0 && (
        <>
          <SectionLabel
            text="Top Revenue Keywords"
            style={styles.sectionSpacing}
          />
          <Card>
            {topRevenueKeywords.map((kw, index) => (
              <View key={kw.id}>
                {index > 0 && <Divider />}
                <View style={styles.revenueRow}>
                  <View style={styles.revenueInfo}>
                    <Text
                      style={[styles.revenueKeyword, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {kw.keyword}
                    </Text>
                    <Text
                      style={[
                        styles.revenueTraffic,
                        { color: colors.inkMuted },
                      ]}
                    >
                      ~{formatNumber(kw.estimated_traffic)} visits/mo
                    </Text>
                  </View>
                  <Text style={[styles.revenueValue, { color: colors.green }]}>
                    {formatCurrency(kw.estimated_revenue)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </>
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
    paddingBottom: 20,
  },
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
    marginTop: 2,
  },

  // Action row
  actionRow: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    width: "auto",
    alignSelf: "flex-start",
  },

  // Pills
  pillsScroll: {
    marginBottom: 16,
  },
  pillsContainer: {
    paddingHorizontal: spacing.screenPadding,
    gap: 8,
    flexDirection: "row",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 0,
  },
  pillText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Body
  body: {
    paddingHorizontal: spacing.screenPadding,
  },

  sectionSpacing: {
    marginTop: 16,
  },

  // -- Summary Section --
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  summaryCard: {
    width: "48%",
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  summaryCardLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryStatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryStatLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  summaryStatValue: {
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: "700",
  },

  // -- SEO Section --
  seoStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },
  seoStatItem: {
    alignItems: "center",
    gap: 2,
  },
  seoStatValue: {
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: "700",
  },
  seoStatLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  seoKwRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  seoKwInfo: {
    flex: 1,
  },
  seoKwName: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  seoKwMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  seoKwVol: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  seoKwRight: {
    alignItems: "flex-end",
  },
  seoKwPos: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  seoKwDiff: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  seoContentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  seoContentLabel: {
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  seoContentValue: {
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: "700",
  },

  // Score row (shared)
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  scoreMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    marginTop: 4,
  },

  // Bar label row (sub-scores)
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  barValue: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  barSpacer: {
    height: 12,
  },

  // Page scores
  pageScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pageScoreInfo: {
    flex: 1,
  },
  pageTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  pageUrl: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  pageScoreRight: {
    alignItems: "center",
  },
  pageScoreValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },

  // AEO
  aeoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aeoInfo: {
    flex: 1,
  },
  aeoKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  aeoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  aeoVolume: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  aeoRight: {
    alignItems: "flex-end",
  },
  aeoVisScore: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  aeoVisCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  // CRO - Schema
  schemaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  schemaInfo: {
    flex: 1,
  },
  schemaLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  schemaMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 3,
  },
  emptyCardText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 12,
  },

  // CRO - Goals
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalInfo: {
    flex: 1,
    gap: 6,
  },
  goalName: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  goalRight: {
    alignItems: "flex-end",
  },
  goalValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  goalRate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  // CRO - Revenue keywords
  revenueRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  revenueInfo: {
    flex: 1,
  },
  revenueKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  revenueTraffic: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  revenueValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
  },

  bottomSpacer: {
    height: 100,
  },
});
