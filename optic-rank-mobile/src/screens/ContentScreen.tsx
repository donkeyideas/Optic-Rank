import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import ScoreRing from "../components/ui/ScoreRing";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import LoadingScreen from "../components/ui/LoadingScreen";
import EmptyState from "../components/ui/EmptyState";
import AppModal from "../components/ui/AppModal";

import {
  useContentPages,
  useContentBriefs,
  type ContentPage,
  type ContentBrief,
} from "../hooks/useContent";
import { useActiveProject } from "../hooks/useProjects";
import {
  useAddContentPage,
  useScoreContentPages,
  useDetectContentDecay,
  useDetectCannibalization,
  useSuggestInternalLinks,
  useGenerateContentBriefs,
  useDetectContentGaps,
  useGenerateCalendarEntries,
} from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_PADDING = spacing.screenPadding;

const TAB_OPTIONS = ["Inventory", "Briefs", "Calendar", "Analysis", "Content Gaps"] as const;
type TabOption = (typeof TAB_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreStatus(score: number): "good" | "warn" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function trafficTrendBadgeVariant(
  trend: string | null
): "green" | "red" | "gold" {
  switch (trend) {
    case "growing":
      return "green";
    case "declining":
      return "red";
    case "stable":
    default:
      return "gold";
  }
}

function briefStatusBadgeVariant(
  status: string
): "green" | "gold" | "outline" {
  switch (status) {
    case "published":
      return "green";
    case "in_progress":
      return "gold";
    case "draft":
    default:
      return "outline";
  }
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Generate All steps
// ---------------------------------------------------------------------------

const GENERATE_ALL_STEPS = [
  "Scoring content pages",
  "Detecting content decay",
  "Checking cannibalization",
  "Suggesting internal links",
  "Analyzing content gaps",
  "Generating content briefs",
  "Generating calendar entries",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentScreen() {
  const { colors } = useTheme();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const [activeTab, setActiveTab] = useState<TabOption>("Inventory");
  const [searchText, setSearchText] = useState("");

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

  // -- Add Page modal state --
  const [addPageModal, setAddPageModal] = useState(false);
  const [newPageUrl, setNewPageUrl] = useState("");

  // -- Mutations --
  const addPageMutation = useAddContentPage(projectId);
  const scorePagesMutation = useScoreContentPages(projectId);
  const detectDecayMutation = useDetectContentDecay(projectId);
  const detectCannibalizationMutation = useDetectCannibalization(projectId);
  const suggestLinksMutation = useSuggestInternalLinks(projectId);
  const generateBriefsMutation = useGenerateContentBriefs(projectId);
  const detectContentGapsMutation = useDetectContentGaps(projectId);
  const generateCalendarMutation = useGenerateCalendarEntries(projectId);

  // -- Data hooks (must be before Generate All handler) --
  const {
    data: pagesResult,
    isLoading: pagesLoading,
    refetch: refetchPages,
    isRefetching: isRefetchingPages,
  } = useContentPages(projectId, { search: searchText });

  const {
    data: briefs,
    isLoading: briefsLoading,
    refetch: refetchBriefs,
    isRefetching: isRefetchingBriefs,
  } = useContentBriefs(projectId);

  const pages = pagesResult?.data ?? [];
  const pageCount = pagesResult?.count ?? 0;
  const briefList = briefs ?? [];

  // -- Generate All progress state --
  const [generateAllProgress, setGenerateAllProgress] = useState<{
    visible: boolean;
    currentStep: number; // -1 = not started, 0-6 = running, 7 = done
    status: "running" | "success" | "error";
    errorMessage?: string;
    startTime: number;
    elapsed: number;
  }>({
    visible: false,
    currentStep: -1,
    status: "running",
    startTime: 0,
    elapsed: 0,
  });

  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update elapsed time every second while running
  useEffect(() => {
    if (generateAllProgress.visible && generateAllProgress.status === "running") {
      elapsedTimerRef.current = setInterval(() => {
        setGenerateAllProgress((prev) => ({
          ...prev,
          elapsed: Math.floor((Date.now() - prev.startTime) / 1000),
        }));
      }, 1000);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [generateAllProgress.visible, generateAllProgress.status]);

  const runMutationAsync = useCallback(
    (mutation: { mutateAsync: (arg: undefined) => Promise<any> }) =>
      mutation.mutateAsync(undefined),
    []
  );

  const handleGenerateAll = useCallback(async () => {
    setGenerateAllProgress({
      visible: true,
      currentStep: 0,
      status: "running",
      startTime: Date.now(),
      elapsed: 0,
    });

    const steps = [
      () => runMutationAsync(scorePagesMutation),
      () => runMutationAsync(detectDecayMutation),
      () => runMutationAsync(detectCannibalizationMutation),
      () => runMutationAsync(suggestLinksMutation),
      () => runMutationAsync(detectContentGapsMutation),
      () => runMutationAsync(generateBriefsMutation),
      () => runMutationAsync(generateCalendarMutation),
    ];

    let failures = 0;
    for (let i = 0; i < steps.length; i++) {
      setGenerateAllProgress((prev) => ({ ...prev, currentStep: i }));
      try {
        await steps[i]();
      } catch {
        // Continue to next step even if one fails
        failures++;
      }
    }
    setGenerateAllProgress((prev) => ({
      ...prev,
      currentStep: steps.length,
      status: failures === steps.length ? "error" : "success",
      errorMessage:
        failures > 0 && failures < steps.length
          ? `${steps.length - failures} of ${steps.length} steps completed.`
          : failures === steps.length
          ? "All steps failed."
          : undefined,
    }));
  }, [
    runMutationAsync,
    scorePagesMutation,
    detectDecayMutation,
    detectCannibalizationMutation,
    suggestLinksMutation,
    detectContentGapsMutation,
    generateBriefsMutation,
    generateCalendarMutation,
  ]);

  const closeGenerateAllModal = useCallback(() => {
    setGenerateAllProgress((prev) => ({ ...prev, visible: false }));
  }, []);

  const isGenerateAllRunning = generateAllProgress.visible && generateAllProgress.status === "running";

  const handleAddPage = useCallback(() => {
    setNewPageUrl("");
    setAddPageModal(true);
  }, []);

  const handleConfirmAddPage = useCallback(() => {
    if (!newPageUrl.trim()) return;
    setAddPageModal(false);
    setModal({
      visible: true,
      title: "Adding Page",
      message: "Tracking new content page...",
      variant: "loading",
    });
    addPageMutation.mutate(
      { url: newPageUrl.trim() },
      {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "Page Added",
            message: "Content page is now being tracked.",
            variant: "success",
          });
        },
        onError: (err: any) => {
          setModal({
            visible: true,
            title: "Error",
            message: err?.message ?? "Failed to add page.",
            variant: "error",
          });
        },
      }
    );
  }, [newPageUrl, addPageMutation]);

  // -- AI Action handlers --
  const handleAIAction = useCallback(
    (
      mutation: any,
      loadingTitle: string,
      loadingMsg: string,
      successTitle: string,
      successMsg: (data: any) => string
    ) => {
      setModal({
        visible: true,
        title: loadingTitle,
        message: loadingMsg,
        variant: "loading",
      });
      mutation.mutate(undefined, {
        onSuccess: (data: any) => {
          setModal({
            visible: true,
            title: successTitle,
            message: successMsg(data),
            variant: "success",
          });
        },
        onError: (err: any) => {
          setModal({
            visible: true,
            title: "Error",
            message: err?.message ?? "An error occurred.",
            variant: "error",
          });
        },
      });
    },
    []
  );

  const handleDetectDecay = useCallback(() => {
    handleAIAction(
      detectDecayMutation,
      "Detecting Decay",
      "Analyzing content for traffic and ranking declines...",
      "Decay Detection Complete",
      (d: any) => `Found ${d?.atRisk ?? 0} pages at risk of content decay.`
    );
  }, [detectDecayMutation, handleAIAction]);

  const handleDetectCannibalization = useCallback(() => {
    handleAIAction(
      detectCannibalizationMutation,
      "Detecting Cannibalization",
      "Scanning for keyword cannibalization issues...",
      "Cannibalization Scan Complete",
      (d: any) =>
        `Found ${d?.groups ?? 0} keyword cannibalization groups.`
    );
  }, [detectCannibalizationMutation, handleAIAction]);

  const handleSuggestLinks = useCallback(() => {
    handleAIAction(
      suggestLinksMutation,
      "Suggesting Links",
      "Analyzing internal linking opportunities...",
      "Link Suggestions Ready",
      (d: any) =>
        `Generated ${d?.suggestions ?? 0} internal link suggestions.`
    );
  }, [suggestLinksMutation, handleAIAction]);

  const handleGenerateBriefs = useCallback(() => {
    handleAIAction(
      generateBriefsMutation,
      "Generating Briefs",
      "Creating content briefs based on keyword gaps...",
      "Briefs Generated",
      (d: any) => `Generated ${d?.generated ?? 0} new content briefs.`
    );
  }, [generateBriefsMutation, handleAIAction]);

  const handleDetectContentGaps = useCallback(() => {
    handleAIAction(
      detectContentGapsMutation,
      "Detecting Content Gaps",
      "Analyzing gaps between your site and competitors...",
      "Content Gaps Detected",
      (d: any) => {
        const count = Array.isArray(d?.gaps) ? d.gaps.length : (d?.gaps ?? 0);
        return `Found ${count} content gap opportunities.`;
      }
    );
  }, [detectContentGapsMutation, handleAIAction]);

  const handleRefresh = useCallback(() => {
    refetchPages();
    refetchBriefs();
  }, [refetchPages, refetchBriefs]);

  const isLoading =
    projectLoading ||
    (activeTab === "Inventory" && pagesLoading && !pagesResult) ||
    (activeTab === "Briefs" && briefsLoading && !briefs);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Content" />;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingPages || isRefetchingBriefs}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.subtitle, { color: colors.inkMuted }]}>
            {pageCount} pages · {briefList.length} briefs
          </Text>
          <View style={styles.buttonRow}>
            <Button
              title="Generate All"
              variant="sm-red"
              onPress={handleGenerateAll}
              disabled={isGenerateAllRunning}
              style={styles.actionButton}
            />
            <Button
              title="+ New Content"
              variant="sm-red"
              onPress={handleAddPage}
              disabled={addPageMutation.isPending}
              style={styles.actionButton}
            />
          </View>
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
          {TAB_OPTIONS.map((tab) => {
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
        {/* Inventory Tab                                                      */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Inventory" && (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <TextInput
                placeholder="Search pages..."
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

            <View style={styles.section}>
              <SectionLabel text={`${pageCount} Pages`} />
              {pages.length === 0 ? (
                <EmptyState
                  title="No content pages"
                  message={
                    searchText
                      ? "No pages match your search query."
                      : "Content pages will appear after your first crawl."
                  }
                />
              ) : (
                pages.map((page: ContentPage) => (
                  <Card key={page.id} variant="sm">
                    <View style={styles.pageTopRow}>
                      {/* Score Ring */}
                      <ScoreRing
                        score={page.content_score ?? 0}
                        size={48}
                        status={scoreStatus(page.content_score ?? 0)}
                      />
                      {/* Title & URL */}
                      <View style={styles.pageInfo}>
                        <Text
                          style={[styles.pageTitle, { color: colors.ink }]}
                          numberOfLines={2}
                        >
                          {page.title || "Untitled Page"}
                        </Text>
                        <Text
                          style={[styles.pageUrl, { color: colors.inkMuted }]}
                          numberOfLines={1}
                        >
                          {page.url}
                        </Text>
                      </View>
                    </View>

                    {/* Metrics row */}
                    <View style={styles.pageMetricsRow}>
                      <View style={styles.pageMetric}>
                        <Text
                          style={[
                            styles.pageMetricLabel,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Words
                        </Text>
                        <Text
                          style={[
                            styles.pageMetricValue,
                            { color: colors.ink },
                          ]}
                        >
                          {formatNumber(page.word_count)}
                        </Text>
                      </View>
                      <View style={styles.pageMetric}>
                        <Text
                          style={[
                            styles.pageMetricLabel,
                            { color: colors.inkMuted },
                          ]}
                        >
                          Readability
                        </Text>
                        <Text
                          style={[
                            styles.pageMetricValue,
                            { color: colors.ink },
                          ]}
                        >
                          {page.readability_score ?? "--"}
                        </Text>
                      </View>
                      {page.traffic_trend && (
                        <Badge
                          label={page.traffic_trend}
                          variant={trafficTrendBadgeVariant(page.traffic_trend)}
                        />
                      )}
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Briefs Tab                                                         */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Briefs" && (
          <View style={styles.section}>
            <SectionLabel text={`${briefList.length} Briefs`} />
            {briefList.length === 0 ? (
              <EmptyState
                title="No content briefs"
                message="Generate content briefs to plan your next articles."
              />
            ) : (
              briefList.map((brief: ContentBrief) => (
                <Card key={brief.id} variant="sm">
                  <View style={styles.briefTopRow}>
                    <Text
                      style={[styles.briefKeyword, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {brief.target_keyword}
                    </Text>
                    <Badge
                      label={brief.status.replace("_", " ")}
                      variant={briefStatusBadgeVariant(brief.status)}
                    />
                  </View>
                  <View style={styles.briefMetaRow}>
                    {brief.target_word_count != null && (
                      <Text
                        style={[
                          styles.briefMeta,
                          { color: colors.inkMuted },
                        ]}
                      >
                        Target: {formatNumber(brief.target_word_count)} words
                      </Text>
                    )}
                    {brief.serp_intent && (
                      <Badge label={brief.serp_intent} variant="outline" />
                    )}
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Calendar Tab                                                       */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Calendar" && (
          <View style={styles.section}>
            <EmptyState
              title="Editorial Calendar"
              message="Editorial calendar — coming to mobile"
            />
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Analysis Tab                                                       */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Analysis" && (
          <View style={styles.section}>
            <SectionLabel text="AI Content Analysis" />
            <View style={styles.analysisGrid}>
              <TouchableOpacity
                style={[
                  styles.analysisCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                onPress={handleDetectDecay}
                disabled={detectDecayMutation.isPending}
              >
                <Text style={[styles.analysisIcon, { color: colors.red }]}>
                  {detectDecayMutation.isPending ? "..." : "~"}
                </Text>
                <Text
                  style={[styles.analysisLabel, { color: colors.ink }]}
                >
                  Detect Decay
                </Text>
                <Text
                  style={[styles.analysisDesc, { color: colors.inkMuted }]}
                >
                  Find pages losing traffic & rankings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.analysisCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                onPress={handleDetectCannibalization}
                disabled={detectCannibalizationMutation.isPending}
              >
                <Text style={[styles.analysisIcon, { color: colors.gold }]}>
                  {detectCannibalizationMutation.isPending ? "..." : "#"}
                </Text>
                <Text
                  style={[styles.analysisLabel, { color: colors.ink }]}
                >
                  Detect Cannibalization
                </Text>
                <Text
                  style={[styles.analysisDesc, { color: colors.inkMuted }]}
                >
                  Find competing pages for same keywords
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.analysisCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                onPress={handleSuggestLinks}
                disabled={suggestLinksMutation.isPending}
              >
                <Text style={[styles.analysisIcon, { color: colors.green }]}>
                  {suggestLinksMutation.isPending ? "..." : "@"}
                </Text>
                <Text
                  style={[styles.analysisLabel, { color: colors.ink }]}
                >
                  Suggest Links
                </Text>
                <Text
                  style={[styles.analysisDesc, { color: colors.inkMuted }]}
                >
                  Discover internal linking opportunities
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.analysisCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                onPress={handleGenerateBriefs}
                disabled={generateBriefsMutation.isPending}
              >
                <Text style={[styles.analysisIcon, { color: colors.red }]}>
                  {generateBriefsMutation.isPending ? "..." : "+"}
                </Text>
                <Text
                  style={[styles.analysisLabel, { color: colors.ink }]}
                >
                  Generate Briefs
                </Text>
                <Text
                  style={[styles.analysisDesc, { color: colors.inkMuted }]}
                >
                  AI-powered content brief creation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Content Gaps Tab                                                    */}
        {/* ---------------------------------------------------------------- */}
        {activeTab === "Content Gaps" && (
          <View style={styles.section}>
            <SectionLabel text="AI Content Gap Analysis" />
            <Text
              style={[styles.contentGapsDescription, { color: colors.inkMuted }]}
            >
              Discover content opportunities by analyzing gaps between your site
              and competitors.
            </Text>

            <TouchableOpacity
              style={[
                styles.analysisCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  width: "100%",
                },
              ]}
              activeOpacity={0.7}
              onPress={handleDetectContentGaps}
              disabled={detectContentGapsMutation.isPending}
            >
              <Text style={[styles.analysisIcon, { color: colors.red }]}>
                {detectContentGapsMutation.isPending ? "..." : "%"}
              </Text>
              <Text style={[styles.analysisLabel, { color: colors.ink }]}>
                Detect Content Gaps
              </Text>
              <Text style={[styles.analysisDesc, { color: colors.inkMuted }]}>
                Find topics your competitors rank for that you don't cover yet
              </Text>
            </TouchableOpacity>

            <EmptyState
              title="No content gaps detected"
              message="Run content gap detection to discover topics your competitors rank for that you don't cover yet."
            />
          </View>
        )}

        {/* Bottom spacer for tab bar clearance */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* -- Add Page Modal (with TextInput) -- */}
      <AppModal
        visible={addPageModal}
        onClose={() => setAddPageModal(false)}
        title="New Content"
        message="Enter the URL of the page to track:"
        variant="info"
        buttons={[
          {
            label: "Cancel",
            onPress: () => setAddPageModal(false),
            variant: "outline",
          },
          {
            label: "Add",
            onPress: handleConfirmAddPage,
            variant: "primary",
          },
        ]}
      >
        <View style={styles.modalInputContainer}>
          <TextInput
            placeholder="https://example.com/page"
            placeholderTextColor={colors.inkMuted}
            value={newPageUrl}
            onChangeText={setNewPageUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[
              styles.modalInput,
              {
                backgroundColor: colors.surfaceInset,
                borderColor: colors.border,
                color: colors.ink,
              },
            ]}
          />
        </View>
      </AppModal>

      {/* -- Feedback Modal (success/error/loading) -- */}
      <AppModal
        visible={modal.visible}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
        loading={modal.variant === "loading"}
        loadingText={modal.message}
      />

      {/* -- Generate All Progress Modal -- */}
      <Modal
        visible={generateAllProgress.visible}
        transparent
        animationType="fade"
        onRequestClose={
          generateAllProgress.status !== "running" ? closeGenerateAllModal : undefined
        }
        statusBarTranslucent
      >
        <Pressable
          style={styles.progressOverlay}
          onPress={
            generateAllProgress.status !== "running" ? closeGenerateAllModal : undefined
          }
        >
          <Pressable
            style={[styles.progressContainer, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            {/* Accent line */}
            <View
              style={[
                styles.progressAccent,
                {
                  backgroundColor:
                    generateAllProgress.status === "error"
                      ? colors.red
                      : generateAllProgress.status === "success"
                      ? colors.green
                      : colors.red,
                },
              ]}
            />

            {/* Title */}
            <Text style={[styles.progressTitle, { color: colors.ink }]}>
              {generateAllProgress.status === "success"
                ? "Analysis Complete"
                : generateAllProgress.status === "error"
                ? "Analysis Error"
                : "Running Full Content Analysis"}
            </Text>

            {/* Description */}
            <Text style={[styles.progressDesc, { color: colors.inkMuted }]}>
              {generateAllProgress.status === "error"
                ? generateAllProgress.errorMessage
                : "Scoring pages, detecting decay & cannibalization, discovering internal links, analyzing gaps, generating briefs & calendar..."}
            </Text>

            {/* Progress bar */}
            <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor:
                      generateAllProgress.status === "error"
                        ? colors.red
                        : generateAllProgress.status === "success"
                        ? colors.green
                        : colors.red,
                    width:
                      generateAllProgress.status === "success"
                        ? "100%"
                        : `${Math.min(
                            95,
                            ((generateAllProgress.currentStep + 0.5) /
                              GENERATE_ALL_STEPS.length) *
                              100
                          )}%`,
                  },
                ]}
              />
            </View>

            {/* Steps list */}
            <View style={styles.progressSteps}>
              {GENERATE_ALL_STEPS.map((step, i) => {
                const isDone = i < generateAllProgress.currentStep;
                const isCurrent = i === generateAllProgress.currentStep;
                const isPending = i > generateAllProgress.currentStep;
                const isFailed =
                  generateAllProgress.status === "error" && isCurrent;

                return (
                  <View key={i} style={styles.progressStepRow}>
                    <View
                      style={[
                        styles.progressDot,
                        isDone && { backgroundColor: colors.green },
                        isCurrent &&
                          !isFailed && { backgroundColor: colors.red },
                        isFailed && { backgroundColor: colors.red },
                        isPending && {
                          backgroundColor: "transparent",
                          borderWidth: 1,
                          borderColor: colors.border,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.progressStepText,
                        { color: isDone ? colors.green : isCurrent ? colors.ink : colors.inkMuted },
                        isCurrent && { fontFamily: fonts.sansBold },
                      ]}
                    >
                      {step}
                    </Text>
                    {isDone && (
                      <Text style={[styles.progressCheck, { color: colors.green }]}>
                        Done
                      </Text>
                    )}
                    {isCurrent && generateAllProgress.status === "running" && (
                      <ActivityIndicator
                        size="small"
                        color={colors.red}
                        style={styles.progressSpinner}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Footer: elapsed time + close button */}
            <View style={styles.progressFooter}>
              <Text style={[styles.progressElapsed, { color: colors.inkMuted }]}>
                {generateAllProgress.elapsed}s elapsed
              </Text>
              {generateAllProgress.status !== "running" && (
                <TouchableOpacity
                  onPress={closeGenerateAllModal}
                  style={[styles.progressCloseBtn, { backgroundColor: colors.red }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.progressCloseBtnText}>
                    {generateAllProgress.status === "success" ? "Done" : "Close"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  section: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: spacing.lg,
  },

  // -- Action Row --
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    width: "auto",
  },

  // -- Tab Pills --
  tabScrollView: {
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: SCREEN_PADDING,
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

  // -- Search --
  searchContainer: {
    paddingHorizontal: SCREEN_PADDING,
  },
  searchInput: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 0,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },

  // -- Page Card --
  pageTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pageInfo: {
    flex: 1,
  },
  pageTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
  },
  pageUrl: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  pageMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  pageMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  pageMetricLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pageMetricValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },

  // -- Brief Card --
  briefTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  briefKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: 8,
  },
  briefMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  briefMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
  },

  // -- Analysis Grid --
  analysisGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  analysisCard: {
    width: "48%",
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  analysisIcon: {
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  analysisLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  analysisDesc: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 14,
  },

  // -- Content Gaps --
  contentGapsDescription: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },

  // -- Modal Input --
  modalInputContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  modalInput: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 0,
    fontFamily: fonts.mono,
    fontSize: 13,
  },

  // -- Bottom spacer --
  bottomSpacer: {
    height: 100,
  },

  // -- Progress Modal --
  progressOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  progressContainer: {
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
  },
  progressAccent: {
    height: 3,
    width: "100%",
  },
  progressTitle: {
    fontFamily: fonts.serifExtraBold,
    fontSize: fontSize.xl,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressDesc: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  progressBarTrack: {
    height: 4,
    marginHorizontal: 20,
    marginTop: 16,
  },
  progressBarFill: {
    height: 4,
  },
  progressSteps: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  progressStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressDot: {
    width: 8,
    height: 8,
  },
  progressStepText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    flex: 1,
  },
  progressCheck: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressSpinner: {
    transform: [{ scale: 0.6 }],
  },
  progressFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
  },
  progressElapsed: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  progressCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  progressCloseBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
