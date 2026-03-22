import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppStoreListing } from "@/types";

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

export interface AppStoreRanking {
  id: string;
  listing_id: string;
  keyword: string;
  position: number | null;
  country: string;
  difficulty: number | null;
  search_volume: number | null;
  checked_at: string;
}

export interface AppReview {
  id: string;
  listing_id: string;
  store: string;
  review_id: string | null;
  author: string | null;
  rating: number;
  title: string | null;
  text: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  topics: string[];
  ai_reply: string | null;
  reply_sent: boolean;
  review_date: string;
  created_at: string;
}

export interface AppStoreCompetitor {
  id: string;
  listing_id: string;
  competitor_app_id: string;
  competitor_store: "apple" | "google";
  competitor_name: string;
  competitor_icon_url: string | null;
  competitor_rating: number | null;
  competitor_reviews_count: number | null;
  competitor_downloads: number | null;
  competitor_version: string | null;
  competitor_description: string | null;
  competitor_aso_score: number | null;
  last_fetched: string;
}

export interface AppStoreSnapshot {
  id: string;
  listing_id: string;
  rating: number | null;
  reviews_count: number | null;
  downloads_estimate: number | null;
  aso_score: number | null;
  visibility_score: number | null;
  snapshot_date: string;
}

export interface AppStoreVersion {
  id: string;
  listing_id: string;
  version: string;
  release_date: string | null;
  release_notes: string | null;
  rating_at_release: number | null;
  reviews_at_release: number | null;
  downloads_at_release: number | null;
  detected_at: string;
}

export interface KeywordHistoryPoint {
  id: string;
  ranking_id: string;
  position: number | null;
  checked_at: string;
}

export interface ReviewTopic {
  id: string;
  listing_id: string;
  topic: string;
  category: "feature_request" | "bug" | "praise" | "complaint" | "competitor_mention";
  mention_count: number;
  sentiment_avg: number | null;
  first_seen: string;
  last_seen: string;
  sample_review_ids: string[];
}

export interface AppStoreLocalization {
  id: string;
  listing_id: string;
  country_code: string;
  locale: string;
  localized_title: string | null;
  localized_subtitle: string | null;
  localized_description: string | null;
  localized_keywords: string | null;
  completeness_score: number;
  opportunity_score: number;
  ai_translated: boolean;
}

/* ------------------------------------------------------------------
   Existing queries (enhanced)
   ------------------------------------------------------------------ */

export async function getAppStoreListings(
  projectId: string
): Promise<AppStoreListing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_store_listings")
    .select("*")
    .eq("project_id", projectId)
    .order("app_name", { ascending: true });
  return (data ?? []) as AppStoreListing[];
}

export async function getAppStoreRankings(
  listingIds: string[]
): Promise<AppStoreRanking[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_store_rankings")
    .select("id, listing_id, keyword, position, country, difficulty, search_volume, checked_at")
    .in("listing_id", listingIds)
    .order("checked_at", { ascending: false });
  return (data ?? []) as AppStoreRanking[];
}

export async function getAppReviews(
  listingIds: string[]
): Promise<AppReview[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_store_reviews")
    .select("*")
    .in("listing_id", listingIds)
    .order("review_date", { ascending: false })
    .limit(200);
  return (data ?? []) as AppReview[];
}

/* ------------------------------------------------------------------
   New queries: Competitors
   ------------------------------------------------------------------ */

export async function getAppStoreCompetitors(
  listingIds: string[]
): Promise<AppStoreCompetitor[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_store_competitors")
    .select("*")
    .in("listing_id", listingIds)
    .order("competitor_name", { ascending: true });
  return (data ?? []) as AppStoreCompetitor[];
}

/* ------------------------------------------------------------------
   New queries: Snapshots (for trend charts)
   ------------------------------------------------------------------ */

export async function getAppStoreSnapshots(
  listingIds: string[],
  days: number = 30
): Promise<AppStoreSnapshot[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("app_store_snapshots")
    .select("*")
    .in("listing_id", listingIds)
    .gte("snapshot_date", since.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });
  return (data ?? []) as AppStoreSnapshot[];
}

/* ------------------------------------------------------------------
   Visibility History (for trend charts)
   ------------------------------------------------------------------ */

export interface VisibilityHistoryPoint {
  listing_id: string;
  snapshot_date: string;
  visibility_score: number | null;
}

export async function getVisibilityHistory(
  listingIds: string[],
  days: number = 90
): Promise<VisibilityHistoryPoint[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("app_store_snapshots")
    .select("listing_id, snapshot_date, visibility_score")
    .in("listing_id", listingIds)
    .not("visibility_score", "is", null)
    .gte("snapshot_date", since.toISOString().split("T")[0])
    .order("snapshot_date", { ascending: true });
  return (data ?? []) as VisibilityHistoryPoint[];
}

/* ------------------------------------------------------------------
   New queries: Keyword History
   ------------------------------------------------------------------ */

export async function getKeywordHistory(
  rankingIds: string[],
  days: number = 30
): Promise<KeywordHistoryPoint[]> {
  if (rankingIds.length === 0) return [];
  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("app_store_keyword_history")
    .select("*")
    .in("ranking_id", rankingIds)
    .gte("checked_at", since.toISOString())
    .order("checked_at", { ascending: true });
  return (data ?? []) as KeywordHistoryPoint[];
}

/* ------------------------------------------------------------------
   New queries: Versions
   ------------------------------------------------------------------ */

export async function getAppVersions(
  listingIds: string[]
): Promise<AppStoreVersion[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_store_versions")
    .select("*")
    .in("listing_id", listingIds)
    .order("detected_at", { ascending: false });
  return (data ?? []) as AppStoreVersion[];
}

/* ------------------------------------------------------------------
   New queries: Review Topics
   ------------------------------------------------------------------ */

export async function getReviewTopics(
  listingIds: string[]
): Promise<ReviewTopic[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_store_review_topics")
    .select("*")
    .in("listing_id", listingIds)
    .order("mention_count", { ascending: false });
  return (data ?? []) as ReviewTopic[];
}

/* ------------------------------------------------------------------
   New queries: Localizations
   ------------------------------------------------------------------ */

export async function getLocalizations(
  listingIds: string[]
): Promise<AppStoreLocalization[]> {
  if (listingIds.length === 0) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_store_localizations")
    .select("*")
    .in("listing_id", listingIds)
    .order("opportunity_score", { ascending: false });
  return (data ?? []) as AppStoreLocalization[];
}
