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
import { stripMarkdown } from "../lib/stripMarkdown";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import Button from "../components/ui/Button";
import AppModal from "../components/ui/AppModal";

import { useBriefs, useLatestBrief } from "../hooks/useBriefs";
import { useActiveProject } from "../hooks/useProjects";
import { useGenerateBrief } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type { AIBrief, BriefSection } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTER_OPTIONS = ["All", "Daily", "Weekly", "Monthly"] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function briefTypeBadgeVariant(
  type: string
): "red" | "green" | "gold" | "blue" | "dark" {
  switch (type) {
    case "daily":
      return "blue";
    case "weekly":
      return "gold";
    case "monthly":
      return "red";
    case "on_demand":
      return "dark";
    default:
      return "dark";
  }
}

function sectionTypeBadgeVariant(
  type: BriefSection["type"]
): "red" | "green" | "gold" | "blue" | "dark" | "outline" {
  switch (type) {
    case "summary":
      return "dark";
    case "keywords":
    case "rankings":
      return "blue";
    case "backlinks":
    case "competitors":
      return "gold";
    case "visibility":
    case "predictions":
      return "green";
    case "technical":
    case "actions":
      return "red";
    case "entities":
      return "outline";
    default:
      return "dark";
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIBriefsScreen() {
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterOption>("All");
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set()
  );

  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const filterType = useMemo(() => {
    if (activeFilter === "All") return undefined;
    return activeFilter.toLowerCase() as "daily" | "weekly" | "monthly";
  }, [activeFilter]);

  const {
    data: briefs,
    isLoading: briefsLoading,
    refetch: refetchBriefs,
    isRefetching: isRefetchingBriefs,
  } = useBriefs(projectId, filterType);

  const {
    data: latestBrief,
    refetch: refetchLatest,
    isRefetching: isRefetchingLatest,
  } = useLatestBrief(projectId);

  const generateBrief = useGenerateBrief(projectId);

  const handleRefresh = useCallback(() => {
    refetchBriefs();
    refetchLatest();
  }, [refetchBriefs, refetchLatest]);

  const handleGenerateBrief = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating Brief",
      message: "Compiling comprehensive AI-generated SEO intelligence report...",
      variant: "loading",
    });
    generateBrief.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Brief Generated",
          message: "Your AI intelligence brief has been successfully generated. Pull to refresh to see it.",
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Brief Generation Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "error",
        });
      },
    });
  }, [generateBrief]);

  const toggleSection = useCallback((index: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // History: all briefs except the latest
  const briefHistory = useMemo(() => {
    if (!briefs || !latestBrief) return briefs ?? [];
    return briefs.filter((b) => b.id !== latestBrief.id);
  }, [briefs, latestBrief]);

  // --- Loading ---
  if (projectLoading || (briefsLoading && !briefs)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Intelligence Briefs" />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingBriefs || isRefetchingLatest}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            Comprehensive AI-generated SEO intelligence reports
          </Text>
        </View>

        <Divider />

        {/* Action Button */}
        <View style={styles.actionRow}>
          <Button
            title="Generate Brief"
            variant="sm-red"
            disabled={generateBrief.isPending}
            onPress={handleGenerateBrief}
          />
        </View>

        {/* Filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContainer}
        >
          {FILTER_OPTIONS.map((filter) => {
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

        {/* Body */}
        <View style={styles.body}>
          {/* ------------------------------------------------------------ */}
          {/* Latest Brief                                                  */}
          {/* ------------------------------------------------------------ */}
          {latestBrief ? (
            <>
              <SectionLabel text="Latest Brief" />
              <Card
                variant="highlighted"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: colors.red,
                }}
              >
                <View style={styles.latestHeader}>
                  <Badge
                    label={latestBrief.brief_type}
                    variant={briefTypeBadgeVariant(latestBrief.brief_type)}
                  />
                  <Text
                    style={[styles.latestDate, { color: colors.inkMuted }]}
                  >
                    {formatDate(latestBrief.created_at)}
                  </Text>
                </View>
                <Text
                  style={[styles.latestTitle, { color: colors.ink }]}
                  numberOfLines={2}
                >
                  {latestBrief.title}
                </Text>
                <Text
                  style={[
                    styles.latestSummary,
                    { color: colors.inkSecondary },
                  ]}
                  numberOfLines={4}
                >
                  {latestBrief.summary}
                </Text>
                <Text style={[styles.latestMeta, { color: colors.inkMuted }]}>
                  Generated by {latestBrief.generated_by}
                </Text>
              </Card>

              {/* -------------------------------------------------------- */}
              {/* Brief Sections                                            */}
              {/* -------------------------------------------------------- */}
              {latestBrief.sections && latestBrief.sections.length > 0 && (
                <>
                  <SectionLabel
                    text="Brief Sections"
                    style={styles.sectionSpacing}
                  />
                  {latestBrief.sections.map(
                    (section: BriefSection, index: number) => {
                      const isExpanded = expandedSections.has(index);
                      return (
                        <TouchableOpacity
                          key={`${section.title}-${index}`}
                          activeOpacity={0.7}
                          onPress={() => toggleSection(index)}
                        >
                          <Card variant="sm">
                            <View style={styles.sectionHeader}>
                              <Badge
                                label={section.type}
                                variant={sectionTypeBadgeVariant(section.type)}
                              />
                              <Text
                                style={[
                                  styles.expandIcon,
                                  { color: colors.inkMuted },
                                ]}
                              >
                                {isExpanded ? "\u25B2" : "\u25BC"}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.sectionTitle,
                                { color: colors.ink },
                              ]}
                            >
                              {section.title}
                            </Text>
                            {isExpanded && (
                              <Text
                                style={[
                                  styles.sectionContent,
                                  { color: colors.inkSecondary },
                                ]}
                              >
                                {stripMarkdown(section.content)}
                              </Text>
                            )}
                          </Card>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </>
              )}
            </>
          ) : (
            <EmptyState
              title="No Briefs Yet"
              message="AI briefs will appear here once your project has enough data for analysis."
            />
          )}

          {/* ------------------------------------------------------------ */}
          {/* Brief History                                                 */}
          {/* ------------------------------------------------------------ */}
          {briefHistory.length > 0 && (
            <>
              <SectionLabel
                text="Brief History"
                style={styles.sectionSpacing}
              />
              {briefHistory.map((brief: AIBrief) => (
                <Card key={brief.id} variant="sm">
                  <View style={styles.historyHeader}>
                    <Badge
                      label={brief.brief_type}
                      variant={briefTypeBadgeVariant(brief.brief_type)}
                    />
                    <Text
                      style={[
                        styles.historyDate,
                        { color: colors.inkMuted },
                      ]}
                    >
                      {formatDate(brief.created_at)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.historyTitle, { color: colors.ink }]}
                    numberOfLines={1}
                  >
                    {brief.title}
                  </Text>
                  <Text
                    style={[
                      styles.historySummary,
                      { color: colors.inkSecondary },
                    ]}
                    numberOfLines={2}
                  >
                    {truncate(brief.summary, 150)}
                  </Text>
                </Card>
              ))}
            </>
          )}
        </View>

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

  actionRow: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
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

  // Latest brief
  latestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  latestDate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  latestTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
    marginBottom: 6,
  },
  latestSummary: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  latestMeta: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },

  // Brief sections (expandable)
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  expandIcon: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    marginTop: 4,
  },
  sectionContent: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  // Brief history
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  historyDate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  historyTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    marginTop: 2,
  },
  historySummary: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  bottomSpacer: {
    height: 100,
  },
});
