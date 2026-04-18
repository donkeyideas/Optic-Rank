import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import ProgressBar from "../components/ui/ProgressBar";
import LoadingScreen from "../components/ui/LoadingScreen";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import AppModal from "../components/ui/AppModal";

import {
  usePredictions,
  type PredictionWithKeyword,
} from "../hooks/usePredictions";
import { useActiveProject } from "../hooks/useProjects";
import { useGeneratePredictions } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_PADDING = spacing.screenPadding;

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

const DIRECTION_FILTERS = ["All", "Improving", "Declining"] as const;
type DirectionFilter = (typeof DIRECTION_FILTERS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function directionFromPositions(
  current: number | null,
  predicted: number
): "up" | "down" | "stable" {
  if (current == null) return "stable";
  if (predicted < current) return "up"; // lower position number = better rank
  if (predicted > current) return "down";
  return "stable";
}

function directionArrow(dir: "up" | "down" | "stable"): string {
  switch (dir) {
    case "up":
      return "\u25B2"; // ▲
    case "down":
      return "\u25BC"; // ▼
    case "stable":
    default:
      return "\u25CF"; // ●
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PredictionsScreen() {
  const { colors } = useTheme();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const [activeFilter, setActiveFilter] = useState<DirectionFilter>("All");

  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  const {
    data: predictions,
    isLoading: predictionsLoading,
    refetch: refetchPredictions,
    isRefetching: isRefetchingPredictions,
  } = usePredictions(projectId);

  const generatePredictions = useGeneratePredictions(projectId);

  const predictionList = predictions ?? [];

  // Filter predictions by direction
  const filteredPredictions = useMemo(() => {
    if (activeFilter === "All") return predictionList;
    return predictionList.filter((p) => {
      const dir = directionFromPositions(p.current_position, p.predicted_position);
      if (activeFilter === "Improving") return dir === "up";
      if (activeFilter === "Declining") return dir === "down";
      return true;
    });
  }, [predictionList, activeFilter]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (predictionList.length === 0) {
      return {
        total: 0,
        avgConfidence: 0,
        predictedUp: 0,
        predictedDown: 0,
      };
    }

    let totalConfidence = 0;
    let upCount = 0;
    let downCount = 0;

    for (const p of predictionList) {
      totalConfidence += p.confidence ?? 0;
      const dir = directionFromPositions(
        p.current_position,
        p.predicted_position
      );
      if (dir === "up") upCount++;
      if (dir === "down") downCount++;
    }

    return {
      total: predictionList.length,
      avgConfidence: Math.round(totalConfidence / predictionList.length),
      predictedUp: upCount,
      predictedDown: downCount,
    };
  }, [predictionList]);

  const handleRefresh = useCallback(() => {
    refetchPredictions();
  }, [refetchPredictions]);

  const handleGeneratePredictions = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating Predictions",
      message: "Analyzing historical data and generating rank forecasts...",
      variant: "loading",
    });
    generatePredictions.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Predictions Generated",
          message: `Successfully generated ${data?.predicted ?? 0} rank predictions using historical data.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Prediction Generation Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "error",
        });
      },
    });
  }, [generatePredictions]);

  if (projectLoading || (predictionsLoading && !predictions)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Predictions" />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingPredictions}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            AI-powered rank forecasting using historical data
          </Text>
        </View>

        <Divider />

        {/* Action Button */}
        <View style={styles.actionRow}>
          <Button
            title="Generate Predictions"
            variant="sm-red"
            disabled={generatePredictions.isPending}
            onPress={handleGeneratePredictions}
          />
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Summary KPIs                                                      */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Forecast Summary" />
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCell}>
              <KPIBox
                value={String(summaryStats.total)}
                label="Predictions"
              />
            </View>
            <View style={styles.kpiCell}>
              <KPIBox
                value={`${summaryStats.avgConfidence}%`}
                label="Avg Confidence"
              />
            </View>
            <View style={styles.kpiCell}>
              <KPIBox
                value={String(summaryStats.predictedUp)}
                label="Predicted Up"
                deltaType={summaryStats.predictedUp > 0 ? "up" : "neutral"}
              />
            </View>
            <View style={styles.kpiCell}>
              <KPIBox
                value={String(summaryStats.predictedDown)}
                label="Predicted Down"
                deltaType={summaryStats.predictedDown > 0 ? "down" : "neutral"}
              />
            </View>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Filter Tabs                                                        */}
        {/* ---------------------------------------------------------------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContainer}
        >
          {DIRECTION_FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setActiveFilter(filter)}
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
                    {
                      color: isActive ? colors.surface : colors.inkSecondary,
                    },
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ---------------------------------------------------------------- */}
        {/* Prediction List                                                    */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel
            text={`${filteredPredictions.length} Predictions`}
            style={styles.sectionSpacing}
          />
          {filteredPredictions.length === 0 ? (
            <EmptyState
              title="No predictions yet"
              message={
                activeFilter !== "All"
                  ? `No predictions match the "${activeFilter}" filter.`
                  : "Rank predictions will appear after enough historical data is collected."
              }
            />
          ) : (
            filteredPredictions.map((pred: PredictionWithKeyword) => {
              const dir = directionFromPositions(
                pred.current_position,
                pred.predicted_position
              );
              const arrow = directionArrow(dir);
              const dirColor =
                dir === "up"
                  ? colors.green
                  : dir === "down"
                  ? colors.red
                  : colors.inkMuted;
              const confidence = Math.round(pred.confidence ?? 0);

              return (
                <Card key={pred.id} variant="sm">
                  {/* Keyword name + direction badge */}
                  <View style={styles.predTopRow}>
                    <Text
                      style={[styles.predKeyword, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {pred.keyword}
                    </Text>
                    <Badge
                      label={dir === "up" ? "Rising" : dir === "down" ? "Falling" : "Stable"}
                      variant={dir === "up" ? "green" : dir === "down" ? "red" : "gold"}
                    />
                  </View>

                  {/* Position transition row */}
                  <View style={styles.predPositionRow}>
                    {/* Current */}
                    <View style={styles.predPosBlock}>
                      <Text
                        style={[
                          styles.predPosLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Current
                      </Text>
                      <Text
                        style={[styles.predPosValue, { color: colors.ink }]}
                      >
                        {pred.current_position != null
                          ? `#${pred.current_position}`
                          : "--"}
                      </Text>
                    </View>

                    {/* Arrow */}
                    <Text
                      style={[styles.predArrow, { color: dirColor }]}
                    >
                      {arrow}
                    </Text>

                    {/* Predicted */}
                    <View style={styles.predPosBlock}>
                      <Text
                        style={[
                          styles.predPosLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Predicted
                      </Text>
                      <Text
                        style={[styles.predPosValue, { color: dirColor }]}
                      >
                        #{pred.predicted_position}
                      </Text>
                    </View>

                    {/* Spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Confidence */}
                    <View style={styles.predConfBlock}>
                      <Text
                        style={[
                          styles.predConfLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Confidence
                      </Text>
                      <Text
                        style={[
                          styles.predConfValue,
                          { color: colors.ink },
                        ]}
                      >
                        {confidence}%
                      </Text>
                    </View>
                  </View>

                  {/* Confidence bar */}
                  <ProgressBar
                    value={confidence}
                    color={
                      confidence >= 80
                        ? colors.green
                        : confidence >= 50
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

  // -- Filter pills --
  pillsScroll: {
    marginTop: spacing.md,
    marginBottom: 4,
  },
  pillsContainer: {
    paddingHorizontal: SCREEN_PADDING,
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

  // -- KPI Grid --
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  kpiCell: {
    width: (SCREEN_WIDTH - SCREEN_PADDING * 2 - 8) / 2,
  },

  // -- Prediction Card --
  predTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  predKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: 8,
  },
  predPositionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
    gap: 12,
  },
  predPosBlock: {
    alignItems: "center",
  },
  predPosLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  predPosValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginTop: 2,
  },
  predArrow: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  predConfBlock: {
    alignItems: "flex-end",
  },
  predConfLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  predConfValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginTop: 2,
  },

  // -- Bottom spacer --
  bottomSpacer: {
    height: 100,
  },
});
