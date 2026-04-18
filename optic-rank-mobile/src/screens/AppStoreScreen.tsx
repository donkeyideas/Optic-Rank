import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { stripMarkdown } from "../lib/stripMarkdown";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import ScoreRing from "../components/ui/ScoreRing";
import EmptyState from "../components/ui/EmptyState";
import LoadingScreen from "../components/ui/LoadingScreen";
import AppModal from "../components/ui/AppModal";

import {
  useAppStoreListings,
  useAppStoreRankings,
  useAppReviews,
  useAppStoreCompetitors,
  useReviewTopics,
} from "../hooks/useAppStoreData";
import {
  useAppStoreSnapshots,
  useAppStoreVersions,
  useAppStoreLocalizations,
  useAppStoreReviewTopics,
} from "../hooks/useQueries";
import { useActiveProject } from "../hooks/useProjects";
import {
  useAddAppListing,
  useCalculateAppVisibility,
  useAnalyzeLocalizationOpportunity,
  useGenerateTranslation,
  useBulkTranslate,
  useAnalyzeUpdateImpact,
  useGetUpdateRecommendations,
  useScoreMetadata,
  useGenerateTitleVariants,
  useGenerateSubtitleVariant,
  useGenerateDescriptionVariant,
  useGenerateKeywordField,
  useGenerateFullListingRecommendation,
  useGetCategoryLeaderboard,
  useFindKeywordOpportunities,
  useAnalyzeCategoryTrends,
  useExtractReviewTopics,
} from "../hooks/useMutations";
import NoProjectGuard from "../components/shared/NoProjectGuard";

import type { AppStoreListing } from "../types";
import type {
  AppStoreRanking,
  AppReview,
  AppStoreCompetitor,
} from "../hooks/useAppStoreData";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = [
  "Overview",
  "Rankings",
  "Reviews",
  "Competitors",
  "Visibility",
  "Localization",
  "Intelligence",
  "Updates",
  "Optimizer",
] as const;
type Tab = (typeof TABS)[number];

// ---------------------------------------------------------------------------
// Market data for localization
// ---------------------------------------------------------------------------

const MARKETS = [
  { code: "US", name: "United States", language: "English", population: "330M" },
  { code: "GB", name: "United Kingdom", language: "English", population: "67M" },
  { code: "DE", name: "Germany", language: "German", population: "83M" },
  { code: "FR", name: "France", language: "French", population: "67M" },
  { code: "ES", name: "Spain", language: "Spanish", population: "47M" },
  { code: "IT", name: "Italy", language: "Italian", population: "60M" },
  { code: "BR", name: "Brazil", language: "Portuguese", population: "214M" },
  { code: "JP", name: "Japan", language: "Japanese", population: "125M" },
  { code: "KR", name: "South Korea", language: "Korean", population: "52M" },
  { code: "CN", name: "China", language: "Chinese", population: "1.4B" },
  { code: "IN", name: "India", language: "Hindi", population: "1.4B" },
  { code: "RU", name: "Russia", language: "Russian", population: "144M" },
  { code: "MX", name: "Mexico", language: "Spanish", population: "130M" },
  { code: "AU", name: "Australia", language: "English", population: "26M" },
  { code: "CA", name: "Canada", language: "English/French", population: "38M" },
  { code: "NL", name: "Netherlands", language: "Dutch", population: "17M" },
  { code: "SE", name: "Sweden", language: "Swedish", population: "10M" },
  { code: "SA", name: "Saudi Arabia", language: "Arabic", population: "35M" },
  { code: "TR", name: "Turkey", language: "Turkish", population: "85M" },
  { code: "PL", name: "Poland", language: "Polish", population: "38M" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreStatus(score: number): "good" | "warn" | "bad" {
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "--";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    "\u2605".repeat(full) +
    (half ? "\u00BD" : "") +
    "\u2606".repeat(empty)
  );
}

function difficultyBadgeVariant(
  difficulty: number | null
): "green" | "gold" | "red" | "outline" {
  if (difficulty == null) return "outline";
  if (difficulty <= 30) return "green";
  if (difficulty <= 60) return "gold";
  return "red";
}

function sentimentBadgeVariant(
  sentiment: string | null
): "green" | "red" | "gold" | "outline" {
  switch (sentiment) {
    case "positive":
      return "green";
    case "negative":
      return "red";
    case "neutral":
      return "gold";
    default:
      return "outline";
  }
}

function positionWeight(pos: number): number {
  if (pos <= 0) return 0;
  if (pos === 1) return 1.0;
  if (pos === 2) return 0.85;
  if (pos === 3) return 0.7;
  if (pos === 4) return 0.6;
  if (pos === 5) return 0.5;
  if (pos <= 10) return 0.4 - (pos - 6) * 0.056;
  if (pos <= 25) return 0.12 - (pos - 10) * 0.006;
  if (pos <= 50) return 0.03 - (pos - 25) * 0.0012;
  return 0;
}

function tierForPosition(pos: number | null): string {
  if (pos == null || pos <= 0) return "Low";
  if (pos <= 3) return "Top 3";
  if (pos <= 10) return "Top 10";
  if (pos <= 25) return "Top 25";
  if (pos <= 50) return "Top 50";
  return "Low";
}

function tierColor(
  tier: string,
  colors: { green: string; gold: string; blue: string; red: string; inkMuted: string }
): string {
  switch (tier) {
    case "Top 3":
      return colors.green;
    case "Top 10":
      return colors.blue;
    case "Top 25":
      return colors.gold;
    case "Top 50":
      return colors.red;
    default:
      return colors.inkMuted;
  }
}

function localizationStatusBadge(
  status: string | null
): { label: string; variant: "green" | "gold" | "red" | "outline" } {
  switch (status) {
    case "localized":
      return { label: "Localized", variant: "green" };
    case "english_ok":
      return { label: "English OK", variant: "gold" };
    case "not_localized":
      return { label: "Not Localized", variant: "red" };
    default:
      return { label: "Unknown", variant: "outline" };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AppStoreScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [selectedListingIndex, setSelectedListingIndex] = useState(0);

  // --- Modal state ---
  const [modal, setModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "info" | "success" | "error" | "loading";
  }>({ visible: false, title: "", message: "", variant: "info" });

  // --- Add App flow state ---
  const [showAddApp, setShowAddApp] = useState(false);
  const [addAppStore, setAddAppStore] = useState<"apple" | "google">("apple");
  const [addAppId, setAddAppId] = useState("");
  const [addAppName, setAddAppName] = useState("");

  // --- Data hooks ---
  const { data: project, isLoading: projectLoading } = useActiveProject();
  const projectId = project?.id;

  // --- Mutations ---
  const addAppMutation = useAddAppListing(projectId);

  const handleAddApp = useCallback(() => {
    setAddAppStore("apple");
    setAddAppId("");
    setAddAppName("");
    setShowAddApp(true);
  }, []);

  const handleSubmitApp = useCallback(() => {
    if (!addAppId.trim() || !addAppName.trim()) {
      setModal({
        visible: true,
        title: "Missing Fields",
        message: "Please enter both an App ID and App Name.",
        variant: "error",
      });
      return;
    }
    setShowAddApp(false);
    addAppMutation.mutate(
      { store: addAppStore, appId: addAppId.trim(), appName: addAppName.trim() },
      {
        onSuccess: () => {
          setModal({
            visible: true,
            title: "App Added",
            message: `Successfully added "${addAppName.trim()}" to your project.`,
            variant: "success",
          });
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message: err instanceof Error ? err.message : "Failed to add app listing.",
            variant: "error",
          });
        },
      }
    );
  }, [addAppStore, addAppId, addAppName, addAppMutation]);

  const {
    data: listings,
    isLoading: listingsLoading,
    refetch: refetchListings,
    isRefetching: isRefetchingListings,
  } = useAppStoreListings(projectId);

  const listingIds = useMemo(
    () => (listings ?? []).map((l) => l.id),
    [listings]
  );

  const selectedListing = listings?.[selectedListingIndex] ?? null;
  const selectedIds = selectedListing ? [selectedListing.id] : [];

  const {
    data: rankings,
    refetch: refetchRankings,
    isRefetching: isRefetchingRankings,
  } = useAppStoreRankings(selectedIds);

  const {
    data: reviews,
    refetch: refetchReviews,
    isRefetching: isRefetchingReviews,
  } = useAppReviews(selectedIds);

  const {
    data: competitors,
    refetch: refetchCompetitors,
    isRefetching: isRefetchingCompetitors,
  } = useAppStoreCompetitors(selectedIds);

  const {
    data: reviewTopics,
    refetch: refetchTopics,
    isRefetching: isRefetchingTopics,
  } = useReviewTopics(selectedIds);

  const {
    data: snapshots,
    refetch: refetchSnapshots,
    isRefetching: isRefetchingSnapshots,
  } = useAppStoreSnapshots(selectedIds);

  const {
    data: versions,
    refetch: refetchVersions,
    isRefetching: isRefetchingVersions,
  } = useAppStoreVersions(selectedIds);

  const {
    data: localizations,
    refetch: refetchLocalizations,
    isRefetching: isRefetchingLocalizations,
  } = useAppStoreLocalizations(selectedIds);

  const isRefreshing =
    isRefetchingListings ||
    isRefetchingRankings ||
    isRefetchingReviews ||
    isRefetchingCompetitors ||
    isRefetchingTopics ||
    isRefetchingSnapshots ||
    isRefetchingVersions ||
    isRefetchingLocalizations;

  const handleRefresh = useCallback(() => {
    refetchListings();
    refetchRankings();
    refetchReviews();
    refetchCompetitors();
    refetchTopics();
    refetchSnapshots();
    refetchVersions();
    refetchLocalizations();
  }, [
    refetchListings,
    refetchRankings,
    refetchReviews,
    refetchCompetitors,
    refetchTopics,
    refetchSnapshots,
    refetchVersions,
    refetchLocalizations,
  ]);

  // --- Loading ---
  if (projectLoading || (listingsLoading && !listings)) {
    return <LoadingScreen />;
  }

  if (!project) return <NoProjectGuard feature="App Store" />;

  if (!listings || listings.length === 0) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
        edges={[]}
      >
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="No App Listings"
            message="Add an App Store or Play Store listing to your project to start tracking ASO data."
          />
        </View>

        {/* Add App modal */}
        <AppModal
          visible={showAddApp}
          onClose={() => setShowAddApp(false)}
          title="Add App"
          message="Enter the app details to start tracking."
          buttons={[
            { label: "Cancel", onPress: () => setShowAddApp(false), variant: "outline" },
            { label: "Add", onPress: handleSubmitApp, variant: "primary" },
          ]}
        >
          <AddAppForm
            addAppStore={addAppStore}
            setAddAppStore={setAddAppStore}
            addAppId={addAppId}
            setAddAppId={setAddAppId}
            addAppName={addAppName}
            setAddAppName={setAddAppName}
          />
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
            Cross-platform ASO intelligence
          </Text>
        </View>

        <Divider />

        {/* Add App action */}
        <View style={styles.actionRow}>
          <Button
            title="Add App"
            variant="sm-red"
            onPress={handleAddApp}
            disabled={addAppMutation.isPending}
            style={styles.actionButton}
          />
        </View>

        {/* Listing selector (if multiple) */}
        {listings.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.listingSelectorScroll}
            contentContainerStyle={styles.listingSelectorContainer}
          >
            {listings.map((listing, index) => {
              const isSelected = selectedListingIndex === index;
              return (
                <TouchableOpacity
                  key={listing.id}
                  onPress={() => setSelectedListingIndex(index)}
                  activeOpacity={0.7}
                  style={[
                    styles.listingPill,
                    {
                      backgroundColor: isSelected
                        ? colors.ink
                        : "transparent",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.listingPillText,
                      {
                        color: isSelected
                          ? colors.surface
                          : colors.inkSecondary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {listing.app_name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Tab pills */}
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
                    {
                      color: isActive ? colors.surface : colors.inkSecondary,
                    },
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
          {activeTab === "Overview" && selectedListing && (
            <OverviewSection listing={selectedListing} />
          )}

          {activeTab === "Rankings" && (
            <RankingsSection rankings={rankings ?? []} />
          )}

          {activeTab === "Reviews" && (
            <ReviewsSection reviews={reviews ?? []} />
          )}

          {activeTab === "Competitors" && (
            <CompetitorsSection competitors={competitors ?? []} />
          )}

          {activeTab === "Visibility" && selectedListing && (
            <VisibilitySection
              listing={selectedListing}
              rankings={rankings ?? []}
              projectId={projectId}
              setModal={setModal}
            />
          )}

          {activeTab === "Localization" && selectedListing && (
            <LocalizationSection
              listing={selectedListing}
              localizations={localizations ?? []}
              projectId={projectId}
              setModal={setModal}
            />
          )}

          {activeTab === "Intelligence" && selectedListing && (
            <IntelligenceSection
              listing={selectedListing}
              projectId={projectId}
              setModal={setModal}
            />
          )}

          {activeTab === "Updates" && selectedListing && (
            <UpdatesSection
              listing={selectedListing}
              versions={versions ?? []}
              snapshots={snapshots ?? []}
              projectId={projectId}
              setModal={setModal}
            />
          )}

          {activeTab === "Optimizer" && selectedListing && (
            <OptimizerSection
              listing={selectedListing}
              projectId={projectId}
              setModal={setModal}
            />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add App modal */}
      <AppModal
        visible={showAddApp}
        onClose={() => setShowAddApp(false)}
        title="Add App"
        message="Enter the app details to start tracking."
        buttons={[
          { label: "Cancel", onPress: () => setShowAddApp(false), variant: "outline" },
          { label: "Add", onPress: handleSubmitApp, variant: "primary" },
        ]}
      >
        <AddAppForm
          addAppStore={addAppStore}
          setAddAppStore={setAddAppStore}
          addAppId={addAppId}
          setAddAppId={setAddAppId}
          addAppName={addAppName}
          setAddAppName={setAddAppName}
        />
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
// Add App Form (shared between empty state and main)
// ---------------------------------------------------------------------------

interface AddAppFormProps {
  addAppStore: "apple" | "google";
  setAddAppStore: (v: "apple" | "google") => void;
  addAppId: string;
  setAddAppId: (v: string) => void;
  addAppName: string;
  setAddAppName: (v: string) => void;
}

function AddAppForm({
  addAppStore,
  setAddAppStore,
  addAppId,
  setAddAppId,
  addAppName,
  setAddAppName,
}: AddAppFormProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.addAppForm}>
      <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>Store</Text>
      <View style={styles.storeToggle}>
        <TouchableOpacity
          style={[
            styles.storeOption,
            {
              backgroundColor: addAppStore === "apple" ? colors.ink : "transparent",
              borderColor: colors.border,
            },
          ]}
          onPress={() => setAddAppStore("apple")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.storeOptionText,
              { color: addAppStore === "apple" ? colors.surface : colors.ink },
            ]}
          >
            App Store
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.storeOption,
            {
              backgroundColor: addAppStore === "google" ? colors.ink : "transparent",
              borderColor: colors.border,
            },
          ]}
          onPress={() => setAddAppStore("google")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.storeOptionText,
              { color: addAppStore === "google" ? colors.surface : colors.ink },
            ]}
          >
            Play Store
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>App ID</Text>
      <TextInput
        style={[styles.textInput, { color: colors.ink, borderColor: colors.border }]}
        value={addAppId}
        onChangeText={setAddAppId}
        placeholder="e.g. com.example.app"
        placeholderTextColor={colors.inkMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={[styles.inputLabel, { color: colors.inkMuted }]}>App Name</Text>
      <TextInput
        style={[styles.textInput, { color: colors.ink, borderColor: colors.border }]}
        value={addAppName}
        onChangeText={setAddAppName}
        placeholder="My App"
        placeholderTextColor={colors.inkMuted}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Overview Section
// ---------------------------------------------------------------------------

interface OverviewSectionProps {
  listing: AppStoreListing;
}

function OverviewSection({ listing }: OverviewSectionProps) {
  const { colors } = useTheme();
  const asoScore = listing.aso_score ?? 0;

  return (
    <>
      <SectionLabel text="App Details" />
      <Card>
        <View style={styles.appRow}>
          {listing.icon_url ? (
            <Image
              source={{ uri: listing.icon_url }}
              style={styles.appIcon}
            />
          ) : (
            <View
              style={[
                styles.appIconPlaceholder,
                { backgroundColor: colors.border },
              ]}
            >
              <Text style={[styles.appIconText, { color: colors.inkMuted }]}>
                {listing.app_name.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: colors.ink }]}>
              {listing.app_name}
            </Text>
            <Text style={[styles.appDeveloper, { color: colors.inkMuted }]}>
              {listing.developer ?? "--"}
            </Text>
            <View style={styles.appMetaRow}>
              <Badge
                label={listing.store === "apple" ? "App Store" : "Play Store"}
                variant={listing.store === "apple" ? "dark" : "green"}
              />
              {listing.category && (
                <Text
                  style={[styles.appCategory, { color: colors.inkSecondary }]}
                >
                  {listing.category}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Card>

      {/* Rating & Stats */}
      <SectionLabel text="Performance" style={styles.sectionSpacing} />
      <Card>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.ink }]}>
              {listing.rating?.toFixed(1) ?? "--"}
            </Text>
            <Text style={[styles.statStars, { color: colors.gold }]}>
              {listing.rating ? renderStars(listing.rating) : "--"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Rating
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.ink }]}>
              {formatNumber(listing.reviews_count)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Reviews
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.ink }]}>
              {formatNumber(listing.downloads_estimate)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Downloads
            </Text>
          </View>
        </View>
      </Card>

      {/* ASO Score */}
      <SectionLabel text="ASO Score" style={styles.sectionSpacing} />
      <Card>
        <View style={styles.asoRow}>
          <ScoreRing
            score={asoScore}
            size={72}
            status={scoreStatus(asoScore)}
          />
          <View style={styles.asoInfo}>
            <Text style={[styles.asoLabel, { color: colors.ink }]}>
              App Store Optimization
            </Text>
            <Text style={[styles.asoMeta, { color: colors.inkMuted }]}>
              Version: {listing.current_version ?? "--"}
            </Text>
            <Text style={[styles.asoMeta, { color: colors.inkMuted }]}>
              Updated: {formatDate(listing.last_updated)}
            </Text>
          </View>
        </View>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Rankings Section
// ---------------------------------------------------------------------------

interface RankingsSectionProps {
  rankings: AppStoreRanking[];
}

function RankingsSection({ rankings }: RankingsSectionProps) {
  const { colors } = useTheme();

  if (rankings.length === 0) {
    return (
      <EmptyState
        title="No Ranking Data"
        message="App Store keyword rankings will appear here once data is collected."
      />
    );
  }

  // Deduplicate by keyword, showing latest
  const latestByKeyword = useMemo(() => {
    const map = new Map<string, AppStoreRanking>();
    for (const r of rankings) {
      if (!map.has(r.keyword)) {
        map.set(r.keyword, r);
      }
    }
    return Array.from(map.values());
  }, [rankings]);

  return (
    <>
      <SectionLabel text="Keyword Rankings" />
      <Card>
        {latestByKeyword.map((rank, index) => (
          <View key={rank.id}>
            {index > 0 && <Divider />}
            <View style={styles.rankRow}>
              <View style={styles.rankInfo}>
                <Text
                  style={[styles.rankKeyword, { color: colors.ink }]}
                  numberOfLines={1}
                >
                  {rank.keyword}
                </Text>
                <View style={styles.rankMeta}>
                  <Badge
                    label={`Diff: ${rank.difficulty ?? "--"}`}
                    variant={difficultyBadgeVariant(rank.difficulty)}
                  />
                  <Text
                    style={[styles.rankVolume, { color: colors.inkMuted }]}
                  >
                    Vol: {formatNumber(rank.search_volume)}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.rankPosition,
                  {
                    color:
                      rank.position != null && rank.position <= 3
                        ? colors.green
                        : rank.position != null && rank.position <= 10
                        ? colors.gold
                        : colors.ink,
                  },
                ]}
              >
                {rank.position != null ? `#${rank.position}` : "--"}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reviews Section
// ---------------------------------------------------------------------------

interface ReviewsSectionProps {
  reviews: AppReview[];
}

function ReviewsSection({ reviews }: ReviewsSectionProps) {
  const { colors } = useTheme();

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="No Reviews"
        message="App reviews will appear here once they are collected from the store."
      />
    );
  }

  return (
    <>
      <SectionLabel text="Recent Reviews" />
      {reviews.slice(0, 20).map((review) => (
        <Card key={review.id} variant="sm">
          <View style={styles.reviewHeader}>
            <Text
              style={[styles.reviewerName, { color: colors.ink }]}
              numberOfLines={1}
            >
              {review.reviewer_name ?? "Anonymous"}
            </Text>
            <Text style={[styles.reviewDate, { color: colors.inkMuted }]}>
              {formatDate(review.review_date)}
            </Text>
          </View>
          <Text style={[styles.reviewStars, { color: colors.gold }]}>
            {renderStars(review.rating)}
          </Text>
          {review.title && (
            <Text
              style={[styles.reviewTitle, { color: colors.ink }]}
              numberOfLines={1}
            >
              {review.title}
            </Text>
          )}
          {review.body && (
            <Text
              style={[styles.reviewBody, { color: colors.inkSecondary }]}
              numberOfLines={3}
            >
              {review.body}
            </Text>
          )}
          {review.sentiment && (
            <View style={styles.reviewFooter}>
              <Badge
                label={review.sentiment}
                variant={sentimentBadgeVariant(review.sentiment)}
              />
            </View>
          )}
        </Card>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Competitors Section
// ---------------------------------------------------------------------------

interface CompetitorsSectionProps {
  competitors: AppStoreCompetitor[];
}

function CompetitorsSection({ competitors }: CompetitorsSectionProps) {
  const { colors } = useTheme();

  if (competitors.length === 0) {
    return (
      <EmptyState
        title="No Competitors"
        message="App store competitors will appear here once they are configured."
      />
    );
  }

  return (
    <>
      <SectionLabel text="App Competitors" />
      {competitors.map((comp) => (
        <Card key={comp.id} variant="sm">
          <View style={styles.compRow}>
            <View style={styles.compInfo}>
              <Text
                style={[styles.compName, { color: colors.ink }]}
                numberOfLines={1}
              >
                {comp.competitor_name}
              </Text>
              <View style={styles.compMeta}>
                <Text style={[styles.compStat, { color: colors.inkMuted }]}>
                  {comp.rating?.toFixed(1) ?? "--"}{" "}
                  <Text style={{ color: colors.gold }}>{"\u2605"}</Text>
                </Text>
                <Text style={[styles.compStat, { color: colors.inkMuted }]}>
                  {formatNumber(comp.reviews_count)} reviews
                </Text>
                <Text style={[styles.compStat, { color: colors.inkMuted }]}>
                  {formatNumber(comp.downloads_estimate)} downloads
                </Text>
              </View>
            </View>
          </View>
        </Card>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Visibility Section (NEW)
// ---------------------------------------------------------------------------

interface VisibilitySectionProps {
  listing: AppStoreListing;
  rankings: AppStoreRanking[];
  projectId: string | undefined;
  setModal: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      title: string;
      message: string;
      variant: "info" | "success" | "error" | "loading";
    }>
  >;
}

function VisibilitySection({
  listing,
  rankings,
  projectId,
  setModal,
}: VisibilitySectionProps) {
  const { colors } = useTheme();
  const calculateVisibility = useCalculateAppVisibility(projectId);

  // Deduplicate rankings by keyword (latest only)
  const latestByKeyword = useMemo(() => {
    const map = new Map<string, AppStoreRanking>();
    for (const r of rankings) {
      if (!map.has(r.keyword)) {
        map.set(r.keyword, r);
      }
    }
    return Array.from(map.values());
  }, [rankings]);

  // Calculate organic visibility score
  const visibilityData = useMemo(() => {
    if (latestByKeyword.length === 0) {
      return { score: 0, maxPossible: 0, keywords: [] as Array<{
        keyword: string;
        position: number | null;
        volume: number;
        weight: number;
        contribution: number;
        tier: string;
      }> };
    }

    let totalWeighted = 0;
    let maxPossible = 0;

    const keywords = latestByKeyword.map((r) => {
      const vol = r.search_volume ?? 0;
      const pos = r.position ?? 0;
      const weight = positionWeight(pos);
      const contribution = weight * vol;
      totalWeighted += contribution;
      maxPossible += vol; // max if all #1

      return {
        keyword: r.keyword,
        position: r.position,
        volume: vol,
        weight: Math.round(weight * 100),
        contribution: Math.round(contribution),
        tier: tierForPosition(r.position),
      };
    });

    const score = maxPossible > 0 ? Math.round((totalWeighted / maxPossible) * 100) : 0;

    // Sort by contribution descending
    keywords.sort((a, b) => b.contribution - a.contribution);

    return { score, maxPossible: Math.round(maxPossible), keywords };
  }, [latestByKeyword]);

  // Tier distribution
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Top 3": 0,
      "Top 10": 0,
      "Top 25": 0,
      "Top 50": 0,
      Low: 0,
    };
    for (const kw of visibilityData.keywords) {
      counts[kw.tier] = (counts[kw.tier] ?? 0) + 1;
    }
    return counts;
  }, [visibilityData.keywords]);

  const totalKeywords = visibilityData.keywords.length;

  const handleCalculate = useCallback(() => {
    if (!listing.id) return;
    setModal({
      visible: true,
      title: "Calculating",
      message: "Computing organic visibility score...",
      variant: "loading",
    });
    calculateVisibility.mutate(listing.id, {
      onSuccess: () => {
        setModal({
          visible: true,
          title: "Complete",
          message: "Visibility score has been calculated and saved.",
          variant: "success",
        });
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to calculate visibility.",
          variant: "error",
        });
      },
    });
  }, [listing.id, calculateVisibility, setModal]);

  return (
    <>
      {/* Visibility Score Hero */}
      <SectionLabel text="Organic Visibility Score" />
      <Card>
        <View style={styles.visScoreRow}>
          <ScoreRing
            score={visibilityData.score}
            size={80}
            status={scoreStatus(visibilityData.score)}
          />
          <View style={styles.visScoreInfo}>
            <Text style={[styles.visScoreLabel, { color: colors.ink }]}>
              Discoverability
            </Text>
            <Text style={[styles.visScoreMeta, { color: colors.inkMuted }]}>
              Across {totalKeywords} tracked keywords
            </Text>
            <Text style={[styles.visScoreMeta, { color: colors.inkMuted }]}>
              Max possible: {formatNumber(visibilityData.maxPossible)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Action */}
      <View style={styles.sectionSpacing}>
        <Button
          title="Calculate Visibility"
          variant="sm-red"
          onPress={handleCalculate}
          disabled={calculateVisibility.isPending}
          style={styles.actionButton}
        />
      </View>

      {/* Tier Distribution */}
      <SectionLabel text="Tier Distribution" style={styles.sectionSpacing} />
      <Card>
        {(["Top 3", "Top 10", "Top 25", "Top 50", "Low"] as const).map((tier) => {
          const count = tierCounts[tier] ?? 0;
          const pct = totalKeywords > 0 ? (count / totalKeywords) * 100 : 0;
          return (
            <View key={tier} style={styles.tierRow}>
              <View style={styles.tierLabelRow}>
                <Text style={[styles.tierLabel, { color: colors.ink }]}>
                  {tier}
                </Text>
                <Text style={[styles.tierCount, { color: colors.inkMuted }]}>
                  {count} ({Math.round(pct)}%)
                </Text>
              </View>
              <View style={[styles.tierBarBg, { backgroundColor: colors.surfaceInset }]}>
                <View
                  style={[
                    styles.tierBarFill,
                    {
                      width: `${Math.max(pct, 1)}%`,
                      backgroundColor: tierColor(tier, colors),
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </Card>

      {/* Keyword Breakdown Table */}
      <SectionLabel text="Keyword Breakdown" style={styles.sectionSpacing} />
      {visibilityData.keywords.length === 0 ? (
        <EmptyState
          title="No Keywords"
          message="Track keyword rankings to see visibility breakdown."
        />
      ) : (
        <Card>
          {/* Table header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.tableColKeyword, { color: colors.inkMuted }]}>
              Keyword
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableColNarrow, { color: colors.inkMuted }]}>
              Pos
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableColNarrow, { color: colors.inkMuted }]}>
              Vol
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableColNarrow, { color: colors.inkMuted }]}>
              Wt%
            </Text>
            <Text style={[styles.tableHeaderCell, styles.tableColNarrow, { color: colors.inkMuted }]}>
              Contrib
            </Text>
          </View>
          <Divider />
          {visibilityData.keywords.map((kw, idx) => (
            <View key={kw.keyword}>
              {idx > 0 && <Divider />}
              <View style={styles.tableRow}>
                <Text
                  style={[styles.tableCell, styles.tableColKeyword, { color: colors.ink }]}
                  numberOfLines={1}
                >
                  {kw.keyword}
                </Text>
                <Text
                  style={[
                    styles.tableCellMono,
                    styles.tableColNarrow,
                    {
                      color:
                        kw.position != null && kw.position <= 3
                          ? colors.green
                          : kw.position != null && kw.position <= 10
                          ? colors.gold
                          : colors.ink,
                    },
                  ]}
                >
                  {kw.position != null ? `#${kw.position}` : "--"}
                </Text>
                <Text style={[styles.tableCellMono, styles.tableColNarrow, { color: colors.inkSecondary }]}>
                  {formatNumber(kw.volume)}
                </Text>
                <Text style={[styles.tableCellMono, styles.tableColNarrow, { color: colors.inkSecondary }]}>
                  {kw.weight}%
                </Text>
                <Text style={[styles.tableCellMono, styles.tableColNarrow, { color: colors.ink }]}>
                  {formatNumber(kw.contribution)}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Localization Section (NEW)
// ---------------------------------------------------------------------------

interface LocalizationSectionProps {
  listing: AppStoreListing;
  localizations: Record<string, unknown>[];
  projectId: string | undefined;
  setModal: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      title: string;
      message: string;
      variant: "info" | "success" | "error" | "loading";
    }>
  >;
}

function LocalizationSection({
  listing,
  localizations,
  projectId,
  setModal,
}: LocalizationSectionProps) {
  const { colors } = useTheme();
  const analyzeLocalization = useAnalyzeLocalizationOpportunity(projectId);
  const generateTranslation = useGenerateTranslation(projectId);
  const bulkTranslate = useBulkTranslate(projectId);

  // Build localization map from DB data
  const locMap = useMemo(() => {
    const m = new Map<string, Record<string, unknown>>();
    for (const loc of localizations) {
      const code = (loc as { country_code?: string }).country_code;
      if (code) m.set(code, loc);
    }
    return m;
  }, [localizations]);

  // Merge market data with localization status
  const marketData = useMemo(() => {
    return MARKETS.map((market) => {
      const loc = locMap.get(market.code);
      const status = loc
        ? (loc as { status?: string }).status ?? "not_localized"
        : "not_localized";
      const opportunityScore = loc
        ? (loc as { opportunity_score?: number }).opportunity_score ?? 0
        : Math.round(Math.random() * 40 + 30); // estimate if no data
      return {
        ...market,
        status,
        opportunityScore,
        hasData: !!loc,
      };
    });
  }, [locMap]);

  const notLocalizedCodes = useMemo(
    () =>
      marketData
        .filter((m) => m.status === "not_localized")
        .map((m) => m.code),
    [marketData]
  );

  const handleGenerateTranslation = useCallback(
    (countryCode: string) => {
      setModal({
        visible: true,
        title: "Generating",
        message: `Generating translation for ${countryCode}...`,
        variant: "loading",
      });
      generateTranslation.mutate(
        { listingId: listing.id, countryCode },
        {
          onSuccess: () => {
            setModal({
              visible: true,
              title: "Complete",
              message: `Translation for ${countryCode} generated successfully.`,
              variant: "success",
            });
          },
          onError: (err) => {
            setModal({
              visible: true,
              title: "Error",
              message: err instanceof Error ? err.message : "Translation generation failed.",
              variant: "error",
            });
          },
        }
      );
    },
    [listing.id, generateTranslation, setModal]
  );

  const handleBulkTranslate = useCallback(() => {
    if (notLocalizedCodes.length === 0) {
      setModal({
        visible: true,
        title: "All Done",
        message: "All markets are already localized.",
        variant: "info",
      });
      return;
    }
    setModal({
      visible: true,
      title: "Bulk Translating",
      message: `Generating translations for ${notLocalizedCodes.length} markets...`,
      variant: "loading",
    });
    bulkTranslate.mutate(
      { listingId: listing.id, countryCodes: notLocalizedCodes },
      {
        onSuccess: (data) => {
          setModal({
            visible: true,
            title: "Complete",
            message: `Successfully translated ${(data as { translated?: number }).translated ?? notLocalizedCodes.length} markets.`,
            variant: "success",
          });
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message: err instanceof Error ? err.message : "Bulk translation failed.",
            variant: "error",
          });
        },
      }
    );
  }, [listing.id, notLocalizedCodes, bulkTranslate, setModal]);

  const localizedCount = marketData.filter((m) => m.status === "localized").length;
  const englishOkCount = marketData.filter((m) => m.status === "english_ok").length;

  return (
    <>
      {/* Summary */}
      <SectionLabel text="Localization Overview" />
      <Card>
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.green }]}>
              {localizedCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Localized
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.gold }]}>
              {englishOkCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              English OK
            </Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: colors.red }]}>
              {notLocalizedCodes.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.inkMuted }]}>
              Not Localized
            </Text>
          </View>
        </View>
      </Card>

      {/* Bulk Translate */}
      <View style={styles.sectionSpacing}>
        <Button
          title={`Bulk Translate (${notLocalizedCodes.length})`}
          variant="sm-red"
          onPress={handleBulkTranslate}
          disabled={bulkTranslate.isPending || notLocalizedCodes.length === 0}
          style={styles.actionButton}
        />
      </View>

      {/* Market Opportunity Grid */}
      <SectionLabel text="Market Opportunities" style={styles.sectionSpacing} />
      {marketData.map((market) => {
        const badge = localizationStatusBadge(market.status);
        return (
          <Card key={market.code} variant="sm">
            <View style={styles.marketRow}>
              <View style={styles.marketInfo}>
                <View style={styles.marketTitleRow}>
                  <Text style={[styles.marketName, { color: colors.ink }]}>
                    {market.name}
                  </Text>
                  <Badge label={badge.label} variant={badge.variant} />
                </View>
                <View style={styles.marketMeta}>
                  <Text style={[styles.marketDetail, { color: colors.inkMuted }]}>
                    {market.code}
                  </Text>
                  <Text style={[styles.marketDetail, { color: colors.inkMuted }]}>
                    {market.language}
                  </Text>
                  <Text style={[styles.marketDetail, { color: colors.inkMuted }]}>
                    Pop: {market.population}
                  </Text>
                </View>
                <View style={styles.marketScoreRow}>
                  <Text style={[styles.marketScoreLabel, { color: colors.inkSecondary }]}>
                    Opportunity:
                  </Text>
                  <Text
                    style={[
                      styles.marketScoreValue,
                      {
                        color:
                          market.opportunityScore >= 70
                            ? colors.green
                            : market.opportunityScore >= 40
                            ? colors.gold
                            : colors.red,
                      },
                    ]}
                  >
                    {market.opportunityScore}/100
                  </Text>
                </View>
              </View>
              {market.status !== "localized" && (
                <TouchableOpacity
                  onPress={() => handleGenerateTranslation(market.code)}
                  activeOpacity={0.7}
                  style={[styles.marketActionBtn, { borderColor: colors.red }]}
                >
                  <Text style={[styles.marketActionText, { color: colors.red }]}>
                    Translate
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Intelligence Section (NEW)
// ---------------------------------------------------------------------------

interface IntelligenceSectionProps {
  listing: AppStoreListing;
  projectId: string | undefined;
  setModal: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      title: string;
      message: string;
      variant: "info" | "success" | "error" | "loading";
    }>
  >;
}

function IntelligenceSection({
  listing,
  projectId,
  setModal,
}: IntelligenceSectionProps) {
  const { colors } = useTheme();
  const getCategoryLeaderboard = useGetCategoryLeaderboard(projectId);
  const findKeywordOpportunities = useFindKeywordOpportunities(projectId);
  const analyzeCategoryTrends = useAnalyzeCategoryTrends(projectId);

  // Local state for results
  const [leaderboard, setLeaderboard] = useState<Record<string, unknown>[]>([]);
  const [opportunities, setOpportunities] = useState<Record<string, unknown>[]>([]);
  const [trendsAnalysis, setTrendsAnalysis] = useState<string | null>(null);

  const handleGetLeaderboard = useCallback(() => {
    setModal({
      visible: true,
      title: "Loading",
      message: "Fetching category leaderboard...",
      variant: "loading",
    });
    getCategoryLeaderboard.mutate(listing.id, {
      onSuccess: (data) => {
        setLeaderboard((data as { apps?: Record<string, unknown>[] }).apps ?? []);
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to fetch leaderboard.",
          variant: "error",
        });
      },
    });
  }, [listing.id, getCategoryLeaderboard, setModal]);

  const handleFindOpportunities = useCallback(() => {
    setModal({
      visible: true,
      title: "Analyzing",
      message: "Finding keyword opportunities with AI...",
      variant: "loading",
    });
    findKeywordOpportunities.mutate(listing.id, {
      onSuccess: (data) => {
        setOpportunities(
          (data as { opportunities?: Record<string, unknown>[] }).opportunities ?? []
        );
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to find opportunities.",
          variant: "error",
        });
      },
    });
  }, [listing.id, findKeywordOpportunities, setModal]);

  const handleAnalyzeTrends = useCallback(() => {
    setModal({
      visible: true,
      title: "Analyzing",
      message: "Running AI category trends analysis...",
      variant: "loading",
    });
    analyzeCategoryTrends.mutate(listing.id, {
      onSuccess: (data) => {
        setTrendsAnalysis(
          (data as { analysis?: string }).analysis ?? "No analysis available."
        );
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to analyze trends.",
          variant: "error",
        });
      },
    });
  }, [listing.id, analyzeCategoryTrends, setModal]);

  return (
    <>
      {/* Action Buttons */}
      <SectionLabel text="Intelligence Actions" />
      <View style={styles.intelButtonRow}>
        <Button
          title="Find Opportunities"
          variant="sm-red"
          onPress={handleFindOpportunities}
          disabled={findKeywordOpportunities.isPending}
          style={styles.intelButton}
        />
        <Button
          title="Analyze Trends"
          variant="sm-outline"
          onPress={handleAnalyzeTrends}
          disabled={analyzeCategoryTrends.isPending}
          style={styles.intelButton}
        />
      </View>

      {/* Category Leaderboard */}
      <SectionLabel text="Category Leaderboard" style={styles.sectionSpacing} />
      {leaderboard.length === 0 ? (
        <Card>
          <View style={styles.intelEmptyCard}>
            <Text style={[styles.intelEmptyText, { color: colors.inkMuted }]}>
              Tap below to load top 15 apps in your category.
            </Text>
            <View style={styles.intelEmptyBtnWrap}>
              <Button
                title="Load Leaderboard"
                variant="sm-outline"
                onPress={handleGetLeaderboard}
                disabled={getCategoryLeaderboard.isPending}
                style={styles.actionButton}
              />
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          {leaderboard.slice(0, 15).map((app, idx) => {
            const appName = (app as { name?: string; app_name?: string }).name ??
              (app as { app_name?: string }).app_name ?? `App ${idx + 1}`;
            const appRating = (app as { rating?: number }).rating;
            const appDownloads = (app as { downloads?: number; downloads_estimate?: number }).downloads ??
              (app as { downloads_estimate?: number }).downloads_estimate;
            const appRank = (app as { rank?: number; position?: number }).rank ??
              (app as { position?: number }).position ?? idx + 1;

            return (
              <View key={idx}>
                {idx > 0 && <Divider />}
                <View style={styles.leaderRow}>
                  <Text style={[styles.leaderRank, { color: colors.inkMuted }]}>
                    #{appRank}
                  </Text>
                  <View style={styles.leaderInfo}>
                    <Text
                      style={[styles.leaderName, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {appName}
                    </Text>
                    <View style={styles.leaderMeta}>
                      {appRating != null && (
                        <Text style={[styles.leaderStat, { color: colors.inkMuted }]}>
                          {appRating.toFixed(1)}{" "}
                          <Text style={{ color: colors.gold }}>{"\u2605"}</Text>
                        </Text>
                      )}
                      {appDownloads != null && (
                        <Text style={[styles.leaderStat, { color: colors.inkMuted }]}>
                          {formatNumber(appDownloads)} downloads
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Keyword Opportunities */}
      <SectionLabel text="Keyword Opportunities" style={styles.sectionSpacing} />
      {opportunities.length === 0 ? (
        <EmptyState
          title="No Opportunities Yet"
          message='Tap "Find Opportunities" to discover AI-suggested keywords with volume, competition, and opportunity scores.'
        />
      ) : (
        <Card>
          {opportunities.slice(0, 10).map((opp, idx) => {
            const kwName = (opp as { keyword?: string }).keyword ?? `Keyword ${idx + 1}`;
            const volume = (opp as { volume?: number; search_volume?: number }).volume ??
              (opp as { search_volume?: number }).search_volume ?? 0;
            const competition = (opp as { competition?: number; difficulty?: number }).competition ??
              (opp as { difficulty?: number }).difficulty ?? 0;
            const score = (opp as { score?: number; opportunity_score?: number }).score ??
              (opp as { opportunity_score?: number }).opportunity_score ?? 0;

            return (
              <View key={idx}>
                {idx > 0 && <Divider />}
                <View style={styles.oppRow}>
                  <View style={styles.oppInfo}>
                    <Text
                      style={[styles.oppKeyword, { color: colors.ink }]}
                      numberOfLines={1}
                    >
                      {kwName}
                    </Text>
                    <View style={styles.oppMeta}>
                      <Text style={[styles.oppStat, { color: colors.inkMuted }]}>
                        Vol: {formatNumber(volume)}
                      </Text>
                      <Badge
                        label={`Comp: ${competition}`}
                        variant={difficultyBadgeVariant(competition)}
                      />
                    </View>
                  </View>
                  <View style={styles.oppScoreWrap}>
                    <Text
                      style={[
                        styles.oppScore,
                        {
                          color:
                            score >= 70
                              ? colors.green
                              : score >= 40
                              ? colors.gold
                              : colors.red,
                        },
                      ]}
                    >
                      {score}
                    </Text>
                    <Text style={[styles.oppScoreLabel, { color: colors.inkMuted }]}>
                      Score
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Category Trends */}
      <SectionLabel text="Category Trends Analysis" style={styles.sectionSpacing} />
      {trendsAnalysis ? (
        <Card>
          <Text style={[styles.trendsText, { color: colors.inkSecondary }]}>
            {stripMarkdown(trendsAnalysis)}
          </Text>
        </Card>
      ) : (
        <EmptyState
          title="No Trends Analysis"
          message='Tap "Analyze Trends" to get AI-powered category trend insights.'
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Updates Section (NEW)
// ---------------------------------------------------------------------------

interface UpdatesSectionProps {
  listing: AppStoreListing;
  versions: Record<string, unknown>[];
  snapshots: Record<string, unknown>[];
  projectId: string | undefined;
  setModal: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      title: string;
      message: string;
      variant: "info" | "success" | "error" | "loading";
    }>
  >;
}

function UpdatesSection({
  listing,
  versions,
  snapshots,
  projectId,
  setModal,
}: UpdatesSectionProps) {
  const { colors } = useTheme();
  const analyzeUpdateImpact = useAnalyzeUpdateImpact(projectId);
  const getUpdateRecs = useGetUpdateRecommendations(projectId);

  // Local state for impact analysis result
  const [impactResults, setImpactResults] = useState<Map<string, string>>(new Map());
  const [updateRecs, setUpdateRecs] = useState<string | null>(null);

  // Find snapshot closest to a date (for pre/post comparison)
  const findSnapshotNear = useCallback(
    (dateStr: string, before: boolean) => {
      const target = new Date(dateStr).getTime();
      let best: Record<string, unknown> | null = null;
      let bestDiff = Infinity;

      for (const snap of snapshots) {
        const snapDate = (snap as { snapshot_date?: string; captured_at?: string }).snapshot_date ??
          (snap as { captured_at?: string }).captured_at;
        if (!snapDate) continue;
        const snapTime = new Date(snapDate).getTime();
        const diff = before ? target - snapTime : snapTime - target;
        if (diff >= 0 && diff < bestDiff) {
          bestDiff = diff;
          best = snap;
        }
      }
      return best;
    },
    [snapshots]
  );

  const handleAnalyzeImpact = useCallback(
    (versionId: string) => {
      setModal({
        visible: true,
        title: "Analyzing",
        message: "Analyzing update impact with AI...",
        variant: "loading",
      });
      analyzeUpdateImpact.mutate(
        { listingId: listing.id, versionId },
        {
          onSuccess: (data) => {
            const analysis = (data as { analysis?: string }).analysis ?? "Analysis complete.";
            setImpactResults((prev) => {
              const next = new Map(prev);
              next.set(versionId, analysis);
              return next;
            });
            setModal((m) => ({ ...m, visible: false }));
          },
          onError: (err) => {
            setModal({
              visible: true,
              title: "Error",
              message: err instanceof Error ? err.message : "Failed to analyze impact.",
              variant: "error",
            });
          },
        }
      );
    },
    [listing.id, analyzeUpdateImpact, setModal]
  );

  const handleGetRecommendations = useCallback(() => {
    setModal({
      visible: true,
      title: "Loading",
      message: "Getting update recommendations...",
      variant: "loading",
    });
    getUpdateRecs.mutate(listing.id, {
      onSuccess: (data) => {
        setUpdateRecs(
          (data as { recommendations?: string }).recommendations ?? "No recommendations."
        );
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to get recommendations.",
          variant: "error",
        });
      },
    });
  }, [listing.id, getUpdateRecs, setModal]);

  if (versions.length === 0) {
    return (
      <EmptyState
        title="No Version History"
        message="Version history will appear here once app updates are tracked."
      />
    );
  }

  return (
    <>
      {/* Action */}
      <SectionLabel text="Update Analysis" />
      <View style={styles.sectionSpacing}>
        <Button
          title="Get Update Recommendations"
          variant="sm-outline"
          onPress={handleGetRecommendations}
          disabled={getUpdateRecs.isPending}
          style={styles.actionButton}
        />
      </View>

      {/* Update Recommendations */}
      {updateRecs && (
        <>
          <SectionLabel text="Recommendations" style={styles.sectionSpacing} />
          <Card>
            <Text style={[styles.trendsText, { color: colors.inkSecondary }]}>
              {stripMarkdown(updateRecs)}
            </Text>
          </Card>
        </>
      )}

      {/* Version History */}
      <SectionLabel text="Version History" style={styles.sectionSpacing} />
      {versions.map((version, idx) => {
        const vId = (version as { id?: string }).id ?? String(idx);
        const versionNum = (version as { version?: string; version_number?: string }).version ??
          (version as { version_number?: string }).version_number ?? "--";
        const releasedAt = (version as { released_at?: string; release_date?: string }).released_at ??
          (version as { release_date?: string }).release_date ?? null;
        const releaseNotes = (version as { release_notes?: string; notes?: string }).release_notes ??
          (version as { notes?: string }).notes ?? null;

        // Pre/post metrics
        const preSnap = releasedAt ? findSnapshotNear(releasedAt, true) : null;
        const postSnap = releasedAt ? findSnapshotNear(releasedAt, false) : null;

        const preRating = preSnap ? (preSnap as { rating?: number }).rating ?? null : null;
        const postRating = postSnap ? (postSnap as { rating?: number }).rating ?? null : null;
        const preReviews = preSnap ? (preSnap as { reviews_count?: number }).reviews_count ?? null : null;
        const postReviews = postSnap ? (postSnap as { reviews_count?: number }).reviews_count ?? null : null;
        const preDownloads = preSnap
          ? (preSnap as { downloads_estimate?: number }).downloads_estimate ?? null
          : null;
        const postDownloads = postSnap
          ? (postSnap as { downloads_estimate?: number }).downloads_estimate ?? null
          : null;

        const impactAnalysis = impactResults.get(vId);

        return (
          <Card key={vId} variant="sm">
            {/* Version header */}
            <View style={styles.versionHeader}>
              <View style={styles.versionTitleRow}>
                <Text style={[styles.versionNumber, { color: colors.ink }]}>
                  v{versionNum}
                </Text>
                <Text style={[styles.versionDate, { color: colors.inkMuted }]}>
                  {formatDate(releasedAt)}
                </Text>
              </View>
            </View>

            {/* Release notes */}
            {releaseNotes && (
              <Text
                style={[styles.releaseNotes, { color: colors.inkSecondary }]}
                numberOfLines={4}
              >
                {releaseNotes}
              </Text>
            )}

            {/* Pre/Post Metrics */}
            {(preSnap || postSnap) && (
              <View style={styles.metricsCompare}>
                <Text style={[styles.metricsLabel, { color: colors.inkMuted }]}>
                  PRE / POST COMPARISON
                </Text>
                <View style={styles.metricsGrid}>
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricCellLabel, { color: colors.inkMuted }]}>
                      Rating
                    </Text>
                    <Text style={[styles.metricCellValue, { color: colors.ink }]}>
                      {preRating?.toFixed(1) ?? "--"} {"\u2192"} {postRating?.toFixed(1) ?? "--"}
                    </Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricCellLabel, { color: colors.inkMuted }]}>
                      Reviews
                    </Text>
                    <Text style={[styles.metricCellValue, { color: colors.ink }]}>
                      {formatNumber(preReviews)} {"\u2192"} {formatNumber(postReviews)}
                    </Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={[styles.metricCellLabel, { color: colors.inkMuted }]}>
                      Downloads
                    </Text>
                    <Text style={[styles.metricCellValue, { color: colors.ink }]}>
                      {formatNumber(preDownloads)} {"\u2192"} {formatNumber(postDownloads)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Impact Analysis result */}
            {impactAnalysis && (
              <View style={[styles.impactResult, { borderTopColor: colors.border }]}>
                <Text style={[styles.impactLabel, { color: colors.inkMuted }]}>
                  AI IMPACT ANALYSIS
                </Text>
                <Text style={[styles.impactText, { color: colors.inkSecondary }]}>
                  {stripMarkdown(impactAnalysis)}
                </Text>
              </View>
            )}

            {/* Analyze Impact button */}
            <View style={styles.versionActionRow}>
              <Button
                title="Analyze Impact"
                variant="sm-outline"
                onPress={() => handleAnalyzeImpact(vId)}
                disabled={analyzeUpdateImpact.isPending}
                style={styles.actionButton}
              />
            </View>
          </Card>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Optimizer Section (NEW)
// ---------------------------------------------------------------------------

interface OptimizerSectionProps {
  listing: AppStoreListing;
  projectId: string | undefined;
  setModal: React.Dispatch<
    React.SetStateAction<{
      visible: boolean;
      title: string;
      message: string;
      variant: "info" | "success" | "error" | "loading";
    }>
  >;
}

function OptimizerSection({
  listing,
  projectId,
  setModal,
}: OptimizerSectionProps) {
  const { colors } = useTheme();

  // Metadata editor state
  const [title, setTitle] = useState(listing.app_name ?? "");
  const [subtitle, setSubtitle] = useState(listing.subtitle ?? "");
  const [description, setDescription] = useState(listing.description ?? "");
  const [keywordsField, setKeywordsField] = useState(listing.keywords_field ?? "");
  const [promotionalText, setPromotionalText] = useState(listing.promotional_text ?? "");

  // Score state
  const [metadataScore, setMetadataScore] = useState<number | null>(null);
  const [scoreRecommendations, setScoreRecommendations] = useState<string[]>([]);

  // Generated variants state
  const [titleVariants, setTitleVariants] = useState<Array<{ title: string; score: number; reason: string }>>([]);
  const [generatedSubtitle, setGeneratedSubtitle] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [generatedKeywords, setGeneratedKeywords] = useState<string | null>(null);
  const [fullRecommendation, setFullRecommendation] = useState<Record<string, unknown> | null>(null);

  // Mutations
  const scoreMetadata = useScoreMetadata(projectId);
  const generateTitles = useGenerateTitleVariants(projectId);
  const generateSubtitleMut = useGenerateSubtitleVariant(projectId);
  const generateDescriptionMut = useGenerateDescriptionVariant(projectId);
  const generateKeywordsMut = useGenerateKeywordField(projectId);
  const generateFull = useGenerateFullListingRecommendation(projectId);

  // Score metadata
  const handleScore = useCallback(() => {
    scoreMetadata.mutate(
      {
        store: listing.store,
        title,
        subtitle,
        description,
        keywordsField,
        ...(listing.store === "apple" ? { promotionalText } : {}),
      },
      {
        onSuccess: (data) => {
          const result = data as { score?: number; recommendations?: string[] };
          setMetadataScore(result.score ?? 0);
          setScoreRecommendations(result.recommendations ?? []);
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message: err instanceof Error ? err.message : "Failed to score metadata.",
            variant: "error",
          });
        },
      }
    );
  }, [listing.store, title, subtitle, description, keywordsField, promotionalText, scoreMetadata, setModal]);

  // Generate Titles
  const handleGenerateTitles = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating",
      message: "Creating title variants with AI...",
      variant: "loading",
    });
    generateTitles.mutate(
      { listingId: listing.id },
      {
        onSuccess: (data) => {
          const result = data as { variants?: Array<{ title: string; score: number; reason: string }> };
          setTitleVariants(result.variants ?? []);
          setModal((m) => ({ ...m, visible: false }));
        },
        onError: (err) => {
          setModal({
            visible: true,
            title: "Error",
            message: err instanceof Error ? err.message : "Failed to generate titles.",
            variant: "error",
          });
        },
      }
    );
  }, [listing.id, generateTitles, setModal]);

  // Generate Subtitle
  const handleGenerateSubtitle = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating",
      message: "Creating subtitle variant with AI...",
      variant: "loading",
    });
    generateSubtitleMut.mutate(listing.id, {
      onSuccess: (data) => {
        const result = data as { subtitle?: string };
        setGeneratedSubtitle(result.subtitle ?? null);
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to generate subtitle.",
          variant: "error",
        });
      },
    });
  }, [listing.id, generateSubtitleMut, setModal]);

  // Generate Description
  const handleGenerateDescription = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating",
      message: "Creating description variant with AI...",
      variant: "loading",
    });
    generateDescriptionMut.mutate(listing.id, {
      onSuccess: (data) => {
        const result = data as { description?: string };
        setGeneratedDescription(result.description ?? null);
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to generate description.",
          variant: "error",
        });
      },
    });
  }, [listing.id, generateDescriptionMut, setModal]);

  // Generate Keywords
  const handleGenerateKeywords = useCallback(() => {
    setModal({
      visible: true,
      title: "Generating",
      message: "Creating keyword field with AI...",
      variant: "loading",
    });
    generateKeywordsMut.mutate(listing.id, {
      onSuccess: (data) => {
        const result = data as { keywords?: string };
        setGeneratedKeywords(result.keywords ?? null);
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to generate keywords.",
          variant: "error",
        });
      },
    });
  }, [listing.id, generateKeywordsMut, setModal]);

  // Full Optimization
  const handleFullOptimization = useCallback(() => {
    setModal({
      visible: true,
      title: "Optimizing",
      message: "Running full listing optimization with AI...",
      variant: "loading",
    });
    generateFull.mutate(listing.id, {
      onSuccess: (data) => {
        const result = data as { recommendation?: Record<string, unknown> };
        setFullRecommendation(result.recommendation ?? null);
        setModal((m) => ({ ...m, visible: false }));
      },
      onError: (err) => {
        setModal({
          visible: true,
          title: "Error",
          message: err instanceof Error ? err.message : "Failed to run full optimization.",
          variant: "error",
        });
      },
    });
  }, [listing.id, generateFull, setModal]);

  return (
    <>
      {/* Real-time Score */}
      <SectionLabel text="Metadata Score" />
      <Card>
        <View style={styles.optimizerScoreRow}>
          {metadataScore != null ? (
            <ScoreRing
              score={metadataScore}
              size={72}
              status={scoreStatus(metadataScore)}
            />
          ) : (
            <View style={[styles.scorePlaceholder, { borderColor: colors.border }]}>
              <Text style={[styles.scorePlaceholderText, { color: colors.inkMuted }]}>
                --
              </Text>
            </View>
          )}
          <View style={styles.optimizerScoreInfo}>
            <Text style={[styles.optimizerScoreLabel, { color: colors.ink }]}>
              ASO Metadata Score
            </Text>
            <Text style={[styles.optimizerScoreMeta, { color: colors.inkMuted }]}>
              {metadataScore != null
                ? `${metadataScore}/100 - Edit fields and re-score`
                : "Edit your metadata below and tap Score"}
            </Text>
          </View>
        </View>
        <View style={styles.scoreButtonRow}>
          <Button
            title="Score Metadata"
            variant="sm-primary"
            onPress={handleScore}
            disabled={scoreMetadata.isPending}
            style={styles.actionButton}
          />
        </View>
        {/* Score recommendations */}
        {scoreRecommendations.length > 0 && (
          <View style={styles.scoreRecsWrap}>
            {scoreRecommendations.map((rec, idx) => (
              <View key={idx} style={styles.scoreRecRow}>
                <Text style={[styles.scoreRecBullet, { color: colors.red }]}>
                  {"\u2022"}
                </Text>
                <Text style={[styles.scoreRecText, { color: colors.inkSecondary }]}>
                  {stripMarkdown(rec)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Metadata Editor */}
      <SectionLabel text="Metadata Editor" style={styles.sectionSpacing} />
      <Card>
        {/* Title */}
        <View style={styles.editorField}>
          <View style={styles.editorFieldHeader}>
            <Text style={[styles.editorFieldLabel, { color: colors.inkMuted }]}>
              Title
            </Text>
            <Text style={[styles.editorCharCount, { color: colors.inkMuted }]}>
              {title.length}/30
            </Text>
          </View>
          <TextInput
            style={[styles.editorInput, { color: colors.ink, borderColor: colors.border }]}
            value={title}
            onChangeText={setTitle}
            placeholder="App title"
            placeholderTextColor={colors.inkMuted}
            maxLength={30}
          />
          <Button
            title="Generate Titles"
            variant="sm-outline"
            onPress={handleGenerateTitles}
            disabled={generateTitles.isPending}
            style={styles.editorGenBtn}
          />
        </View>

        <Divider />

        {/* Subtitle */}
        <View style={styles.editorField}>
          <View style={styles.editorFieldHeader}>
            <Text style={[styles.editorFieldLabel, { color: colors.inkMuted }]}>
              Subtitle
            </Text>
            <Text style={[styles.editorCharCount, { color: colors.inkMuted }]}>
              {subtitle.length}/30
            </Text>
          </View>
          <TextInput
            style={[styles.editorInput, { color: colors.ink, borderColor: colors.border }]}
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="App subtitle"
            placeholderTextColor={colors.inkMuted}
            maxLength={30}
          />
          <Button
            title="Generate Subtitle"
            variant="sm-outline"
            onPress={handleGenerateSubtitle}
            disabled={generateSubtitleMut.isPending}
            style={styles.editorGenBtn}
          />
        </View>

        <Divider />

        {/* Description */}
        <View style={styles.editorField}>
          <View style={styles.editorFieldHeader}>
            <Text style={[styles.editorFieldLabel, { color: colors.inkMuted }]}>
              Description
            </Text>
            <Text style={[styles.editorCharCount, { color: colors.inkMuted }]}>
              {description.length}/4000
            </Text>
          </View>
          <TextInput
            style={[
              styles.editorInput,
              styles.editorInputMultiline,
              { color: colors.ink, borderColor: colors.border },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="App description"
            placeholderTextColor={colors.inkMuted}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={4000}
          />
          <Button
            title="Generate Description"
            variant="sm-outline"
            onPress={handleGenerateDescription}
            disabled={generateDescriptionMut.isPending}
            style={styles.editorGenBtn}
          />
        </View>

        <Divider />

        {/* Keywords Field */}
        <View style={styles.editorField}>
          <View style={styles.editorFieldHeader}>
            <Text style={[styles.editorFieldLabel, { color: colors.inkMuted }]}>
              Keywords
            </Text>
            <Text style={[styles.editorCharCount, { color: colors.inkMuted }]}>
              {keywordsField.length}/100
            </Text>
          </View>
          <TextInput
            style={[styles.editorInput, { color: colors.ink, borderColor: colors.border }]}
            value={keywordsField}
            onChangeText={setKeywordsField}
            placeholder="keyword1,keyword2,keyword3"
            placeholderTextColor={colors.inkMuted}
            maxLength={100}
            autoCapitalize="none"
          />
          <Button
            title="Generate Keywords"
            variant="sm-outline"
            onPress={handleGenerateKeywords}
            disabled={generateKeywordsMut.isPending}
            style={styles.editorGenBtn}
          />
        </View>

        {/* Promotional Text — Apple only */}
        {listing.store === "apple" && (
          <>
            <Divider />
            <View style={styles.editorField}>
              <View style={styles.editorFieldHeader}>
                <Text style={[styles.editorFieldLabel, { color: colors.inkMuted }]}>
                  Promotional Text
                </Text>
                <Text style={[styles.editorCharCount, { color: colors.inkMuted }]}>
                  {promotionalText.length}/170
                </Text>
              </View>
              <TextInput
                value={promotionalText}
                onChangeText={setPromotionalText}
                multiline
                maxLength={170}
                placeholder="Enter promotional text..."
                placeholderTextColor={colors.inkMuted}
                textAlignVertical="top"
                style={[
                  styles.editorInput,
                  styles.editorInputMultiline,
                  { color: colors.ink, borderColor: colors.border, minHeight: 80 },
                ]}
              />
            </View>
          </>
        )}
      </Card>

      {/* Full Optimization */}
      <View style={styles.sectionSpacing}>
        <Button
          title="Full Optimization"
          variant="red"
          onPress={handleFullOptimization}
          disabled={generateFull.isPending}
        />
      </View>

      {/* Generated Title Variants */}
      {titleVariants.length > 0 && (
        <>
          <SectionLabel text="Generated Title Variants" style={styles.sectionSpacing} />
          <Card>
            {titleVariants.map((variant, idx) => (
              <View key={idx}>
                {idx > 0 && <Divider />}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setTitle(variant.title)}
                  style={styles.variantRow}
                >
                  <View style={styles.variantInfo}>
                    <Text style={[styles.variantTitle, { color: colors.ink }]}>
                      {variant.title}
                    </Text>
                    <Text
                      style={[styles.variantReason, { color: colors.inkMuted }]}
                      numberOfLines={2}
                    >
                      {variant.reason}
                    </Text>
                  </View>
                  <View style={styles.variantScoreWrap}>
                    <Text
                      style={[
                        styles.variantScore,
                        {
                          color:
                            variant.score >= 80
                              ? colors.green
                              : variant.score >= 60
                              ? colors.gold
                              : colors.red,
                        },
                      ]}
                    >
                      {variant.score}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Generated Subtitle */}
      {generatedSubtitle && (
        <>
          <SectionLabel text="Generated Subtitle" style={styles.sectionSpacing} />
          <Card>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSubtitle(generatedSubtitle)}
              style={styles.generatedTextCard}
            >
              <Text style={[styles.generatedText, { color: colors.ink }]}>
                {generatedSubtitle}
              </Text>
              <Text style={[styles.generatedHint, { color: colors.inkMuted }]}>
                Tap to apply
              </Text>
            </TouchableOpacity>
          </Card>
        </>
      )}

      {/* Generated Description */}
      {generatedDescription && (
        <>
          <SectionLabel text="Generated Description" style={styles.sectionSpacing} />
          <Card>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setDescription(generatedDescription)}
              style={styles.generatedTextCard}
            >
              <Text
                style={[styles.generatedText, { color: colors.ink }]}
                numberOfLines={10}
              >
                {generatedDescription}
              </Text>
              <Text style={[styles.generatedHint, { color: colors.inkMuted }]}>
                Tap to apply
              </Text>
            </TouchableOpacity>
          </Card>
        </>
      )}

      {/* Generated Keywords */}
      {generatedKeywords && (
        <>
          <SectionLabel text="Generated Keywords" style={styles.sectionSpacing} />
          <Card>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setKeywordsField(generatedKeywords)}
              style={styles.generatedTextCard}
            >
              <Text style={[styles.generatedTextMono, { color: colors.ink }]}>
                {generatedKeywords}
              </Text>
              <Text style={[styles.generatedHint, { color: colors.inkMuted }]}>
                Tap to apply
              </Text>
            </TouchableOpacity>
          </Card>
        </>
      )}

      {/* Full Optimization Result */}
      {fullRecommendation && (
        <>
          <SectionLabel text="Full Optimization Result" style={styles.sectionSpacing} />
          <Card>
            {Object.entries(fullRecommendation).map(([key, value]) => (
              <View key={key} style={styles.fullRecField}>
                <Text style={[styles.fullRecKey, { color: colors.inkMuted }]}>
                  {key.replace(/_/g, " ").toUpperCase()}
                </Text>
                <Text style={[styles.fullRecValue, { color: colors.ink }]}>
                  {typeof value === "string"
                    ? stripMarkdown(value)
                    : typeof value === "number"
                    ? String(value)
                    : JSON.stringify(value, null, 2)}
                </Text>
              </View>
            ))}
            <View style={styles.fullRecActions}>
              <Button
                title="Apply Title"
                variant="sm-outline"
                onPress={() => {
                  const t = (fullRecommendation as { title?: string }).title;
                  if (t) setTitle(t);
                }}
                style={styles.fullRecBtn}
              />
              <Button
                title="Apply Subtitle"
                variant="sm-outline"
                onPress={() => {
                  const s = (fullRecommendation as { subtitle?: string }).subtitle;
                  if (s) setSubtitle(s);
                }}
                style={styles.fullRecBtn}
              />
              <Button
                title="Apply Description"
                variant="sm-outline"
                onPress={() => {
                  const d = (fullRecommendation as { description?: string }).description;
                  if (d) setDescription(d);
                }}
                style={styles.fullRecBtn}
              />
              <Button
                title="Apply Keywords"
                variant="sm-outline"
                onPress={() => {
                  const k =
                    (fullRecommendation as { keywords?: string; keywords_field?: string }).keywords ??
                    (fullRecommendation as { keywords_field?: string }).keywords_field;
                  if (k) setKeywordsField(k);
                }}
                style={styles.fullRecBtn}
              />
            </View>
          </Card>
        </>
      )}
    </>
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
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
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

  // Action row
  actionRow: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
  },
  actionButton: {
    width: "auto",
    alignSelf: "flex-start",
  },

  // Listing selector
  listingSelectorScroll: {
    marginBottom: 8,
  },
  listingSelectorContainer: {
    paddingHorizontal: spacing.screenPadding,
    gap: 8,
    flexDirection: "row",
  },
  listingPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 0,
    maxWidth: 160,
  },
  listingPillText: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
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

  // Add App form (inside modal)
  addAppForm: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: 4,
  },
  inputLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 8,
  },
  storeToggle: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  storeOption: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  storeOptionText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },

  // Overview - App details
  appRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  appIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  appIconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appIconText: {
    fontFamily: fonts.serifBlack,
    fontSize: 24,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
  },
  appDeveloper: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  appMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  appCategory: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },

  // Overview - Stats
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statCell: {
    alignItems: "center",
  },
  statValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  statStars: {
    fontSize: 12,
    marginTop: 2,
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Overview - ASO
  asoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  asoInfo: {
    flex: 1,
  },
  asoLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  asoMeta: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 3,
  },

  // Rankings
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  rankInfo: {
    flex: 1,
  },
  rankKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  rankMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  rankVolume: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  rankPosition: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },

  // Reviews
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewerName: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  reviewDate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  reviewStars: {
    fontSize: 12,
    marginTop: 4,
  },
  reviewTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    marginTop: 4,
  },
  reviewBody: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  reviewFooter: {
    marginTop: 6,
  },

  // Competitors
  compRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compInfo: {
    flex: 1,
  },
  compName: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  compMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  compStat: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },

  // Visibility
  visScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  visScoreInfo: {
    flex: 1,
  },
  visScoreLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  visScoreMeta: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 3,
  },
  tierRow: {
    marginBottom: 10,
  },
  tierLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  tierLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  tierCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  tierBarBg: {
    height: 8,
    width: "100%",
    borderRadius: 0,
  },
  tierBarFill: {
    height: 8,
    borderRadius: 0,
  },

  // Table (Visibility keyword breakdown)
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    alignItems: "center",
  },
  tableCell: {
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  tableCellMono: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    textAlign: "right",
  },
  tableColKeyword: {
    flex: 1,
    paddingRight: 4,
  },
  tableColNarrow: {
    width: 52,
    textAlign: "right",
  },

  // Localization
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  marketInfo: {
    flex: 1,
  },
  marketTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  marketName: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  marketMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  marketDetail: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  marketScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  marketScoreLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  marketScoreValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
  },
  marketActionBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 0,
  },
  marketActionText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Intelligence
  intelButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  intelButton: {
    flex: 1,
  },
  intelEmptyCard: {
    alignItems: "center",
    paddingVertical: 12,
  },
  intelEmptyText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    textAlign: "center",
  },
  intelEmptyBtnWrap: {
    marginTop: 10,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  leaderRank: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
    width: 28,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  leaderMeta: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  leaderStat: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  oppRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  oppInfo: {
    flex: 1,
  },
  oppKeyword: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  oppMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  oppStat: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  oppScoreWrap: {
    alignItems: "center",
    marginLeft: 8,
  },
  oppScore: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  oppScoreLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trendsText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },

  // Updates
  versionHeader: {
    marginBottom: 6,
  },
  versionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  versionNumber: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.lg,
  },
  versionDate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  releaseNotes: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  metricsCompare: {
    marginTop: 10,
  },
  metricsLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  metricsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  metricCell: {
    alignItems: "center",
  },
  metricCellLabel: {
    fontFamily: fonts.sans,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricCellValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  impactResult: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  impactLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  impactText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
  },
  versionActionRow: {
    marginTop: 10,
  },

  // Optimizer
  optimizerScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optimizerScoreInfo: {
    flex: 1,
  },
  optimizerScoreLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  optimizerScoreMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 3,
  },
  scorePlaceholder: {
    width: 72,
    height: 72,
    borderWidth: 2,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scorePlaceholderText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xxl,
    fontWeight: "700",
  },
  scoreButtonRow: {
    marginTop: 10,
  },
  scoreRecsWrap: {
    marginTop: 10,
  },
  scoreRecRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  scoreRecBullet: {
    fontFamily: fonts.sans,
    fontSize: 12,
    marginTop: 1,
  },
  scoreRecText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  editorField: {
    paddingVertical: 10,
  },
  editorFieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  editorFieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  editorCharCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
  },
  editorInput: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  editorInputMultiline: {
    minHeight: 100,
  },
  editorGenBtn: {
    width: "auto",
    alignSelf: "flex-start",
    marginTop: 8,
  },
  variantRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  variantInfo: {
    flex: 1,
  },
  variantTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  variantReason: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  variantScoreWrap: {
    marginLeft: 8,
    alignItems: "center",
  },
  variantScore: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  generatedTextCard: {
    paddingVertical: 4,
  },
  generatedText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  generatedTextMono: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  generatedHint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  fullRecField: {
    marginBottom: 10,
  },
  fullRecKey: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  fullRecValue: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  fullRecActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  fullRecBtn: {
    width: "auto",
  },

  bottomSpacer: {
    height: 100,
  },
});
