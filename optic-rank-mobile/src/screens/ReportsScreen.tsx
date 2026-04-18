import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import ScoreRing from "../components/ui/ScoreRing";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import {
  useScheduledReports,
  useAuditHistory,
  useBacklinkSnapshots,
} from "../hooks/useReports";
import { useActiveProject } from "../hooks/useProjects";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type {
  ScheduledReport,
  BacklinkSnapshot,
} from "../hooks/useReports";

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
  });
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function scheduleVariant(
  schedule: string
): "blue" | "gold" | "red" | "dark" {
  switch (schedule) {
    case "daily":
      return "blue";
    case "weekly":
      return "gold";
    case "monthly":
      return "red";
    default:
      return "dark";
  }
}

function scoreStatus(score: number | null): "good" | "warn" | "bad" {
  if (score == null) return "bad";
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ReportsScreen() {
  const { colors } = useTheme();

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const {
    data: scheduledReports,
    isLoading: reportsLoading,
    refetch: refetchReports,
    isRefetching: isRefetchingReports,
  } = useScheduledReports(projectId);

  const {
    data: auditHistory,
    refetch: refetchAudits,
    isRefetching: isRefetchingAudits,
  } = useAuditHistory(projectId);

  const {
    data: backlinkSnapshots,
    refetch: refetchSnapshots,
    isRefetching: isRefetchingSnapshots,
  } = useBacklinkSnapshots(projectId);

  const isRefreshing =
    isRefetchingReports || isRefetchingAudits || isRefetchingSnapshots;

  const handleRefresh = useCallback(() => {
    refetchReports();
    refetchAudits();
    refetchSnapshots();
  }, [refetchReports, refetchAudits, refetchSnapshots]);

  // --- Loading ---
  if (projectLoading || (reportsLoading && !scheduledReports)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Reports" />;

  const reports = scheduledReports ?? [];
  const audits = auditHistory ?? [];
  const snapshots = backlinkSnapshots ?? [];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={[]}
    >
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.red}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            Scheduled reports, audit history, and backlink trends
          </Text>
        </View>

        <Divider />

        <View style={styles.body}>
            {/* -------------------------------------------------------------- */}
            {/* Scheduled Reports                                              */}
            {/* -------------------------------------------------------------- */}
            <SectionLabel text="Scheduled Reports" />
            {reports.length === 0 ? (
              <EmptyState
                title="No Scheduled Reports"
                message="Set up automated reports to receive regular SEO intelligence updates by email."
              />
            ) : (
              reports.map((report: ScheduledReport) => (
                <Card key={report.id} variant="sm">
                  <View style={styles.reportHeader}>
                    <Text
                      style={[styles.reportName, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {report.name}
                    </Text>
                    <View style={styles.reportBadges}>
                      <Badge
                        label={report.schedule}
                        variant={scheduleVariant(report.schedule)}
                      />
                      <Badge
                        label={report.is_active ? "Active" : "Paused"}
                        variant={report.is_active ? "green" : "outline"}
                      />
                    </View>
                  </View>
                  <View style={styles.reportMeta}>
                    <Text
                      style={[styles.reportMetaText, { color: colors.inkMuted }]}
                    >
                      {report.recipients.length} recipient
                      {report.recipients.length !== 1 ? "s" : ""}
                    </Text>
                    <Text
                      style={[styles.reportMetaText, { color: colors.inkMuted }]}
                    >
                      Last sent: {formatDate(report.last_sent_at)}
                    </Text>
                  </View>
                </Card>
              ))
            )}

            {/* -------------------------------------------------------------- */}
            {/* Recent Audits                                                   */}
            {/* -------------------------------------------------------------- */}
            <SectionLabel text="Recent Audits" style={styles.sectionSpacing} />
            {audits.length === 0 ? (
              <EmptyState
                title="No Audits"
                message="Run a site audit to see health scores and discovered issues."
              />
            ) : (
              audits.slice(0, 10).map((audit) => {
                const healthScore = audit.health_score ?? 0;
                return (
                  <Card key={audit.id} variant="sm">
                    <View style={styles.auditRow}>
                      <ScoreRing
                        score={healthScore}
                        size={48}
                        status={scoreStatus(audit.health_score)}
                      />
                      <View style={styles.auditInfo}>
                        <View style={styles.auditTop}>
                          <Text
                            style={[styles.auditDate, { color: colors.ink }]}
                          >
                            {formatDate(audit.completed_at ?? audit.started_at)}
                          </Text>
                          <Badge
                            label={audit.status}
                            variant={
                              audit.status === "completed" ? "green" : "gold"
                            }
                          />
                        </View>
                        <View style={styles.auditStats}>
                          <Text
                            style={[
                              styles.auditStatText,
                              { color: colors.inkMuted },
                            ]}
                          >
                            {audit.pages_crawled} pages crawled
                          </Text>
                          <Text
                            style={[
                              styles.auditStatText,
                              { color: colors.inkMuted },
                            ]}
                          >
                            {audit.issues_found} issues found
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}

            {/* -------------------------------------------------------------- */}
            {/* Backlink Trend                                                  */}
            {/* -------------------------------------------------------------- */}
            <SectionLabel text="Backlink Trend" style={styles.sectionSpacing} />
            {snapshots.length === 0 ? (
              <EmptyState
                title="No Backlink Data"
                message="Backlink snapshots will appear here once your project's backlink profile is being tracked."
              />
            ) : (
              <Card>
                {snapshots.slice(-15).map((snap: BacklinkSnapshot, index: number) => (
                  <View key={snap.id}>
                    {index > 0 && <Divider />}
                    <View style={styles.snapshotRow}>
                      <Text
                        style={[
                          styles.snapshotDate,
                          { color: colors.inkMuted },
                        ]}
                      >
                        {formatShortDate(snap.snapshot_date)}
                      </Text>
                      <View style={styles.snapshotStats}>
                        <View style={styles.snapshotStat}>
                          <Text
                            style={[
                              styles.snapshotValue,
                              { color: colors.ink },
                            ]}
                          >
                            {formatNumber(snap.total_backlinks)}
                          </Text>
                          <Text
                            style={[
                              styles.snapshotLabel,
                              { color: colors.inkMuted },
                            ]}
                          >
                            Total
                          </Text>
                        </View>
                        <View style={styles.snapshotStat}>
                          <Text
                            style={[
                              styles.snapshotValue,
                              { color: colors.ink },
                            ]}
                          >
                            {formatNumber(snap.referring_domains)}
                          </Text>
                          <Text
                            style={[
                              styles.snapshotLabel,
                              { color: colors.inkMuted },
                            ]}
                          >
                            Domains
                          </Text>
                        </View>
                        <View style={styles.snapshotStat}>
                          <Text
                            style={[
                              styles.snapshotValue,
                              { color: colors.green },
                            ]}
                          >
                            +{snap.new_backlinks}
                          </Text>
                          <Text
                            style={[
                              styles.snapshotLabel,
                              { color: colors.inkMuted },
                            ]}
                          >
                            New
                          </Text>
                        </View>
                        <View style={styles.snapshotStat}>
                          <Text
                            style={[
                              styles.snapshotValue,
                              { color: colors.red },
                            ]}
                          >
                            -{snap.lost_backlinks}
                          </Text>
                          <Text
                            style={[
                              styles.snapshotLabel,
                              { color: colors.inkMuted },
                            ]}
                          >
                            Lost
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </Card>
            )}
          </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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

  // Body
  body: {
    paddingHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
  },

  sectionSpacing: {
    marginTop: 16,
  },

  // Scheduled Reports
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  reportName: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  reportBadges: {
    flexDirection: "row",
    gap: 4,
  },
  reportMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reportMetaText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },

  // Audit History
  auditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  auditInfo: {
    flex: 1,
  },
  auditTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  auditDate: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  auditStats: {
    flexDirection: "row",
    gap: 16,
  },
  auditStatText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },

  // Backlink Snapshots
  snapshotRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 12,
  },
  snapshotDate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    width: 50,
  },
  snapshotStats: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  snapshotStat: {
    alignItems: "center",
  },
  snapshotValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  snapshotLabel: {
    fontFamily: fonts.sans,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 1,
  },

  bottomSpacer: {
    height: 100,
  },
});
