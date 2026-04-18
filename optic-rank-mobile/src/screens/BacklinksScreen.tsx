import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import KPIBox from "../components/ui/KPIBox";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import LoadingScreen from "../components/ui/LoadingScreen";
import EmptyState from "../components/ui/EmptyState";
import FilterPills from "../components/keywords/FilterPills";
import AppModal from "../components/ui/AppModal";

import { useBacklinks } from "../hooks/useBacklinksDetail";
import { useBacklinkStats } from "../hooks/useBacklinks";
import { useActiveProject } from "../hooks/useProjects";
import { useDisavowBacklink, useDiscoverBacklinks, useDiscoverBrokenLinkOpportunities } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type { Backlink } from "../types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_PADDING = spacing.screenPadding;

const FILTER_OPTIONS = ["All", "Active", "New", "Lost", "Dofollow", "Nofollow"];

const TABS = ["Backlinks", "Link Building"] as const;
type TabName = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function linkTypeBadgeVariant(
  type: string
): "dark" | "green" | "gold" | "outline" | "blue" {
  switch (type) {
    case "dofollow":
      return "green";
    case "nofollow":
      return "outline";
    case "ugc":
      return "gold";
    case "sponsored":
      return "blue";
    default:
      return "dark";
  }
}

function statusBadgeVariant(
  status: string
): "green" | "red" | "gold" {
  switch (status) {
    case "active":
      return "green";
    case "lost":
      return "red";
    case "new":
      return "gold";
    default:
      return "gold";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BacklinksScreen() {
  const { colors } = useTheme();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const [activeTab, setActiveTab] = useState<TabName>("Backlinks");
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

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

  // Mutations
  const discoverBacklinks = useDiscoverBacklinks(projectId);
  const discoverBrokenLinks = useDiscoverBrokenLinkOpportunities(projectId);

  // Build query options from filter
  const queryOpts = useMemo(() => {
    const opts: {
      search?: string;
      linkType?: "dofollow" | "nofollow" | "ugc" | "sponsored";
      status?: "active" | "lost" | "new";
    } = {};
    if (searchText) opts.search = searchText;
    if (activeFilter === "Dofollow") opts.linkType = "dofollow";
    if (activeFilter === "Nofollow") opts.linkType = "nofollow";
    if (activeFilter === "Active") opts.status = "active";
    if (activeFilter === "New") opts.status = "new";
    if (activeFilter === "Lost") opts.status = "lost";
    return opts;
  }, [searchText, activeFilter]);

  const {
    data: backlinksResult,
    isLoading: backlinksLoading,
    refetch: refetchBacklinks,
    isRefetching: isRefetchingBacklinks,
  } = useBacklinks(projectId, queryOpts);

  const {
    data: stats,
    refetch: refetchStats,
    isRefetching: isRefetchingStats,
  } = useBacklinkStats(projectId);

  const backlinks = backlinksResult?.data ?? [];
  const totalCount = backlinksResult?.count ?? 0;

  const safeStats = stats ?? {
    total: 0,
    referringDomains: 0,
    dofollowPct: 0,
    toxicCount: 0,
    newThisWeek: 0,
  };

  const handleRefresh = useCallback(() => {
    refetchBacklinks();
    refetchStats();
  }, [refetchBacklinks, refetchStats]);

  const handleDiscoverBacklinks = useCallback(() => {
    setModal({
      visible: true,
      title: "Discovering Backlinks",
      message: "Discovering backlinks... This may take a minute.",
      variant: "loading",
    });
    discoverBacklinks.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Backlinks Discovered",
          message: `Successfully discovered ${data?.discovered ?? 0} new backlinks from ${data?.crawled ?? 0} pages crawled.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Discovery Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred while discovering backlinks.",
          variant: "error",
        });
      },
    });
  }, [discoverBacklinks]);

  const handleDiscoverBrokenLinks = useCallback(() => {
    setModal({
      visible: true,
      title: "Discovering Opportunities",
      message: "Scanning for broken link building opportunities...",
      variant: "loading",
    });
    discoverBrokenLinks.mutate(undefined, {
      onSuccess: (d) => {
        setModal({
          visible: true,
          title: "Opportunities Found",
          message: `Discovered ${d?.opportunities ?? 0} broken link building opportunities.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Discovery Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred while discovering broken link opportunities.",
          variant: "error",
        });
      },
    });
  }, [discoverBrokenLinks]);

  // --- Loading state ---
  if (projectLoading || (backlinksLoading && !backlinksResult)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Backlinks" />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingBacklinks || isRefetchingStats}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            Monitor & Build Your Link Profile
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="Discover"
              variant="sm-red"
              onPress={handleDiscoverBacklinks}
              disabled={discoverBacklinks.isPending}
              style={styles.headerButton}
            />
          </View>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            {formatNumber(safeStats.total)} total backlinks ·{" "}
            {formatNumber(safeStats.referringDomains)} referring domains
          </Text>
        </View>

        <Divider />

        {/* Tab Bar */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={[
                  styles.tabItem,
                  isActive && {
                    borderBottomWidth: 2,
                    borderBottomColor: colors.red,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? colors.ink : colors.inkMuted,
                      fontFamily: isActive ? fonts.sansBold : fonts.sans,
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================================================================ */}
        {/* Backlinks Tab                                                     */}
        {/* ================================================================ */}
        {activeTab === "Backlinks" && (
          <>
            {/* ---------------------------------------------------------------- */}
            {/* Stats KPI Grid                                                    */}
            {/* ---------------------------------------------------------------- */}
            <View style={styles.section}>
              <SectionLabel text="Link Profile" />
              <View style={styles.kpiGrid}>
                <View style={styles.kpiCell}>
                  <KPIBox
                    value={formatNumber(safeStats.total)}
                    label="Total"
                  />
                </View>
                <View style={styles.kpiCell}>
                  <KPIBox
                    value={formatNumber(safeStats.referringDomains)}
                    label="Ref. Domains"
                  />
                </View>
                <View style={styles.kpiCell}>
                  <KPIBox
                    value={`${Math.round(safeStats.dofollowPct)}%`}
                    label="Dofollow"
                    deltaType={safeStats.dofollowPct >= 50 ? "up" : "neutral"}
                  />
                </View>
                <View style={styles.kpiCell}>
                  <KPIBox
                    value={String(safeStats.toxicCount)}
                    label="Toxic"
                    deltaType={safeStats.toxicCount > 0 ? "down" : "neutral"}
                  />
                </View>
                <View style={styles.kpiCell}>
                  <KPIBox
                    value={formatNumber(safeStats.newThisWeek)}
                    label="New This Week"
                    delta={
                      safeStats.newThisWeek > 0
                        ? `+${safeStats.newThisWeek}`
                        : undefined
                    }
                    deltaType={safeStats.newThisWeek > 0 ? "up" : "neutral"}
                  />
                </View>
              </View>
            </View>

            {/* ---------------------------------------------------------------- */}
            {/* Search & Filters                                                  */}
            {/* ---------------------------------------------------------------- */}
            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search backlinks..."
                placeholderTextColor={colors.inkMuted}
                value={searchText}
                onChangeText={setSearchText}
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.surfaceInset,
                    borderColor: colors.border,
                    color: colors.ink,
                  },
                ]}
              />
            </View>

            <View style={styles.pillsContainer}>
              <FilterPills
                filters={FILTER_OPTIONS}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </View>

            {/* ---------------------------------------------------------------- */}
            {/* Backlink List                                                      */}
            {/* ---------------------------------------------------------------- */}
            <View style={styles.section}>
              <SectionLabel
                text={`${totalCount} Results`}
              />
              {backlinks.length === 0 ? (
                <EmptyState
                  title="No backlinks found"
                  message={
                    searchText || activeFilter !== "All"
                      ? "Try adjusting your search or filters."
                      : "Backlink data will appear after your first analysis."
                  }
                />
              ) : (
                backlinks.map((bl: Backlink, index: number) => (
                  <Card key={bl.id} variant="sm">
                    {/* Top row: domain + status */}
                    <View style={styles.blTopRow}>
                      <Text
                        style={[styles.blDomain, { color: colors.ink }]}
                        numberOfLines={1}
                      >
                        {bl.source_domain}
                      </Text>
                      <Badge
                        label={bl.status}
                        variant={statusBadgeVariant(bl.status)}
                      />
                    </View>

                    {/* Anchor text */}
                    <Text
                      style={[styles.blAnchor, { color: colors.inkSecondary }]}
                      numberOfLines={1}
                    >
                      {bl.anchor_text || "(no anchor)"}
                    </Text>

                    {/* Metrics row */}
                    <View style={styles.blMetricsRow}>
                      <Badge
                        label={bl.link_type}
                        variant={linkTypeBadgeVariant(bl.link_type)}
                      />
                      <View style={styles.blMetric}>
                        <Text style={[styles.blMetricLabel, { color: colors.inkMuted }]}>
                          DA
                        </Text>
                        <Text style={[styles.blMetricValue, { color: colors.ink }]}>
                          {bl.domain_authority ?? "--"}
                        </Text>
                      </View>
                      <View style={styles.blMetric}>
                        <Text style={[styles.blMetricLabel, { color: colors.inkMuted }]}>
                          TF
                        </Text>
                        <Text style={[styles.blMetricValue, { color: colors.ink }]}>
                          {bl.trust_flow ?? "--"}
                        </Text>
                      </View>
                      {bl.is_toxic && (
                        <Badge label="TOXIC" variant="red" />
                      )}
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        )}

        {/* ================================================================ */}
        {/* Link Building Tab                                                 */}
        {/* ================================================================ */}
        {activeTab === "Link Building" && (
          <>
            <View style={styles.section}>
              <SectionLabel text="Broken Link Building" />
              <Text style={[styles.linkBuildingDesc, { color: colors.inkSecondary }]}>
                Discover broken link opportunities on competitor and authority sites to build high-quality backlinks.
              </Text>
              <Button
                title="Discover Opportunities"
                variant="sm-red"
                onPress={handleDiscoverBrokenLinks}
                disabled={discoverBrokenLinks.isPending}
                style={styles.linkBuildingButton}
              />
            </View>

            <View style={styles.section}>
              <EmptyState
                title="No broken link opportunities yet"
                message="Run discovery to find broken links on authority sites that you can replace with your content."
              />
            </View>
          </>
        )}

        {/* Bottom spacer for tab bar clearance */}
        <View style={styles.bottomSpacer} />
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
  headerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  headerButton: {
    width: "auto",
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 8,
  },

  // -- Tab Bar --
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: SCREEN_PADDING,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 4,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.8,
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

  // -- Search --
  searchContainer: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: spacing.md,
  },
  searchInput: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 0,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },

  // -- Filter pills --
  pillsContainer: {
    paddingHorizontal: SCREEN_PADDING,
  },

  // -- Backlink card --
  blTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  blDomain: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: 8,
  },
  blAnchor: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
    fontStyle: "italic",
  },
  blMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  blMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  blMetricLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  blMetricValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },

  // -- Link Building --
  linkBuildingDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  linkBuildingButton: {
    width: "auto",
    alignSelf: "flex-start",
  },

  // -- Bottom spacer --
  bottomSpacer: {
    height: 100,
  },
});
