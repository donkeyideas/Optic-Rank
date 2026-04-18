import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import KPIBox from "../components/ui/KPIBox";
import ScoreRing from "../components/ui/ScoreRing";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import ProgressBar from "../components/ui/ProgressBar";
import LoadingScreen from "../components/ui/LoadingScreen";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import AppModal from "../components/ui/AppModal";

import {
  useVisibilityStats,
  useVisibilityByKeyword,
  type KeywordVisibility,
} from "../hooks/useVisibility";
import { useActiveProject } from "../hooks/useProjects";
import { useRunVisibilityCheck } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_PADDING = spacing.screenPadding;

// Provider display config
const PROVIDER_CONFIG: Record<string, { label: string; color: string }> = {
  openai: { label: "OpenAI", color: "#10a37f" },
  gemini: { label: "Gemini", color: "#4285f4" },
  anthropic: { label: "Anthropic", color: "#d97706" },
  perplexity: { label: "Perplexity", color: "#20b8cd" },
  deepseek: { label: "DeepSeek", color: "#5b6abf" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreStatus(score: number): "good" | "warn" | "bad" {
  if (score >= 70) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIVisibilityScreen() {
  const { colors } = useTheme();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching: isRefetchingStats,
  } = useVisibilityStats(projectId);

  const {
    data: keywordVisibility,
    isLoading: kwLoading,
    refetch: refetchKw,
    isRefetching: isRefetchingKw,
  } = useVisibilityByKeyword(projectId);

  const runVisibilityCheck = useRunVisibilityCheck(projectId);

  const safeStats = stats ?? {
    avgScore: 0,
    keywordsWithVisibility: 0,
    totalChecks: 0,
    lastChecked: null,
    providerBreakdown: {},
  };

  const kwList = keywordVisibility ?? [];

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchKw();
  }, [refetchStats, refetchKw]);

  const handleRunVisibilityCheck = useCallback(() => {
    setModal({
      visible: true,
      title: "Running Visibility Check",
      message: "Analyzing AI visibility across all providers. This may take a few minutes...",
      variant: "loading",
    });
    runVisibilityCheck.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Visibility Check Complete",
          message: `Successfully ran ${data?.checksRun ?? 0} visibility checks across all AI providers.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Visibility Check Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "error",
        });
      },
    });
  }, [runVisibilityCheck]);

  // Known provider keys in display order
  const providerKeys = ["openai", "gemini", "anthropic", "perplexity", "deepseek"];

  if (projectLoading || (statsLoading && !stats)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Visibility Tracker" />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingStats || isRefetchingKw}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Track how AI assistants mention your brand
          </Text>
        </View>

        <Divider />

        {/* Action Button */}
        <View style={styles.actionRow}>
          <Button
            title="Run Visibility Check"
            variant="sm-red"
            disabled={runVisibilityCheck.isPending}
            onPress={handleRunVisibilityCheck}
          />
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Overall Score                                                      */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Overall Score" />
          <Card>
            <View style={styles.overallRow}>
              <ScoreRing
                score={safeStats.avgScore}
                size={96}
                status={scoreStatus(safeStats.avgScore)}
              />
              <View style={styles.overallMeta}>
                <Text style={[styles.overallTitle, { color: colors.ink }]}>
                  AI Visibility Score
                </Text>
                <Text
                  style={[styles.overallDesc, { color: colors.inkSecondary }]}
                >
                  Average visibility across all tracked keywords and AI
                  providers.
                </Text>
                <View style={styles.overallStatsRow}>
                  <View style={styles.overallStat}>
                    <Text
                      style={[
                        styles.overallStatValue,
                        { color: colors.ink },
                      ]}
                    >
                      {safeStats.totalChecks}
                    </Text>
                    <Text
                      style={[
                        styles.overallStatLabel,
                        { color: colors.inkMuted },
                      ]}
                    >
                      Checks
                    </Text>
                  </View>
                  <View style={styles.overallStat}>
                    <Text
                      style={[
                        styles.overallStatValue,
                        { color: colors.ink },
                      ]}
                    >
                      {safeStats.keywordsWithVisibility}
                    </Text>
                    <Text
                      style={[
                        styles.overallStatLabel,
                        { color: colors.inkMuted },
                      ]}
                    >
                      Keywords
                    </Text>
                  </View>
                  <View style={styles.overallStat}>
                    <Text
                      style={[
                        styles.overallStatValue,
                        { color: colors.ink },
                      ]}
                    >
                      {formatDate(safeStats.lastChecked)}
                    </Text>
                    <Text
                      style={[
                        styles.overallStatLabel,
                        { color: colors.inkMuted },
                      ]}
                    >
                      Last Check
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Provider Breakdown                                                 */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Provider Breakdown" style={styles.sectionSpacing} />
          <View style={styles.providerGrid}>
            {providerKeys.map((key) => {
              const provData = safeStats.providerBreakdown[key];
              const config = PROVIDER_CONFIG[key] ?? {
                label: key,
                color: colors.inkMuted,
              };
              const mentioned = provData?.mentioned ?? 0;
              const total = provData?.total ?? 0;
              const pct = total > 0 ? Math.round((mentioned / total) * 100) : 0;

              return (
                <View
                  key={key}
                  style={[
                    styles.providerCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.providerDot,
                      { backgroundColor: config.color },
                    ]}
                  />
                  <Text
                    style={[styles.providerName, { color: colors.ink }]}
                  >
                    {config.label}
                  </Text>
                  <Text
                    style={[styles.providerPct, { color: colors.ink }]}
                  >
                    {pct}%
                  </Text>
                  <Text
                    style={[
                      styles.providerCount,
                      { color: colors.inkMuted },
                    ]}
                  >
                    {mentioned}/{total}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Keyword Visibility Matrix                                          */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel
            text="Keyword Visibility"
            style={styles.sectionSpacing}
          />
          {kwList.length === 0 ? (
            <EmptyState
              title="No visibility data"
              message="AI visibility checks will appear after your first analysis run."
            />
          ) : (
            kwList.map((kv: KeywordVisibility) => {
              // Build per-provider status for this keyword
              const providerStatus: Record<string, boolean | null> = {};
              for (const key of providerKeys) {
                const check = kv.checks.find(
                  (c) => c.llm_provider === key
                );
                providerStatus[key] =
                  check != null ? check.brand_mentioned : null;
              }

              return (
                <Card key={kv.keywordId} variant="sm">
                  <View style={styles.kwTopRow}>
                    <Text
                      style={[styles.kwName, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {kv.keyword}
                    </Text>
                    <Text style={[styles.kwScore, { color: colors.ink }]}>
                      {kv.visibilityScore ?? 0}%
                    </Text>
                  </View>

                  {/* Provider dots row */}
                  <View style={styles.kwDotsRow}>
                    {providerKeys.map((key) => {
                      const status = providerStatus[key];
                      const config = PROVIDER_CONFIG[key];
                      let dotColor = colors.border; // not checked
                      if (status === true) dotColor = colors.green;
                      if (status === false) dotColor = colors.red;

                      return (
                        <View key={key} style={styles.kwDotGroup}>
                          <View
                            style={[
                              styles.kwDot,
                              { backgroundColor: dotColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.kwDotLabel,
                              { color: colors.inkMuted },
                            ]}
                          >
                            {config?.label?.substring(0, 3) ?? key.substring(0, 3)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Visibility bar */}
                  <ProgressBar
                    value={kv.visibilityScore ?? 0}
                    color={
                      (kv.visibilityScore ?? 0) >= 70
                        ? colors.green
                        : (kv.visibilityScore ?? 0) >= 40
                        ? colors.gold
                        : colors.red
                    }
                  />
                </Card>
              );
            })
          )}
        </View>

        {/* Bottom spacer for tab bar clearance */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AppModal
        visible={modal.visible}
        onClose={() => setModal((m) => ({ ...m, visible: false }))}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        loading={modal.variant === "loading"}
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
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.xl,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },
  actionRow: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: spacing.md,
  },
  section: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: spacing.lg,
  },
  sectionSpacing: {
    marginTop: 16,
  },

  // -- Overall Score --
  overallRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  overallMeta: {
    flex: 1,
  },
  overallTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
  overallDesc: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  overallStatsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 10,
  },
  overallStat: {
    alignItems: "flex-start",
  },
  overallStatValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  overallStatLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },

  // -- Provider Grid --
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  providerCard: {
    width: (SCREEN_WIDTH - SCREEN_PADDING * 2 - 8) / 2,
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    alignItems: "center",
  },
  providerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  providerName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  providerPct: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xxl,
    fontWeight: "700",
    marginTop: 2,
  },
  providerCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  // -- Keyword Visibility --
  kwTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kwName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: 8,
  },
  kwScore: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  kwDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  kwDotGroup: {
    alignItems: "center",
    gap: 2,
  },
  kwDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  kwDotLabel: {
    fontFamily: fonts.mono,
    fontSize: 7,
    textTransform: "uppercase",
  },

  // -- Bottom spacer --
  bottomSpacer: {
    height: 100,
  },
});
