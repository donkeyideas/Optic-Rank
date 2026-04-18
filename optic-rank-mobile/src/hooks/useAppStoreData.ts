import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { AppStoreListing } from "../types";

// ── App Store Listings ──────────────────────────────────────────────────────

export function useAppStoreListings(projectId: string | undefined) {
  return useQuery({
    queryKey: ["appStoreListings", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<AppStoreListing[]> => {
      const { data, error } = await supabase
        .from("app_store_listings")
        .select("*")
        .eq("project_id", projectId!)
        .order("app_name", { ascending: true });

      if (error) return [];
      return (data ?? []) as AppStoreListing[];
    },
  });
}

// ── App Store Rankings ──────────────────────────────────────────────────────

export interface AppStoreRanking {
  id: string;
  listing_id: string;
  keyword: string;
  position: number | null;
  country: string | null;
  difficulty: number | null;
  search_volume: number | null;
  checked_at: string;
}

export function useAppStoreRankings(listingIds: string[]) {
  return useQuery({
    queryKey: ["appStoreRankings", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async (): Promise<AppStoreRanking[]> => {
      const { data, error } = await supabase
        .from("app_store_rankings")
        .select("id, listing_id, keyword, position, country, difficulty, search_volume, checked_at")
        .in("listing_id", listingIds)
        .order("checked_at", { ascending: false });

      if (error) return [];
      return (data ?? []) as AppStoreRanking[];
    },
  });
}

// ── App Reviews ─────────────────────────────────────────────────────────────

export interface AppReview {
  id: string;
  listing_id: string;
  reviewer_name: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  review_date: string;
  country: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
}

export function useAppReviews(listingIds: string[]) {
  return useQuery({
    queryKey: ["appReviews", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async (): Promise<AppReview[]> => {
      const { data, error } = await supabase
        .from("app_store_reviews")
        .select("*")
        .in("listing_id", listingIds)
        .order("review_date", { ascending: false })
        .limit(200);

      if (error) return [];
      return (data ?? []) as AppReview[];
    },
  });
}

// ── App Store Competitors ───────────────────────────────────────────────────

export interface AppStoreCompetitor {
  id: string;
  listing_id: string;
  competitor_name: string;
  competitor_app_id: string | null;
  store: string | null;
  rating: number | null;
  reviews_count: number | null;
  downloads_estimate: number | null;
  created_at: string;
}

export function useAppStoreCompetitors(listingIds: string[]) {
  return useQuery({
    queryKey: ["appStoreCompetitors", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async (): Promise<AppStoreCompetitor[]> => {
      const { data, error } = await supabase
        .from("app_store_competitors")
        .select("*")
        .in("listing_id", listingIds)
        .order("competitor_name", { ascending: true });

      if (error) return [];
      return (data ?? []) as AppStoreCompetitor[];
    },
  });
}

// ── App Store Snapshots ─────────────────────────────────────────────────────

export interface AppStoreSnapshot {
  id: string;
  listing_id: string;
  rating: number | null;
  reviews_count: number | null;
  downloads_estimate: number | null;
  snapshot_date: string;
}

export function useAppStoreSnapshots(listingIds: string[], days = 90) {
  return useQuery({
    queryKey: ["appStoreSnapshots", listingIds, days],
    enabled: listingIds.length > 0,
    queryFn: async (): Promise<AppStoreSnapshot[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from("app_store_snapshots")
        .select("*")
        .in("listing_id", listingIds)
        .gte("snapshot_date", since.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: true });

      if (error) return [];
      return (data ?? []) as AppStoreSnapshot[];
    },
  });
}

// ── Review Topics ───────────────────────────────────────────────────────────

export interface ReviewTopic {
  id: string;
  listing_id: string;
  topic: string;
  sentiment: "positive" | "neutral" | "negative";
  mention_count: number;
}

export function useReviewTopics(listingIds: string[]) {
  return useQuery({
    queryKey: ["reviewTopics", listingIds],
    enabled: listingIds.length > 0,
    queryFn: async (): Promise<ReviewTopic[]> => {
      const { data, error } = await supabase
        .from("app_store_review_topics")
        .select("*")
        .in("listing_id", listingIds)
        .order("mention_count", { ascending: false });

      if (error) return [];
      return (data ?? []) as ReviewTopic[];
    },
  });
}
