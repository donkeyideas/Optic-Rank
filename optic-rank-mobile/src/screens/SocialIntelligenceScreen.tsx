import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { stripMarkdown } from "../lib/stripMarkdown";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import KPIBox from "../components/ui/KPIBox";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";
import ScoreRing from "../components/ui/ScoreRing";
import ProgressBar from "../components/ui/ProgressBar";
import Input from "../components/ui/Input";

import {
  useSocialProfiles,
  useSocialMetrics,
  useSocialCompetitors,
  useAllSocialAnalyses,
  useSocialGoal,
} from "../hooks/useSocial";
import { useSocialGoals } from "../hooks/useQueries";
import { useActiveProject } from "../hooks/useProjects";
import {
  useAddSocialProfile,
  useRunSocialAnalysis,
  useAddSocialCompetitor,
  useRemoveSocialCompetitor,
  useDiscoverSocialCompetitors,
  useSaveSocialGoals,
  useGenerateSocialContent,
} from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type {
  SocialProfile,
  SocialMetric,
  SocialCompetitor,
  SocialPlatform,
} from "../types";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = [
  "Overview",
  "Growth",
  "Goals",
  "Earnings",
  "Competitors",
  "Strategy",
  "Generate",
  "Hashtags",
  "Insights",
] as const;
type Tab = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Content generator constants
// ---------------------------------------------------------------------------

const CONTENT_TYPES = [
  "Post Ideas",
  "Captions",
  "Calendar",
  "Scripts",
  "Carousels",
  "Bio",
] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const TONE_OPTIONS = [
  "professional",
  "casual",
  "humorous",
  "educational",
  "inspirational",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function platformBadgeVariant(
  platform: SocialPlatform
): "red" | "green" | "gold" | "blue" | "dark" {
  switch (platform) {
    case "instagram":
      return "red";
    case "tiktok":
      return "dark";
    case "youtube":
      return "red";
    case "twitter":
      return "blue";
    case "linkedin":
      return "blue";
    case "facebook":
      return "blue";
    default:
      return "dark";
  }
}

function platformLabel(platform: SocialPlatform): string {
  switch (platform) {
    case "instagram":
      return "Instagram";
    case "tiktok":
      return "TikTok";
    case "youtube":
      return "YouTube";
    case "twitter":
      return "Twitter/X";
    case "linkedin":
      return "LinkedIn";
    case "facebook":
      return "Facebook";
    default:
      return platform;
  }
}

function formatEngagement(rate: number | null): string {
  if (rate == null) return "--";
  return `${(rate * 100).toFixed(2)}%`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function scoreStatus(score: number): "good" | "warn" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function effortBadgeVariant(
  effort: string
): "green" | "gold" | "red" | "outline" {
  const e = (effort || "").toLowerCase();
  if (e === "easy") return "green";
  if (e === "medium") return "gold";
  if (e === "hard") return "red";
  return "outline";
}

function safeArray(val: unknown): unknown[] {
  if (Array.isArray(val)) return val;
  return [];
}

function safeString(val: unknown, fallback = "--"): string {
  if (typeof val === "string" && val.length > 0) return val;
  if (typeof val === "number") return String(val);
  return fallback;
}

function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

function safeRecord(val: unknown): Record<string, unknown> {
  if (val && typeof val === "object" && !Array.isArray(val))
    return val as Record<string, unknown>;
  return {};
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS: { label: string; value: string }[] = [
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "YouTube", value: "youtube" },
  { label: "Twitter/X", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Facebook", value: "facebook" },
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SocialIntelligenceScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);

  // --- Modal state ---
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  // --- Add Profile flow state ---
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [showHandleInput, setShowHandleInput] = useState(false);
  const [handleText, setHandleText] = useState("");

  // --- Add Competitor modal state ---
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [compPlatform, setCompPlatform] = useState<string>("instagram");
  const [compHandle, setCompHandle] = useState("");

  // --- Goals modal state ---
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalMetric, setGoalMetric] = useState("followers");
  const [goalTargetValue, setGoalTargetValue] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  // --- Content generator state ---
  const [contentType, setContentType] = useState<ContentType>("Post Ideas");
  const [contentTopic, setContentTopic] = useState("");
  const [contentTone, setContentTone] = useState("professional");
  const [contentCount, setContentCount] = useState("5");
  const [generatedContent, setGeneratedContent] = useState<unknown>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAllTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (copyAllTimerRef.current) clearTimeout(copyAllTimerRef.current);
    };
  }, []);

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  // --- Mutations ---
  const addProfileMutation = useAddSocialProfile(projectId);
  const runAnalysisMutation = useRunSocialAnalysis(projectId);
  const addCompetitorMutation = useAddSocialCompetitor(projectId);
  const removeCompetitorMutation = useRemoveSocialCompetitor(projectId);
  const discoverCompetitorsMutation = useDiscoverSocialCompetitors(projectId);
  const saveGoalsMutation = useSaveSocialGoals(projectId);
  const generateContentMutation = useGenerateSocialContent(projectId);

  // --- Profile handlers ---
  const handleAddProfile = useCallback(() => {
    setSelectedPlatform(null);
    setHandleText("");
    setShowHandleInput(false);
    setShowPlatformPicker(true);
  }, []);

  const handleSelectPlatform = useCallback((platform: string) => {
    setSelectedPlatform(platform);
    setShowPlatformPicker(false);
    setHandleText("");
    setShowHandleInput(true);
  }, []);

  const handleSubmitProfile = useCallback(() => {
    if (!selectedPlatform || !handleText.trim()) return;
    setShowHandleInput(false);
    addProfileMutation.mutate(
      { platform: selectedPlatform, handle: handleText.trim() },
      {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "Profile Added",
            message: `Successfully added ${handleText.trim()} on ${PLATFORMS.find((p) => p.value === selectedPlatform)?.label ?? selectedPlatform}.`,
            variant: "success",
          });
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message:
              err instanceof Error ? err.message : "Failed to add profile.",
            variant: "error",
          });
        },
      }
    );
  }, [selectedPlatform, handleText, addProfileMutation]);

  // --- Query hooks ---
  const {
    data: profiles,
    isLoading: profilesLoading,
    refetch: refetchProfiles,
    isRefetching: isRefetchingProfiles,
  } = useSocialProfiles(projectId);

  const selectedProfile = profiles?.[selectedProfileIndex] ?? null;
  const selectedProfileId = selectedProfile?.id;

  const {
    data: metrics,
    refetch: refetchMetrics,
    isRefetching: isRefetchingMetrics,
  } = useSocialMetrics(selectedProfileId, 30);

  const {
    data: competitors,
    refetch: refetchCompetitors,
    isRefetching: isRefetchingCompetitors,
  } = useSocialCompetitors(selectedProfileId);

  const {
    data: allAnalyses,
    refetch: refetchAnalyses,
    isRefetching: isRefetchingAnalyses,
  } = useAllSocialAnalyses(selectedProfileId);

  const {
    data: goals,
    refetch: refetchGoals,
    isRefetching: isRefetchingGoals,
  } = useSocialGoals(selectedProfileId);

  const isRefreshing =
    isRefetchingProfiles ||
    isRefetchingMetrics ||
    isRefetchingCompetitors ||
    isRefetchingAnalyses ||
    isRefetchingGoals;

  const handleRefresh = useCallback(() => {
    refetchProfiles();
    refetchMetrics();
    refetchCompetitors();
    refetchAnalyses();
    refetchGoals();
  }, [
    refetchProfiles,
    refetchMetrics,
    refetchCompetitors,
    refetchAnalyses,
    refetchGoals,
  ]);

  // --- Derived data ---
  const latestMetric = useMemo(() => {
    if (!metrics || metrics.length === 0) return null;
    return metrics[metrics.length - 1];
  }, [metrics]);

  const engagementTrend = useMemo(() => {
    if (!metrics || metrics.length < 2) return null;
    const recent = metrics.slice(-7);
    if (recent.length < 2) return null;
    const first = recent[0].engagement_rate ?? 0;
    const last = recent[recent.length - 1].engagement_rate ?? 0;
    if (first === 0) return null;
    const changePct = ((last - first) / first) * 100;
    return changePct;
  }, [metrics]);

  const followersDataPoints = useMemo(() => {
    if (!metrics) return [];
    return metrics.slice(-14).map((m) => ({
      date: formatDate(m.date),
      followers: m.followers,
    }));
  }, [metrics]);

  // --- Analysis helpers ---
  const findAnalysis = useCallback(
    (type: string) => {
      if (!allAnalyses) return null;
      return allAnalyses.find((a) => a.analysis_type === type) ?? null;
    },
    [allAnalyses]
  );

  const getAnalysisData = useCallback(
    (type: string): Record<string, unknown> => {
      const analysis = findAnalysis(type);
      if (!analysis) return {};
      return safeRecord(analysis.data);
    },
    [findAnalysis]
  );

  // --- Run analysis handler ---
  const handleRunAnalysis = useCallback(
    (analysisType: string, label: string) => {
      if (!selectedProfileId) return;
      runAnalysisMutation.mutate(
        { profileId: selectedProfileId, analysisType },
        {
          onSuccess: () => {
            refetchAnalyses();
            setModal({
              visible: true,
              title: "Analysis Complete",
              message: `${label} analysis completed successfully.`,
              variant: "success",
            });
          },
          onError: (err) => {
            setModal({
              visible: true,
              title: "Error",
              message:
                err instanceof Error
                  ? err.message
                  : `Failed to run ${label} analysis.`,
              variant: "error",
            });
          },
        }
      );
    },
    [selectedProfileId, runAnalysisMutation, refetchAnalyses]
  );

  // --- Competitor handlers ---
  const handleAddCompetitor = useCallback(() => {
    if (!selectedProfileId || !compHandle.trim()) return;
    setShowAddCompetitor(false);
    addCompetitorMutation.mutate(
      {
        profileId: selectedProfileId,
        platform: compPlatform,
        handle: compHandle.trim(),
      },
      {
        onSuccess: () => {
          refetchCompetitors();
          setCompHandle("");
          setModal({
            visible: true,
            title: "Competitor Added",
            message: `Added @${compHandle.trim()} as a competitor.`,
            variant: "success",
          });
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message:
              err instanceof Error
                ? err.message
                : "Failed to add competitor.",
            variant: "error",
          });
        },
      }
    );
  }, [
    selectedProfileId,
    compPlatform,
    compHandle,
    addCompetitorMutation,
    refetchCompetitors,
  ]);

  const handleRemoveCompetitor = useCallback(
    (competitorId: string) => {
      removeCompetitorMutation.mutate(competitorId, {
        onSuccess: () => refetchCompetitors(),
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message:
              err instanceof Error
                ? err.message
                : "Failed to remove competitor.",
            variant: "error",
          });
        },
      });
    },
    [removeCompetitorMutation, refetchCompetitors]
  );

  const handleDiscoverCompetitors = useCallback(() => {
    if (!selectedProfileId) return;
    discoverCompetitorsMutation.mutate(selectedProfileId, {
      onSuccess: () => {
        refetchCompetitors();
        setModal({
          visible: true,
          title: "Competitors Discovered",
          message: "AI found competitor profiles for you.",
          variant: "success",
        });
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message:
            err instanceof Error
              ? err.message
              : "Failed to discover competitors.",
          variant: "error",
        });
      },
    });
  }, [selectedProfileId, discoverCompetitorsMutation, refetchCompetitors]);

  // --- Goals handler ---
  const handleSaveGoal = useCallback(() => {
    if (!selectedProfileId || !goalTargetValue.trim()) return;
    setShowGoalModal(false);
    const goalData = [
      {
        metric: goalMetric,
        target_value: parseFloat(goalTargetValue) || 0,
        deadline: goalDeadline.trim() || null,
      },
    ];
    saveGoalsMutation.mutate(
      { profileId: selectedProfileId, goals: goalData },
      {
        onSuccess: () => {
          refetchGoals();
          setGoalTargetValue("");
          setGoalDeadline("");
          setModal({
            visible: true,
            title: "Goal Saved",
            message: "Your goal has been saved successfully.",
            variant: "success",
          });
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message:
              err instanceof Error ? err.message : "Failed to save goal.",
            variant: "error",
          });
        },
      }
    );
  }, [
    selectedProfileId,
    goalMetric,
    goalTargetValue,
    goalDeadline,
    saveGoalsMutation,
    refetchGoals,
  ]);

  // --- Content generation handler ---
  const handleGenerate = useCallback(() => {
    if (!selectedProfileId) return;
    const typeMap: Record<ContentType, string> = {
      "Post Ideas": "post_ideas",
      Captions: "captions",
      Calendar: "calendar",
      Scripts: "scripts",
      Carousels: "carousels",
      Bio: "bio",
    };
    generateContentMutation.mutate(
      {
        profileId: selectedProfileId,
        contentType: typeMap[contentType],
        topic: contentTopic.trim() || undefined,
        tone: contentTone,
        count: parseInt(contentCount, 10) || 5,
      },
      {
        onSuccess: (result) => {
          setGeneratedContent(result?.content ?? null);
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message:
              err instanceof Error
                ? err.message
                : "Failed to generate content.",
            variant: "error",
          });
        },
      }
    );
  }, [
    selectedProfileId,
    contentType,
    contentTopic,
    contentTone,
    contentCount,
    generateContentMutation,
  ]);

  // --- Copy handler ---
  const handleCopy = useCallback((text: string, index?: number) => {
    try {
      const RNClipboard = require("react-native").Clipboard;
      if (RNClipboard && RNClipboard.setString) {
        RNClipboard.setString(text);
      }
    } catch {
      // Silently fail if clipboard not available
    }
    if (index !== undefined) {
      setCopiedIndex(index);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedIndex(null), 2000);
    } else {
      setCopiedAll(true);
      if (copyAllTimerRef.current) clearTimeout(copyAllTimerRef.current);
      copyAllTimerRef.current = setTimeout(() => setCopiedAll(false), 2000);
    }
  }, []);

  // --- Generated content items ---
  const contentItems = useMemo(() => {
    if (!generatedContent) return [];
    const gc = safeRecord(generatedContent);
    const items =
      gc.items ||
      gc.results ||
      gc.content ||
      gc.ideas ||
      gc.captions ||
      gc.scripts ||
      gc.carousels ||
      gc.bios ||
      gc.calendar ||
      gc.days;
    return safeArray(items);
  }, [generatedContent]);

  // --- Loading ---
  if (projectLoading || (profilesLoading && !profiles)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="Social Intelligence" />;

  if (!profiles || profiles.length === 0) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={[]}
      >
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="No Social Profiles"
            message="Connect social media profiles to your project to start tracking engagement and competitors."
          />
          <View style={styles.emptyAction}>
            <Button
              title="Add Profile"
              variant="sm-red"
              onPress={handleAddProfile}
              disabled={addProfileMutation.isPending}
            />
          </View>
        </View>

        <AppModal
          visible={showPlatformPicker}
          onClose={() => setShowPlatformPicker(false)}
          title="Add Profile"
          message="Select a platform:"
        >
          <View style={styles.platformGrid}>
            {PLATFORMS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.platformButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => handleSelectPlatform(p.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.platformButtonText, { color: colors.ink }]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </AppModal>

        <AppModal
          visible={showHandleInput}
          onClose={() => setShowHandleInput(false)}
          title="Add Profile"
          message={`Enter the ${PLATFORMS.find((p) => p.value === selectedPlatform)?.label ?? ""} handle:`}
          buttons={[
            {
              label: "Cancel",
              onPress: () => setShowHandleInput(false),
              variant: "outline",
            },
            {
              label: "Add",
              onPress: handleSubmitProfile,
              variant: "primary",
            },
          ]}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textInput,
                { color: colors.ink, borderColor: colors.border },
              ]}
              value={handleText}
              onChangeText={setHandleText}
              placeholder="@handle"
              placeholderTextColor={colors.inkMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </AppModal>

        <AppModal
          visible={modal.visible}
          onClose={() => setModal((m) => ({ ...m, visible: false }))}
          title={modal.title}
          message={modal.message}
          variant={modal.variant}
        />
      </SafeAreaView>
    );
  }

  // =========================================================================
  // TAB 1: Overview
  // =========================================================================
  const renderOverview = () => (
    <View>
      {selectedProfile && (
        <>
          <SectionLabel text="Profile" />
          <Card variant="highlighted">
            <View style={styles.profileHeader}>
              <View style={styles.profileLeft}>
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.surfaceInset, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.inkMuted }]}>
                    {(selectedProfile.handle || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileMeta}>
                  <Text style={[styles.profileHandle, { color: colors.ink }]}>
                    @{selectedProfile.handle}
                  </Text>
                  <View style={styles.profileBadgeRow}>
                    <Badge
                      label={platformLabel(selectedProfile.platform)}
                      variant={platformBadgeVariant(selectedProfile.platform)}
                    />
                    {selectedProfile.is_verified && (
                      <Badge label="Verified" variant="blue" />
                    )}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.profileStatsRow}>
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { color: colors.ink }]}>
                  {formatNumber(selectedProfile.followers_count)}
                </Text>
                <Text style={[styles.profileStatLabel, { color: colors.inkMuted }]}>
                  Followers
                </Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { color: colors.ink }]}>
                  {formatNumber(selectedProfile.following_count)}
                </Text>
                <Text style={[styles.profileStatLabel, { color: colors.inkMuted }]}>
                  Following
                </Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { color: colors.ink }]}>
                  {formatNumber(selectedProfile.posts_count)}
                </Text>
                <Text style={[styles.profileStatLabel, { color: colors.inkMuted }]}>
                  Posts
                </Text>
              </View>
              <View style={styles.profileStat}>
                <Text style={[styles.profileStatValue, { color: colors.ink }]}>
                  {formatEngagement(selectedProfile.engagement_rate)}
                </Text>
                <Text style={[styles.profileStatLabel, { color: colors.inkMuted }]}>
                  Eng. Rate
                </Text>
              </View>
            </View>

            {selectedProfile.last_synced_at && (
              <Text style={[styles.profileSynced, { color: colors.inkMuted }]}>
                Last synced: {formatDate(selectedProfile.last_synced_at)}
              </Text>
            )}
          </Card>
        </>
      )}

      <SectionLabel text="Key Metrics" style={styles.sectionSpacing} />
      {latestMetric ? (
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCell}>
            <KPIBox value={formatNumber(latestMetric.followers)} label="Followers" />
          </View>
          <View style={styles.kpiCell}>
            <KPIBox
              value={formatEngagement(latestMetric.engagement_rate)}
              label="Eng. Rate"
              delta={
                engagementTrend != null
                  ? `${engagementTrend > 0 ? "+" : ""}${engagementTrend.toFixed(1)}%`
                  : undefined
              }
              deltaType={
                engagementTrend != null
                  ? engagementTrend > 0
                    ? "up"
                    : engagementTrend < 0
                      ? "down"
                      : "neutral"
                  : "neutral"
              }
            />
          </View>
          <View style={styles.kpiCell}>
            <KPIBox value={formatNumber(latestMetric.avg_likes)} label="Avg Likes" />
          </View>
          <View style={styles.kpiCell}>
            <KPIBox value={formatNumber(latestMetric.reach)} label="Reach" />
          </View>
        </View>
      ) : (
        <Card variant="sm">
          <Text style={[styles.emptyCardText, { color: colors.inkMuted }]}>
            No metric data available yet. Data will appear after your first sync.
          </Text>
        </Card>
      )}

      {followersDataPoints.length > 0 && (
        <>
          <SectionLabel text="Follower Trend (14d)" style={styles.sectionSpacing} />
          <Card>
            {followersDataPoints.map((dp, index) => (
              <View key={`${dp.date}-${index}`}>
                {index > 0 && <Divider />}
                <View style={styles.followerRow}>
                  <Text style={[styles.followerDate, { color: colors.inkMuted }]}>
                    {dp.date}
                  </Text>
                  <Text style={[styles.followerCount, { color: colors.ink }]}>
                    {formatNumber(dp.followers)}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionLabel text="Health Score" style={styles.sectionSpacing} />
      <Card>
        <View style={styles.healthScoreRow}>
          {(() => {
            const hs = latestMetric
              ? Math.min(
                  100,
                  Math.round(
                    safeNumber(latestMetric.engagement_rate) * 1000 +
                      Math.min(50, safeNumber(latestMetric.followers) / 1000)
                  )
                )
              : 0;
            return (
              <>
                <ScoreRing score={hs} size={72} status={scoreStatus(hs)} />
                <View style={styles.healthScoreText}>
                  <Text style={[styles.healthTitle, { color: colors.ink }]}>
                    Profile Health
                  </Text>
                  <Text style={[styles.healthSubtitle, { color: colors.inkMuted }]}>
                    Based on engagement rate, follower count, and activity
                  </Text>
                </View>
              </>
            );
          })()}
        </View>
      </Card>
    </View>
  );

  // =========================================================================
  // TAB 2: Growth
  // =========================================================================
  const renderGrowth = () => {
    const growthAnalysis = findAnalysis("growth");
    const data = getAnalysisData("growth");
    const tips = safeArray(data.tips || data.growth_tips || data.recommendations || data.items);

    return (
      <View>
        <SectionLabel text="Growth Analysis" />
        <Button
          title={runAnalysisMutation.isPending ? "Analyzing..." : "Run Growth Analysis"}
          variant="sm-red"
          onPress={() => handleRunAnalysis("growth", "Growth")}
          disabled={runAnalysisMutation.isPending}
          style={styles.actionButtonFull}
        />

        {growthAnalysis ? (
          <>
            {growthAnalysis.summary ? (
              <Card style={styles.sectionSpacing}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Summary</Text>
                <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>
                  {stripMarkdown(growthAnalysis.summary)}
                </Text>
              </Card>
            ) : null}

            {tips.length > 0 && (
              <>
                <SectionLabel text="Growth Tips" style={styles.sectionSpacing} />
                {tips.map((tip: unknown, i: number) => {
                  const t = safeRecord(tip);
                  const title = safeString(t.title || t.name || t.tip, `Tip ${i + 1}`);
                  const description = safeString(t.description || t.details || t.explanation, "");
                  const effort = safeString(t.effort || t.difficulty, "");
                  const priority = safeNumber(t.priority || t.rank, i + 1);

                  return (
                    <Card key={i} variant="sm">
                      <View style={styles.tipHeader}>
                        <View style={styles.tipRank}>
                          <Text style={[styles.tipRankText, { color: colors.ink }]}>
                            #{priority}
                          </Text>
                        </View>
                        <View style={styles.tipContent}>
                          <Text style={[styles.tipTitle, { color: colors.ink }]}>
                            {title}
                          </Text>
                          {effort !== "" && (
                            <Badge label={effort} variant={effortBadgeVariant(effort)} />
                          )}
                        </View>
                      </View>
                      {description !== "" && (
                        <Text style={[styles.tipDescription, { color: colors.inkSecondary }]}>
                          {description}
                        </Text>
                      )}
                    </Card>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              title="No Growth Analysis"
              message='Tap "Run Growth Analysis" to get AI-powered growth recommendations.'
            />
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // TAB 3: Goals
  // =========================================================================
  const renderGoals = () => {
    const goalList = safeArray(goals);

    return (
      <View>
        <SectionLabel text="Campaign Goals" />
        <Button
          title="Set Goal"
          variant="sm-red"
          onPress={() => setShowGoalModal(true)}
          style={styles.actionButtonFull}
        />

        {goalList.length > 0 ? (
          goalList.map((g: unknown, i: number) => {
            const goal = safeRecord(g);
            const metric = safeString(goal.metric, "Unknown");
            const target = safeNumber(goal.target_value);
            const current = safeNumber(goal.current_value);
            const deadline = safeString(goal.deadline, "");
            const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const isActive = goal.is_active !== false;

            return (
              <Card key={i} variant="sm">
                <View style={styles.goalHeader}>
                  <Text style={[styles.goalMetric, { color: colors.ink }]}>
                    {metric.charAt(0).toUpperCase() + metric.slice(1)}
                  </Text>
                  <Badge
                    label={isActive ? "Active" : "Inactive"}
                    variant={isActive ? "green" : "outline"}
                  />
                </View>
                <View style={styles.goalValues}>
                  <Text style={[styles.goalCurrent, { color: colors.ink }]}>
                    {formatNumber(current)}
                  </Text>
                  <Text style={[styles.goalSeparator, { color: colors.inkMuted }]}>
                    {" / "}
                  </Text>
                  <Text style={[styles.goalTarget, { color: colors.green }]}>
                    {formatNumber(target)}
                  </Text>
                </View>
                <ProgressBar
                  value={progress}
                  color={progress >= 100 ? colors.green : progress >= 50 ? colors.gold : colors.red}
                />
                <View style={styles.goalFooter}>
                  <Text style={[styles.goalProgress, { color: colors.inkMuted }]}>
                    {progress}% complete
                  </Text>
                  {deadline !== "" && deadline !== "--" && (
                    <Text style={[styles.goalDeadline, { color: colors.inkMuted }]}>
                      Due: {formatDate(deadline)}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              title="No Goals Set"
              message='Tap "Set Goal" to create targets for followers, engagement, or revenue.'
            />
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // TAB 4: Earnings
  // =========================================================================
  const renderEarnings = () => {
    const earningsAnalysis = findAnalysis("earnings_forecast");
    const data = getAnalysisData("earnings_forecast");
    const factors = safeArray(data.monetization_factors || data.factors || []);
    const scenarios = safeArray(data.scenarios || data.earnings_scenarios || []);
    const monthlyEstimate = safeString(data.monthly_estimate || data.estimated_monthly, "");

    return (
      <View>
        <SectionLabel text="Earnings Forecast" />
        <Button
          title={runAnalysisMutation.isPending ? "Analyzing..." : "Run Earnings Forecast"}
          variant="sm-red"
          onPress={() => handleRunAnalysis("earnings_forecast", "Earnings")}
          disabled={runAnalysisMutation.isPending}
          style={styles.actionButtonFull}
        />

        {earningsAnalysis ? (
          <>
            {earningsAnalysis.summary ? (
              <Card style={styles.sectionSpacing}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Summary</Text>
                <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>
                  {stripMarkdown(earningsAnalysis.summary)}
                </Text>
              </Card>
            ) : null}

            {monthlyEstimate !== "" && (
              <Card>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Monthly Estimate</Text>
                <Text style={[styles.earningsValue, { color: colors.green }]}>
                  {monthlyEstimate}
                </Text>
              </Card>
            )}

            {scenarios.length > 0 && (
              <>
                <SectionLabel text="Earnings Scenarios" style={styles.sectionSpacing} />
                {scenarios.map((s: unknown, i: number) => {
                  const scenario = safeRecord(s);
                  const name = safeString(scenario.name || scenario.type || scenario.label, "Scenario");
                  const amount = safeString(scenario.amount || scenario.estimate || scenario.value || scenario.monthly, "--");
                  const desc = safeString(scenario.description || scenario.details, "");

                  return (
                    <Card key={i} variant="sm">
                      <Text style={[styles.scenarioName, { color: colors.ink }]}>{name}</Text>
                      <Text style={[styles.scenarioAmount, { color: colors.green }]}>{amount}</Text>
                      {desc !== "" && (
                        <Text style={[styles.scenarioDesc, { color: colors.inkMuted }]}>{desc}</Text>
                      )}
                    </Card>
                  );
                })}
              </>
            )}

            {factors.length > 0 && (
              <>
                <SectionLabel text="Monetization Factors" style={styles.sectionSpacing} />
                {factors.map((f: unknown, i: number) => {
                  const factor = safeRecord(f);
                  const name = safeString(factor.name || factor.factor || factor.title, `Factor ${i + 1}`);
                  const impact = safeString(factor.impact || factor.score || factor.weight, "");

                  return (
                    <Card key={i} variant="sm">
                      <View style={styles.factorRow}>
                        <Text style={[styles.factorName, { color: colors.ink }]}>{name}</Text>
                        {impact !== "" && <Badge label={String(impact)} variant="gold" />}
                      </View>
                    </Card>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              title="No Earnings Forecast"
              message='Tap "Run Earnings Forecast" to get AI-powered revenue estimates.'
            />
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // TAB 5: Competitors
  // =========================================================================
  const renderCompetitors = () => {
    const competitorAnalysis = findAnalysis("competitors");
    const data = getAnalysisData("competitors");
    const benchmarks = safeArray(data.benchmarks || data.swot || data.comparison || []);

    return (
      <View>
        <SectionLabel text="Competitors" />
        <View style={styles.competitorActions}>
          <Button
            title="Add Competitor"
            variant="sm-red"
            onPress={() => {
              setCompHandle("");
              setCompPlatform(selectedProfile?.platform || "instagram");
              setShowAddCompetitor(true);
            }}
            disabled={addCompetitorMutation.isPending}
            style={styles.competitorActionBtn}
          />
          <Button
            title={discoverCompetitorsMutation.isPending ? "Discovering..." : "AI Discover"}
            variant="sm-outline"
            onPress={handleDiscoverCompetitors}
            disabled={discoverCompetitorsMutation.isPending}
            style={styles.competitorActionBtn}
          />
        </View>

        <Button
          title={runAnalysisMutation.isPending ? "Analyzing..." : "Run Competitor Analysis"}
          variant="sm-outline"
          onPress={() => handleRunAnalysis("competitors", "Competitor")}
          disabled={runAnalysisMutation.isPending}
          style={[styles.actionButtonFull, { marginTop: 8 }]}
        />

        {competitors && competitors.length > 0 ? (
          <>
            <SectionLabel text="Competitor Profiles" style={styles.sectionSpacing} />
            {competitors.map((comp: SocialCompetitor) => (
              <Card key={comp.id} variant="sm">
                <View style={styles.compRow}>
                  <View style={styles.compInfo}>
                    <View style={styles.compHeader}>
                      <Text style={[styles.compHandle, { color: colors.ink }]} numberOfLines={1}>
                        @{comp.handle}
                      </Text>
                      <Badge
                        label={platformLabel(comp.platform)}
                        variant={platformBadgeVariant(comp.platform)}
                      />
                    </View>
                    <View style={styles.compStats}>
                      <Text style={[styles.compStatText, { color: colors.inkMuted }]}>
                        {formatNumber(comp.followers_count)} followers
                      </Text>
                      <Text style={[styles.compStatText, { color: colors.inkMuted }]}>
                        Eng: {formatEngagement(comp.engagement_rate)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveCompetitor(comp.id)}
                    style={[styles.removeBtn, { borderColor: colors.red }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.removeBtnText, { color: colors.red }]}>X</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              title="No Competitors"
              message="Add competitors or use AI Discover to find them automatically."
            />
          </View>
        )}

        {competitorAnalysis && benchmarks.length > 0 && (
          <>
            <SectionLabel text="SWOT / Benchmarks" style={styles.sectionSpacing} />
            {benchmarks.map((b: unknown, i: number) => {
              const item = safeRecord(b);
              const label = safeString(item.category || item.area || item.name || item.label, `Area ${i + 1}`);
              const finding = safeString(item.finding || item.description || item.details || item.analysis, "");

              return (
                <Card key={i} variant="sm">
                  <Text style={[styles.benchLabel, { color: colors.ink }]}>{label}</Text>
                  {finding !== "" && (
                    <Text style={[styles.benchFinding, { color: colors.inkSecondary }]}>
                      {stripMarkdown(finding)}
                    </Text>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </View>
    );
  };

  // =========================================================================
  // TAB 6: Strategy
  // =========================================================================
  const renderStrategy = () => {
    const strategyAnalysis = findAnalysis("content_strategy");
    const data = getAnalysisData("content_strategy");
    const pillars = safeArray(data.content_pillars || data.pillars || data.categories || []);
    const postingTimes = safeArray(data.best_posting_times || data.posting_times || data.optimal_times || []);
    const frequency = safeString(data.frequency || data.posting_frequency || data.recommended_frequency, "");
    const distribution = safeArray(data.content_distribution || data.content_types || data.type_distribution || []);

    return (
      <View>
        <SectionLabel text="Content Strategy" />
        <Button
          title={runAnalysisMutation.isPending ? "Analyzing..." : "Run Strategy Analysis"}
          variant="sm-red"
          onPress={() => handleRunAnalysis("content_strategy", "Content Strategy")}
          disabled={runAnalysisMutation.isPending}
          style={styles.actionButtonFull}
        />

        {strategyAnalysis ? (
          <>
            {strategyAnalysis.summary ? (
              <Card style={styles.sectionSpacing}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Summary</Text>
                <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>
                  {stripMarkdown(strategyAnalysis.summary)}
                </Text>
              </Card>
            ) : null}

            {pillars.length > 0 && (
              <>
                <SectionLabel text="Content Pillars" style={styles.sectionSpacing} />
                {pillars.map((p: unknown, i: number) => {
                  const pillar = safeRecord(p);
                  const name = safeString(pillar.name || pillar.pillar || pillar.title, `Pillar ${i + 1}`);
                  const desc = safeString(pillar.description || pillar.details, "");
                  const percentage = safeString(pillar.percentage || pillar.share, "");

                  return (
                    <Card key={i} variant="sm">
                      <View style={styles.pillarHeader}>
                        <Text style={[styles.pillarName, { color: colors.ink }]}>{name}</Text>
                        {percentage !== "" && <Badge label={`${percentage}%`} variant="gold" />}
                      </View>
                      {desc !== "" && (
                        <Text style={[styles.pillarDesc, { color: colors.inkMuted }]}>{desc}</Text>
                      )}
                    </Card>
                  );
                })}
              </>
            )}

            {postingTimes.length > 0 && (
              <>
                <SectionLabel text="Best Posting Times" style={styles.sectionSpacing} />
                <Card>
                  {postingTimes.map((t: unknown, i: number) => {
                    const time = typeof t === "string" ? t : safeString(safeRecord(t).time || safeRecord(t).slot, `Time ${i + 1}`);
                    return (
                      <View key={i}>
                        {i > 0 && <Divider />}
                        <Text style={[styles.postingTime, { color: colors.ink }]}>{time}</Text>
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {frequency !== "" && (
              <Card style={styles.sectionSpacing}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Frequency Recommendation</Text>
                <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>{frequency}</Text>
              </Card>
            )}

            {distribution.length > 0 && (
              <>
                <SectionLabel text="Content Type Distribution" style={styles.sectionSpacing} />
                {distribution.map((d: unknown, i: number) => {
                  const dist = safeRecord(d);
                  const type = safeString(dist.type || dist.name || dist.content_type, `Type ${i + 1}`);
                  const pct = safeNumber(dist.percentage || dist.share, 0);

                  return (
                    <Card key={i} variant="sm">
                      <View style={styles.distRow}>
                        <Text style={[styles.distType, { color: colors.ink }]}>{type}</Text>
                        <Text style={[styles.distPct, { color: colors.gold }]}>{pct}%</Text>
                      </View>
                      <ProgressBar value={pct} color={colors.gold} />
                    </Card>
                  );
                })}
              </>
            )}
          </>
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              title="No Strategy Analysis"
              message='Tap "Run Strategy Analysis" to get content strategy recommendations.'
            />
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // TAB 7: Generate
  // =========================================================================
  const renderCalendarGrid = (items: unknown[]) => {
    const rows: unknown[][] = [];
    let currentRow: unknown[] = [];
    for (let i = 0; i < items.length; i++) {
      currentRow.push(items[i]);
      if (currentRow.length === 7) {
        rows.push(currentRow);
        currentRow = [];
      }
    }
    if (currentRow.length > 0) {
      while (currentRow.length < 7) currentRow.push(null);
      rows.push(currentRow);
    }

    return (
      <View>
        <View style={styles.calHeaderRow}>
          {DAYS_OF_WEEK.map((d) => (
            <View key={d} style={styles.calHeaderCell}>
              <Text style={[styles.calHeaderText, { color: colors.inkMuted }]}>{d}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.calRow}>
            {row.map((cell: unknown, ci: number) => {
              if (!cell) {
                return (
                  <View key={ci} style={[styles.calCell, { borderColor: colors.border }]} />
                );
              }
              const c = safeRecord(cell);
              const day = safeString(c.day || c.date, `${ri * 7 + ci + 1}`);
              const topic = safeString(c.topic || c.title || c.content || c.theme, "");
              const category = safeString(c.category || c.type, "");

              return (
                <View
                  key={ci}
                  style={[styles.calCell, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.calDay, { color: colors.ink }]}>{day}</Text>
                  {topic !== "" && (
                    <Text style={[styles.calTopic, { color: colors.inkSecondary }]} numberOfLines={2}>
                      {topic}
                    </Text>
                  )}
                  {category !== "" && (
                    <View
                      style={[
                        styles.calCategoryDot,
                        {
                          backgroundColor: category.toLowerCase().includes("edu")
                            ? colors.blue
                            : category.toLowerCase().includes("promo")
                              ? colors.red
                              : colors.gold,
                        },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderGenerate = () => {
    const isCalendar = contentType === "Calendar";

    return (
      <View>
        <SectionLabel text="Content Generator" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.contentTypeScroll}
          contentContainerStyle={styles.contentTypeContainer}
        >
          {CONTENT_TYPES.map((ct) => {
            const isActive = contentType === ct;
            return (
              <TouchableOpacity
                key={ct}
                onPress={() => {
                  setContentType(ct);
                  setGeneratedContent(null);
                }}
                activeOpacity={0.7}
                style={[
                  styles.contentTypePill,
                  {
                    backgroundColor: isActive ? colors.ink : "transparent",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.contentTypePillText,
                    { color: isActive ? colors.surface : colors.inkSecondary },
                  ]}
                >
                  {ct}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Card style={styles.sectionSpacing}>
          <Input
            label="Topic (optional)"
            value={contentTopic}
            onChangeText={setContentTopic}
            placeholder="e.g., fitness tips, brand launch..."
          />

          <Text style={[styles.formLabel, { color: colors.inkSecondary }]}>TONE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toneScroll}>
            {TONE_OPTIONS.map((tone) => {
              const isActive = contentTone === tone;
              return (
                <TouchableOpacity
                  key={tone}
                  onPress={() => setContentTone(tone)}
                  activeOpacity={0.7}
                  style={[
                    styles.tonePill,
                    {
                      backgroundColor: isActive ? colors.ink : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tonePillText,
                      { color: isActive ? colors.surface : colors.inkSecondary },
                    ]}
                  >
                    {tone}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Input
            label="Count"
            value={contentCount}
            onChangeText={setContentCount}
            placeholder="5"
            keyboardType="numeric"
          />

          <Button
            title={generateContentMutation.isPending ? "Generating..." : "Generate"}
            variant="red"
            onPress={handleGenerate}
            disabled={generateContentMutation.isPending}
          />
        </Card>

        {contentItems.length > 0 && (
          <>
            <SectionLabel text="Results" style={styles.sectionSpacing} />
            {isCalendar ? (
              renderCalendarGrid(contentItems)
            ) : (
              contentItems.map((item: unknown, i: number) => {
                const rec = safeRecord(item);
                const title = safeString(rec.title || rec.idea || rec.caption || rec.name || rec.heading, "");
                const body = safeString(rec.body || rec.content || rec.text || rec.description || rec.script || rec.bio, "");
                const copyText = body || title || JSON.stringify(item);
                const isCopied = copiedIndex === i;

                return (
                  <Card key={i} variant="sm">
                    {title !== "" && (
                      <Text style={[styles.genTitle, { color: colors.ink }]}>{title}</Text>
                    )}
                    {body !== "" && (
                      <Text style={[styles.genBody, { color: colors.inkSecondary }]}>{body}</Text>
                    )}
                    <TouchableOpacity
                      onPress={() => handleCopy(copyText, i)}
                      style={[styles.copyBtn, { borderColor: isCopied ? colors.green : colors.border }]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.copyBtnText,
                          { color: isCopied ? colors.green : colors.inkSecondary },
                        ]}
                      >
                        {isCopied ? "Copied!" : "Copy"}
                      </Text>
                    </TouchableOpacity>
                  </Card>
                );
              })
            )}
          </>
        )}
      </View>
    );
  };

  // =========================================================================
  // TAB 8: Hashtags
  // =========================================================================
  const renderHashtags = () => {
    const hashtagAnalysis = findAnalysis("hashtags");
    const data = getAnalysisData("hashtags");
    const groups = safeArray(data.groups || data.categories || data.hashtag_groups || []);
    const trending = safeArray(data.trending || data.trending_hashtags || []);
    const allHashtags: string[] = [];

    groups.forEach((g: unknown) => {
      const group = safeRecord(g);
      const tags = safeArray(group.hashtags || group.tags || group.items || []);
      tags.forEach((t: unknown) => {
        const tag = typeof t === "string" ? t : safeString(safeRecord(t).tag || safeRecord(t).hashtag, "");
        if (tag && tag !== "--") allHashtags.push(tag.startsWith("#") ? tag : `#${tag}`);
      });
    });
    trending.forEach((t: unknown) => {
      const tag = typeof t === "string" ? t : safeString(safeRecord(t).tag || safeRecord(t).hashtag, "");
      if (tag && tag !== "--") {
        const formatted = tag.startsWith("#") ? tag : `#${tag}`;
        if (!allHashtags.includes(formatted)) allHashtags.push(formatted);
      }
    });

    return (
      <View>
        <SectionLabel text="Hashtag Analysis" />
        <Button
          title={runAnalysisMutation.isPending ? "Analyzing..." : "Run Hashtag Analysis"}
          variant="sm-red"
          onPress={() => handleRunAnalysis("hashtags", "Hashtag")}
          disabled={runAnalysisMutation.isPending}
          style={styles.actionButtonFull}
        />

        {hashtagAnalysis ? (
          <>
            {hashtagAnalysis.summary ? (
              <Card style={styles.sectionSpacing}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Summary</Text>
                <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>
                  {stripMarkdown(hashtagAnalysis.summary)}
                </Text>
              </Card>
            ) : null}

            {allHashtags.length > 0 && (
              <Card style={styles.sectionSpacing}>
                <View style={styles.hashtagCopyHeader}>
                  <Text style={[styles.cardTitle, { color: colors.ink }]}>All Hashtags</Text>
                  <TouchableOpacity
                    onPress={() => handleCopy(allHashtags.join(" "))}
                    style={[
                      styles.copyAllBtn,
                      {
                        borderColor: copiedAll ? colors.green : colors.ink,
                        backgroundColor: copiedAll ? "transparent" : colors.ink,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.copyAllBtnText,
                        { color: copiedAll ? colors.green : colors.surface },
                      ]}
                    >
                      {copiedAll ? "Copied!" : "Copy All"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.hashtagBlock, { color: colors.inkSecondary }]}>
                  {allHashtags.join(" ")}
                </Text>
              </Card>
            )}

            {groups.length > 0 && (
              <>
                <SectionLabel text="By Category" style={styles.sectionSpacing} />
                {groups.map((g: unknown, i: number) => {
                  const group = safeRecord(g);
                  const name = safeString(group.name || group.category || group.group || group.label, `Group ${i + 1}`);
                  const tags = safeArray(group.hashtags || group.tags || group.items || []);

                  return (
                    <Card key={i} variant="sm">
                      <Text style={[styles.hashGroupName, { color: colors.ink }]}>{name}</Text>
                      <View style={styles.hashtagWrap}>
                        {tags.map((t: unknown, j: number) => {
                          const tag = typeof t === "string" ? t : safeString(safeRecord(t).tag || safeRecord(t).hashtag, "");
                          return (
                            <View
                              key={j}
                              style={[
                                styles.hashtagChip,
                                { borderColor: colors.border, backgroundColor: colors.surfaceInset },
                              ]}
                            >
                              <Text style={[styles.hashtagChipText, { color: colors.ink }]}>
                                {tag.startsWith("#") ? tag : `#${tag}`}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </Card>
                  );
                })}
              </>
            )}

            {trending.length > 0 && (
              <>
                <SectionLabel text="Trending" style={styles.sectionSpacing} />
                <Card>
                  <View style={styles.hashtagWrap}>
                    {trending.map((t: unknown, i: number) => {
                      const tag = typeof t === "string" ? t : safeString(safeRecord(t).tag || safeRecord(t).hashtag, "");
                      return (
                        <View
                          key={i}
                          style={[
                            styles.hashtagChip,
                            { borderColor: colors.gold, backgroundColor: colors.surfaceInset },
                          ]}
                        >
                          <Text style={[styles.hashtagChipText, { color: colors.gold }]}>
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              </>
            )}
          </>
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              title="No Hashtag Analysis"
              message='Tap "Run Hashtag Analysis" to get hashtag recommendations.'
            />
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // TAB 9: Insights
  // =========================================================================
  const renderInsights = () => {
    const insightsAnalysis = findAnalysis("insights");
    const data = getAnalysisData("insights");
    const influenceBreakdown = safeArray(data.influence_breakdown || data.influence_scores || data.influence || []);
    const brandOpportunities = safeArray(data.brand_opportunities || data.opportunities || data.brands || []);
    const collaborators = safeArray(data.collaborator_recommendations || data.collaborators || data.recommended_collaborators || []);
    const benchmarks = safeArray(data.industry_benchmarks || data.benchmarks || []);
    const influenceScore = safeNumber(data.influence_score || data.overall_score, 0);

    return (
      <View>
        <SectionLabel text="Insights" />
        <Button
          title={runAnalysisMutation.isPending ? "Analyzing..." : "Run Insights"}
          variant="sm-red"
          onPress={() => handleRunAnalysis("insights", "Insights")}
          disabled={runAnalysisMutation.isPending}
          style={styles.actionButtonFull}
        />

        {insightsAnalysis ? (
          <>
            {insightsAnalysis.summary ? (
              <Card style={styles.sectionSpacing}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Summary</Text>
                <Text style={[styles.cardBody, { color: colors.inkSecondary }]}>
                  {stripMarkdown(insightsAnalysis.summary)}
                </Text>
              </Card>
            ) : null}

            {influenceScore > 0 && (
              <Card style={styles.sectionSpacing}>
                <View style={styles.influenceRow}>
                  <ScoreRing score={Math.round(influenceScore)} size={72} status={scoreStatus(influenceScore)} />
                  <View style={styles.influenceText}>
                    <Text style={[styles.influenceTitle, { color: colors.ink }]}>Influence Score</Text>
                    <Text style={[styles.influenceSubtitle, { color: colors.inkMuted }]}>
                      Overall influence rating
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {influenceBreakdown.length > 0 && (
              <>
                <SectionLabel text="Influence Breakdown" style={styles.sectionSpacing} />
                {influenceBreakdown.map((b: unknown, i: number) => {
                  const item = safeRecord(b);
                  const category = safeString(item.category || item.area || item.name, `Area ${i + 1}`);
                  const score = safeNumber(item.score || item.value, 0);

                  return (
                    <Card key={i} variant="sm">
                      <View style={styles.breakdownRow}>
                        <Text style={[styles.breakdownCategory, { color: colors.ink }]}>{category}</Text>
                        <Text
                          style={[
                            styles.breakdownScore,
                            { color: score >= 80 ? colors.green : score >= 50 ? colors.gold : colors.red },
                          ]}
                        >
                          {score}
                        </Text>
                      </View>
                      <ProgressBar
                        value={score}
                        color={score >= 80 ? colors.green : score >= 50 ? colors.gold : colors.red}
                      />
                    </Card>
                  );
                })}
              </>
            )}

            {brandOpportunities.length > 0 && (
              <>
                <SectionLabel text="Brand Opportunities" style={styles.sectionSpacing} />
                {brandOpportunities.map((b: unknown, i: number) => {
                  const opp = safeRecord(b);
                  const brand = safeString(opp.brand || opp.name || opp.company, `Brand ${i + 1}`);
                  const reason = safeString(opp.reason || opp.description || opp.fit, "");
                  const fit = safeString(opp.fit_score || opp.match, "");

                  return (
                    <Card key={i} variant="sm">
                      <View style={styles.brandHeader}>
                        <Text style={[styles.brandName, { color: colors.ink }]}>{brand}</Text>
                        {fit !== "" && <Badge label={`${fit}% fit`} variant="green" />}
                      </View>
                      {reason !== "" && (
                        <Text style={[styles.brandReason, { color: colors.inkMuted }]}>{reason}</Text>
                      )}
                    </Card>
                  );
                })}
              </>
            )}

            {collaborators.length > 0 && (
              <>
                <SectionLabel text="Collaborator Recommendations" style={styles.sectionSpacing} />
                {collaborators.map((c: unknown, i: number) => {
                  const collab = safeRecord(c);
                  const name = safeString(collab.name || collab.handle || collab.profile, `Collaborator ${i + 1}`);
                  const reason = safeString(collab.reason || collab.why || collab.description, "");
                  const niche = safeString(collab.niche || collab.category, "");

                  return (
                    <Card key={i} variant="sm">
                      <View style={styles.collabHeader}>
                        <View
                          style={[
                            styles.collabAvatar,
                            { backgroundColor: colors.surfaceInset, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.collabAvatarText, { color: colors.inkMuted }]}>
                            {name[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.collabInfo}>
                          <Text style={[styles.collabName, { color: colors.ink }]}>{name}</Text>
                          {niche !== "" && <Badge label={niche} variant="outline" />}
                        </View>
                      </View>
                      {reason !== "" && (
                        <Text style={[styles.collabReason, { color: colors.inkMuted }]}>{reason}</Text>
                      )}
                    </Card>
                  );
                })}
              </>
            )}

            {benchmarks.length > 0 && (
              <>
                <SectionLabel text="Industry Benchmarks" style={styles.sectionSpacing} />
                <Card>
                  {benchmarks.map((b: unknown, i: number) => {
                    const bench = safeRecord(b);
                    const metric = safeString(bench.metric || bench.name || bench.label, `Metric ${i + 1}`);
                    const yours = safeString(bench.yours || bench.your_value || bench.current, "--");
                    const avg = safeString(bench.industry_avg || bench.average || bench.benchmark, "--");

                    return (
                      <View key={i}>
                        {i > 0 && <Divider />}
                        <View style={styles.benchmarkRow}>
                          <Text style={[styles.benchmarkMetric, { color: colors.ink }]}>{metric}</Text>
                          <View style={styles.benchmarkValues}>
                            <Text style={[styles.benchmarkYours, { color: colors.green }]}>
                              You: {yours}
                            </Text>
                            <Text style={[styles.benchmarkAvg, { color: colors.inkMuted }]}>
                              Avg: {avg}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </>
            )}
          </>
        ) : (
          <View style={styles.sectionSpacing}>
            <EmptyState
              title="No Insights"
              message='Tap "Run Insights" to get AI-powered influence and brand analysis.'
            />
          </View>
        )}
      </View>
    );
  };

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

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
        <View style={styles.header}>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            Cross-platform performance tracking
          </Text>
        </View>

        <Divider />

        <View style={styles.actionRow}>
          <Button
            title="Add Profile"
            variant="sm-red"
            onPress={handleAddProfile}
            disabled={addProfileMutation.isPending}
            style={styles.actionButton}
          />
        </View>

        {profiles.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.profileSelectorScroll}
            contentContainerStyle={styles.profileSelectorContainer}
          >
            {profiles.map((profile, index) => {
              const isSelected = selectedProfileIndex === index;
              return (
                <TouchableOpacity
                  key={profile.id}
                  onPress={() => setSelectedProfileIndex(index)}
                  activeOpacity={0.7}
                  style={[
                    styles.profilePill,
                    {
                      backgroundColor: isSelected ? colors.ink : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.profilePillText,
                      { color: isSelected ? colors.surface : colors.inkSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    @{profile.handle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

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

        <View style={styles.body}>
          {activeTab === "Overview" && renderOverview()}
          {activeTab === "Growth" && renderGrowth()}
          {activeTab === "Goals" && renderGoals()}
          {activeTab === "Earnings" && renderEarnings()}
          {activeTab === "Competitors" && renderCompetitors()}
          {activeTab === "Strategy" && renderStrategy()}
          {activeTab === "Generate" && renderGenerate()}
          {activeTab === "Hashtags" && renderHashtags()}
          {activeTab === "Insights" && renderInsights()}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Platform picker modal */}
      <AppModal
        visible={showPlatformPicker}
        onClose={() => setShowPlatformPicker(false)}
        title="Add Profile"
        message="Select a platform:"
      >
        <View style={styles.platformGrid}>
          {PLATFORMS.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.platformButton, { borderColor: colors.border }]}
              onPress={() => handleSelectPlatform(p.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.platformButtonText, { color: colors.ink }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </AppModal>

      {/* Handle input modal */}
      <AppModal
        visible={showHandleInput}
        onClose={() => setShowHandleInput(false)}
        title="Add Profile"
        message={`Enter the ${PLATFORMS.find((p) => p.value === selectedPlatform)?.label ?? ""} handle:`}
        buttons={[
          { label: "Cancel", onPress: () => setShowHandleInput(false), variant: "outline" },
          { label: "Add", onPress: handleSubmitProfile, variant: "primary" },
        ]}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.textInput, { color: colors.ink, borderColor: colors.border }]}
            value={handleText}
            onChangeText={setHandleText}
            placeholder="@handle"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </AppModal>

      {/* Add Competitor modal */}
      <AppModal
        visible={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        title="Add Competitor"
        message="Enter competitor details:"
        buttons={[
          { label: "Cancel", onPress: () => setShowAddCompetitor(false), variant: "outline" },
          { label: "Add", onPress: handleAddCompetitor, variant: "primary" },
        ]}
      >
        <View style={styles.inputContainer}>
          <Text style={[styles.modalFieldLabel, { color: colors.inkSecondary }]}>PLATFORM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPlatformScroll}>
            {PLATFORMS.map((p) => {
              const isActive = compPlatform === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setCompPlatform(p.value)}
                  activeOpacity={0.7}
                  style={[
                    styles.modalPlatformPill,
                    {
                      backgroundColor: isActive ? colors.ink : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalPlatformText,
                      { color: isActive ? colors.surface : colors.inkSecondary },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.modalFieldLabel, { color: colors.inkSecondary, marginTop: 12 }]}>
            HANDLE
          </Text>
          <TextInput
            style={[styles.textInput, { color: colors.ink, borderColor: colors.border }]}
            value={compHandle}
            onChangeText={setCompHandle}
            placeholder="@handle"
            placeholderTextColor={colors.inkMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </AppModal>

      {/* Set Goal modal */}
      <AppModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        title="Set Goal"
        message="Define your target:"
        buttons={[
          { label: "Cancel", onPress: () => setShowGoalModal(false), variant: "outline" },
          { label: "Save", onPress: handleSaveGoal, variant: "primary" },
        ]}
      >
        <View style={styles.inputContainer}>
          <Text style={[styles.modalFieldLabel, { color: colors.inkSecondary }]}>METRIC</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPlatformScroll}>
            {["followers", "engagement", "revenue", "posts"].map((m) => {
              const isActive = goalMetric === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setGoalMetric(m)}
                  activeOpacity={0.7}
                  style={[
                    styles.modalPlatformPill,
                    {
                      backgroundColor: isActive ? colors.ink : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalPlatformText,
                      { color: isActive ? colors.surface : colors.inkSecondary },
                    ]}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Text style={[styles.modalFieldLabel, { color: colors.inkSecondary, marginTop: 12 }]}>
            TARGET VALUE
          </Text>
          <TextInput
            style={[styles.textInput, { color: colors.ink, borderColor: colors.border }]}
            value={goalTargetValue}
            onChangeText={setGoalTargetValue}
            placeholder="e.g., 10000"
            placeholderTextColor={colors.inkMuted}
            keyboardType="numeric"
          />
          <Text style={[styles.modalFieldLabel, { color: colors.inkSecondary, marginTop: 12 }]}>
            DEADLINE (OPTIONAL)
          </Text>
          <TextInput
            style={[styles.textInput, { color: colors.ink, borderColor: colors.border }]}
            value={goalDeadline}
            onChangeText={setGoalDeadline}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.inkMuted}
          />
        </View>
      </AppModal>

      {/* General notification modal */}
      <AppModal
        visible={modal.visible}
        onClose={() => setModal((m) => ({ ...m, visible: false }))}
        title={modal.title}
        message={modal.message}
        variant={modal.variant}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const SCREEN_PADDING = spacing.screenPadding;

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
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  emptyAction: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: 16,
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
  actionRow: {
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    width: "auto",
    alignSelf: "flex-start",
  },
  actionButtonFull: {
    marginBottom: 8,
  },
  profileSelectorScroll: {
    marginBottom: 8,
  },
  profileSelectorContainer: {
    paddingHorizontal: SCREEN_PADDING,
    gap: 8,
    flexDirection: "row",
  },
  profilePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 0,
    maxWidth: 160,
  },
  profilePillText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  pillsScroll: {
    marginBottom: 16,
  },
  pillsContainer: {
    paddingHorizontal: SCREEN_PADDING,
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
  body: {
    paddingHorizontal: SCREEN_PADDING,
  },
  sectionSpacing: {
    marginTop: 16,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileMeta: {
    gap: 4,
  },
  profileBadgeRow: {
    flexDirection: "row",
    gap: 6,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.serifBlack,
    fontSize: 20,
  },
  profileHandle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
  },
  profileStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  profileStat: {
    alignItems: "center",
  },
  profileStatValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  profileStatLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  profileSynced: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 10,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  kpiCell: {
    width: "48%",
    flexGrow: 1,
  },
  followerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  followerDate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  followerCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  healthScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  healthScoreText: {
    flex: 1,
  },
  healthTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
  healthSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  emptyCardText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    textAlign: "center",
    paddingVertical: 12,
  },
  cardTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  tipRank: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  tipRankText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  tipContent: {
    flex: 1,
    gap: 4,
  },
  tipTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
  },
  tipDescription: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: 6,
    paddingLeft: 38,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  goalMetric: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  goalValues: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  goalCurrent: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  goalSeparator: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  goalTarget: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  goalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  goalProgress: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  goalDeadline: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  earningsValue: {
    fontFamily: fonts.mono,
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  scenarioName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scenarioAmount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginTop: 4,
  },
  scenarioDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 4,
    lineHeight: 16,
  },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  factorName: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    flex: 1,
  },
  competitorActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  competitorActionBtn: {
    flex: 1,
  },
  compRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compInfo: {
    flex: 1,
  },
  compHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  compHandle: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  compStats: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  compStatText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  removeBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
  },
  benchLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  benchFinding: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  pillarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pillarName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    flex: 1,
  },
  pillarDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 4,
    lineHeight: 16,
  },
  postingTime: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    paddingVertical: 6,
  },
  distRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distType: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  distPct: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  contentTypeScroll: {
    marginBottom: 8,
  },
  contentTypeContainer: {
    gap: 8,
    flexDirection: "row",
  },
  contentTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 0,
  },
  contentTypePillText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formLabel: {
    fontSize: fontSize.label,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  toneScroll: {
    marginBottom: 14,
  },
  tonePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 0,
    marginRight: 8,
  },
  tonePillText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: "capitalize",
  },
  genTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    marginBottom: 4,
  },
  genBody: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginBottom: 8,
  },
  copyBtn: {
    alignSelf: "flex-end",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 0,
  },
  copyBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calHeaderRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  calHeaderText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calRow: {
    flexDirection: "row",
  },
  calCell: {
    flex: 1,
    borderWidth: 1,
    padding: 4,
    minHeight: 60,
  },
  calDay: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  calTopic: {
    fontFamily: fonts.sans,
    fontSize: 9,
    marginTop: 2,
    lineHeight: 12,
  },
  calCategoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  hashtagCopyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  copyAllBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
  },
  copyAllBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hashtagBlock: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    lineHeight: 20,
  },
  hashGroupName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  hashtagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  hashtagChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  hashtagChipText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  influenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  influenceText: {
    flex: 1,
  },
  influenceTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
  influenceSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownCategory: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    flex: 1,
  },
  breakdownScore: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  brandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  brandName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    flex: 1,
  },
  brandReason: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  collabHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  collabAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  collabAvatarText: {
    fontFamily: fonts.serifBlack,
    fontSize: 16,
  },
  collabInfo: {
    flex: 1,
    gap: 4,
  },
  collabName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
  },
  collabReason: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  benchmarkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  benchmarkMetric: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    flex: 1,
  },
  benchmarkValues: {
    alignItems: "flex-end",
  },
  benchmarkYours: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    fontWeight: "700",
  },
  benchmarkAvg: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  platformGrid: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: 8,
  },
  platformButton: {
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  platformButtonText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  textInput: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalFieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  modalPlatformScroll: {
    marginBottom: 8,
  },
  modalPlatformPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 0,
    marginRight: 8,
  },
  modalPlatformText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: "capitalize",
  },
  bottomSpacer: {
    height: 100,
  },
});
