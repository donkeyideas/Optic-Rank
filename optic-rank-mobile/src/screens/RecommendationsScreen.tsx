import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";

import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";
import FilterPills from "../components/keywords/FilterPills";
import NoProjectGuard from "../components/shared/NoProjectGuard";
import { useActiveProject } from "../hooks/useProjects";
import { useRecommendations } from "../hooks/useQueries";
import {
  useGenerateRecommendations,
  useDismissRecommendation,
  useCompleteRecommendation,
} from "../hooks/useMutations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Recommendation {
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
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_FILTERS = [
  "All",
  "Quick Wins",
  "Content",
  "Technical",
  "Backlinks",
  "Visibility",
  "Revenue",
  "Competitive",
  "Performance",
] as const;

type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

// ---------------------------------------------------------------------------
// Category badge color mapping
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
// Impact / Effort badge variant mapping
// ---------------------------------------------------------------------------

function getImpactEffortVariant(level: string): "red" | "gold" | "green" {
  const l = level?.toLowerCase();
  if (l === "high") return "red";
  if (l === "medium") return "gold";
  return "green";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeCategory(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function matchesFilter(rec: Recommendation, filter: CategoryFilter): boolean {
  if (filter === "All") return true;
  const normalized = normalizeCategory(rec.category);
  return normalized === filter;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RecommendationsScreen() {
  const { colors } = useTheme();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const {
    data: recommendations,
    isLoading: recsLoading,
    refetch: refetchRecs,
    isRefetching,
  } = useRecommendations(project?.id);

  const generateRecs = useGenerateRecommendations(project?.id);
  const dismissRec = useDismissRecommendation(project?.id);
  const completeRec = useCompleteRecommendation(project?.id);

  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("All");

  // Modal state
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, visible: false }));
  }, []);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const allRecs = useMemo(() => {
    return (recommendations ?? []) as Recommendation[];
  }, [recommendations]);

  const activeRecs = useMemo(() => {
    return allRecs.filter((r) => !r.is_completed);
  }, [allRecs]);

  const completedRecs = useMemo(() => {
    return allRecs.filter((r) => r.is_completed);
  }, [allRecs]);

  const filteredRecs = useMemo(() => {
    return activeRecs.filter((r) => matchesFilter(r, activeFilter));
  }, [activeRecs, activeFilter]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    refetchRecs();
  }, [refetchRecs]);

  const handleGenerate = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating Recommendations",
      message: "Analyzing your SEO data to generate actionable recommendations...",
      variant: "loading",
    });
    generateRecs.mutate(undefined, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Recommendations Ready",
          message:
            "AI-powered recommendations have been generated based on your current SEO data.",
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Generation Failed",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while generating recommendations.",
          variant: "error",
        });
      },
    });
  }, [generateRecs]);

  const handleComplete = useCallback(
    (id: string) => {
      completeRec.mutate(id, {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "Marked as Done",
            message: "Recommendation marked as completed. Great work!",
            variant: "success",
          });
        },
        onError: (error) => {
          setModal({
            visible: true,
            title: "Action Failed",
            message:
              error instanceof Error
                ? error.message
                : "Could not mark recommendation as completed.",
            variant: "error",
          });
        },
      });
    },
    [completeRec]
  );

  const handleDismiss = useCallback(
    (id: string) => {
      dismissRec.mutate(id, {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "Dismissed",
            message: "Recommendation has been dismissed and will no longer appear.",
            variant: "info",
          });
        },
        onError: (error) => {
          setModal({
            visible: true,
            title: "Action Failed",
            message:
              error instanceof Error
                ? error.message
                : "Could not dismiss recommendation.",
            variant: "error",
          });
        },
      });
    },
    [dismissRec]
  );

  // ---------------------------------------------------------------------------
  // Loading / Guard
  // ---------------------------------------------------------------------------

  if (projectLoading || (recsLoading && !recommendations)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Recommendations" />;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            AI-powered action items
          </Text>
          <Text style={[styles.headerInfo, { color: colors.inkMuted }]}>
            {activeRecs.length} active &middot; {completedRecs.length} completed
          </Text>
        </View>

        {/* Generate button */}
        <View style={styles.generateSection}>
          <Button
            title={
              generateRecs.isPending
                ? "Generating..."
                : "Generate Recommendations"
            }
            variant="sm-red"
            onPress={handleGenerate}
            disabled={generateRecs.isPending}
            style={styles.generateButton}
          />
        </View>

        <Divider />

        {/* Filter pills */}
        <View style={styles.filterSection}>
          <FilterPills
            filters={CATEGORY_FILTERS as unknown as string[]}
            activeFilter={activeFilter}
            onFilterChange={(f) => setActiveFilter(f as CategoryFilter)}
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
                  ? 'Tap "Generate Recommendations" to get AI-powered action items based on your SEO data.'
                  : "No recommendations match this filter. Try selecting a different category."
              }
            />
          ) : (
            filteredRecs.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                colors={colors}
                onComplete={handleComplete}
                onDismiss={handleDismiss}
                isCompleting={completeRec.isPending}
                isDismissing={dismissRec.isPending}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* AppModal */}
      <AppModal
        visible={modal.visible}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        loading={modal.variant === "loading"}
        loadingText={modal.variant === "loading" ? modal.message : undefined}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Recommendation Card sub-component
// ---------------------------------------------------------------------------

interface RecommendationCardProps {
  rec: Recommendation;
  colors: ReturnType<typeof useTheme>["colors"];
  onComplete: (id: string) => void;
  onDismiss: (id: string) => void;
  isCompleting: boolean;
  isDismissing: boolean;
}

function RecommendationCard({
  rec,
  colors,
  onComplete,
  onDismiss,
  isCompleting,
  isDismissing,
}: RecommendationCardProps) {
  const categoryColor = getCategoryBadgeColor(rec.category);
  const dataSources = rec.data_sources ?? [];

  return (
    <Card style={styles.recCard}>
      {/* Badges row */}
      <View style={styles.badgesRow}>
        {/* Category badge with custom color */}
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColor.bg },
          ]}
        >
          <Text style={[styles.categoryBadgeText, { color: categoryColor.text }]}>
            {normalizeCategory(rec.category)}
          </Text>
        </View>

        {/* Impact badge */}
        {rec.impact && (
          <Badge
            label={`Impact: ${rec.impact}`}
            variant={getImpactEffortVariant(rec.impact)}
          />
        )}

        {/* Effort badge */}
        {rec.effort && (
          <Badge
            label={`Effort: ${rec.effort}`}
            variant={getImpactEffortVariant(rec.effort)}
          />
        )}
      </View>

      {/* Title */}
      <Text style={[styles.recTitle, { color: colors.ink }]}>{rec.title}</Text>

      {/* Description */}
      <Text style={[styles.recDescription, { color: colors.inkSecondary }]}>
        {rec.description}
      </Text>

      {/* Expected outcome */}
      {rec.expected_outcome ? (
        <View
          style={[
            styles.outcomeCard,
            {
              backgroundColor: `rgba(39, 174, 96, 0.08)`,
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

      {/* Data sources */}
      {dataSources.length > 0 ? (
        <View style={styles.dataSourcesRow}>
          {dataSources.map((source, i) => (
            <View
              key={i}
              style={[styles.dataSourceTag, { backgroundColor: colors.surfaceInset }]}
            >
              <Text style={[styles.dataSourceText, { color: colors.inkMuted }]}>
                {source}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <Button
          title={isCompleting ? "..." : "Done"}
          variant="sm-primary"
          onPress={() => onComplete(rec.id)}
          disabled={isCompleting || isDismissing}
          style={styles.actionButton}
        />
        <Button
          title={isDismissing ? "..." : "Dismiss"}
          variant="sm-outline"
          onPress={() => onDismiss(rec.id)}
          disabled={isCompleting || isDismissing}
          style={styles.actionButton}
        />
      </View>
    </Card>
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
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  headerInfo: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },

  // -- Generate button --
  generateSection: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
  },
  generateButton: {
    width: "auto",
    alignSelf: "flex-start",
  },

  // -- Filter pills --
  filterSection: {
    paddingHorizontal: spacing.screenPadding,
  },

  // -- Section --
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.lg,
  },

  // -- Recommendation card --
  recCard: {
    marginBottom: 12,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
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

  // -- Expected outcome --
  outcomeCard: {
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

  // -- Data sources --
  dataSourcesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 10,
  },
  dataSourceTag: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  dataSourceText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.label,
  },

  // -- Action buttons --
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
  },
});
