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
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import ProgressBar from "../components/ui/ProgressBar";
import LoadingScreen from "../components/ui/LoadingScreen";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import FilterPills from "../components/keywords/FilterPills";
import AppModal from "../components/ui/AppModal";

import { useEntities, useEntityStats } from "../hooks/useEntities";
import { useActiveProject } from "../hooks/useProjects";
import { useExtractEntities } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type { Entity, EntityType } from "../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_PADDING = spacing.screenPadding;

const FILTER_OPTIONS = [
  "All",
  "Person",
  "Organization",
  "Product",
  "Place",
  "Technology",
  "Concept",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function entityTypeBadgeVariant(
  type: EntityType
): "dark" | "green" | "gold" | "red" | "blue" | "outline" {
  switch (type) {
    case "person":
      return "blue";
    case "organization":
      return "dark";
    case "product":
      return "green";
    case "place":
      return "gold";
    case "technology":
      return "red";
    case "concept":
      return "outline";
    case "brand":
      return "green";
    case "event":
      return "gold";
    default:
      return "outline";
  }
}

function sourceBadgeVariant(
  source: string
): "outline" | "dark" | "gold" {
  switch (source) {
    case "knowledge_graph":
      return "dark";
    case "ai_extraction":
      return "gold";
    case "serp":
      return "outline";
    case "manual":
    default:
      return "outline";
  }
}

function filterToEntityType(filter: string): EntityType | undefined {
  const map: Record<string, EntityType> = {
    Person: "person",
    Organization: "organization",
    Product: "product",
    Place: "place",
    Technology: "technology",
    Concept: "concept",
  };
  return map[filter];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EntitiesScreen() {
  const { colors } = useTheme();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const [activeFilter, setActiveFilter] = useState("All");

  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  const entityType = filterToEntityType(activeFilter);

  const {
    data: entities,
    isLoading: entitiesLoading,
    refetch: refetchEntities,
    isRefetching: isRefetchingEntities,
  } = useEntities(projectId, entityType);

  const {
    data: stats,
    refetch: refetchStats,
    isRefetching: isRefetchingStats,
  } = useEntityStats(projectId);

  const extractEntities = useExtractEntities(projectId);

  const entityList = entities ?? [];
  const safeStats = stats ?? {
    total: 0,
    byType: {},
    avgRelevance: 0,
  };

  const handleRefresh = useCallback(() => {
    refetchEntities();
    refetchStats();
  }, [refetchEntities, refetchStats]);

  const handleExtractEntities = useCallback(() => {
    setModal({
      visible: true,
      title: "Extracting Entities",
      message: "Analyzing content and extracting named entities for semantic SEO...",
      variant: "loading",
    });
    extractEntities.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Entity Extraction Complete",
          message: `Successfully extracted ${data?.extracted ?? 0} entities from your project content.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Entity Extraction Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "error",
        });
      },
    });
  }, [extractEntities]);

  const handleGapAnalysis = useCallback(() => {
    setModal({
      visible: true,
      title: "Gap Analysis",
      message: "Analyzing entity coverage gaps...",
      variant: "loading",
    });
    extractEntities.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Gap Analysis Complete",
          message: `Analyzed entity coverage and extracted ${data?.extracted ?? 0} entities. Review results below for coverage gaps.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Gap Analysis Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "error",
        });
      },
    });
  }, [extractEntities]);

  // Build type breakdown summary string
  const typeBreakdownEntries = Object.entries(safeStats.byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (projectLoading || (entitiesLoading && !entities)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Entities" />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingEntities || isRefetchingStats}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Extract and optimize named entities for semantic SEO
          </Text>
        </View>

        <Divider />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <View style={styles.actionButtonsRow}>
            <View style={styles.actionButtonPrimary}>
              <Button
                title="Extract Entities"
                variant="sm-red"
                disabled={extractEntities.isPending}
                onPress={handleExtractEntities}
              />
            </View>
            <View style={styles.actionButtonSecondary}>
              <Button
                title="Gap Analysis"
                variant="sm-outline"
                disabled={extractEntities.isPending}
                onPress={handleGapAnalysis}
              />
            </View>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Stats Header                                                      */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel text="Entity Overview" />
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCell}>
              <KPIBox
                value={String(safeStats.total)}
                label="Total Entities"
              />
            </View>
            <View style={styles.kpiCell}>
              <KPIBox
                value={`${safeStats.avgRelevance}%`}
                label="Avg Relevance"
              />
            </View>
          </View>

          {/* Type breakdown */}
          {typeBreakdownEntries.length > 0 && (
            <Card variant="sm" style={styles.breakdownCard}>
              <Text style={[styles.breakdownTitle, { color: colors.ink }]}>
                Type Breakdown
              </Text>
              {typeBreakdownEntries.map(([type, count]) => (
                <View key={type} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Badge
                      label={type}
                      variant={entityTypeBadgeVariant(type as EntityType)}
                    />
                  </View>
                  <Text
                    style={[styles.breakdownCount, { color: colors.ink }]}
                  >
                    {count}
                  </Text>
                  <View style={styles.breakdownBarWrap}>
                    <ProgressBar
                      value={
                        safeStats.total > 0
                          ? Math.round((count / safeStats.total) * 100)
                          : 0
                      }
                      color={colors.gold}
                    />
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Filter Pills                                                      */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.pillsContainer}>
          <FilterPills
            filters={FILTER_OPTIONS}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Entity List                                                        */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.section}>
          <SectionLabel
            text={`${entityList.length} Entities`}
          />
          {entityList.length === 0 ? (
            <EmptyState
              title="No entities found"
              message={
                activeFilter !== "All"
                  ? `No entities match the "${activeFilter}" filter.`
                  : "Entity data will appear after content analysis."
              }
            />
          ) : (
            entityList.map((entity: Entity) => (
              <Card key={entity.id} variant="sm">
                {/* Top row: name + type badge */}
                <View style={styles.entityTopRow}>
                  <Text
                    style={[styles.entityName, { color: colors.ink }]}
                    numberOfLines={1}
                  >
                    {entity.name}
                  </Text>
                  <Badge
                    label={entity.entity_type}
                    variant={entityTypeBadgeVariant(entity.entity_type)}
                  />
                </View>

                {/* Description */}
                {entity.description && (
                  <Text
                    style={[
                      styles.entityDescription,
                      { color: colors.inkSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {entity.description}
                  </Text>
                )}

                {/* Relevance bar + source */}
                <View style={styles.entityMetaRow}>
                  <View style={styles.entityRelevanceWrap}>
                    <View style={styles.entityRelevanceLabelRow}>
                      <Text
                        style={[
                          styles.entityRelevanceLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Relevance
                      </Text>
                      <Text
                        style={[
                          styles.entityRelevanceValue,
                          { color: colors.ink },
                        ]}
                      >
                        {entity.relevance_score ?? 0}%
                      </Text>
                    </View>
                    <ProgressBar
                      value={entity.relevance_score ?? 0}
                      color={
                        (entity.relevance_score ?? 0) >= 70
                          ? colors.green
                          : (entity.relevance_score ?? 0) >= 40
                          ? colors.gold
                          : colors.red
                      }
                    />
                  </View>
                  <Badge
                    label={entity.source.replace("_", " ")}
                    variant={sourceBadgeVariant(entity.source)}
                  />
                </View>
              </Card>
            ))
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
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButtonPrimary: {
    flex: 1,
  },
  actionButtonSecondary: {
    flex: 1,
  },
  section: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: spacing.lg,
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

  // -- Breakdown Card --
  breakdownCard: {
    marginTop: 8,
  },
  breakdownTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  breakdownLeft: {
    width: 90,
  },
  breakdownCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    width: 30,
    textAlign: "right",
  },
  breakdownBarWrap: {
    flex: 1,
  },

  // -- Filter pills --
  pillsContainer: {
    paddingHorizontal: SCREEN_PADDING,
  },

  // -- Entity Card --
  entityTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entityName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: 8,
  },
  entityDescription: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  entityMetaRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  entityRelevanceWrap: {
    flex: 1,
  },
  entityRelevanceLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entityRelevanceLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  entityRelevanceValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },

  // -- Bottom spacer --
  bottomSpacer: {
    height: 100,
  },
});
