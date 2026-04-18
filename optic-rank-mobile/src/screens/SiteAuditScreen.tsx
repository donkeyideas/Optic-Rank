import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";

import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Divider from "../components/ui/Divider";
import SectionLabel from "../components/ui/SectionLabel";
import ScoreRing from "../components/ui/ScoreRing";
import ProgressBar from "../components/ui/ProgressBar";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import IssueCard from "../components/audit/IssueCard";
import CWVCard from "../components/audit/CWVCard";
import AppModal from "../components/ui/AppModal";
import { useActiveProject } from "../hooks/useProjects";
import { useLatestAudit, useAuditIssues, useAuditPages } from "../hooks/useSiteAudit";
import { useAuditHistory } from "../hooks/useReports";
import { useRunAudit, useBatchAnalyzeUrls } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";
import Badge from "../components/ui/Badge";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = ["Overview", "Issues", "Pages", "History", "Batch Analysis"] as const;
type TabName = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getScoreStatus(score: number | null): "good" | "warn" | "bad" {
  if (score === null) return "bad";
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function getScoreColor(
  score: number | null,
  colors: { green: string; gold: string; red: string; inkMuted: string }
): string {
  if (score === null) return colors.inkMuted;
  if (score >= 80) return colors.green;
  if (score >= 60) return colors.gold;
  return colors.red;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SiteAuditScreen() {
  const { colors } = useTheme();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const {
    data: audit,
    isLoading: auditLoading,
    refetch: refetchAudit,
    isRefetching: isRefetchingAudit,
  } = useLatestAudit(project?.id);
  const {
    data: issues,
    refetch: refetchIssues,
    isRefetching: isRefetchingIssues,
  } = useAuditIssues(audit?.id);

  const {
    data: auditPages,
    refetch: refetchPages,
    isRefetching: isRefetchingPages,
  } = useAuditPages(audit?.id);

  const {
    data: auditHistory,
    refetch: refetchHistory,
    isRefetching: isRefetchingHistory,
  } = useAuditHistory(project?.id);

  const runAudit = useRunAudit(project?.id);
  const batchAnalyze = useBatchAnalyzeUrls(project?.id);

  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const [batchUrls, setBatchUrls] = useState("");
  const [batchResults, setBatchResults] = useState<Record<string, unknown>[] | null>(null);

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

  const handleRefresh = useCallback(() => {
    refetchAudit();
    refetchIssues();
    refetchPages();
    refetchHistory();
  }, [refetchAudit, refetchIssues, refetchPages, refetchHistory]);

  const handleRunAudit = useCallback(() => {
    setModal({
      visible: true,
      title: "Running Site Audit",
      message: "Running site audit... This may take a few minutes.",
      variant: "loading",
    });
    runAudit.mutate(undefined, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Audit Complete",
          message: "Site audit completed successfully. Pull down to refresh results.",
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Audit Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred while running the audit.",
          variant: "error",
        });
      },
    });
  }, [runAudit]);

  // Filter out signal entries (aeo-signal, geo-signal) and CWV metrics
  const { realIssues, cwvMetrics } = useMemo(() => {
    if (!issues) return { realIssues: [] as any[], cwvMetrics: [] as any[] };
    const cwv = issues.filter((i) => i.rule_id?.startsWith("cwv-metric-"));
    const real = issues.filter(
      (i) =>
        !i.rule_id?.startsWith("cwv-metric-") &&
        i.category !== ("aeo-signal" as any) &&
        i.category !== ("geo-signal" as any)
    );
    return { realIssues: real, cwvMetrics: cwv };
  }, [issues]);

  const criticalCount = useMemo(() => {
    return realIssues.filter((i) => i.severity === "critical").length;
  }, [realIssues]);

  // Extract CWV values from metrics issues
  const cwvData = useMemo(() => {
    const map: Record<string, { value: string; good: boolean }> = {};
    for (const m of cwvMetrics ?? []) {
      const key = m.rule_id?.replace("cwv-metric-", "") ?? "";
      // Title format: "LCP: 2.50s" or "CLS: 0.152"
      const titleVal = m.title?.split(":")?.[1]?.trim() ?? "--";
      const isGood = m.recommendation?.toLowerCase().includes("good") ?? false;
      map[key] = { value: titleVal, good: isGood };
    }
    return {
      lcp: map["lcp"] ?? { value: "--", good: false },
      cls: map["cls"] ?? { value: "--", good: false },
      fid: map["fcp"] ?? { value: "--", good: false }, // FCP as fallback for FID
    };
  }, [cwvMetrics]);

  // Category scores data
  const categoryScores = useMemo(() => {
    return [
      { label: "Performance", value: audit?.performance_score ?? null },
      { label: "SEO", value: audit?.seo_score ?? null },
      { label: "Accessibility", value: audit?.accessibility_score ?? null },
      { label: "Best Practices", value: null as number | null },
    ];
  }, [audit]);

  if (projectLoading || (auditLoading && !audit)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Site Audit" />;

  const healthScore = audit?.health_score ?? 0;
  const pagesCrawled = audit?.pages_crawled ?? 0;

  // ---------------------------------------------------------------------------
  // Tab content renderers
  // ---------------------------------------------------------------------------

  const renderOverviewTab = () => (
    <>
      {/* Overall Score section */}
      <View style={styles.section}>
        <View style={styles.overallRow}>
          <ScoreRing
            score={healthScore}
            size={80}
            status={getScoreStatus(healthScore)}
          />
          <View style={styles.overallRight}>
            <Text style={[styles.overallTitle, { color: colors.ink }]}>
              Overall Health
            </Text>
            <Text style={[styles.overallSubtitle, { color: colors.inkMuted }]}>
              {audit?.issues_found ?? 0} issues found · {criticalCount} critical
            </Text>
            <Button
              title={runAudit.isPending ? "Running..." : "Run New Audit"}
              variant="sm-red"
              onPress={handleRunAudit}
              disabled={runAudit.isPending}
              style={styles.runAuditButton}
            />
          </View>
        </View>
      </View>

      <Divider />

      {/* Core Web Vitals section */}
      <View style={styles.section}>
        <SectionLabel text="CORE WEB VITALS" />
        <View style={styles.cwvRow}>
          <CWVCard label="LCP" value={cwvData.lcp.value} status={cwvData.lcp.good ? "good" : "warn"} />
          <CWVCard label="CLS" value={cwvData.cls.value} status={cwvData.cls.good ? "good" : "warn"} />
          <CWVCard label="FCP" value={cwvData.fid.value} status={cwvData.fid.good ? "good" : "warn"} />
        </View>
      </View>

      <Divider />

      {/* Category Scores section */}
      <View style={styles.section}>
        <SectionLabel text="CATEGORY SCORES" />
        <Card>
          {categoryScores.map((cat, index) => {
            const scoreColor = getScoreColor(cat.value, colors);
            return (
              <View key={cat.label}>
                <View style={styles.categoryRow}>
                  <Text style={[styles.categoryLabel, { color: colors.ink }]}>
                    {cat.label}
                  </Text>
                  <Text style={[styles.categoryValue, { color: scoreColor }]}>
                    {cat.value !== null ? cat.value : "--"}
                  </Text>
                </View>
                <ProgressBar
                  value={cat.value ?? 0}
                  color={scoreColor}
                />
                {index < categoryScores.length - 1 && (
                  <View style={styles.categorySpacer} />
                )}
              </View>
            );
          })}
        </Card>
      </View>

      <Divider />

      {/* Issues preview in overview */}
      <View style={styles.section}>
        <SectionLabel text="ISSUES FOUND" />
        {realIssues.length === 0 ? (
          <EmptyState
            title="No issues found"
            message={
              audit
                ? "Your site passed all checks. Great job!"
                : "Run an audit to discover potential issues."
            }
          />
        ) : (
          realIssues.slice(0, 5).map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))
        )}
        {realIssues.length > 5 && (
          <TouchableOpacity
            onPress={() => setActiveTab("Issues")}
            style={styles.viewAllButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllText, { color: colors.red }]}>
              View all {realIssues.length} issues
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderIssuesTab = () => (
    <View style={styles.section}>
      <SectionLabel text={`${realIssues.length} ISSUES`} />
      {realIssues.length === 0 ? (
        <EmptyState
          title="No issues found"
          message={
            audit
              ? "Your site passed all checks. Great job!"
              : "Run an audit to discover potential issues."
          }
        />
      ) : (
        realIssues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))
      )}
    </View>
  );

  const renderPagesTab = () => (
    <View style={styles.section}>
      <SectionLabel text={`${auditPages?.length ?? 0} PAGES CRAWLED`} />
      {!auditPages || auditPages.length === 0 ? (
        <EmptyState
          title="No pages crawled"
          message="Run a site audit to discover and analyze your pages."
        />
      ) : (
        auditPages.map((page) => (
          <Card key={page.id} variant="sm">
            <Text
              style={[styles.pageTitle, { color: colors.ink }]}
              numberOfLines={1}
            >
              {page.title || "Untitled"}
            </Text>
            <Text
              style={[styles.pageUrl, { color: colors.inkMuted }]}
              numberOfLines={1}
            >
              {page.url}
            </Text>
            <View style={styles.pageMetaRow}>
              {page.status_code != null && (
                <Badge
                  label={String(page.status_code)}
                  variant={page.status_code === 200 ? "green" : "red"}
                />
              )}
              {page.word_count != null && (
                <Text style={[styles.pageMeta, { color: colors.inkMuted }]}>
                  {page.word_count} words
                </Text>
              )}
              {page.load_time_ms != null && (
                <Text style={[styles.pageMeta, { color: colors.inkMuted }]}>
                  {(page.load_time_ms / 1000).toFixed(2)}s
                </Text>
              )}
              {page.has_schema != null && (
                <Badge
                  label={page.has_schema ? "Schema" : "No Schema"}
                  variant={page.has_schema ? "green" : "outline"}
                />
              )}
            </View>
          </Card>
        ))
      )}
    </View>
  );

  const renderHistoryTab = () => (
    <View style={styles.section}>
      <SectionLabel text="AUDIT HISTORY" />
      {!auditHistory || auditHistory.length === 0 ? (
        <EmptyState
          title="No audit history"
          message="Run your first site audit to start tracking your site health over time."
        />
      ) : (
        auditHistory.map((a: any) => (
          <Card key={a.id} variant="sm">
            <View style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyDate, { color: colors.ink }]}>
                  {formatDate(a.completed_at ?? a.started_at)}
                </Text>
                <Text style={[styles.historyMeta, { color: colors.inkMuted }]}>
                  {a.pages_crawled ?? 0} pages · {a.issues_found ?? 0} issues
                </Text>
              </View>
              <View style={styles.historyRight}>
                <ScoreRing
                  score={a.health_score ?? 0}
                  size={40}
                  status={getScoreStatus(a.health_score ?? 0)}
                />
              </View>
            </View>
            <Badge
              label={a.status ?? "unknown"}
              variant={a.status === "completed" ? "green" : a.status === "failed" ? "red" : "gold"}
            />
          </Card>
        ))
      )}
    </View>
  );

  const handleBatchAnalyze = useCallback(() => {
    const urls = batchUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;

    setModal({
      visible: true,
      title: "Batch Analysis",
      message: `Analyzing ${urls.length} URL${urls.length > 1 ? "s" : ""}... This may take a moment.`,
      variant: "loading",
    });

    batchAnalyze.mutate(urls, {
      onSuccess: (d) => {
        setBatchResults((d as any)?.results ?? null);
        setModal({
          visible: true,
          title: "Batch Analysis Complete",
          message: `Analyzed ${(d as any)?.analyzed ?? 0} URLs successfully.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Batch Analysis Failed",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during batch analysis.",
          variant: "error",
        });
      },
    });
  }, [batchUrls, batchAnalyze]);

  const renderBatchAnalysisTab = () => (
    <View style={styles.section}>
      <SectionLabel text="BATCH URL ANALYSIS" />
      <Text
        style={[
          styles.batchDescription,
          { color: colors.inkMuted },
        ]}
      >
        Enter URLs (one per line) to analyze multiple pages at once.
      </Text>
      <TextInput
        style={[
          styles.batchInput,
          {
            backgroundColor: colors.surfaceInset,
            borderColor: colors.border,
            color: colors.ink,
          },
        ]}
        value={batchUrls}
        onChangeText={setBatchUrls}
        placeholder={"https://example.com/page-1\nhttps://example.com/page-2"}
        placeholderTextColor={colors.inkMuted}
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button
        title={batchAnalyze.isPending ? "Analyzing..." : "Analyze URLs"}
        variant="sm-red"
        onPress={handleBatchAnalyze}
        disabled={batchAnalyze.isPending || batchUrls.trim().length === 0}
        style={styles.batchButton}
      />
      {batchResults && batchResults.length > 0 ? (
        <View style={styles.batchResults}>
          <SectionLabel text="RESULTS" />
          {batchResults.map((result, idx) => (
            <Card key={idx}>
              {Object.entries(result).map(([key, val]) => (
                <View key={key} style={styles.batchResultRow}>
                  <Text style={[styles.batchResultKey, { color: colors.inkMuted }]}>
                    {key}
                  </Text>
                  <Text style={[styles.batchResultValue, { color: colors.ink }]}>
                    {String(val ?? "--")}
                  </Text>
                </View>
              ))}
            </Card>
          ))}
        </View>
      ) : (
        !batchAnalyze.isPending && (
          <EmptyState
            title="No results yet"
            message="Enter URLs above and tap Analyze to get started."
          />
        )
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "Overview":
        return renderOverviewTab();
      case "Issues":
        return renderIssuesTab();
      case "Pages":
        return renderPagesTab();
      case "History":
        return renderHistoryTab();
      case "Batch Analysis":
        return renderBatchAnalysisTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingAudit || isRefetchingIssues || isRefetchingPages || isRefetchingHistory}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            Crawl your site to discover technical SEO issues
          </Text>
          <Text style={[styles.headerInfo, { color: colors.inkMuted }]}>
            Last audit: {formatDate(audit?.completed_at ?? null)}
          </Text>
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  isActive && { borderBottomColor: colors.red, borderBottomWidth: 2 },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? colors.ink : colors.inkMuted },
                    isActive && styles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {renderTabContent()}
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

  // -- Tab Bar --
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    fontFamily: fonts.sansBold,
  },

  section: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.lg,
  },
  overallRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  overallRight: {
    flex: 1,
  },
  overallTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
  overallSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },
  runAuditButton: {
    width: "auto",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  cwvRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  categoryValue: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  categorySpacer: {
    height: 12,
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  viewAllText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // -- Pages Tab --
  pageTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  pageUrl: {
    fontFamily: fonts.mono,
    fontSize: 10,
    marginTop: 2,
  },
  pageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  pageMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },

  // -- History Tab --
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  historyMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  historyRight: {
    alignItems: "center",
  },

  // -- Batch Analysis --
  batchDescription: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  batchInput: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    borderWidth: 1,
    borderRadius: 0,
    padding: spacing.md,
    minHeight: 120,
  },
  batchButton: {
    width: "auto",
    alignSelf: "flex-start",
    marginTop: spacing.md,
  },
  batchResults: {
    marginTop: spacing.lg,
    gap: 8,
  },
  batchResultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  batchResultKey: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    textTransform: "uppercase",
  },
  batchResultValue: {
    fontFamily: fonts.mono,
    fontSize: 11,
    flexShrink: 1,
    textAlign: "right",
  },
});
