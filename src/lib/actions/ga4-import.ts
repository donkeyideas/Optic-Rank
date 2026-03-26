"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getGA4TopPages,
  getGA4Overview,
  getGA4TrafficSources,
  getGA4DailyData,
  type GA4Overview,
  type GA4PageData,
  type GA4TrafficSource,
  type GA4DailyData,
} from "@/lib/google/analytics";
import {
  hasGA4OAuthCredentials,
  refreshAccessToken,
  fetchGA4Properties,
  type GA4PropertySummary,
} from "@/lib/google/oauth";

// ================================================================
// Helpers
// ================================================================

/**
 * Resolve the GA4 property ID for a project.
 * Priority: project record → global env var → null.
 */
async function resolvePropertyId(projectId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("projects")
    .select("ga4_property_id")
    .eq("id", projectId)
    .maybeSingle();

  const fromDb = data?.ga4_property_id?.trim();
  if (fromDb) return fromDb;

  return process.env.GA4_PROPERTY_ID?.trim() ?? null;
}

/**
 * Get a valid OAuth access token for a user/project, refreshing if expired.
 */
async function getValidGA4AccessToken(
  userId: string,
  projectId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: token } = await supabase
    .from("ga4_oauth_tokens")
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
      .from("ga4_oauth_tokens")
      .update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", token.id);

    return refreshed.access_token;
  } catch (err) {
    console.error("[ga4] Token refresh failed:", err);
    return null;
  }
}

// ================================================================
// OAuth Connection Actions
// ================================================================

/**
 * Check if a user has connected GA4 OAuth for a project.
 */
export async function getGA4ConnectionStatus(
  projectId: string
): Promise<{ connected: boolean; configured: boolean; googleEmail: string | null }> {
  const configured = hasGA4OAuthCredentials();

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { connected: false, configured, googleEmail: null };

  if (!configured) return { connected: false, configured, googleEmail: null };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ga4_oauth_tokens")
    .select("google_email")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .single();

  return {
    connected: !!data,
    configured,
    googleEmail: data?.google_email ?? null,
  };
}

/**
 * Disconnect GA4 OAuth for a project.
 */
export async function disconnectGA4(
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ga4_oauth_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("project_id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/keywords");
  return { success: true };
}

/**
 * List GA4 properties accessible by the user's OAuth token.
 */
export async function listGA4Properties(
  projectId: string
): Promise<{ error: string } | { properties: GA4PropertySummary[] }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const accessToken = await getValidGA4AccessToken(user.id, projectId);
  if (!accessToken) return { error: "GA4 not connected or token expired. Please reconnect." };

  try {
    const properties = await fetchGA4Properties(accessToken);
    return { properties };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch GA4 properties." };
  }
}

/**
 * Select which GA4 property to use for a project.
 */
export async function selectGA4Property(
  projectId: string,
  propertyId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmed = propertyId.trim();
  if (trimmed && !/^\d+$/.test(trimmed)) {
    return { error: "GA4 Property ID must be numeric." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("projects")
    .update({ ga4_property_id: trimmed || null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/keywords");
  return { success: true };
}

// ================================================================
// GA4 Dashboard Data (fetch + cache)
// ================================================================

export interface GA4DashboardData {
  connected: boolean;
  overview: GA4Overview | null;
  dailyData: GA4DailyData[];
  trafficSources: GA4TrafficSource[];
  topPages: GA4PageData[];
  lastSynced: string | null;
}

const EMPTY_GA4: GA4DashboardData = {
  connected: false,
  overview: null,
  dailyData: [],
  trafficSources: [],
  topPages: [],
  lastSynced: null,
};

/**
 * Fetch all GA4 dashboard data for a project.
 * Uses a 15-minute cache via ga4_snapshots table.
 */
export async function fetchGA4DashboardData(
  projectId: string
): Promise<GA4DashboardData> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return EMPTY_GA4;

  const propertyId = await resolvePropertyId(projectId);
  if (!propertyId) return EMPTY_GA4;

  const accessToken = await getValidGA4AccessToken(user.id, projectId);
  if (!accessToken) return EMPTY_GA4;

  const supabase = createAdminClient();

  // Check cache: today's snapshot < 15 min old
  const today = new Date().toISOString().slice(0, 10);
  const { data: cached } = await supabase
    .from("ga4_snapshots")
    .select("*")
    .eq("project_id", projectId)
    .eq("snapshot_date", today)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.created_at).getTime();
    if (age < 15 * 60 * 1000) {
      return {
        connected: true,
        overview: {
          totalSessions: cached.total_sessions,
          totalUsers: cached.total_users,
          totalPageviews: cached.total_pageviews,
          bounceRate: cached.bounce_rate ?? 0,
          avgSessionDuration: cached.avg_session_duration ?? 0,
          newUsers: cached.new_users,
        },
        dailyData: (cached.daily_data as GA4DailyData[]) ?? [],
        trafficSources: (cached.traffic_sources as GA4TrafficSource[]) ?? [],
        topPages: (cached.top_pages as GA4PageData[]) ?? [],
        lastSynced: cached.created_at,
      };
    }
  }

  // Fetch fresh data from GA4 in parallel
  const [overview, dailyData, trafficSources, topPages] = await Promise.all([
    getGA4Overview(propertyId, 30, accessToken).catch(() => null),
    getGA4DailyData(propertyId, 30, accessToken).catch(() => [] as GA4DailyData[]),
    getGA4TrafficSources(propertyId, 30, accessToken).catch(() => [] as GA4TrafficSource[]),
    getGA4TopPages(propertyId, 30, 50, accessToken).catch(() => [] as GA4PageData[]),
  ]);

  // Upsert snapshot
  const now = new Date().toISOString();
  await supabase.from("ga4_snapshots").upsert(
    {
      project_id: projectId,
      snapshot_date: today,
      total_sessions: overview?.totalSessions ?? 0,
      total_users: overview?.totalUsers ?? 0,
      total_pageviews: overview?.totalPageviews ?? 0,
      bounce_rate: overview?.bounceRate ?? null,
      avg_session_duration: overview?.avgSessionDuration ?? null,
      new_users: overview?.newUsers ?? 0,
      traffic_sources: trafficSources,
      top_pages: topPages,
      daily_data: dailyData,
      period_days: 30,
      created_at: now,
    },
    { onConflict: "project_id,snapshot_date,period_days" }
  );

  // Update project organic_traffic with real sessions
  if (overview && overview.totalSessions > 0) {
    await supabase
      .from("projects")
      .update({ organic_traffic: overview.totalSessions })
      .eq("id", projectId);
  }

  return {
    connected: true,
    overview,
    dailyData,
    trafficSources,
    topPages,
    lastSynced: now,
  };
}

/**
 * Sync GA4 data for a project (headless — for cron, no user session needed).
 */
export async function syncGA4ForProject(projectId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const propertyId = await resolvePropertyId(projectId);
  if (!propertyId) return false;

  // Find any valid token for this project
  const { data: tokenRow } = await supabase
    .from("ga4_oauth_tokens")
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
        .from("ga4_oauth_tokens")
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

  const [overview, dailyData, trafficSources, topPages] = await Promise.all([
    getGA4Overview(propertyId, 30, accessToken).catch(() => null),
    getGA4DailyData(propertyId, 30, accessToken).catch(() => [] as GA4DailyData[]),
    getGA4TrafficSources(propertyId, 30, accessToken).catch(() => [] as GA4TrafficSource[]),
    getGA4TopPages(propertyId, 30, 50, accessToken).catch(() => [] as GA4PageData[]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("ga4_snapshots").upsert(
    {
      project_id: projectId,
      snapshot_date: today,
      total_sessions: overview?.totalSessions ?? 0,
      total_users: overview?.totalUsers ?? 0,
      total_pageviews: overview?.totalPageviews ?? 0,
      bounce_rate: overview?.bounceRate ?? null,
      avg_session_duration: overview?.avgSessionDuration ?? null,
      new_users: overview?.newUsers ?? 0,
      traffic_sources: trafficSources,
      top_pages: topPages,
      daily_data: dailyData,
      period_days: 30,
      created_at: new Date().toISOString(),
    },
    { onConflict: "project_id,snapshot_date,period_days" }
  );

  if (overview && overview.totalSessions > 0) {
    await supabase
      .from("projects")
      .update({ organic_traffic: overview.totalSessions })
      .eq("id", projectId);
  }

  return true;
}

// ================================================================
// Data Import Actions
// ================================================================

/**
 * Import top pages and traffic data from Google Analytics 4.
 * Uses OAuth token if available, falls back to service account.
 */
export async function importFromGoogleAnalytics(
  projectId: string
): Promise<{ error: string } | { success: true; pagesImported: number; totalSessions: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const propertyId = await resolvePropertyId(projectId);
  if (!propertyId) {
    return {
      error:
        "Google Analytics not configured. Go to Settings → Integrations and connect Google Analytics.",
    };
  }

  // Try to get OAuth access token for richer access
  const accessToken = await getValidGA4AccessToken(user.id, projectId);

  try {
    const [topPages, overview] = await Promise.all([
      getGA4TopPages(propertyId, 28, 50, accessToken ?? undefined),
      getGA4Overview(propertyId, 28, accessToken ?? undefined),
    ]);

    if (topPages.length === 0) {
      return { error: "No page data found in Google Analytics for the last 28 days." };
    }

    const supabase = createAdminClient();

    const { data: latestAudit } = await supabase
      .from("site_audits")
      .select("id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let pagesImported = 0;

    if (latestAudit) {
      for (const page of topPages) {
        if (!page.path || page.path.startsWith("/api/")) continue;

        const { error: upsertError } = await supabase
          .from("audit_pages")
          .upsert(
            {
              audit_id: latestAudit.id,
              url: page.path,
              title: page.title || page.path,
              status_code: 200,
              word_count: null,
              load_time: page.avgTimeOnPage > 0 ? Math.round(page.avgTimeOnPage * 1000) : null,
            },
            { onConflict: "audit_id,url", ignoreDuplicates: false }
          );

        if (!upsertError) pagesImported++;
      }
    }

    const totalSessions = overview?.totalSessions ?? 0;
    if (totalSessions > 0) {
      await supabase
        .from("projects")
        .update({ organic_traffic: totalSessions })
        .eq("id", projectId);
    }

    revalidatePath("/dashboard/keywords");
    revalidatePath("/dashboard/content");
    revalidatePath("/dashboard");

    return {
      success: true,
      pagesImported,
      totalSessions,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to import from Google Analytics.";
    return { error: msg };
  }
}

/**
 * Test the GA4 connection for a project.
 * Uses OAuth token if available, falls back to service account.
 */
export async function testGA4Connection(
  projectId: string
): Promise<{ error: string } | { success: true; totalSessions: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const propertyId = await resolvePropertyId(projectId);
  if (!propertyId) {
    return { error: "No GA4 Property ID configured. Please select a property after connecting." };
  }

  const accessToken = await getValidGA4AccessToken(user.id, projectId);

  try {
    const overview = await getGA4Overview(propertyId, 7, accessToken ?? undefined);
    return {
      success: true,
      totalSessions: overview?.totalSessions ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed.";
    if (msg.includes("PERMISSION_DENIED") || msg.includes("sufficient permissions")) {
      return {
        error: "Permission denied. Please reconnect Google Analytics or verify the property selection.",
      };
    }
    return { error: msg };
  }
}

/**
 * Save a GA4 Property ID to a project (manual entry fallback).
 */
export async function saveGA4PropertyId(
  projectId: string,
  propertyId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmed = propertyId.trim();
  if (trimmed && !/^\d+$/.test(trimmed)) {
    return { error: "GA4 Property ID must be a numeric value (e.g. 528445226)." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("projects")
    .update({ ga4_property_id: trimmed || null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/keywords");

  return { success: true };
}
