import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { supabase } from "../lib/supabase";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionLabel from "../components/ui/SectionLabel";
import ScoreRing from "../components/ui/ScoreRing";
import Divider from "../components/ui/Divider";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import Button from "../components/ui/Button";
import AppModal from "../components/ui/AppModal";

import InsightCard from "../components/insights/InsightCard";
import VisibilityMatrix from "../components/insights/VisibilityMatrix";

import { useAIInsights } from "../hooks/useAIInsights";
import { usePredictions, PredictionWithKeyword } from "../hooks/usePredictions";
import { useActiveProject } from "../hooks/useProjects";
import { useKeywords } from "../hooks/useKeywords";
import { useGenerateInsights } from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type { AIVisibilityCheck } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["Visibility", "Predictions", "Insights"] as const;
type Tab = (typeof TABS)[number];

const PROVIDERS = [
  { key: "openai", name: "OpenAI" },
  { key: "gemini", name: "Gemini" },
  { key: "anthropic", name: "Anthropic" },
  { key: "perplexity", name: "Perplexity" },
  { key: "deepseek", name: "DeepSeek" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AIInsightsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Visibility");

  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  const { data: aiInsights, isLoading: insightsLoading } = useAIInsights(projectId);
  const { data: predictions, isLoading: predictionsLoading } = usePredictions(projectId);
  const { data: keywordsResult } = useKeywords(projectId, { limit: 100 });

  const generateInsights = useGenerateInsights(projectId);

  const keywordIds = useMemo(
    () => (keywordsResult?.data ?? []).map((k) => k.id),
    [keywordsResult]
  );

  const keywordMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const kw of keywordsResult?.data ?? []) {
      map.set(kw.id, kw.keyword);
    }
    return map;
  }, [keywordsResult]);

  // AI visibility checks query
  const { data: visibilityChecks } = useQuery<AIVisibilityCheck[]>({
    queryKey: ["aiVisibility", projectId],
    queryFn: async () => {
      if (!keywordIds.length) return [];
      const { data } = await supabase
        .from("ai_visibility_checks")
        .select("*")
        .in("keyword_id", keywordIds);
      return (data as AIVisibilityCheck[]) ?? [];
    },
    enabled: !!projectId && keywordIds.length > 0,
  });

  // --- Derived data ---
  const checks = visibilityChecks ?? [];
  const insights = aiInsights ?? [];
  const preds = predictions ?? [];

  // Compute visibility score
  const visibilityScore = useMemo(() => {
    if (!checks.length) return 0;
    const mentionedCount = checks.filter((c) => c.brand_mentioned).length;
    return Math.round((mentionedCount / checks.length) * 100);
  }, [checks]);

  // Count unique providers that have at least one mention
  const mentionedProviderCount = useMemo(() => {
    const providersWithMention = new Set<string>();
    for (const c of checks) {
      if (c.brand_mentioned) {
        providersWithMention.add(c.llm_provider);
      }
    }
    return providersWithMention.size;
  }, [checks]);

  // Provider-level stats
  const providerStats = useMemo(() => {
    return PROVIDERS.map((p) => {
      const providerChecks = checks.filter(
        (c) => c.llm_provider.toLowerCase().includes(p.key)
      );
      const total = providerChecks.length;
      const mentioned = providerChecks.filter((c) => c.brand_mentioned).length;
      const pct = total > 0 ? (mentioned / total) * 100 : 0;
      return { ...p, total, mentioned, pct };
    });
  }, [checks]);

  // Build visibility matrix data
  const matrixData = useMemo(() => {
    // Group checks by keyword
    const byKeyword = new Map<string, AIVisibilityCheck[]>();
    for (const c of checks) {
      const existing = byKeyword.get(c.keyword_id) ?? [];
      existing.push(c);
      byKeyword.set(c.keyword_id, existing);
    }

    const rows: Array<{
      keyword: string;
      providers: Record<string, "mentioned" | "partial" | "not_found">;
    }> = [];

    for (const [kwId, kwChecks] of byKeyword) {
      const kwName = keywordMap.get(kwId) ?? kwId;
      const providers: Record<string, "mentioned" | "partial" | "not_found"> = {};

      for (const prov of PROVIDERS) {
        const match = kwChecks.find((c) =>
          c.llm_provider.toLowerCase().includes(prov.key)
        );
        if (!match) {
          providers[prov.key] = "not_found";
        } else if (match.brand_mentioned && match.url_cited) {
          providers[prov.key] = "mentioned";
        } else if (match.brand_mentioned) {
          providers[prov.key] = "partial";
        } else {
          providers[prov.key] = "not_found";
        }
      }

      rows.push({ keyword: kwName, providers });
    }

    return rows;
  }, [checks, keywordMap]);

  // --- Score status helper ---
  function scoreStatus(score: number): "good" | "warn" | "bad" {
    if (score >= 70) return "good";
    if (score >= 50) return "warn";
    return "bad";
  }

  const handleGenerateInsights = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating Insights",
      message: "Running machine-learning analysis to generate actionable recommendations...",
      variant: "loading",
    });
    generateInsights.mutate(undefined, {
      onSuccess: (data) => {
        setModal({
          visible: true,
          title: "Insights Generated",
          message: `Successfully generated ${data?.generated ?? 0} new AI-powered insights and recommendations.`,
          variant: "success",
        });
      },
      onError: (error) => {
        setModal({
          visible: true,
          title: "Insight Generation Failed",
          message: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
          variant: "error",
        });
      },
    });
  }, [generateInsights]);

  // --- Loading ---
  if (projectLoading) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Insights" />;

  // --- Render ---
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            Machine-learning powered insights and recommendations
          </Text>
        </View>

        <Divider />

        {/* Action Button */}
        <View style={styles.actionRow}>
          <Button
            title="Generate Insights"
            variant="sm-red"
            disabled={generateInsights.isPending}
            onPress={handleGenerateInsights}
          />
        </View>

        {/* Sub-navigation pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillsScroll}
          contentContainerStyle={styles.pillsContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
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
                    { color: isActive ? colors.surface : colors.inkSecondary },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        <View style={styles.body}>
          {activeTab === "Visibility" && (
            <VisibilitySection
              visibilityScore={visibilityScore}
              mentionedProviderCount={mentionedProviderCount}
              providerStats={providerStats}
              matrixData={matrixData}
              scoreStatus={scoreStatus}
              hasData={checks.length > 0}
            />
          )}

          {activeTab === "Predictions" && (
            <PredictionsSection
              predictions={preds}
              isLoading={predictionsLoading}
            />
          )}

          {activeTab === "Insights" && (
            <InsightsSection insights={insights} isLoading={insightsLoading} />
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
// Visibility Section
// ---------------------------------------------------------------------------

interface VisibilitySectionProps {
  visibilityScore: number;
  mentionedProviderCount: number;
  providerStats: Array<{
    key: string;
    name: string;
    total: number;
    mentioned: number;
    pct: number;
  }>;
  matrixData: Array<{
    keyword: string;
    providers: Record<string, "mentioned" | "partial" | "not_found">;
  }>;
  scoreStatus: (score: number) => "good" | "warn" | "bad";
  hasData: boolean;
}

function VisibilitySection({
  visibilityScore,
  mentionedProviderCount,
  providerStats,
  matrixData,
  scoreStatus,
  hasData,
}: VisibilitySectionProps) {
  const { colors } = useTheme();

  if (!hasData) {
    return (
      <EmptyState
        title="No Visibility Data"
        message="AI visibility checks will appear here once your keywords have been analyzed across LLM providers."
      />
    );
  }

  return (
    <>
      {/* AI Visibility Score */}
      <SectionLabel text="AI Visibility Score" />
      <Card>
        <View style={styles.scoreRow}>
          <ScoreRing
            score={visibilityScore}
            size={72}
            status={scoreStatus(visibilityScore)}
          />
          <View style={styles.scoreInfo}>
            <Text style={[styles.scoreLabel, { color: colors.ink }]}>
              Brand mentioned by {mentionedProviderCount}/5 LLMs
            </Text>
            <Text style={[styles.scoreDelta, { color: colors.inkSecondary }]}>
              Overall visibility: {visibilityScore}%
            </Text>
          </View>
        </View>
      </Card>

      {/* LLM Provider Status */}
      <SectionLabel text="LLM Provider Status" style={styles.sectionSpacing} />
      <View style={styles.providerGrid}>
        {providerStats.map((p) => {
          const dotColor =
            p.pct >= 60 ? colors.green : p.pct >= 40 ? colors.gold : colors.red;

          return (
            <View key={p.key} style={styles.providerCardWrapper}>
              <Card variant="sm">
                <View style={styles.providerRow}>
                  <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: colors.ink }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.providerCount, { color: colors.inkMuted }]}>
                      {p.mentioned}/{p.total} visible
                    </Text>
                  </View>
                </View>
              </Card>
            </View>
          );
        })}
      </View>

      {/* Visibility Matrix */}
      <SectionLabel text="Visibility Matrix" style={styles.sectionSpacing} />
      <VisibilityMatrix data={matrixData} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Predictions Section
// ---------------------------------------------------------------------------

interface PredictionsSectionProps {
  predictions: PredictionWithKeyword[];
  isLoading: boolean;
}

function PredictionsSection({ predictions, isLoading }: PredictionsSectionProps) {
  const { colors } = useTheme();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (predictions.length === 0) {
    return (
      <EmptyState
        title="No Predictions"
        message="Rank predictions will appear here once enough data has been collected for your tracked keywords."
      />
    );
  }

  return (
    <>
      <SectionLabel text="Rank Predictions" />
      {predictions.map((pred) => {
        const directionLabel =
          pred.stored_direction === "improving"
            ? "Improving"
            : pred.stored_direction === "declining"
            ? "Declining"
            : "Stable";
        const directionVariant: "green" | "red" =
          pred.stored_direction === "declining" ? "red" : "green";

        return (
          <Card key={pred.id} variant="sm">
            <Text style={[styles.predKeyword, { color: colors.ink }]}>
              {pred.keyword}
            </Text>
            <Text style={[styles.predPositions, { color: colors.inkSecondary }]}>
              Current:{" "}
              <Text style={styles.predMono}>
                #{pred.current_position ?? "--"}
              </Text>
              {"  \u2192  "}
              Predicted:{" "}
              <Text style={styles.predMono}>
                #{pred.predicted_position}
              </Text>
            </Text>
            <View style={styles.predFooter}>
              <Badge label={directionLabel} variant={directionVariant} />
              <Text style={[styles.predConfidence, { color: colors.inkMuted }]}>
                Confidence: {pred.confidence}%
              </Text>
            </View>
          </Card>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Insights Section
// ---------------------------------------------------------------------------

interface InsightsSectionProps {
  insights: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    action_label: string | null;
    priority: number;
    revenue_impact: number | null;
    is_read: boolean;
    created_at: string;
  }>;
  isLoading: boolean;
}

function InsightsSection({ insights, isLoading }: InsightsSectionProps) {
  const { colors } = useTheme();

  if (isLoading) return <LoadingScreen />;

  if (insights.length === 0) {
    return (
      <EmptyState
        title="No Insights"
        message="AI insights will appear here after your project has been analyzed."
      />
    );
  }

  return (
    <>
      <SectionLabel text="Insights" />
      {insights.map((insight) => {
        const borderColor =
          insight.type === "opportunity" || insight.type === "win"
            ? colors.green
            : insight.type === "alert" || insight.type === "technical"
            ? colors.red
            : colors.gold;
        const badgeVariant: "green" | "red" | "gold" =
          insight.type === "opportunity" || insight.type === "win"
            ? "green"
            : insight.type === "alert" || insight.type === "technical"
            ? "red"
            : "gold";

        return (
          <Card
            key={insight.id}
            variant="sm"
            style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
          >
            <View style={insightStyles.header}>
              <Badge label={insight.type} variant={badgeVariant} />
              {insight.revenue_impact != null && insight.revenue_impact > 0 && (
                <Text style={[insightStyles.revenue, { color: colors.green }]}>
                  +${Math.round(insight.revenue_impact).toLocaleString()}
                </Text>
              )}
            </View>
            <Text style={[insightStyles.title, { color: colors.ink }]} numberOfLines={2}>
              {insight.title}
            </Text>
            <Text style={[insightStyles.desc, { color: colors.inkSecondary }]} numberOfLines={3}>
              {insight.description}
            </Text>
            {insight.action_label && (
              <Text style={[insightStyles.action, { color: colors.red }]}>
                {insight.action_label}
              </Text>
            )}
          </Card>
        );
      })}
    </>
  );
}

const insightStyles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontFamily: fonts.sansBold, fontSize: 12, marginTop: 6 },
  desc: { fontFamily: fonts.sans, fontSize: 11, marginTop: 3, lineHeight: 16 },
  action: { fontFamily: fonts.sansSemiBold, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 6 },
  revenue: { fontFamily: fonts.mono, fontSize: 11 },
});

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
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
  },
  headerTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: 18,
  },
  headerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },

  // Action row
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

  // Visibility section
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  scoreDelta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    marginTop: 4,
  },

  sectionSpacing: {
    marginTop: 16,
  },

  // Provider grid
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  providerCardWrapper: {
    width: "48%",
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  providerCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },

  // Predictions
  predKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  predPositions: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 4,
  },
  predMono: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  predFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  predConfidence: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },

  bottomSpacer: {
    height: 100,
  },
});
