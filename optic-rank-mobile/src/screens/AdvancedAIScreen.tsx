import React, { useCallback, useMemo, useState } from "react";
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

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionLabel from "../components/ui/SectionLabel";
import ScoreRing from "../components/ui/ScoreRing";
import KPIBox from "../components/ui/KPIBox";
import Divider from "../components/ui/Divider";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";

import { useVisibilityStats } from "../hooks/useVisibility";
import { useEntityStats } from "../hooks/useEntities";
import { useLatestBrief } from "../hooks/useBriefs";
import { usePredictions } from "../hooks/usePredictions";
import { useActiveProject } from "../hooks/useProjects";
import {
  useRunVisibilityCheck,
  useExtractEntities,
  useGeneratePredictions,
  useGenerateBrief,
  useGenerateInsights,
} from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type { PredictionWithKeyword } from "../hooks/usePredictions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreStatus(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdvancedAIScreen() {
  const { colors } = useTheme();

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const {
    data: visibilityStats,
    isLoading: visLoading,
    refetch: refetchVis,
    isRefetching: isRefetchingVis,
  } = useVisibilityStats(projectId);

  const {
    data: entityStats,
    refetch: refetchEntities,
    isRefetching: isRefetchingEntities,
  } = useEntityStats(projectId);

  const {
    data: latestBrief,
    refetch: refetchBrief,
    isRefetching: isRefetchingBrief,
  } = useLatestBrief(projectId);

  const {
    data: predictions,
    refetch: refetchPredictions,
    isRefetching: isRefetchingPredictions,
  } = usePredictions(projectId);

  // --- Mutations ---
  const visibilityMutation = useRunVisibilityCheck(projectId);
  const entityMutation = useExtractEntities(projectId);
  const predictionMutation = useGeneratePredictions(projectId);
  const briefMutation = useGenerateBrief(projectId);
  const insightsMutation = useGenerateInsights(projectId);

  // --- Modal state ---
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

  // --- Individual action handler ---
  const handleAIAction = useCallback(
    (
      mutation: any,
      loadingTitle: string,
      loadingMsg: string,
      successTitle: string,
      successMsg: (data: any) => string
    ) => {
      setModal({ visible: true, title: loadingTitle, message: loadingMsg, variant: "loading" });
      mutation.mutate(undefined, {
        onSuccess: (data: any) => {
          setModal({ visible: true, title: successTitle, message: successMsg(data), variant: "success" });
        },
        onError: (err: any) => {
          setModal({ visible: true, title: "Error", message: err?.message ?? "An error occurred.", variant: "error" });
        },
      });
    },
    []
  );

  // --- Derived data ---
  const vis = visibilityStats ?? null;
  const entities = entityStats ?? null;
  const preds = predictions ?? [];

  // Prediction accuracy stats
  const predictionStats = useMemo(() => {
    if (!preds.length) {
      return { total: 0, accurate: 0, accuracyPct: 0, avgConfidence: 0 };
    }

    let accurate = 0;
    let confidenceSum = 0;
    let withActual = 0;

    for (const p of preds) {
      confidenceSum += p.confidence;
      if (p.actual_position !== null) {
        withActual++;
        // Consider accurate if predicted within 3 positions of actual
        if (Math.abs(p.predicted_position - p.actual_position) <= 3) {
          accurate++;
        }
      }
    }

    const accuracyPct =
      withActual > 0 ? Math.round((accurate / withActual) * 100) : 0;
    const avgConfidence = Math.round(confidenceSum / preds.length);

    return {
      total: preds.length,
      accurate,
      accuracyPct,
      avgConfidence,
    };
  }, [preds]);

  // Confidence distribution
  const confidenceBuckets = useMemo(() => {
    const high = preds.filter((p) => p.confidence >= 80).length;
    const medium = preds.filter((p) => p.confidence >= 50 && p.confidence < 80).length;
    const low = preds.filter((p) => p.confidence < 50).length;
    const total = preds.length || 1;
    return {
      high,
      highPct: Math.round((high / total) * 100),
      medium,
      mediumPct: Math.round((medium / total) * 100),
      low,
      lowPct: Math.round((low / total) * 100),
    };
  }, [preds]);

  // Entity type breakdown
  const entityTypeEntries = useMemo(() => {
    if (!entities || !entities.byType) return [];
    return Object.entries(entities.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [entities]);

  // --- Individual handlers ---
  const handleRunVisibility = useCallback(() => {
    handleAIAction(
      visibilityMutation,
      "Running Visibility Check",
      "Checking AI visibility across LLM providers...",
      "Visibility Check Complete",
      (d: any) => `Checked ${d?.checked ?? 0} keywords across AI providers.`
    );
  }, [visibilityMutation, handleAIAction]);

  const handleExtractEntities = useCallback(() => {
    handleAIAction(
      entityMutation,
      "Extracting Entities",
      "Analyzing content pages for entity extraction...",
      "Entity Extraction Complete",
      (d: any) => `Extracted ${d?.extracted ?? 0} entities from your content.`
    );
  }, [entityMutation, handleAIAction]);

  const handleGeneratePredictions = useCallback(() => {
    handleAIAction(
      predictionMutation,
      "Generating Predictions",
      "Analyzing keyword trends for rank predictions...",
      "Predictions Generated",
      (d: any) => `Generated ${d?.predicted ?? 0} rank predictions.`
    );
  }, [predictionMutation, handleAIAction]);

  const handleGenerateBrief = useCallback(() => {
    handleAIAction(
      briefMutation,
      "Generating Brief",
      "Creating intelligence brief from all available data...",
      "Brief Generated",
      () => "Your intelligence brief has been generated."
    );
  }, [briefMutation, handleAIAction]);

  const handleGenerateInsights = useCallback(() => {
    handleAIAction(
      insightsMutation,
      "Generating Insights",
      "Analyzing project data for actionable insights...",
      "Insights Generated",
      (d: any) => `Generated ${d?.count ?? 0} new insights.`
    );
  }, [insightsMutation, handleAIAction]);

  // --- Refresh ---
  const handleRefresh = useCallback(() => {
    refetchVis();
    refetchEntities();
    refetchBrief();
    refetchPredictions();
  }, [refetchVis, refetchEntities, refetchBrief, refetchPredictions]);

  const isRefreshing =
    isRefetchingVis ||
    isRefetchingEntities ||
    isRefetchingBrief ||
    isRefetchingPredictions;

  // --- Loading ---
  if (projectLoading || (visLoading && !vis)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Command Center" />;

  const avgScore = vis?.avgScore ?? 0;

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
            AI-powered intelligence modules
          </Text>
        </View>

        <Divider />

        {/* ---------------------------------------------------------------- */}
        {/* Module Action Grid                                               */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Intelligence Modules" />
          <View style={styles.moduleGrid}>
            <TouchableOpacity
              style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={handleGenerateInsights}
              disabled={insightsMutation.isPending}
            >
              <Text style={[styles.moduleIcon, { color: colors.gold }]}>
                {insightsMutation.isPending ? "..." : "*"}
              </Text>
              <Text style={[styles.moduleLabel, { color: colors.ink }]}>Insights</Text>
              <Text style={[styles.moduleDesc, { color: colors.inkMuted }]}>
                AI-generated actionable insights
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={handleRunVisibility}
              disabled={visibilityMutation.isPending}
            >
              <Text style={[styles.moduleIcon, { color: colors.red }]}>
                {visibilityMutation.isPending ? "..." : "@"}
              </Text>
              <Text style={[styles.moduleLabel, { color: colors.ink }]}>Visibility</Text>
              <Text style={[styles.moduleDesc, { color: colors.inkMuted }]}>
                Check LLM visibility across providers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={handleGeneratePredictions}
              disabled={predictionMutation.isPending}
            >
              <Text style={[styles.moduleIcon, { color: colors.green }]}>
                {predictionMutation.isPending ? "..." : "^"}
              </Text>
              <Text style={[styles.moduleLabel, { color: colors.ink }]}>Predictions</Text>
              <Text style={[styles.moduleDesc, { color: colors.inkMuted }]}>
                Forecast keyword rank movements
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={handleExtractEntities}
              disabled={entityMutation.isPending}
            >
              <Text style={[styles.moduleIcon, { color: colors.ink }]}>
                {entityMutation.isPending ? "..." : "#"}
              </Text>
              <Text style={[styles.moduleLabel, { color: colors.ink }]}>Entities</Text>
              <Text style={[styles.moduleDesc, { color: colors.inkMuted }]}>
                Extract entities from content pages
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.moduleCard, { backgroundColor: colors.surface, borderColor: colors.border, width: "100%" }]}
              activeOpacity={0.7}
              onPress={handleGenerateBrief}
              disabled={briefMutation.isPending}
            >
              <Text style={[styles.moduleIcon, { color: colors.gold }]}>
                {briefMutation.isPending ? "..." : "+"}
              </Text>
              <Text style={[styles.moduleLabel, { color: colors.ink }]}>Intelligence Brief</Text>
              <Text style={[styles.moduleDesc, { color: colors.inkMuted }]}>
                Generate comprehensive intelligence report
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Divider />

        {/* ---------------------------------------------------------------- */}
        {/* AI Overview Card                                                 */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="AI Overview" />
          <Card>
            <View style={styles.overviewRow}>
              <ScoreRing
                score={avgScore}
                size={80}
                status={scoreStatus(avgScore)}
              />
              <View style={styles.overviewInfo}>
                <Text style={[styles.overviewTitle, { color: colors.ink }]}>
                  Visibility Score
                </Text>
                <Text style={[styles.overviewMeta, { color: colors.inkSecondary }]}>
                  Across {vis?.totalChecks ?? 0} checks
                </Text>
                {vis?.lastChecked && (
                  <Text style={[styles.overviewDate, { color: colors.inkMuted }]}>
                    Last checked: {formatDate(vis.lastChecked)}
                  </Text>
                )}
              </View>
            </View>
          </Card>

          {/* KPI row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCell}>
              <KPIBox
                value={String(entities?.total ?? 0)}
                label="Entities"
              />
            </View>
            <View style={styles.kpiCell}>
              <KPIBox
                value={String(predictionStats.total)}
                label="Predictions"
              />
            </View>
            <View style={styles.kpiCell}>
              <KPIBox
                value={vis?.keywordsWithVisibility != null ? String(vis.keywordsWithVisibility) : "0"}
                label="AI Keywords"
              />
            </View>
          </View>
        </View>

        <Divider />

        {/* ---------------------------------------------------------------- */}
        {/* Entity-Visibility Correlation                                    */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Entity-Visibility Correlation" />

          {!entities || entities.total === 0 ? (
            <EmptyState
              title="No Entity Data"
              message="Entities will appear once AI extraction has analyzed your content pages."
            />
          ) : (
            <View style={styles.correlationGrid}>
              {/* Entities side */}
              <View style={styles.correlationCol}>
                <Card variant="sm">
                  <Text style={[styles.correlationHeading, { color: colors.ink }]}>
                    Entities
                  </Text>
                  <Text style={[styles.correlationBigNum, { color: colors.ink }]}>
                    {entities.total}
                  </Text>
                  <Text style={[styles.correlationSubtext, { color: colors.inkMuted }]}>
                    Avg relevance: {entities.avgRelevance}%
                  </Text>

                  {entityTypeEntries.length > 0 && (
                    <View style={styles.typeList}>
                      {entityTypeEntries.map(([type, count]) => (
                        <View key={type} style={styles.typeRow}>
                          <Text style={[styles.typeLabel, { color: colors.inkSecondary }]}>
                            {type.replace(/_/g, " ")}
                          </Text>
                          <Text style={[styles.typeCount, { color: colors.ink }]}>
                            {count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              </View>

              {/* Visibility side */}
              <View style={styles.correlationCol}>
                <Card variant="sm">
                  <Text style={[styles.correlationHeading, { color: colors.ink }]}>
                    Visibility
                  </Text>
                  <Text style={[styles.correlationBigNum, { color: colors.ink }]}>
                    {avgScore}%
                  </Text>
                  <Text style={[styles.correlationSubtext, { color: colors.inkMuted }]}>
                    {vis?.keywordsWithVisibility ?? 0} keywords scored
                  </Text>

                  {vis?.providerBreakdown && (
                    <View style={styles.typeList}>
                      {Object.entries(vis.providerBreakdown)
                        .slice(0, 5)
                        .map(([provider, stats]) => (
                          <View key={provider} style={styles.typeRow}>
                            <Text
                              style={[styles.typeLabel, { color: colors.inkSecondary }]}
                              numberOfLines={1}
                            >
                              {provider}
                            </Text>
                            <Text style={[styles.typeCount, { color: colors.ink }]}>
                              {stats.mentioned}/{stats.total}
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}
                </Card>
              </View>
            </View>
          )}
        </View>

        <Divider />

        {/* ---------------------------------------------------------------- */}
        {/* Prediction Accuracy                                              */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Prediction Accuracy" />

          {preds.length === 0 ? (
            <EmptyState
              title="No Predictions"
              message="Rank predictions will appear here once enough historical data has been collected for your keywords."
            />
          ) : (
            <>
              <Card>
                <View style={styles.predAccuracyRow}>
                  <ScoreRing
                    score={predictionStats.accuracyPct}
                    size={64}
                    status={scoreStatus(predictionStats.accuracyPct)}
                  />
                  <View style={styles.predAccuracyInfo}>
                    <Text style={[styles.predAccuracyTitle, { color: colors.ink }]}>
                      Prediction Accuracy
                    </Text>
                    <Text style={[styles.predAccuracySub, { color: colors.inkSecondary }]}>
                      {predictionStats.accurate} accurate of{" "}
                      {predictionStats.total} predictions
                    </Text>
                    <Text style={[styles.predAccuracySub, { color: colors.inkMuted }]}>
                      Avg confidence: {predictionStats.avgConfidence}%
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Confidence distribution */}
              <Card variant="sm">
                <Text style={[styles.confTitle, { color: colors.ink }]}>
                  Confidence Distribution
                </Text>

                <View style={styles.confRow}>
                  <View style={styles.confLabelRow}>
                    <Text style={[styles.confLabel, { color: colors.ink }]}>
                      High ({"\u2265"}80%)
                    </Text>
                    <Text style={[styles.confValue, { color: colors.green }]}>
                      {confidenceBuckets.high}
                    </Text>
                  </View>
                  <ProgressBar
                    value={confidenceBuckets.highPct}
                    color={colors.green}
                  />
                </View>

                <View style={styles.confRow}>
                  <View style={styles.confLabelRow}>
                    <Text style={[styles.confLabel, { color: colors.ink }]}>
                      Medium (50-79%)
                    </Text>
                    <Text style={[styles.confValue, { color: colors.gold }]}>
                      {confidenceBuckets.medium}
                    </Text>
                  </View>
                  <ProgressBar
                    value={confidenceBuckets.mediumPct}
                    color={colors.gold}
                  />
                </View>

                <View style={styles.confRow}>
                  <View style={styles.confLabelRow}>
                    <Text style={[styles.confLabel, { color: colors.ink }]}>
                      Low ({"<"}50%)
                    </Text>
                    <Text style={[styles.confValue, { color: colors.red }]}>
                      {confidenceBuckets.low}
                    </Text>
                  </View>
                  <ProgressBar
                    value={confidenceBuckets.lowPct}
                    color={colors.red}
                  />
                </View>
              </Card>
            </>
          )}
        </View>

        <Divider />

        {/* ---------------------------------------------------------------- */}
        {/* Latest AI Brief                                                  */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Latest AI Brief" />

          {!latestBrief ? (
            <EmptyState
              title="No Briefs Yet"
              message="AI-generated intelligence briefs will appear here after your first scheduled analysis."
            />
          ) : (
            <Card
              variant="highlighted"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: colors.gold,
              }}
            >
              <View style={styles.briefHeader}>
                <Badge
                  label={latestBrief.brief_type}
                  variant="gold"
                />
                <Text style={[styles.briefDate, { color: colors.inkMuted }]}>
                  {formatDate(latestBrief.created_at)}
                  {latestBrief.created_at ? ` ${formatTime(latestBrief.created_at)}` : ""}
                </Text>
              </View>

              <Text
                style={[styles.briefTitle, { color: colors.ink }]}
                numberOfLines={2}
              >
                {latestBrief.title}
              </Text>

              <Text
                style={[styles.briefSummary, { color: colors.inkSecondary }]}
                numberOfLines={6}
              >
                {latestBrief.summary}
              </Text>

              {latestBrief.sections && latestBrief.sections.length > 0 && (
                <View style={styles.briefSections}>
                  <Text style={[styles.briefSectionsLabel, { color: colors.inkMuted }]}>
                    Sections covered:
                  </Text>
                  <View style={styles.briefBadgeRow}>
                    {latestBrief.sections.slice(0, 5).map((section, index) => (
                      <Badge
                        key={`${section.type}-${index}`}
                        label={section.type}
                        variant="outline"
                      />
                    ))}
                  </View>
                </View>
              )}

              <Text style={[styles.briefGeneratedBy, { color: colors.inkMuted }]}>
                Generated by {latestBrief.generated_by}
              </Text>
            </Card>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* -- Feedback Modal -- */}
      <AppModal
        visible={modal.visible}
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
  section: {
    paddingHorizontal: spacing.screenPadding,
  },

  // Overview
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  overviewInfo: {
    flex: 1,
  },
  overviewTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
  overviewMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  overviewDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 4,
  },

  // KPI row
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  kpiCell: {
    flex: 1,
  },

  // Correlation grid
  correlationGrid: {
    flexDirection: "row",
    gap: 8,
  },
  correlationCol: {
    flex: 1,
  },
  correlationHeading: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  correlationBigNum: {
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
  },
  correlationSubtext: {
    fontFamily: fonts.sans,
    fontSize: 10,
    marginTop: 2,
  },
  typeList: {
    marginTop: 8,
  },
  typeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  typeLabel: {
    fontFamily: fonts.sans,
    fontSize: 10,
    flex: 1,
    textTransform: "capitalize",
  },
  typeCount: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "700",
  },

  // Prediction accuracy
  predAccuracyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  predAccuracyInfo: {
    flex: 1,
  },
  predAccuracyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  predAccuracySub: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },

  // Confidence distribution
  confTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    marginBottom: 8,
  },
  confRow: {
    marginBottom: 8,
  },
  confLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
  },
  confValue: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "700",
  },

  // Brief card
  briefHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  briefDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  briefTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
    marginBottom: 6,
  },
  briefSummary: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  briefSections: {
    marginTop: 12,
  },
  briefSectionsLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  briefBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  briefGeneratedBy: {
    fontFamily: fonts.mono,
    fontSize: 9,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // -- Module Grid --
  moduleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  moduleCard: {
    width: "48%",
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  moduleIcon: {
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  moduleLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  moduleDesc: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 14,
  },

  bottomSpacer: {
    height: 100,
  },
});
