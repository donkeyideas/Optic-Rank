"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hasGooglePlayOAuthCredentials,
  refreshAccessToken,
  fetchGooglePlayApps,
  type GooglePlayAppSummary,
} from "@/lib/google/oauth";
import {
  fetchPlayReviews,
  fetchPlayMetrics,
  validatePlayAccess,
  type PlayReview,
  type PlayAppMetrics,
} from "@/lib/google/play-console";

// ================================================================
// Helpers
// ================================================================

/**
 * Get a valid OAuth access token for Google Play, refreshing if expired.
 */
async function getValidGooglePlayAccessToken(
  userId: string,
  projectId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: token } = await supabase
    .from("google_play_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();

  if (!token) return null;

  // Check if token is still valid (with 5-min buffer)
  const expiresAt = new Date(token.expires_at);
  if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return token.access_token;
  }

  // Refresh the token
  try {
    const refreshed = await refreshAccessToken(token.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await supabase
      .from("google_play_tokens")
      .update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", token.id);

    return refreshed.access_token;
  } catch (err) {
    console.error("[google-play] Token refresh failed:", err);
    return null;
  }
}

// ================================================================
// OAuth Connection Actions
// ================================================================

/**
 * Check if a user has connected Google Play OAuth for a project.
 */
export async function getGooglePlayConnectionStatus(
  projectId: string
): Promise<{
  connected: boolean;
  configured: boolean;
  googleEmail: string | null;
  packageName: string | null;
}> {
  const configured = hasGooglePlayOAuthCredentials();

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { connected: false, configured, googleEmail: null, packageName: null };

  if (!configured) return { connected: false, configured, googleEmail: null, packageName: null };

  const supabase = createAdminClient();
  const { data: token } = await supabase
    .from("google_play_tokens")
    .select("google_email")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .single();

  // Also get selected package name from project
  const { data: project } = await supabase
    .from("projects")
    .select("google_play_package_name")
    .eq("id", projectId)
    .maybeSingle();

  return {
    connected: !!token,
    configured,
    googleEmail: token?.google_email ?? null,
    packageName: project?.google_play_package_name ?? null,
  };
}

/**
 * Disconnect Google Play OAuth for a project.
 */
export async function disconnectGooglePlay(
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("google_play_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("project_id", projectId);

  if (error) return { error: error.message };

  // Clear selected package
  await supabase
    .from("projects")
    .update({ google_play_package_name: null })
    .eq("id", projectId);

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * List Google Play apps accessible by the user's OAuth token.
 */
export async function listGooglePlayApps(
  projectId: string
): Promise<{ error: string } | { apps: GooglePlayAppSummary[] }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const accessToken = await getValidGooglePlayAccessToken(user.id, projectId);
  if (!accessToken) return { error: "Google Play not connected or token expired. Please reconnect." };

  try {
    const apps = await fetchGooglePlayApps(accessToken);
    return { apps };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch Google Play apps." };
  }
}

/**
 * Select which Google Play package to use for a project.
 */
export async function selectGooglePlayApp(
  projectId: string,
  packageName: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("projects")
    .update({ google_play_package_name: packageName.trim() || null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/app-store");
  return { success: true };
}

/**
 * Test the Google Play connection for a project.
 */
export async function testGooglePlayConnection(
  projectId: string
): Promise<{ error: string } | { success: true; reviewCount: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: project } = await supabase
    .from("projects")
    .select("google_play_package_name")
    .eq("id", projectId)
    .maybeSingle();

  const packageName = project?.google_play_package_name;
  if (!packageName) {
    return { error: "No Google Play app selected. Please select an app first." };
  }

  const accessToken = await getValidGooglePlayAccessToken(user.id, projectId);
  if (!accessToken) return { error: "Google Play not connected or token expired. Please reconnect." };

  // Validate access to the specific package
  const validation = await validatePlayAccess(accessToken, packageName);
  if (!validation.accessible) {
    return { error: validation.error ?? "Cannot access this app." };
  }

  // Fetch reviews as a test
  try {
    const reviews = await fetchPlayReviews(accessToken, packageName, 5);
    return { success: true, reviewCount: reviews.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Connection test failed." };
  }
}

// ================================================================
// Data Sync Actions
// ================================================================

/**
 * Sync Google Play data for all listings in a project using authenticated API.
 * Updates reviews, metrics in the app_store_listings table.
 */
export async function syncGooglePlayData(
  projectId: string
): Promise<{
  error: string;
} | {
  success: true;
  synced: number;
  reviewsImported: number;
}> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const accessToken = await getValidGooglePlayAccessToken(user.id, projectId);
  if (!accessToken) return { error: "Google Play not connected. Connect in Settings → Integrations." };

  const supabase = createAdminClient();

  // Get all Google Play listings for this project
  const { data: listings } = await supabase
    .from("app_store_listings")
    .select("id, app_id, app_name")
    .eq("project_id", projectId)
    .eq("store", "google");

  if (!listings || listings.length === 0) {
    return { error: "No Google Play apps found in this project. Add an app first." };
  }

  let synced = 0;
  let totalReviewsImported = 0;

  for (const listing of listings) {
    try {
      // 1. Fetch authenticated reviews
      const reviews = await fetchPlayReviews(accessToken, listing.app_id, 50);

      // 2. Upsert reviews into app_store_reviews
      for (const review of reviews) {
        const sentiment = review.rating >= 4 ? "positive" : review.rating <= 2 ? "negative" : "neutral";
        await supabase.from("app_store_reviews").upsert(
          {
            listing_id: listing.id,
            store: "google",
            review_id: review.reviewId,
            author: review.authorName,
            rating: review.rating,
            title: review.title || null,
            text: review.text,
            sentiment,
            review_date: review.lastModified,
          },
          { onConflict: "listing_id,review_id" }
        );
        totalReviewsImported++;
      }

      // 3. Update listing with review count from API
      const reviewCount = reviews.length;
      const avgRating = reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 100) / 100
        : null;

      // Only update if we got real data
      if (reviewCount > 0) {
        await supabase
          .from("app_store_listings")
          .update({
            reviews_count: reviewCount,
            ...(avgRating !== null ? { rating: avgRating } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", listing.id);
      }

      // 4. Try to fetch quality metrics
      try {
        const metrics = await fetchPlayMetrics(accessToken, listing.app_id);
        // Store metrics in listing if available
        if (metrics.totalRatings !== null || metrics.crashRate !== null) {
          const updates: Record<string, unknown> = {};
          if (metrics.totalRatings !== null) updates.reviews_count = metrics.totalRatings;
          if (metrics.averageRating !== null) updates.rating = metrics.averageRating;
          if (Object.keys(updates).length > 0) {
            await supabase
              .from("app_store_listings")
              .update(updates)
              .eq("id", listing.id);
          }
        }
      } catch {
        // Quality metrics not available for all apps — non-critical
      }

      synced++;
    } catch (err) {
      console.error(`[google-play] Sync failed for ${listing.app_id}:`, err);
    }
  }

  revalidatePath("/dashboard/app-store");
  return { success: true, synced, reviewsImported: totalReviewsImported };
}

/**
 * Fetch authenticated reviews for a specific listing.
 * Used by the refresh flow to get real reviews instead of scraped ones.
 */
export async function fetchAuthenticatedPlayReviews(
  projectId: string,
  packageName: string
): Promise<PlayReview[] | null> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;

  const accessToken = await getValidGooglePlayAccessToken(user.id, projectId);
  if (!accessToken) return null;

  try {
    return await fetchPlayReviews(accessToken, packageName, 50);
  } catch {
    return null;
  }
}

/**
 * Fetch authenticated metrics for a specific package.
 * Used by the refresh flow to get real download counts.
 */
export async function fetchAuthenticatedPlayMetrics(
  projectId: string,
  packageName: string
): Promise<PlayAppMetrics | null> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;

  const accessToken = await getValidGooglePlayAccessToken(user.id, projectId);
  if (!accessToken) return null;

  try {
    return await fetchPlayMetrics(accessToken, packageName);
  } catch {
    return null;
  }
}

/**
 * Headless sync (for cron jobs — no user session needed).
 */
export async function syncGooglePlayForProject(projectId: string): Promise<boolean> {
  const supabase = createAdminClient();

  // Find any valid token for this project
  const { data: tokenRow } = await supabase
    .from("google_play_tokens")
    .select("*")
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();

  if (!tokenRow) return false;

  // Refresh if expired
  let accessToken = tokenRow.access_token;
  const expiresAt = new Date(tokenRow.expires_at);
  if (expiresAt.getTime() <= Date.now() + 5 * 60 * 1000) {
    try {
      const refreshed = await refreshAccessToken(tokenRow.refresh_token);
      accessToken = refreshed.access_token;
      await supabase
        .from("google_play_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", tokenRow.id);
    } catch {
      return false;
    }
  }

  // Get all Google Play listings
  const { data: listings } = await supabase
    .from("app_store_listings")
    .select("id, app_id")
    .eq("project_id", projectId)
    .eq("store", "google");

  if (!listings || listings.length === 0) return false;

  for (const listing of listings) {
    try {
      const reviews = await fetchPlayReviews(accessToken, listing.app_id, 50);

      for (const review of reviews) {
        const sentiment = review.rating >= 4 ? "positive" : review.rating <= 2 ? "negative" : "neutral";
        await supabase.from("app_store_reviews").upsert(
          {
            listing_id: listing.id,
            store: "google",
            review_id: review.reviewId,
            author: review.authorName,
            rating: review.rating,
            title: review.title || null,
            text: review.text,
            sentiment,
            review_date: review.lastModified,
          },
          { onConflict: "listing_id,review_id" }
        );
      }

      if (reviews.length > 0) {
        const avgRating = Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 100
        ) / 100;
        await supabase
          .from("app_store_listings")
          .update({
            reviews_count: reviews.length,
            rating: avgRating,
            updated_at: new Date().toISOString(),
          })
          .eq("id", listing.id);
      }
    } catch {
      // Continue with next listing
    }
  }

  return true;
}
