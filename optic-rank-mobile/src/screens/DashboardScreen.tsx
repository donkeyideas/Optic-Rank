import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/AppStack";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import KPIBox from "../components/ui/KPIBox";
import ScoreRing from "../components/ui/ScoreRing";
import ProgressBar from "../components/ui/ProgressBar";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import LoadingScreen from "../components/ui/LoadingScreen";
import ChartCarousel from "../components/ui/ChartCarousel";
import type { ChartSlide } from "../components/ui/ChartCarousel";

import TrialBanner from "../components/shared/TrialBanner";
import ProjectSelector from "../components/shared/ProjectSelector";

import { useOrganization, useProfile } from "../hooks/useProfile";
import { useActiveProject, useProjects } from "../hooks/useProjects";
import { useKeywords, useKeywordStats } from "../hooks/useKeywords";
import { useAIInsights } from "../hooks/useAIInsights";
import { useLatestAudit } from "../hooks/useSiteAudit";
import { useBacklinkStats } from "../hooks/useBacklinks";

import type { InsightType, Keyword } from "../types";

type DashboardNav = NativeStackNavigationProp<AppStackParamList>;

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_PADDING = spacing.screenPadding;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function insightBorderColor(type: InsightType): string {
  switch (type) {
    case "opportunity":
    case "win":
      return "#27ae60";
    case "alert":
    case "technical":
      return "#c0392b";
    case "prediction":
    case "content":
    case "backlinks":
    default:
      return "#b8860b";
  }
}

function insightBadgeVariant(
  type: InsightType
): "green" | "red" | "gold" {
  switch (type) {
    case "opportunity":
    case "win":
      return "green";
    case "alert":
    case "technical":
      return "red";
    case "prediction":
    case "content":
    case "backlinks":
    default:
      return "gold";
  }
}

// CTR curve for traffic estimates
function getPositionCTR(position: number | null): number {
  if (position === null || position <= 0) return 0;
  const ctrMap: Record<number, number> = { 1: 0.3, 2: 0.15, 3: 0.1, 4: 0.07, 5: 0.05 };
  if (position <= 5) return ctrMap[position] ?? 0.05;
  if (position <= 10) return 0.03;
  if (position <= 20) return 0.02;
  return 0.01;
}

const INTENT_LABELS: Record<string, string> = {
  informational: "Informational",
  transactional: "Transactional",
  navigational: "Navigational",
  commercial: "Commercial",
};

const INTENT_COLORS: Record<string, string> = {
  informational: "#3498db",
  transactional: "#27ae60",
  navigational: "#b8860b",
  commercial: "#c0392b",
};

function positionColor(
  pos: number | null,
  inkColor: string
): string {
  if (pos == null) return inkColor;
  if (pos === 1) return "#c0392b";
  if (pos <= 3) return "#27ae60";
  return inkColor;
}

function scoreStatus(score: number): "good" | "warn" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<DashboardNav>();

  // --- Data hooks ---
  const { data: org } = useOrganization();
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const { data: keywordStats } = useKeywordStats(projectId);
  const { data: keywordsResult } = useKeywords(projectId, { limit: 4 });
  const { data: allKeywordsResult } = useKeywords(projectId, { limit: 50 });
  const { data: aiInsights } = useAIInsights(projectId, { limit: 3 });
  const { data: audit } = useLatestAudit(projectId);
  const { data: backlinkStats } = useBacklinkStats(projectId);

  // Safe defaults
  const stats = keywordStats ?? {
    total: 0,
    top3Count: 0,
    top10Count: 0,
    avgPosition: 0,
    upCount: 0,
    downCount: 0,
    organicTraffic: 0,
    aiVisibilityAvg: 0,
  };
  const topKeywords = keywordsResult?.data ?? [];
  const allKeywords: Keyword[] = allKeywordsResult?.data ?? [];
  const insights = aiInsights ?? [];

  // Chart width
  const chartWidth = SCREEN_WIDTH - SCREEN_PADDING * 2 - 16 * 2;

  // Keyword Strength Map — top 12 ranked keywords by position
  const strengthMapData = useMemo(() => {
    return allKeywords
      .filter((k) => k.current_position != null && k.current_position > 0)
      .sort((a, b) => (a.current_position ?? 100) - (b.current_position ?? 100))
      .slice(0, 12)
      .map((k) => ({
        keyword: k.keyword.length > 20 ? k.keyword.slice(0, 18) + "..." : k.keyword,
        position: k.current_position ?? 0,
        volume: k.search_volume ?? 0,
        strength: Math.max(0, 100 - ((k.current_position ?? 50) - 1) * 2),
      }));
  }, [allKeywords]);

  // Traffic Intelligence — computed from keywords
  const trafficByIntent = useMemo(() => {
    const groups: Record<string, { count: number; traffic: number }> = {};
    for (const kw of allKeywords) {
      const intent = kw.intent ?? "unknown";
      if (!groups[intent]) groups[intent] = { count: 0, traffic: 0 };
      groups[intent].count++;
      if (kw.current_position != null && kw.current_position > 0) {
        groups[intent].traffic += (kw.search_volume ?? 0) * getPositionCTR(kw.current_position);
      }
    }
    return Object.entries(groups)
      .map(([intent, d]) => ({ intent, label: INTENT_LABELS[intent] ?? "Unknown", count: d.count, estTraffic: Math.round(d.traffic) }))
      .sort((a, b) => b.estTraffic - a.estTraffic);
  }, [allKeywords]);

  const totalEstTraffic = useMemo(() => {
    return allKeywords.reduce((sum, kw) => {
      if (kw.current_position != null && kw.current_position > 0) {
        return sum + (kw.search_volume ?? 0) * getPositionCTR(kw.current_position);
      }
      return sum;
    }, 0);
  }, [allKeywords]);

  const maxIntentTraffic = Math.max(...trafficByIntent.map((i) => i.estTraffic), 1);

  // Top Traffic Keywords — top 10 by estimated traffic
  const topTrafficKeywords = useMemo(() => {
    return allKeywords
      .filter((k) => k.current_position != null && k.current_position > 0)
      .map((k) => ({
        keyword: k.keyword.length > 18 ? k.keyword.slice(0, 16) + "..." : k.keyword,
        position: k.current_position ?? 0,
        volume: k.search_volume ?? 0,
        estTraffic: Math.round((k.search_volume ?? 0) * getPositionCTR(k.current_position)),
      }))
      .sort((a, b) => b.estTraffic - a.estTraffic)
      .slice(0, 10);
  }, [allKeywords]);

  const maxTopTraffic = Math.max(...topTrafficKeywords.map((k) => k.estTraffic), 1);

  // Traffic Opportunity — top 8 keywords by volume (treemap-like grid)
  const trafficOpportunity = useMemo(() => {
    return allKeywords
      .filter((k) => (k.search_volume ?? 0) > 0)
      .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
      .slice(0, 8)
      .map((k) => ({
        keyword: k.keyword.length > 12 ? k.keyword.slice(0, 10) + "..." : k.keyword,
        volume: k.search_volume ?? 0,
        position: k.current_position ?? 0,
      }));
  }, [allKeywords]);

  const maxOpportunityVol = Math.max(...trafficOpportunity.map((k) => k.volume), 1);

  const healthScore = audit?.health_score ?? 0;
  const seoScore = audit?.seo_score ?? 0;

  // Organic traffic: CTR-based estimate from all keywords
  const organicTraffic = stats.organicTraffic;

  // Backlinks total from real data
  const totalBacklinks = backlinkStats?.total ?? 0;
  const newBacklinks = backlinkStats?.newThisWeek ?? 0;

  // Authority Score: use DB value or compute fallback matching web formula
  const authorityScore = (() => {
    if (project?.authority_score != null && project.authority_score > 0) {
      return project.authority_score;
    }
    // Fallback: 40% audit health + 30% top10 keyword % + 30% backlink log scale
    const auditComponent = (healthScore / 100) * 40;
    const kwPct = stats.total > 0 ? Math.min((stats.top10Count / stats.total) * 100, 100) : 0;
    const kwComponent = kwPct * 0.3;
    const blComponent = Math.min(Math.log10(totalBacklinks + 1) * 20, 100) * 0.3;
    return Math.min(Math.round(auditComponent + kwComponent + blComponent), 100);
  })();

  // AI visibility: average from ALL keywords (not just top 4)
  const aiVisibilityPct = stats.aiVisibilityAvg;

  // --- Loading state ---
  if (projectLoading) {
    return <LoadingScreen />;
  }

  if (!project) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.statusBar }]} edges={["top"]}>
        <ScrollView
          style={[styles.scroll, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Paper Header */}
          <View style={[styles.paperHeader, { backgroundColor: colors.background }]}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="menu" size={20} color={colors.ink} />
              </TouchableOpacity>
              <Text style={[styles.paperTitle, { color: colors.ink }]}>Optic Rank</Text>
              <View style={styles.headerRightIcons}>
                <TouchableOpacity
                  onPress={toggleTheme}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name={isDark ? "sun" : "moon"} size={18} color={colors.ink} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Profile" as any)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="user" size={20} color={colors.ink} />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={[styles.paperSubtitle, { color: colors.inkMuted }]}>AI-Powered SEO Intelligence</Text>
            <Divider variant="thick" />
          </View>

          {/* Onboarding */}
          <View style={styles.body}>
            <View style={[styles.onboardingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="compass" size={36} color={colors.red} />
              <Text style={[styles.onboardingTitle, { color: colors.ink }]}>
                Welcome to Optic Rank
              </Text>
              <Text style={[styles.onboardingSubtitle, { color: colors.inkSecondary }]}>
                Set up your first project to start tracking rankings, traffic, and AI visibility.
              </Text>

              <TouchableOpacity
                style={[styles.onboardingButton, { backgroundColor: colors.ink }]}
                onPress={() => navigation.navigate("CreateProject" as any)}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={18} color={colors.surface} />
                <Text style={[styles.onboardingButtonText, { color: colors.surface }]}>
                  CREATE YOUR FIRST PROJECT
                </Text>
              </TouchableOpacity>
            </View>

            {/* Onboarding Checklist */}
            <Text style={[styles.checklistTitle, { color: colors.ink }]}>Getting Started</Text>
            {[
              { step: 1, label: "Create Your Organization", done: true, desc: "Your workspace is ready." },
              { step: 2, label: "Add Your First Project", done: false, desc: "Add your website or app to begin tracking." },
              { step: 3, label: "Track Your Keywords", done: false, desc: "Add keywords to monitor positions daily." },
              { step: 4, label: "Run a Site Audit", done: false, desc: "Get your first health score in seconds." },
            ].map((item) => (
              <View
                key={item.step}
                style={[styles.checklistItem, { borderColor: colors.border }]}
              >
                <View style={[
                  styles.checklistCircle,
                  { backgroundColor: item.done ? colors.green : "transparent", borderColor: item.done ? colors.green : colors.border },
                ]}>
                  {item.done ? (
                    <Feather name="check" size={12} color="#fff" />
                  ) : (
                    <Text style={[styles.checklistNum, { color: colors.inkMuted }]}>{item.step}</Text>
                  )}
                </View>
                <View style={styles.checklistContent}>
                  <Text style={[styles.checklistLabel, { color: item.done ? colors.inkMuted : colors.ink }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.checklistDesc, { color: colors.inkMuted }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.statusBar }]} edges={["top"]}>
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Paper Header                                                        */}
      {/* ------------------------------------------------------------------ */}
      <View
        style={[styles.paperHeader, { backgroundColor: colors.background }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="menu" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={[styles.paperTitle, { color: colors.ink }]}>
            Optic Rank
          </Text>
          <View style={styles.headerRightIcons}>
            <TouchableOpacity
              onPress={toggleTheme}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name={isDark ? "sun" : "moon"} size={18} color={colors.ink} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile" as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="user" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.paperSubtitle, { color: colors.inkMuted }]}>
          AI-Powered SEO Intelligence
        </Text>
        <Text style={[styles.paperDate, { color: colors.gold }]}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </Text>
        <Divider variant="thick" />
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Content body with screen padding                                    */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.body}>
        {/* Project selector */}
        <ProjectSelector />

        {/* 3. Trial banner */}
        {org?.trial_ends_at ? (
          <TrialBanner
            trialEndsAt={org.trial_ends_at}
            onUpgrade={() => navigation.navigate("Billing")}
          />
        ) : null}

        {/* -------------------------------------------------------------- */}
        {/* 4. Today's Numbers                                              */}
        {/* -------------------------------------------------------------- */}
        <SectionLabel text="Today's Numbers" />
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCell}>
            <KPIBox
              value={String(authorityScore)}
              label="Authority Score"
              deltaType="neutral"
            />
          </View>
          <View style={styles.kpiCell}>
            <KPIBox
              value={formatNumber(organicTraffic)}
              label="Organic Traffic"
              deltaType="neutral"
            />
          </View>
          <View style={styles.kpiCell}>
            <KPIBox
              value={String(stats.total)}
              label="Keywords Ranked"
              delta={
                stats.avgPosition > 0
                  ? `Avg #${stats.avgPosition.toFixed(1)}`
                  : undefined
              }
              deltaType={stats.upCount > 0 ? "up" : "neutral"}
            />
          </View>
          <View style={styles.kpiCell}>
            <KPIBox
              value={`${aiVisibilityPct}%`}
              label="Visibility"
              deltaType="neutral"
            />
          </View>
          <View style={styles.kpiCell}>
            <KPIBox
              value={formatNumber(totalBacklinks)}
              label="Backlinks"
              delta={
                newBacklinks > 0
                  ? `+${newBacklinks}`
                  : undefined
              }
              deltaType={newBacklinks > 0 ? "up" : "neutral"}
            />
          </View>
        </View>

        {/* -------------------------------------------------------------- */}
        {/* 5. Keyword Analytics — Chart Carousel                            */}
        {/* -------------------------------------------------------------- */}
        <SectionLabel text="Keyword Analytics" style={styles.sectionSpacing} />
        <ChartCarousel
          slides={[
            /* Slide 1: Strength Map */
            {
              label: "Strength Map",
              chart: strengthMapData.length === 0 ? (
                <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>No ranked keywords yet.</Text>
              ) : (
                <View style={styles.strengthMap}>
                  {strengthMapData.map((item, i) => {
                    const barColor = item.position <= 3 ? "#8b0000" : item.position <= 10 ? "#c0392b" : item.position <= 20 ? "#e74c3c" : "#ff7675";
                    const barWidth = Math.max(8, (item.strength / 100) * chartWidth * 0.6);
                    const opacity = item.volume > 0 ? Math.max(0.4, Math.min(1, item.volume / 10000)) : 0.6;
                    return (
                      <View key={i} style={styles.barRow}>
                        <Text style={[styles.barKeyword, { color: colors.ink }]} numberOfLines={1}>{item.keyword}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.bar, { width: barWidth, backgroundColor: barColor, opacity }]} />
                          <Text style={[styles.barPosition, { color: colors.inkMuted }]}>#{item.position}</Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.legendRow}>
                    {[{ label: "Top 3", color: "#8b0000" }, { label: "4-10", color: "#c0392b" }, { label: "11-20", color: "#e74c3c" }, { label: "21-50", color: "#ff7675" }].map((l) => (
                      <View key={l.label} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                        <Text style={[styles.legendLabel, { color: colors.inkMuted }]}>{l.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ),
            },
            /* Slide 3: Traffic Opportunity */
            {
              label: "Traffic Opportunity",
              chart: trafficOpportunity.length === 0 ? (
                <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>No keyword volume data.</Text>
              ) : (
                <View>
                  {/* 2-column fixed grid */}
                  {Array.from({ length: Math.ceil(trafficOpportunity.length / 2) }).map((_, rowIdx) => {
                    const left = trafficOpportunity[rowIdx * 2];
                    const right = trafficOpportunity[rowIdx * 2 + 1];
                    return (
                      <View key={rowIdx} style={styles.treemapRow}>
                        {[left, right].filter(Boolean).map((item, ci) => {
                          const size = Math.max(0.3, item.volume / maxOpportunityVol);
                          const bgColor = item.position <= 3 ? "#8b0000" : item.position <= 10 ? "#c0392b" : item.position <= 20 ? "#e74c3c" : item.position > 0 ? "#ff7675" : colors.inkMuted;
                          return (
                            <View key={ci} style={[styles.treemapItem, { backgroundColor: bgColor, opacity: 0.4 + size * 0.6 }]}>
                              <Text style={styles.treemapKeyword} numberOfLines={1}>{item.keyword}</Text>
                              <Text style={styles.treemapVolume}>{formatNumber(item.volume)}</Text>
                              {item.position > 0 && <Text style={styles.treemapRank}>#{item.position}</Text>}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              ),
            },
            /* Slide 4: Top Traffic Keywords */
            {
              label: "Top Traffic",
              chart: topTrafficKeywords.length === 0 ? (
                <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>No traffic data yet.</Text>
              ) : (
                <View style={styles.strengthMap}>
                  {topTrafficKeywords.map((item, i) => {
                    const barColor = item.position <= 3 ? "#8b0000" : item.position <= 10 ? "#c0392b" : item.position <= 20 ? "#e74c3c" : "#ff7675";
                    const barWidth = Math.max(8, (item.estTraffic / maxTopTraffic) * chartWidth * 0.5);
                    return (
                      <View key={i} style={styles.barRow}>
                        <Text style={[styles.barKeyword, { color: colors.ink }]} numberOfLines={1}>{item.keyword}</Text>
                        <View style={styles.barContainer}>
                          <View style={[styles.bar, { width: barWidth, backgroundColor: barColor }]} />
                          <Text style={[styles.barPosition, { color: colors.inkMuted }]}>{formatNumber(item.estTraffic)}</Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.legendLabel, { color: colors.inkMuted, textAlign: "center" }]}>
                      Total: {formatNumber(Math.round(totalEstTraffic))} est. monthly visits
                    </Text>
                  </View>
                </View>
              ),
            },
            /* Slide 5: Traffic by Intent */
            {
              label: "Traffic by Intent",
              chart: trafficByIntent.length === 0 ? (
                <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>No intent data.</Text>
              ) : (
                <View>
                  <View style={styles.trafficKpiRow}>
                    <View style={styles.trafficKpi}>
                      <Text style={[styles.trafficKpiValue, { color: colors.ink }]}>{formatNumber(Math.round(totalEstTraffic))}</Text>
                      <Text style={[styles.trafficKpiLabel, { color: colors.inkMuted }]}>EST. MONTHLY</Text>
                    </View>
                    <View style={styles.trafficKpi}>
                      <Text style={[styles.trafficKpiValue, { color: colors.ink }]}>{allKeywords.filter((k) => k.current_position != null && k.current_position > 0).length}</Text>
                      <Text style={[styles.trafficKpiLabel, { color: colors.inkMuted }]}>RANKED</Text>
                    </View>
                  </View>
                  <View style={styles.intentSection}>
                    {trafficByIntent.map((item) => {
                      const pct = item.estTraffic / maxIntentTraffic;
                      const barColor = INTENT_COLORS[item.intent] ?? colors.inkMuted;
                      return (
                        <View key={item.intent} style={styles.intentRow}>
                          <Text style={[styles.intentLabel, { color: colors.ink }]} numberOfLines={1}>{item.label}</Text>
                          <View style={styles.intentBarWrap}>
                            <View style={[styles.intentBarBg, { backgroundColor: barColor + "20" }]}>
                              <View style={[styles.intentBar, { width: `${Math.max(5, pct * 100)}%`, backgroundColor: barColor }]} />
                            </View>
                          </View>
                          <Text style={[styles.intentValue, { color: colors.ink }]}>{formatNumber(item.estTraffic)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ),
            },
            /* Slide 6: Rank vs Volume */
            {
              label: "Rank vs Volume",
              chart: strengthMapData.length === 0 ? (
                <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>No data yet.</Text>
              ) : (() => {
                const positions = strengthMapData.map((d) => d.position);
                const volumes = strengthMapData.map((d) => d.volume);
                const minPos = Math.max(1, Math.min(...positions));
                const maxPos = Math.max(minPos + 1, Math.max(...positions));
                const maxVol = Math.max(...volumes, 1);
                const posRange = maxPos - minPos || 1;
                return (
                  <View>
                    <Text style={[styles.chartSubtitle, { color: colors.inkMuted, marginBottom: 4 }]}>POSITION × SEARCH VOLUME</Text>
                    <View style={styles.scatterContainer}>
                      {/* Y-axis labels */}
                      <View style={styles.scatterYAxis}>
                        <Text style={[styles.scatterTickLabel, { color: colors.inkMuted }]}>{formatNumber(maxVol)}</Text>
                        <Text style={[styles.scatterTickLabel, { color: colors.inkMuted }]}>{formatNumber(Math.round(maxVol / 2))}</Text>
                        <Text style={[styles.scatterTickLabel, { color: colors.inkMuted }]}>0</Text>
                      </View>
                      {/* Scatter plot area */}
                      <View style={[styles.scatterArea, { borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.border }]}>
                        {/* Grid lines */}
                        <View style={[styles.scatterGridLine, { top: "25%", borderColor: colors.border }]} />
                        <View style={[styles.scatterGridLine, { top: "50%", borderColor: colors.border }]} />
                        <View style={[styles.scatterGridLine, { top: "75%", borderColor: colors.border }]} />
                        {strengthMapData.map((item, i) => {
                          const x = ((item.position - minPos) / posRange) * 0.85 + 0.05;
                          const y = 1 - (item.volume / maxVol) * 0.85 - 0.05;
                          const dotColor = item.position <= 3 ? "#8b0000" : item.position <= 10 ? "#c0392b" : item.position <= 20 ? "#e74c3c" : "#ff7675";
                          const dotSize = Math.max(8, Math.min(18, (item.volume / maxVol) * 14 + 8));
                          return (
                            <View key={i} style={[styles.scatterDot, { left: `${x * 100}%`, top: `${y * 100}%`, width: dotSize, height: dotSize, backgroundColor: dotColor, borderRadius: dotSize / 2, marginLeft: -dotSize / 2, marginTop: -dotSize / 2 }]} />
                          );
                        })}
                      </View>
                    </View>
                    {/* X-axis labels */}
                    <View style={styles.scatterXAxis}>
                      <View style={{ width: 30 }} />
                      <Text style={[styles.scatterTickLabel, { color: colors.inkMuted }]}>#{minPos}</Text>
                      <Text style={[styles.scatterTickLabel, { color: colors.inkMuted }]}>#{Math.round((minPos + maxPos) / 2)}</Text>
                      <Text style={[styles.scatterTickLabel, { color: colors.inkMuted }]}>#{maxPos}</Text>
                    </View>
                    <Text style={[styles.scatterAxisLabel, { color: colors.inkMuted, textAlign: "center", marginTop: 2 }]}>POSITION (lower = better)</Text>
                  </View>
                );
              })(),
            },
          ] as ChartSlide[]}
        />

        {/* -------------------------------------------------------------- */}
        {/* 7. AI Intelligence Brief                                        */}
        {/* -------------------------------------------------------------- */}
        <SectionLabel
          text="AI Intelligence Brief"
          style={styles.sectionSpacing}
        />
        {insights.length === 0 ? (
          <Card variant="sm">
            <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>
              No insights yet. Data will appear after your first analysis.
            </Text>
          </Card>
        ) : (
          insights.map((insight) => (
            <Card
              key={insight.id}
              variant="sm"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: insightBorderColor(insight.type),
              }}
            >
              <Badge
                label={insight.type}
                variant={insightBadgeVariant(insight.type)}
              />
              <Text
                style={[styles.insightTitle, { color: colors.ink }]}
                numberOfLines={2}
              >
                {insight.title}
              </Text>
              <Text
                style={[
                  styles.insightDescription,
                  { color: colors.inkSecondary },
                ]}
                numberOfLines={3}
              >
                {insight.description}
              </Text>
              {insight.action_label ? (
                <Text style={[styles.insightAction, { color: colors.red }]}>
                  {insight.action_label}
                </Text>
              ) : null}
            </Card>
          ))
        )}

        {/* -------------------------------------------------------------- */}
        {/* 7. Top Ranked Keywords                                          */}
        {/* -------------------------------------------------------------- */}
        <SectionLabel
          text="Top Ranked Keywords"
          style={styles.sectionSpacing}
        />
        <Card>
          {topKeywords.length === 0 ? (
            <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>
              No keywords tracked yet.
            </Text>
          ) : (
            topKeywords.map((kw, index) => {
              const pos = kw.current_position;
              const prev = kw.previous_position;
              const delta =
                pos != null && prev != null ? prev - pos : null;
              const deltaSymbol =
                delta != null && delta > 0
                  ? "\u25B2"
                  : delta != null && delta < 0
                  ? "\u25BC"
                  : "";
              const deltaColor =
                delta != null && delta > 0
                  ? colors.green
                  : delta != null && delta < 0
                  ? colors.red
                  : colors.inkMuted;

              return (
                <View key={kw.id}>
                  {index > 0 && <Divider />}
                  <View style={styles.kwRow}>
                    <Text
                      style={[styles.kwName, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {kw.keyword}
                    </Text>
                    <View style={styles.kwRight}>
                      <Text
                        style={[
                          styles.kwPosition,
                          {
                            color: positionColor(pos, colors.ink),
                          },
                        ]}
                      >
                        {pos != null ? `#${pos}` : "--"}
                      </Text>
                      {delta != null && delta !== 0 && (
                        <Text
                          style={[styles.kwDelta, { color: deltaColor }]}
                        >
                          {deltaSymbol}
                          {Math.abs(delta)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* -------------------------------------------------------------- */}
        {/* 8. Marketing Health                                             */}
        {/* -------------------------------------------------------------- */}
        <SectionLabel
          text="Marketing Health"
          style={styles.sectionSpacing}
        />
        <Card>
          <View style={styles.healthRow}>
            {/* Left: ScoreRing */}
            <ScoreRing
              score={healthScore}
              size={72}
              status={scoreStatus(healthScore)}
            />

            {/* Right: bars */}
            <View style={styles.healthBars}>
              <Text style={[styles.healthTitle, { color: colors.ink }]}>
                Overall Health
              </Text>

              {/* SEO bar */}
              <View style={styles.barGroup}>
                <View style={styles.barLabelRow}>
                  <Text
                    style={[styles.barLabel, { color: colors.ink }]}
                  >
                    SEO
                  </Text>
                  <Text
                    style={[styles.barValue, { color: colors.ink }]}
                  >
                    {seoScore}%
                  </Text>
                </View>
                <ProgressBar value={seoScore} color={colors.green} />
              </View>

              {/* Content bar */}
              <View style={styles.barGroup}>
                <View style={styles.barLabelRow}>
                  <Text
                    style={[styles.barLabel, { color: colors.ink }]}
                  >
                    Content
                  </Text>
                  <Text
                    style={[styles.barValue, { color: colors.ink }]}
                  >
                    {audit?.performance_score ?? 0}%
                  </Text>
                </View>
                <ProgressBar
                  value={audit?.performance_score ?? 0}
                  color={colors.gold}
                />
              </View>

              {/* AI Visibility bar */}
              <View style={styles.barGroup}>
                <View style={styles.barLabelRow}>
                  <Text
                    style={[styles.barLabel, { color: colors.ink }]}
                  >
                    AI Visibility
                  </Text>
                  <Text
                    style={[styles.barValue, { color: colors.ink }]}
                  >
                    {aiVisibilityPct}%
                  </Text>
                </View>
                <ProgressBar
                  value={aiVisibilityPct}
                  color={colors.gold}
                />
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </View>
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
  scroll: {
    flex: 1,
  },

  // -- Paper Header --
  paperHeader: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 16,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 4,
  },
  headerRightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  paperTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: 20,
    fontWeight: "900",
  },
  paperSubtitle: {
    fontSize: 8,
    fontFamily: fonts.sans,
    marginTop: 2,
  },
  paperDate: {
    fontFamily: fonts.mono,
    fontSize: 9,
    marginTop: 4,
  },

  // -- Body --
  body: {
    paddingHorizontal: SCREEN_PADDING,
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

  sectionSpacing: {
    marginTop: 16,
  },

  // -- Insights --
  insightTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    marginTop: 6,
  },
  insightDescription: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  insightAction: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },

  // -- Keywords table --
  kwRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  kwName: {
    flex: 1,
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  kwRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kwPosition: {
    fontFamily: fonts.mono,
    fontSize: 16,
    fontWeight: "700",
  },
  kwDelta: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },

  // -- Health --
  healthRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  healthBars: {
    flex: 1,
  },
  healthTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    marginBottom: 8,
  },
  barGroup: {
    marginBottom: 8,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
  },
  barValue: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },

  // -- Onboarding --
  onboardingCard: {
    alignItems: "center",
    padding: 28,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  onboardingTitle: {
    fontFamily: fonts.serifExtraBold,
    fontSize: 22,
    textAlign: "center",
  },
  onboardingSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  onboardingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    marginTop: 8,
  },
  onboardingButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    letterSpacing: 1,
  },
  checklistTitle: {
    fontFamily: fonts.serif,
    fontSize: 16,
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  checklistCircle: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  checklistNum: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  checklistContent: {
    flex: 1,
  },
  checklistLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
  },
  checklistDesc: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },

  // -- Empty states --
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    textAlign: "center",
  },
  emptyCardText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 12,
  },

  // -- Keyword Analytics Charts --
  chartTitle: {
    fontFamily: fonts.serifExtraBold,
    fontSize: 14,
    marginBottom: 2,
  },
  chartSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  strengthMap: {
    gap: 6,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barKeyword: {
    fontFamily: fonts.sans,
    fontSize: 10,
    width: 90,
  },
  barContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bar: {
    height: 14,
  },
  barPosition: {
    fontFamily: fonts.mono,
    fontSize: 9,
  },
  legendRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
  },
  legendLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
  },

  // -- Treemap (Traffic Opportunity) --
  treemapRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  treemapItem: {
    flex: 1,
    height: 52,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  treemapKeyword: {
    fontFamily: fonts.sans,
    fontSize: 8,
    color: "#fff",
    textAlign: "center",
  },
  treemapVolume: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    marginTop: 2,
  },
  treemapRank: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: "rgba(255,255,255,0.7)",
  },

  // -- Scatter (Rank vs Volume) --
  scatterContainer: {
    flexDirection: "row",
    gap: 4,
  },
  scatterYAxis: {
    width: 30,
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 4,
  },
  scatterArea: {
    flex: 1,
    height: 160,
    position: "relative",
    overflow: "hidden",
  },
  scatterGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scatterDot: {
    position: "absolute",
  },
  scatterXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  scatterTickLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
  },
  scatterAxisLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // -- Traffic Intelligence --
  trafficKpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  trafficKpi: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  trafficKpiValue: {
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: "700",
  },
  trafficKpiLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 2,
  },
  intentSection: {
    gap: 8,
  },
  intentSectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  intentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  intentLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    width: 80,
  },
  intentBarWrap: {
    flex: 1,
  },
  intentBarBg: {
    height: 16,
    overflow: "hidden",
  },
  intentBar: {
    height: 16,
  },
  intentValue: {
    fontFamily: fonts.mono,
    fontSize: 10,
    width: 40,
    textAlign: "right",
  },

  // -- Bottom spacer --
  bottomSpacer: {
    height: 100,
  },
});
