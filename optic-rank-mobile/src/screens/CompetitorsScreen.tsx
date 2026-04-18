import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Divider from "../components/ui/Divider";
import SectionLabel from "../components/ui/SectionLabel";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";
import CompetitorCard from "../components/competitors/CompetitorCard";
import { useActiveProject } from "../hooks/useProjects";
import { useCompetitors } from "../hooks/useCompetitors";
import { useBacklinkStats } from "../hooks/useBacklinks";
import { useNavigation } from "@react-navigation/native";
import {
  useAddCompetitor,
  useGenerateCompetitorsAI,
  useAnalyzeCompetitorPages,
  useAnalyzeCompetitorPPC,
} from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = ["Overview", "Site Explorer", "PPC Intel"] as const;
type TabName = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "--";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function CompetitorsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const {
    data: competitors,
    isLoading: competitorsLoading,
    refetch: refetchCompetitors,
    isRefetching: isRefetchingCompetitors,
  } = useCompetitors(project?.id);
  const {
    data: backlinkStats,
    refetch: refetchBacklinks,
    isRefetching: isRefetchingBacklinks,
  } = useBacklinkStats(project?.id);

  const addCompetitorMutation = useAddCompetitor(project?.id);
  const generateCompetitorsAIMutation = useGenerateCompetitorsAI(project?.id);
  const analyzePagesMutation = useAnalyzeCompetitorPages(project?.id);
  const analyzePPCMutation = useAnalyzeCompetitorPPC(project?.id);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabName>("Overview");

  // Site Explorer state
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [pagesResult, setPagesResult] = useState<Record<string, unknown>[] | null>(null);

  // PPC Intel state
  const [ppcResult, setPpcResult] = useState<Record<string, unknown> | null>(null);

  // AppModal state
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  // Add Competitor modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newDomain, setNewDomain] = useState("");

  const handleAddCompetitor = useCallback(() => {
    setNewDomain("");
    setAddModalVisible(true);
  }, []);

  const confirmAddCompetitor = useCallback(() => {
    const domain = newDomain.trim();
    if (!domain) {
      setModal({
        visible: true,
        title: "No Domain",
        message: "Please enter a competitor domain.",
        variant: "error",
      });
      return;
    }

    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    setAddModalVisible(false);
    setNewDomain("");

    addCompetitorMutation.mutate(
      { name: cleanDomain, domain: cleanDomain },
      {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "Competitor Added",
            message: `Successfully added "${cleanDomain}" to your competitor watch list.`,
            variant: "success",
          });
        },
        onError: (error: Error) => {
          setModal({
            visible: true,
            title: "Error",
            message: error.message || "Failed to add competitor. Please try again.",
            variant: "error",
          });
        },
      }
    );
  }, [newDomain, addCompetitorMutation]);

  const handleGenerateAI = useCallback(() => {
    setModal({
      visible: true,
      title: "AI Discover",
      message: "Analyzing your niche and discovering competitors...",
      variant: "loading",
    });

    generateCompetitorsAIMutation.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Competitors Discovered",
          message: `AI discovered ${data?.added ?? 0} new competitors from ${data?.source ?? "analysis"}.`,
          variant: "success",
        });
      },
      onError: (error: Error) => {
        setModal({
          visible: true,
          title: "Discovery Failed",
          message: error.message || "Failed to discover competitors. Please try again.",
          variant: "error",
        });
      },
    });
  }, [generateCompetitorsAIMutation]);

  // Site Explorer: analyze competitor pages
  const handleAnalyzePages = useCallback(() => {
    if (!selectedCompetitorId) return;
    setModal({
      visible: true,
      title: "Analyzing Pages",
      message: "Crawling and analyzing competitor pages...",
      variant: "loading",
    });

    analyzePagesMutation.mutate(selectedCompetitorId, {
      onSuccess: (data) => {
        setPagesResult(data?.pages ?? []);
        setModal({
          visible: true,
          title: "Analysis Complete",
          message: `Found ${data?.pages?.length ?? 0} pages to analyze.`,
          variant: "success",
        });
      },
      onError: (error: Error) => {
        setModal({
          visible: true,
          title: "Analysis Failed",
          message: error.message || "Failed to analyze competitor pages.",
          variant: "error",
        });
      },
    });
  }, [selectedCompetitorId, analyzePagesMutation]);

  // PPC Intel: analyze competitor PPC
  const handleAnalyzePPC = useCallback(() => {
    setModal({
      visible: true,
      title: "Analyzing PPC",
      message: "Gathering paid search intelligence...",
      variant: "loading",
    });

    analyzePPCMutation.mutate(undefined, {
      onSuccess: (data) => {
        setPpcResult(data?.data ?? null);
        setModal({
          visible: true,
          title: "PPC Analysis Complete",
          message: "Competitor PPC intelligence is ready.",
          variant: "success",
        });
      },
      onError: (error: Error) => {
        setModal({
          visible: true,
          title: "PPC Analysis Failed",
          message: error.message || "Failed to analyze competitor PPC data.",
          variant: "error",
        });
      },
    });
  }, [analyzePPCMutation]);

  const handleRefresh = useCallback(() => {
    refetchCompetitors();
    refetchBacklinks();
  }, [refetchCompetitors, refetchBacklinks]);

  if (projectLoading || (competitorsLoading && !competitors)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Competitors" />;

  const competitorCount = competitors?.length ?? 0;
  const authorityScore = project?.authority_score;
  const scoreColor =
    authorityScore !== null && authorityScore !== undefined
      ? colors.red
      : colors.inkMuted;

  const selectedCompetitor = competitors?.find(
    (c) => c.id === selectedCompetitorId
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingCompetitors || isRefetchingBacklinks}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            Monitor, analyze, and outmaneuver your competition
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="Discover"
              variant="sm-red"
              onPress={handleGenerateAI}
              disabled={generateCompetitorsAIMutation.isPending}
              style={styles.headerButton}
            />
            <Button
              title="+ Add Competitor"
              variant="sm-red"
              onPress={handleAddCompetitor}
              style={styles.headerButton}
            />
          </View>
          <Text style={[styles.statsLine, { color: colors.inkMuted }]}>
            {competitorCount} tracked competitors · AI discovery available
          </Text>
        </View>

        <Divider />

        {/* ---------------------------------------------------------------- */}
        {/* Tab Pills                                                         */}
        {/* ---------------------------------------------------------------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={[
                  styles.tabPill,
                  isActive
                    ? { backgroundColor: colors.ink }
                    : {
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isActive ? colors.surface : colors.inkSecondary },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ---------------------------------------------------------------- */}
        {/* Overview Tab                                                      */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Overview" && (
          <>
            {/* Your Site section */}
            <View style={styles.section}>
              <SectionLabel text="YOUR SITE" />
              <Card variant="highlighted">
                <View style={styles.yourSiteHeader}>
                  <View style={styles.yourSiteLeft}>
                    <Text
                      style={[styles.yourSiteDomain, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {project?.domain ?? "No domain set"}
                    </Text>
                    <Text style={[styles.yourSiteLabel, { color: colors.inkMuted }]}>
                      Authority Score
                    </Text>
                  </View>
                  <Text style={[styles.yourSiteScore, { color: scoreColor }]}>
                    {authorityScore ?? "--"}
                  </Text>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={[styles.metricValue, { color: colors.ink }]}>
                      --
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.inkMuted }]}>
                      Traffic
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={[styles.metricValue, { color: colors.ink }]}>
                      --
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.inkMuted }]}>
                      Keywords
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={[styles.metricValue, { color: colors.ink }]}>
                      {formatNumber(backlinkStats?.total ?? null)}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.inkMuted }]}>
                      Backlinks
                    </Text>
                  </View>
                </View>
              </Card>
            </View>

            {/* Competitor Watch section */}
            <View style={styles.section}>
              <SectionLabel text="COMPETITOR WATCH" />
              {competitorCount === 0 ? (
                <EmptyState
                  title="No competitors yet"
                  message="Add competitors to track their rankings and compare performance."
                />
              ) : (
                competitors?.map((comp) => (
                  <CompetitorCard key={comp.id} competitor={comp} />
                ))
              )}
            </View>

            {/* AI Discovery card */}
            <View style={styles.section}>
              <Card
                style={[
                  styles.discoveryCard,
                  {
                    borderColor: colors.gold,
                    backgroundColor: "rgba(184, 134, 11, 0.05)",
                  },
                ]}
              >
                <Text style={[styles.discoveryTitle, { color: colors.ink }]}>
                  AI Competitor Discovery
                </Text>
                <Text style={[styles.discoveryDescription, { color: colors.inkMuted }]}>
                  Let AI analyze your niche and discover competitors you may not be
                  tracking. Our algorithms scan SERP overlaps and content similarity
                  to find your true competitors.
                </Text>
                <Button
                  title="Discover Competitors"
                  variant="sm-red"
                  onPress={handleGenerateAI}
                  disabled={generateCompetitorsAIMutation.isPending}
                  style={[styles.discoveryButton, { backgroundColor: colors.gold }]}
                />
              </Card>
            </View>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Site Explorer Tab                                                 */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Site Explorer" && (
          <>
            <View style={styles.section}>
              <SectionLabel text="SELECT COMPETITOR" />
              {competitorCount === 0 ? (
                <EmptyState
                  title="No competitors to explore"
                  message="Add competitors from the Overview tab first, then return here to analyze their pages."
                />
              ) : (
                <>
                  {competitors?.map((comp) => {
                    const isSelected = comp.id === selectedCompetitorId;
                    return (
                      <TouchableOpacity
                        key={comp.id}
                        activeOpacity={0.7}
                        onPress={() =>
                          setSelectedCompetitorId(
                            isSelected ? null : comp.id
                          )
                        }
                      >
                        <Card
                          style={[
                            styles.selectableCard,
                            isSelected && {
                              borderColor: colors.red,
                              borderWidth: 2,
                            },
                            !isSelected && {
                              borderColor: colors.border,
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <View style={styles.selectableCardRow}>
                            <View style={styles.selectableCardLeft}>
                              <Text
                                style={[
                                  styles.selectableCardDomain,
                                  { color: colors.ink },
                                ]}
                                numberOfLines={1}
                              >
                                {comp.domain}
                              </Text>
                              {comp.name && comp.name !== comp.domain ? (
                                <Text
                                  style={[
                                    styles.selectableCardName,
                                    { color: colors.inkMuted },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {comp.name}
                                </Text>
                              ) : null}
                            </View>
                            <View
                              style={[
                                styles.selectIndicator,
                                {
                                  backgroundColor: isSelected
                                    ? colors.red
                                    : "transparent",
                                  borderColor: isSelected
                                    ? colors.red
                                    : colors.border,
                                },
                              ]}
                            >
                              {isSelected && (
                                <Text style={styles.selectIndicatorCheck}>
                                  {"\u2713"}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={styles.selectableCardMetrics}>
                            <Text
                              style={[
                                styles.selectableCardMetric,
                                { color: colors.inkSecondary },
                              ]}
                            >
                              Authority: {comp.authority_score ?? "--"}
                            </Text>
                            <Text
                              style={[
                                styles.selectableCardMetric,
                                { color: colors.inkSecondary },
                              ]}
                            >
                              Traffic: {formatNumber(comp.organic_traffic)}
                            </Text>
                          </View>
                        </Card>
                      </TouchableOpacity>
                    );
                  })}

                  {selectedCompetitorId && (
                    <View style={styles.analyzeButtonContainer}>
                      <Button
                        title={
                          analyzePagesMutation.isPending
                            ? "Analyzing..."
                            : `Analyze Pages — ${selectedCompetitor?.domain ?? ""}`
                        }
                        variant="sm-red"
                        onPress={handleAnalyzePages}
                        disabled={analyzePagesMutation.isPending}
                        style={styles.analyzeButton}
                      />
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Pages Analysis Results */}
            {pagesResult && pagesResult.length > 0 && (
              <View style={styles.section}>
                <SectionLabel text="PAGE ANALYSIS RESULTS" />
                <Card style={styles.resultSummaryCard}>
                  <Text style={[styles.resultSummaryValue, { color: colors.ink }]}>
                    {pagesResult.length}
                  </Text>
                  <Text style={[styles.resultSummaryLabel, { color: colors.inkMuted }]}>
                    Pages Found
                  </Text>
                </Card>

                {pagesResult.map((page, index) => {
                  const title =
                    (page.title as string) ||
                    (page.url as string) ||
                    `Page ${index + 1}`;
                  const url = (page.url as string) || "";
                  const traffic = page.traffic as number | undefined;
                  const keywords = page.keywords as number | undefined;
                  const score = page.score as number | undefined;

                  return (
                    <Card key={index} variant="sm" style={styles.pageCard}>
                      <Text
                        style={[styles.pageCardTitle, { color: colors.ink }]}
                        numberOfLines={2}
                      >
                        {title}
                      </Text>
                      {url ? (
                        <Text
                          style={[styles.pageCardUrl, { color: colors.inkMuted }]}
                          numberOfLines={1}
                        >
                          {url}
                        </Text>
                      ) : null}
                      <View style={styles.pageCardMetrics}>
                        {traffic !== undefined && (
                          <View style={styles.pageCardMetric}>
                            <Text
                              style={[
                                styles.pageCardMetricValue,
                                { color: colors.ink },
                              ]}
                            >
                              {formatNumber(traffic)}
                            </Text>
                            <Text
                              style={[
                                styles.pageCardMetricLabel,
                                { color: colors.inkMuted },
                              ]}
                            >
                              Traffic
                            </Text>
                          </View>
                        )}
                        {keywords !== undefined && (
                          <View style={styles.pageCardMetric}>
                            <Text
                              style={[
                                styles.pageCardMetricValue,
                                { color: colors.ink },
                              ]}
                            >
                              {formatNumber(keywords)}
                            </Text>
                            <Text
                              style={[
                                styles.pageCardMetricLabel,
                                { color: colors.inkMuted },
                              ]}
                            >
                              Keywords
                            </Text>
                          </View>
                        )}
                        {score !== undefined && (
                          <View style={styles.pageCardMetric}>
                            <Text
                              style={[
                                styles.pageCardMetricValue,
                                { color: colors.red },
                              ]}
                            >
                              {score}
                            </Text>
                            <Text
                              style={[
                                styles.pageCardMetricLabel,
                                { color: colors.inkMuted },
                              ]}
                            >
                              Score
                            </Text>
                          </View>
                        )}
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}

            {pagesResult && pagesResult.length === 0 && (
              <View style={styles.section}>
                <EmptyState
                  title="No pages found"
                  message="The analysis completed but no significant pages were discovered for this competitor."
                />
              </View>
            )}
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* PPC Intel Tab                                                     */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "PPC Intel" && (
          <>
            <View style={styles.section}>
              <SectionLabel text="PAID SEARCH INTELLIGENCE" />
              <Card
                style={[
                  styles.ppcIntroCard,
                  {
                    borderColor: colors.gold,
                    backgroundColor: "rgba(184, 134, 11, 0.05)",
                  },
                ]}
              >
                <Text style={[styles.ppcIntroTitle, { color: colors.ink }]}>
                  PPC Competitor Analysis
                </Text>
                <Text style={[styles.ppcIntroDescription, { color: colors.inkMuted }]}>
                  Uncover competitor ad strategies, top paid keywords, estimated ad
                  spend, and landing page tactics. AI analyzes your competitors'
                  paid search presence to reveal opportunities.
                </Text>
                <Button
                  title={
                    analyzePPCMutation.isPending
                      ? "Analyzing..."
                      : "Analyze PPC"
                  }
                  variant="sm-red"
                  onPress={handleAnalyzePPC}
                  disabled={analyzePPCMutation.isPending}
                  style={[styles.ppcAnalyzeButton, { backgroundColor: colors.gold }]}
                />
              </Card>
            </View>

            {/* PPC Results */}
            {ppcResult ? (
              <View style={styles.section}>
                <SectionLabel text="PPC INTELLIGENCE REPORT" />

                {/* Ad Strategies */}
                {ppcResult.ad_strategies != null && (
                  <Card variant="sm" style={styles.ppcResultCard}>
                    <Text style={[styles.ppcResultCardTitle, { color: colors.ink }]}>
                      Ad Strategies
                    </Text>
                    <Text style={[styles.ppcResultCardBody, { color: colors.inkSecondary }]}>
                      {typeof ppcResult.ad_strategies === "string"
                        ? ppcResult.ad_strategies
                        : JSON.stringify(ppcResult.ad_strategies, null, 2)}
                    </Text>
                  </Card>
                )}

                {/* Top Keywords */}
                {ppcResult.top_keywords != null && (
                  <Card variant="sm" style={styles.ppcResultCard}>
                    <Text style={[styles.ppcResultCardTitle, { color: colors.ink }]}>
                      Top Paid Keywords
                    </Text>
                    {Array.isArray(ppcResult.top_keywords) ? (
                      (ppcResult.top_keywords as Array<Record<string, unknown>>).map(
                        (kw, i) => (
                          <View key={i} style={styles.ppcKeywordRow}>
                            <Text
                              style={[
                                styles.ppcKeywordText,
                                { color: colors.ink },
                              ]}
                              numberOfLines={1}
                            >
                              {(kw.keyword as string) || `Keyword ${i + 1}`}
                            </Text>
                            {kw.cpc != null && (
                              <Text
                                style={[
                                  styles.ppcKeywordCpc,
                                  { color: colors.green },
                                ]}
                              >
                                ${String(kw.cpc)}
                              </Text>
                            )}
                          </View>
                        )
                      )
                    ) : (
                      <Text
                        style={[
                          styles.ppcResultCardBody,
                          { color: colors.inkSecondary },
                        ]}
                      >
                        {typeof ppcResult.top_keywords === "string"
                          ? ppcResult.top_keywords
                          : JSON.stringify(ppcResult.top_keywords, null, 2)}
                      </Text>
                    )}
                  </Card>
                )}

                {/* Estimated Spend */}
                {ppcResult.estimated_spend != null && (
                  <Card variant="sm" style={styles.ppcResultCard}>
                    <Text style={[styles.ppcResultCardTitle, { color: colors.ink }]}>
                      Estimated Ad Spend
                    </Text>
                    <Text style={[styles.ppcSpendValue, { color: colors.red }]}>
                      {typeof ppcResult.estimated_spend === "number"
                        ? `$${formatNumber(ppcResult.estimated_spend as number)}/mo`
                        : String(ppcResult.estimated_spend)}
                    </Text>
                  </Card>
                )}

                {/* Summary / Other fields */}
                {ppcResult.summary != null && (
                  <Card variant="sm" style={styles.ppcResultCard}>
                    <Text style={[styles.ppcResultCardTitle, { color: colors.ink }]}>
                      Summary
                    </Text>
                    <Text style={[styles.ppcResultCardBody, { color: colors.inkSecondary }]}>
                      {String(ppcResult.summary)}
                    </Text>
                  </Card>
                )}

                {/* Fallback: show all data if no recognized keys */}
                {ppcResult.ad_strategies == null &&
                  ppcResult.top_keywords == null &&
                  ppcResult.estimated_spend == null &&
                  ppcResult.summary == null && (
                    <Card variant="sm" style={styles.ppcResultCard}>
                      <Text style={[styles.ppcResultCardTitle, { color: colors.ink }]}>
                        Analysis Results
                      </Text>
                      <Text
                        style={[
                          styles.ppcResultCardBody,
                          { color: colors.inkSecondary },
                        ]}
                      >
                        {JSON.stringify(ppcResult, null, 2)}
                      </Text>
                    </Card>
                  )}
              </View>
            ) : (
              !analyzePPCMutation.isPending && (
                <View style={styles.section}>
                  <EmptyState
                    title="No PPC data yet"
                    message="Run the PPC analysis above to uncover competitor ad strategies, top paid keywords, and estimated spend."
                  />
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Add Competitor AppModal with TextInput */}
      <AppModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        title="Add Competitor"
        message="Enter the competitor's domain (e.g., example.com):"
        variant="info"
        buttons={[
          {
            label: "Cancel",
            onPress: () => {
              setAddModalVisible(false);
              setNewDomain("");
            },
            variant: "outline",
          },
          {
            label: addCompetitorMutation.isPending ? "Adding..." : "Add",
            onPress: confirmAddCompetitor,
            variant: "primary",
          },
        ]}
      >
        <View style={styles.addInputContainer}>
          <TextInput
            placeholder="competitor.com"
            placeholderTextColor={colors.inkMuted}
            value={newDomain}
            onChangeText={setNewDomain}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[
              styles.addInput,
              {
                backgroundColor: colors.surfaceInset,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
          />
        </View>
      </AppModal>

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
    </SafeAreaView>
  );
}

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
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  headerButton: {
    width: "auto",
  },
  statsLine: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 8,
  },

  // -- Tab Pills --
  tabScrollView: {
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  tabPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 0,
  },
  tabPillText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.sansSemiBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // -- Sections --
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.lg,
  },
  yourSiteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  yourSiteLeft: {
    flex: 1,
    marginRight: 12,
  },
  yourSiteDomain: {
    fontSize: fontSize.sm,
    fontFamily: fonts.sansBold,
  },
  yourSiteLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.sans,
    marginTop: 2,
  },
  yourSiteScore: {
    fontSize: fontSize.headline,
    fontFamily: fonts.mono,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
  },
  metric: {
    alignItems: "flex-start",
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontFamily: fonts.monoMedium,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.sans,
    marginTop: 1,
  },
  discoveryCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 0,
    padding: 16,
  },
  discoveryIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  discoveryTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.md,
    fontWeight: "700",
    marginBottom: 6,
  },
  discoveryDescription: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  discoveryButton: {
    width: "auto",
    alignSelf: "flex-start",
  },
  addInputContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  addInput: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },

  // -- Site Explorer --
  selectableCard: {
    borderRadius: 0,
    marginBottom: 8,
  },
  selectableCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectableCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  selectableCardDomain: {
    fontSize: fontSize.sm,
    fontFamily: fonts.sansBold,
  },
  selectableCardName: {
    fontSize: 11,
    fontFamily: fonts.sans,
    marginTop: 2,
  },
  selectIndicator: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  selectIndicatorCheck: {
    color: "#fff",
    fontSize: 13,
    fontFamily: fonts.sansBold,
    lineHeight: 16,
  },
  selectableCardMetrics: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  selectableCardMetric: {
    fontSize: 11,
    fontFamily: fonts.mono,
  },
  analyzeButtonContainer: {
    marginTop: 12,
  },
  analyzeButton: {
    width: "auto",
    alignSelf: "flex-start",
  },

  // -- Page Analysis Results --
  resultSummaryCard: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 0,
    marginBottom: 12,
  },
  resultSummaryValue: {
    fontSize: fontSize.headline,
    fontFamily: fonts.mono,
    fontWeight: "700",
  },
  resultSummaryLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.sans,
    marginTop: 2,
  },
  pageCard: {
    marginBottom: 8,
    borderRadius: 0,
  },
  pageCardTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.sansBold,
  },
  pageCardUrl: {
    fontSize: 10,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
  pageCardMetrics: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  pageCardMetric: {
    alignItems: "flex-start",
  },
  pageCardMetricValue: {
    fontSize: fontSize.sm,
    fontFamily: fonts.monoMedium,
  },
  pageCardMetricLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.sans,
    marginTop: 1,
  },

  // -- PPC Intel --
  ppcIntroCard: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 0,
    padding: 16,
  },
  ppcIntroTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.md,
    fontWeight: "700",
    marginBottom: 6,
  },
  ppcIntroDescription: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  ppcAnalyzeButton: {
    width: "auto",
    alignSelf: "flex-start",
  },
  ppcResultCard: {
    marginBottom: 10,
    borderRadius: 0,
  },
  ppcResultCardTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.sm,
    marginBottom: 6,
  },
  ppcResultCardBody: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  ppcSpendValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.headline,
    fontWeight: "700",
  },
  ppcKeywordRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  ppcKeywordText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  ppcKeywordCpc: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
  },
});
