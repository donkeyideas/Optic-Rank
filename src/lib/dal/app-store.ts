import { createClient } from "@/lib/supabase/server";
import type { AppStoreListing } from "@/types";

interface AppStoreRanking {
  id: string;
  listing_id: string;
  keyword: string;
  position: number | null;
  country: string;
  checked_at: string;
}

interface AppReview {
  id: string;
  listing_id: string;
  review_id: string | null;
  author: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  topics: string[];
  reply: string | null;
  review_date: string;
  created_at: string;
}

/**
 * Get all app store listings for a project.
 */
export async function getAppStoreListings(
  projectId: string
): Promise<AppStoreListing[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("app_store_listings")
    .select(
      "id, project_id, store, app_name, rating, reviews_count, downloads_estimate, last_updated"
    )
    .eq("project_id", projectId)
    .order("app_name", { ascending: true });

  if (error || !data) return [];

  return data as AppStoreListing[];
}

/**
 * Get keyword rankings for a specific app store listing.
 */
export async function getAppStoreRankings(
  listingId: string
): Promise<AppStoreRanking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("app_store_rankings")
    .select("id, listing_id, keyword, position, country, checked_at")
    .eq("listing_id", listingId)
    .order("checked_at", { ascending: false });

  if (error || !data) return [];

  return data as AppStoreRanking[];
}

/**
 * Get reviews for a specific app store listing.
 */
export async function getAppReviews(
  listingId: string
): Promise<AppReview[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("app_reviews")
    .select(
      "id, listing_id, review_id, author, rating, title, body, sentiment, topics, reply, review_date, created_at"
    )
    .eq("listing_id", listingId)
    .order("review_date", { ascending: false });

  if (error || !data) return [];

  return data as AppReview[];
}
