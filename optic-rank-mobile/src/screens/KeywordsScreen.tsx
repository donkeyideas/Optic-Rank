import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import ScoreRing from "../components/ui/ScoreRing";
import KPIBox from "../components/ui/KPIBox";
import Divider from "../components/ui/Divider";
import SectionLabel from "../components/ui/SectionLabel";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";
import KeywordCard from "../components/keywords/KeywordCard";
import FilterPills from "../components/keywords/FilterPills";
import { useKeywords, useKeywordStats } from "../hooks/useKeywords";
import { useActiveProject } from "../hooks/useProjects";
import {
  useAddKeywords,
  useDeleteKeyword,
  useGenerateKeywordsAI,
  useEnrichKeywords,
} from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";
import { useOrganization } from "../hooks/useProfile";
import { useIntegrationSettings } from "../hooks/useQueries";
import type { Keyword } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["Rankings", "Traffic", "Share of Voice"] as const;
type Tab = (typeof TABS)[number];

const FILTER_OPTIONS = [
  "All",
  "Top 3",
  "Top 10",
  "Rising",
  "Falling",
  "SERP Features",
];

import { APP_CONFIG } from "../lib/config";
import { openURL } from "../lib/openURL";


// Position CTR approximation
const POSITION_CTR: Record<number, number> = {
  1: 0.3,
  2: 0.15,
  3: 0.1,
  4: 0.07,
  5: 0.05,
};

function getPositionCTR(position: number | null): number {
  if (position === null || position <= 0) return 0;
  if (position <= 5) return POSITION_CTR[position] ?? 0.05;
  if (position <= 10) return 0.03;
  if (position <= 20) return 0.02;
  return 0.01;
}

// Intent labels for display
const INTENT_LABELS: Record<string, string> = {
  informational: "Informational",
  transactional: "Transactional",
  navigational: "Navigational",
  commercial: "Commercial",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUpdatedTime(dateStr: string | null): string {
  if (!dateStr) return "never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function truncateUrl(url: string, maxLen: number = 40): string {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + "...";
}

// ---------------------------------------------------------------------------
// Traffic computation helpers
// ---------------------------------------------------------------------------

interface TrafficStats {
  estMonthlyTraffic: number;
  avgPosition: number;
  keywordsRanked: number;
  serpFeaturesCount: number;
}

function computeTrafficStats(keywords: Keyword[]): TrafficStats {
  let totalTraffic = 0;
  let positionSum = 0;
  let rankedCount = 0;
  let serpCount = 0;

  for (const kw of keywords) {
    if (kw.current_position !== null && kw.current_position > 0) {
      rankedCount++;
      positionSum += kw.current_position;
      const vol = kw.search_volume ?? 0;
      const ctr = getPositionCTR(kw.current_position);
      totalTraffic += vol * ctr;
    }
    if (kw.serp_features && kw.serp_features.length > 0) {
      serpCount++;
    }
  }

  return {
    estMonthlyTraffic: Math.round(totalTraffic),
    avgPosition: rankedCount > 0 ? positionSum / rankedCount : 0,
    keywordsRanked: rankedCount,
    serpFeaturesCount: serpCount,
  };
}

interface IntentGroup {
  intent: string;
  label: string;
  count: number;
  estTraffic: number;
}

function computeTrafficByIntent(keywords: Keyword[]): IntentGroup[] {
  const groups: Record<string, { count: number; traffic: number }> = {};

  for (const kw of keywords) {
    const intent = kw.intent ?? "unknown";
    if (!groups[intent]) {
      groups[intent] = { count: 0, traffic: 0 };
    }
    groups[intent].count++;
    if (kw.current_position !== null && kw.current_position > 0) {
      const vol = kw.search_volume ?? 0;
      const ctr = getPositionCTR(kw.current_position);
      groups[intent].traffic += vol * ctr;
    }
  }

  return Object.entries(groups)
    .map(([intent, data]) => ({
      intent,
      label: INTENT_LABELS[intent] ?? "Unknown",
      count: data.count,
      estTraffic: Math.round(data.traffic),
    }))
    .sort((a, b) => b.estTraffic - a.estTraffic);
}

interface PageGroup {
  url: string;
  keywordCount: number;
  estTraffic: number;
}

function computeTopPages(keywords: Keyword[]): PageGroup[] {
  const pages: Record<string, { count: number; traffic: number }> = {};

  for (const kw of keywords) {
    // Use any available URL/page field from keyword ranks
    const url = (kw as any).url || (kw as any).page || null;
    if (!url) continue;

    if (!pages[url]) {
      pages[url] = { count: 0, traffic: 0 };
    }
    pages[url].count++;
    if (kw.current_position !== null && kw.current_position > 0) {
      const vol = kw.search_volume ?? 0;
      const ctr = getPositionCTR(kw.current_position);
      pages[url].traffic += vol * ctr;
    }
  }

  return Object.entries(pages)
    .map(([url, data]) => ({
      url,
      keywordCount: data.count,
      estTraffic: Math.round(data.traffic),
    }))
    .sort((a, b) => b.estTraffic - a.estTraffic)
    .slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KeywordsScreen() {
  const { colors } = useTheme();
  const { data: project } = useActiveProject();

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("Rankings");

  // Rankings tab state
  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newKeywordsText, setNewKeywordsText] = useState("");

  // AppModal state
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    keyword: Keyword | null;
  }>({ visible: false, keyword: null });

  // Integration status — hide GA4 CTA if already connected
  const { data: org } = useOrganization();
  const { data: integrationSettings } = useIntegrationSettings(org?.id);
  const ga4Connected = !!integrationSettings?.ga4_property_id;

  // Mutations
  const addKeywordsMutation = useAddKeywords(project?.id);
  const deleteKeywordMutation = useDeleteKeyword();
  const generateKeywordsAIMutation = useGenerateKeywordsAI(project?.id);
  const enrichKeywordsMutation = useEnrichKeywords(project?.id);

  // Queries
  const {
    data: keywordsResult,
    isLoading: keywordsLoading,
    refetch: refetchKeywords,
    isRefetching: isRefetchingKeywords,
  } = useKeywords(project?.id, { search: searchText });

  const {
    data: stats,
    refetch: refetchStats,
    isRefetching: isRefetchingStats,
  } = useKeywordStats(project?.id);

  const keywords = keywordsResult?.data ?? [];

  // Client-side filtering based on active pill
  const filteredKeywords = useMemo(() => {
    return keywords.filter((kw: Keyword) => {
      switch (activeFilter) {
        case "Top 3":
          return kw.current_position !== null && kw.current_position <= 3;
        case "Top 10":
          return kw.current_position !== null && kw.current_position <= 10;
        case "Rising":
          return (
            kw.current_position !== null &&
            kw.previous_position !== null &&
            kw.current_position < kw.previous_position
          );
        case "Falling":
          return (
            kw.current_position !== null &&
            kw.previous_position !== null &&
            kw.current_position > kw.previous_position
          );
        case "SERP Features":
          return kw.serp_features && kw.serp_features.length > 0;
        case "All":
        default:
          return true;
      }
    });
  }, [keywords, activeFilter]);

  // Traffic tab computed data
  const trafficStats = useMemo(() => computeTrafficStats(keywords), [keywords]);
  const trafficByIntent = useMemo(
    () => computeTrafficByIntent(keywords),
    [keywords]
  );
  const topPages = useMemo(() => computeTopPages(keywords), [keywords]);

  const hasRankedKeywords = trafficStats.keywordsRanked > 0;

  // Share of Voice computed data
  const sovData = useMemo(() => {
    const kws = keywords ?? [];
    const total = kws.length;
    if (total === 0) return null;
    const top3 = kws.filter(
      (k) => k.current_position && k.current_position <= 3
    ).length;
    const top10 = kws.filter(
      (k) => k.current_position && k.current_position <= 10
    ).length;
    const top20 = kws.filter(
      (k) =>
        k.current_position &&
        k.current_position > 10 &&
        k.current_position <= 20
    ).length;
    const top50 = kws.filter(
      (k) =>
        k.current_position &&
        k.current_position > 20 &&
        k.current_position <= 50
    ).length;
    const below50 = kws.filter(
      (k) => !k.current_position || k.current_position > 50
    ).length;
    const sovPct = Math.round((top10 / total) * 100);
    return { total, top3, top10: top10 - top3, top20, top50, below50, sovPct };
  }, [keywords]);

  // Share of Voice — intent breakdown
  const sovIntentBreakdown = useMemo(() => {
    const kws = keywords ?? [];
    if (kws.length === 0) return [];
    const groups: Record<
      string,
      { count: number; positionSum: number; rankedCount: number }
    > = {};

    for (const kw of kws) {
      const intent = kw.intent ?? "unknown";
      if (!groups[intent]) {
        groups[intent] = { count: 0, positionSum: 0, rankedCount: 0 };
      }
      groups[intent].count++;
      if (kw.current_position !== null && kw.current_position > 0) {
        groups[intent].positionSum += kw.current_position;
        groups[intent].rankedCount++;
      }
    }

    return Object.entries(groups)
      .map(([intent, data]) => ({
        intent,
        label: INTENT_LABELS[intent] ?? "Unknown",
        count: data.count,
        avgPosition:
          data.rankedCount > 0
            ? Math.round((data.positionSum / data.rankedCount) * 10) / 10
            : null,
      }))
      .sort((a, b) => b.count - a.count);
  }, [keywords]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleRefresh = useCallback(() => {
    refetchKeywords();
    refetchStats();
  }, [refetchKeywords, refetchStats]);

  const handleOpenAddModal = useCallback(() => {
    setNewKeywordsText("");
    setAddModalVisible(true);
  }, []);

  const handleAddKeywords = useCallback(() => {
    const kws = newKeywordsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (kws.length === 0) {
      setModal({
        visible: true,
        title: "No Keywords",
        message: "Please enter at least one keyword.",
        variant: "error",
      });
      return;
    }

    addKeywordsMutation.mutate(kws, {
      onSuccess: () => {
        setAddModalVisible(false);
        setNewKeywordsText("");
        setModal({
          visible: true,
          title: "Keywords Added",
          message: `Successfully added ${kws.length} keyword${kws.length > 1 ? "s" : ""} to tracking.`,
          variant: "success",
        });
      },
      onError: (error: Error) => {
        setModal({
          visible: true,
          title: "Error",
          message: error.message || "Failed to add keywords. Please try again.",
          variant: "error",
        });
      },
    });
  }, [newKeywordsText, addKeywordsMutation]);

  const handleDeleteKeyword = useCallback((kw: Keyword) => {
    setDeleteModal({ visible: true, keyword: kw });
  }, []);

  const confirmDeleteKeyword = useCallback(() => {
    if (!deleteModal.keyword) return;
    const kw = deleteModal.keyword;
    setDeleteModal({ visible: false, keyword: null });
    deleteKeywordMutation.mutate(kw.id, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Keyword Deleted",
          message: `"${kw.keyword}" has been removed from tracking.`,
          variant: "success",
        });
      },
      onError: (error: Error) => {
        setModal({
          visible: true,
          title: "Error",
          message:
            error.message || "Failed to delete keyword. Please try again.",
          variant: "error",
        });
      },
    });
  }, [deleteModal.keyword, deleteKeywordMutation]);

  const handleGenerateAI = useCallback(() => {
    setModal({
      visible: true,
      title: "Generate",
      message: "Analyzing your domain and generating keyword suggestions...",
      variant: "loading",
    });

    generateKeywordsAIMutation.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Keywords Generated",
          message: `AI successfully generated ${data?.keywords?.length ?? 0} keyword suggestions from ${data?.source ?? "analysis"}.`,
          variant: "success",
        });
      },
      onError: (error: Error) => {
        setModal({
          visible: true,
          title: "Generation Failed",
          message:
            error.message || "Failed to generate keywords. Please try again.",
          variant: "error",
        });
      },
    });
  }, [generateKeywordsAIMutation]);

  const handleEnrichKeywords = useCallback(() => {
    setModal({
      visible: true,
      title: "Enriching Keywords",
      message:
        "Fetching search volume, CPC, difficulty, and intent data for all keywords...",
      variant: "loading",
    });

    enrichKeywordsMutation.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Keywords Enriched",
          message: `Successfully enriched ${data?.enriched ?? 0} keywords with search volume, CPC, difficulty, and intent data.`,
          variant: "success",
        });
      },
      onError: (error: Error) => {
        setModal({
          visible: true,
          title: "Enrichment Failed",
          message:
            error.message || "Failed to enrich keywords. Please try again.",
          variant: "error",
        });
      },
    });
  }, [enrichKeywordsMutation]);

  const openWebSettings = useCallback(() => {
    openURL(APP_CONFIG.WEB_SETTINGS_URL);
  }, []);

  // -----------------------------------------------------------------------
  // Loading / Guard
  // -----------------------------------------------------------------------

  if (keywordsLoading && !keywordsResult) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Keywords" />;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingKeywords || isRefetchingStats}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Track, Research & Optimize Your Keyword Portfolio
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="Generate"
              variant="sm-red"
              onPress={handleGenerateAI}
              disabled={generateKeywordsAIMutation.isPending}
              style={styles.headerButton}
            />
            <Button
              title="+ Add Keywords"
              variant="sm-red"
              onPress={handleOpenAddModal}
              style={styles.headerButton}
            />
            <Button
              title="Enrich"
              variant="sm-red"
              onPress={handleEnrichKeywords}
              disabled={enrichKeywordsMutation.isPending}
              style={styles.headerButton}
            />
          </View>
          <Text style={[styles.statsLine, { color: colors.inkMuted }]}>
            {stats?.total ?? 0} tracked · Updated{" "}
            {formatUpdatedTime(project?.last_rank_check ?? null)}
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
        {/* Rankings Tab                                                      */}
        {/* ================================================================ */}
        {activeTab === "Rankings" && (
          <>
            {/* Search input */}
            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search keywords..."
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

            {/* Filter Pills */}
            <View style={styles.pillsContainer}>
              <FilterPills
                filters={FILTER_OPTIONS}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />
            </View>

            {/* Keyword List */}
            <View style={styles.listContainer}>
              {filteredKeywords.length === 0 ? (
                <EmptyState
                  title="No keywords found"
                  message={
                    activeFilter !== "All"
                      ? `No keywords match the "${activeFilter}" filter.`
                      : "Add keywords to start tracking your rankings."
                  }
                />
              ) : (
                filteredKeywords.map((kw: Keyword) => (
                  <View key={kw.id} style={styles.keywordRow}>
                    <View style={styles.keywordCardWrapper}>
                      <KeywordCard keyword={kw} />
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteKeyword(kw)}
                      style={[
                        styles.deleteButton,
                        { backgroundColor: colors.red },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteIcon}>{"\u2715"}</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ================================================================ */}
        {/* Traffic Intelligence Tab                                          */}
        {/* ================================================================ */}
        {activeTab === "Traffic" && (
          <View style={styles.trafficContainer}>
            <Text style={[styles.trafficTitle, { color: colors.ink }]}>
              Traffic Intelligence
            </Text>
            <Text style={[styles.trafficSubtitle, { color: colors.inkMuted }]}>
              Estimated organic traffic based on keyword positions and search
              volume
            </Text>

            {!hasRankedKeywords ? (
              /* No ranked keywords — empty state */
              <View style={styles.trafficEmptyWrap}>
                <EmptyState
                  title="No traffic data yet"
                  message="Add keywords and let them get ranked to see traffic intelligence data."
                />
              </View>
            ) : (
              <>
                {/* KPI Boxes — 2x2 grid */}
                <View style={styles.kpiGrid}>
                  <View style={styles.kpiRow}>
                    <View style={styles.kpiCell}>
                      <KPIBox
                        value={formatNumber(trafficStats.estMonthlyTraffic)}
                        label="Est. Monthly Traffic"
                      />
                    </View>
                    <View style={styles.kpiCell}>
                      <KPIBox
                        value={trafficStats.avgPosition.toFixed(1)}
                        label="Avg Position"
                      />
                    </View>
                  </View>
                  <View style={styles.kpiRow}>
                    <View style={styles.kpiCell}>
                      <KPIBox
                        value={trafficStats.keywordsRanked.toString()}
                        label="Keywords Ranked"
                      />
                    </View>
                    <View style={styles.kpiCell}>
                      <KPIBox
                        value={trafficStats.serpFeaturesCount.toString()}
                        label="SERP Features"
                      />
                    </View>
                  </View>
                </View>

                {/* Traffic by Intent */}
                <SectionLabel
                  text="Traffic by Intent"
                  style={styles.sectionSpacing}
                />
                <Card>
                  {trafficByIntent.length === 0 ? (
                    <View style={styles.tablePlaceholder}>
                      <Text
                        style={[
                          styles.tablePlaceholderText,
                          { color: colors.inkMuted },
                        ]}
                      >
                        No intent data available. Enrich keywords to add intent
                        classification.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Table header */}
                      <View
                        style={[
                          styles.intentTableHeader,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.intentHeaderCell,
                            styles.intentLabelCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Intent
                        </Text>
                        <Text
                          style={[
                            styles.intentHeaderCell,
                            styles.intentNumCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Keywords
                        </Text>
                        <Text
                          style={[
                            styles.intentHeaderCell,
                            styles.intentNumCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Est. Traffic
                        </Text>
                      </View>
                      {trafficByIntent.map((group, idx) => (
                        <View
                          key={group.intent}
                          style={[
                            styles.intentRow,
                            idx > 0 && {
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.intentLabelCol}>
                            <Badge
                              label={group.label}
                              variant={
                                group.intent === "transactional"
                                  ? "green"
                                  : group.intent === "commercial"
                                    ? "gold"
                                    : group.intent === "navigational"
                                      ? "blue"
                                      : "dark"
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.intentCell,
                              styles.intentNumCol,
                              { color: colors.ink },
                            ]}
                          >
                            {group.count}
                          </Text>
                          <Text
                            style={[
                              styles.intentCell,
                              styles.intentNumCol,
                              { color: colors.ink },
                            ]}
                          >
                            {formatNumber(group.estTraffic)}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </Card>

                {/* Top Pages */}
                {topPages.length > 0 && (
                  <>
                    <SectionLabel
                      text="Top Pages"
                      style={styles.sectionSpacing}
                    />
                    <Card>
                      <View
                        style={[
                          styles.pagesTableHeader,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pagesHeaderCell,
                            styles.pagesUrlCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Page URL
                        </Text>
                        <Text
                          style={[
                            styles.pagesHeaderCell,
                            styles.pagesNumCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          KWs
                        </Text>
                        <Text
                          style={[
                            styles.pagesHeaderCell,
                            styles.pagesTrafficCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Est. Traffic
                        </Text>
                      </View>
                      {topPages.map((page, idx) => (
                        <View
                          key={page.url}
                          style={[
                            styles.pagesRow,
                            idx > 0 && {
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.pagesCell,
                              styles.pagesUrlCol,
                              { color: colors.ink },
                            ]}
                            numberOfLines={1}
                          >
                            {truncateUrl(page.url)}
                          </Text>
                          <Text
                            style={[
                              styles.pagesCell,
                              styles.pagesNumCol,
                              { color: colors.ink },
                            ]}
                          >
                            {page.keywordCount}
                          </Text>
                          <Text
                            style={[
                              styles.pagesCell,
                              styles.pagesTrafficCol,
                              { color: colors.ink },
                            ]}
                          >
                            {formatNumber(page.estTraffic)}
                          </Text>
                        </View>
                      ))}
                    </Card>
                  </>
                )}
              </>
            )}

            {/* Connect GA4 CTA — only shown if GA4 is not connected */}
            {!ga4Connected && (
              <>
                <SectionLabel
                  text="Real Traffic Data"
                  style={styles.sectionSpacing}
                />
                <Card>
                  <View style={styles.ctaCard}>
                    <View
                      style={[
                        styles.ctaIconBox,
                        { backgroundColor: colors.red },
                      ]}
                    >
                      <Text style={styles.ctaIconText}>GA4</Text>
                    </View>
                    <Text style={[styles.ctaTitle, { color: colors.ink }]}>
                      Connect Google Analytics
                    </Text>
                    <Text style={[styles.ctaDesc, { color: colors.inkMuted }]}>
                      Connect Google Analytics on the web dashboard for real traffic
                      data including sessions, pageviews, and conversion tracking.
                    </Text>
                    <Button
                      title="Open Web Dashboard"
                      variant="sm-red"
                      onPress={openWebSettings}
                      style={styles.ctaButton}
                    />
                  </View>
                </Card>
              </>
            )}
          </View>
        )}

        {/* ================================================================ */}
        {/* Share of Voice Tab                                                */}
        {/* ================================================================ */}
        {activeTab === "Share of Voice" && (
          <View style={styles.sovContainer}>
            <Text style={[styles.sovTitle, { color: colors.ink }]}>
              Share of Voice
            </Text>
            <Text style={[styles.sovSubtitle, { color: colors.inkMuted }]}>
              Keyword visibility across search result positions
            </Text>

            {!sovData ? (
              <View style={styles.sovEmptyWrap}>
                <EmptyState
                  title="No keyword data"
                  message="Add keywords to calculate your share of voice."
                />
              </View>
            ) : (
              <>
                {/* SOV Score Ring */}
                <View style={styles.sovScoreWrap}>
                  <ScoreRing
                    score={sovData.sovPct}
                    size={96}
                    status={
                      sovData.sovPct >= 50
                        ? "good"
                        : sovData.sovPct >= 20
                          ? "warn"
                          : "bad"
                    }
                  />
                  <Text
                    style={[styles.sovScoreLabel, { color: colors.inkMuted }]}
                  >
                    Top 10 Visibility
                  </Text>
                  <Text
                    style={[styles.sovScoreDetail, { color: colors.inkMuted }]}
                  >
                    {sovData.top3 + sovData.top10} of {sovData.total} keywords
                    in top 10
                  </Text>
                </View>

                {/* Position Distribution */}
                <SectionLabel
                  text="Position Distribution"
                  style={styles.sectionSpacing}
                />
                <View style={styles.sovBucketGrid}>
                  {/* Top 3 */}
                  <Card>
                    <View style={styles.sovBucketCard}>
                      <View
                        style={[
                          styles.sovBucketDot,
                          { backgroundColor: colors.green },
                        ]}
                      />
                      <Text
                        style={[
                          styles.sovBucketLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Top 3
                      </Text>
                      <Text
                        style={[
                          styles.sovBucketValue,
                          { color: colors.green },
                        ]}
                      >
                        {sovData.top3}
                      </Text>
                      <Text
                        style={[
                          styles.sovBucketPct,
                          { color: colors.inkMuted },
                        ]}
                      >
                        {sovData.total > 0
                          ? Math.round((sovData.top3 / sovData.total) * 100)
                          : 0}
                        %
                      </Text>
                    </View>
                  </Card>

                  {/* Top 10 (positions 4-10) */}
                  <Card>
                    <View style={styles.sovBucketCard}>
                      <View
                        style={[
                          styles.sovBucketDot,
                          { backgroundColor: colors.green },
                        ]}
                      />
                      <Text
                        style={[
                          styles.sovBucketLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Top 10
                      </Text>
                      <Text
                        style={[
                          styles.sovBucketValue,
                          { color: colors.green },
                        ]}
                      >
                        {sovData.top10}
                      </Text>
                      <Text
                        style={[
                          styles.sovBucketPct,
                          { color: colors.inkMuted },
                        ]}
                      >
                        {sovData.total > 0
                          ? Math.round((sovData.top10 / sovData.total) * 100)
                          : 0}
                        %
                      </Text>
                    </View>
                  </Card>

                  {/* Top 20 (positions 11-20) */}
                  <Card>
                    <View style={styles.sovBucketCard}>
                      <View
                        style={[
                          styles.sovBucketDot,
                          { backgroundColor: colors.gold },
                        ]}
                      />
                      <Text
                        style={[
                          styles.sovBucketLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Top 20
                      </Text>
                      <Text
                        style={[styles.sovBucketValue, { color: colors.gold }]}
                      >
                        {sovData.top20}
                      </Text>
                      <Text
                        style={[
                          styles.sovBucketPct,
                          { color: colors.inkMuted },
                        ]}
                      >
                        {sovData.total > 0
                          ? Math.round((sovData.top20 / sovData.total) * 100)
                          : 0}
                        %
                      </Text>
                    </View>
                  </Card>

                  {/* Top 50 (positions 21-50) */}
                  <Card>
                    <View style={styles.sovBucketCard}>
                      <View
                        style={[
                          styles.sovBucketDot,
                          { backgroundColor: colors.gold },
                        ]}
                      />
                      <Text
                        style={[
                          styles.sovBucketLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Top 50
                      </Text>
                      <Text
                        style={[styles.sovBucketValue, { color: colors.gold }]}
                      >
                        {sovData.top50}
                      </Text>
                      <Text
                        style={[
                          styles.sovBucketPct,
                          { color: colors.inkMuted },
                        ]}
                      >
                        {sovData.total > 0
                          ? Math.round((sovData.top50 / sovData.total) * 100)
                          : 0}
                        %
                      </Text>
                    </View>
                  </Card>

                  {/* Below 50 / Unranked */}
                  <Card>
                    <View style={styles.sovBucketCard}>
                      <View
                        style={[
                          styles.sovBucketDot,
                          { backgroundColor: colors.red },
                        ]}
                      />
                      <Text
                        style={[
                          styles.sovBucketLabel,
                          { color: colors.inkMuted },
                        ]}
                      >
                        50+ / Unranked
                      </Text>
                      <Text
                        style={[styles.sovBucketValue, { color: colors.red }]}
                      >
                        {sovData.below50}
                      </Text>
                      <Text
                        style={[
                          styles.sovBucketPct,
                          { color: colors.inkMuted },
                        ]}
                      >
                        {sovData.total > 0
                          ? Math.round((sovData.below50 / sovData.total) * 100)
                          : 0}
                        %
                      </Text>
                    </View>
                  </Card>
                </View>

                {/* Keyword Intent Breakdown */}
                <SectionLabel
                  text="Keyword Intent Breakdown"
                  style={styles.sectionSpacing}
                />
                <Card>
                  {sovIntentBreakdown.length === 0 ? (
                    <View style={styles.tablePlaceholder}>
                      <Text
                        style={[
                          styles.tablePlaceholderText,
                          { color: colors.inkMuted },
                        ]}
                      >
                        No intent data available. Enrich keywords to add intent
                        classification.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Table header */}
                      <View
                        style={[
                          styles.sovIntentHeader,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sovIntentHeaderCell,
                            styles.sovIntentLabelCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Intent
                        </Text>
                        <Text
                          style={[
                            styles.sovIntentHeaderCell,
                            styles.sovIntentNumCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Count
                        </Text>
                        <Text
                          style={[
                            styles.sovIntentHeaderCell,
                            styles.sovIntentNumCol,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Avg Pos
                        </Text>
                      </View>
                      {sovIntentBreakdown.map((group, idx) => (
                        <View
                          key={group.intent}
                          style={[
                            styles.sovIntentRow,
                            idx > 0 && {
                              borderTopWidth: StyleSheet.hairlineWidth,
                              borderTopColor: colors.border,
                            },
                          ]}
                        >
                          <View style={styles.sovIntentLabelCol}>
                            <Badge
                              label={group.label}
                              variant={
                                group.intent === "transactional"
                                  ? "green"
                                  : group.intent === "commercial"
                                    ? "gold"
                                    : group.intent === "navigational"
                                      ? "blue"
                                      : "dark"
                              }
                            />
                          </View>
                          <Text
                            style={[
                              styles.sovIntentCell,
                              styles.sovIntentNumCol,
                              { color: colors.ink },
                            ]}
                          >
                            {group.count}
                          </Text>
                          <Text
                            style={[
                              styles.sovIntentCell,
                              styles.sovIntentNumCol,
                              {
                                color:
                                  group.avgPosition !== null
                                    ? group.avgPosition <= 10
                                      ? colors.green
                                      : group.avgPosition <= 20
                                        ? colors.gold
                                        : colors.red
                                    : colors.inkMuted,
                              },
                            ]}
                          >
                            {group.avgPosition !== null
                              ? group.avgPosition.toFixed(1)
                              : "\u2014"}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                </Card>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* ================================================================== */}
      {/* Add Keywords Modal                                                  */}
      {/* ================================================================== */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.modalTitle, { color: colors.ink }]}>
              Add Keywords
            </Text>
            <Text style={[styles.modalHint, { color: colors.inkMuted }]}>
              Enter keywords, one per line
            </Text>
            <TextInput
              multiline
              numberOfLines={6}
              placeholder={"best seo tools\nkeyword tracker\nrank monitoring"}
              placeholderTextColor={colors.inkMuted}
              value={newKeywordsText}
              onChangeText={setNewKeywordsText}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceInset,
                  borderColor: colors.border,
                  color: colors.ink,
                },
              ]}
              autoFocus
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="sm-outline"
                onPress={() => setAddModalVisible(false)}
                style={styles.modalButton}
              />
              <Button
                title={
                  addKeywordsMutation.isPending ? "Adding..." : "Add Keywords"
                }
                variant="sm-red"
                onPress={handleAddKeywords}
                disabled={addKeywordsMutation.isPending}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* General AppModal for feedback */}
      <AppModal
        visible={modal.visible}
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        loading={modal.variant === "loading"}
        loadingText={modal.variant === "loading" ? modal.message : undefined}
      />

      {/* Delete Confirmation AppModal */}
      <AppModal
        visible={deleteModal.visible}
        onClose={() => setDeleteModal({ visible: false, keyword: null })}
        title="Delete Keyword"
        message={`Remove "${deleteModal.keyword?.keyword ?? ""}" from tracking?`}
        variant="confirm"
        buttons={[
          {
            label: "Cancel",
            onPress: () => setDeleteModal({ visible: false, keyword: null }),
            variant: "outline",
          },
          {
            label: "Delete",
            onPress: confirmDeleteKeyword,
            variant: "red",
          },
        ]}
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

  // Header
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  headerTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.xl,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  headerButton: {
    width: "auto",
  },
  statsLine: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 8,
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: spacing.screenPadding,
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

  // Search
  searchContainer: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
  },
  searchInput: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 0,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },

  // Filter Pills
  pillsContainer: {
    paddingHorizontal: spacing.screenPadding,
  },

  // Keyword List
  listContainer: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: 4,
  },
  keywordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  keywordCardWrapper: {
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  deleteIcon: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fonts.sansBold,
  },

  // Traffic Tab
  trafficContainer: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
  },
  trafficTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
    marginBottom: 4,
  },
  trafficSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  trafficEmptyWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionSpacing: {
    marginTop: spacing.lg,
  },

  // KPI Grid
  kpiGrid: {
    gap: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
  },
  kpiCell: {
    flex: 1,
  },

  // Intent Table
  intentTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 4,
  },
  intentHeaderCell: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  intentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  intentCell: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  intentLabelCol: {
    flex: 1,
    paddingRight: 8,
  },
  intentNumCol: {
    width: 80,
    textAlign: "right",
  },

  // Pages Table
  pagesTableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 4,
  },
  pagesHeaderCell: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pagesRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  pagesCell: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  pagesUrlCol: {
    flex: 1,
    paddingRight: 8,
  },
  pagesNumCol: {
    width: 40,
    textAlign: "right",
  },
  pagesTrafficCol: {
    width: 80,
    textAlign: "right",
    fontFamily: fonts.mono,
  },

  // CTA Card
  ctaCard: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  ctaIconBox: {
    width: 48,
    height: 48,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  ctaIconText: {
    color: "#ffffff",
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: "700",
  },
  ctaTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
    textAlign: "center",
    marginBottom: 8,
  },
  ctaDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  ctaButton: {
    width: "auto",
  },

  // Placeholder
  tablePlaceholder: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  tablePlaceholderText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },

  // Modals (shared)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screenPadding,
  },
  modalContent: {
    width: "100%",
    padding: spacing.lg,
  },
  modalTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
    marginBottom: 4,
  },
  modalHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    minHeight: 120,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  modalButton: {
    width: "auto",
  },

  // Share of Voice Tab
  sovContainer: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
  },
  sovTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
    marginBottom: 4,
  },
  sovSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  sovEmptyWrap: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sovScoreWrap: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  sovScoreLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  sovScoreDetail: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 4,
  },
  sovBucketGrid: {
    gap: 8,
  },
  sovBucketCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  sovBucketDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sovBucketLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    flex: 1,
  },
  sovBucketValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
    width: 48,
    textAlign: "right",
  },
  sovBucketPct: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    width: 48,
    textAlign: "right",
  },

  // SOV Intent Table
  sovIntentHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 4,
  },
  sovIntentHeaderCell: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sovIntentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  sovIntentCell: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  sovIntentLabelCol: {
    flex: 1,
    paddingRight: 8,
  },
  sovIntentNumCol: {
    width: 64,
    textAlign: "right",
  },
});
