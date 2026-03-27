"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hasGSCOAuthCredentials,
  refreshAccessToken,
} from "@/lib/google/oauth";
import type {
  GSCOverview,
  GSCQuery,
  GSCPage,
  GSCDailyData,
  GSCDevice,
  GSCCountry,
} from "@/lib/google/search-console";

// ================================================================
// Types
// ================================================================

export interface GSCDashboardData {
  connected: boolean;
  overview: GSCOverview | null;
  topQueries: GSCQuery[];
  topPages: GSCPage[];
  dailyData: GSCDailyData[];
  devices: GSCDevice[];
  countries: GSCCountry[];
  lastSynced: string | null;
}

const EMPTY_GSC: GSCDashboardData = {
  connected: false,
  overview: null,
  topQueries: [],
  topPages: [],
  dailyData: [],
  devices: [],
  countries: [],
  lastSynced: null,
};

// ================================================================
// Helpers
// ================================================================

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function getValidAccessToken(
  userId: string,
  projectId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: token } = await supabase
    .from("gsc_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();

  if (!token) return null;

  const expiresAt = new Date(token.expires_at);
  if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return token.access_token;
  }

  try {
    const refreshed = await refreshAccessToken(token.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await supabase
      .from("gsc_tokens")
      .update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", token.id);

    return refreshed.access_token;
  } catch (err) {
    console.error("[gsc-dashboard] Token refresh failed:", err);
    return null;
  }
}

async function getPropertyUrl(
  userId: string,
  projectId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gsc_tokens")
    .select("gsc_property_url")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();

  return data?.gsc_property_url ?? null;
}

// ================================================================
// OAuth-based GSC API calls
// ================================================================

async function fetchOverview(
  accessToken: string,
  siteUrl: string,
  days: number
): Promise<GSCOverview | null> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: [],
        rowLimit: 1,
        type: "web",
      }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const row = data.rows?.[0];
  return {
    totalClicks: row?.clicks ?? 0,
    totalImpressions: row?.impressions ?? 0,
    avgCTR: row?.ctr ?? 0,
    avgPosition: row?.position ?? 0,
  };
}

async function fetchQueries(
  accessToken: string,
  siteUrl: string,
  days: number,
  limit: number
): Promise<GSCQuery[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["query"],
        rowLimit: limit,
        type: "web",
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: Math.round(row.position * 10) / 10,
    })
  );
}

async function fetchPages(
  accessToken: string,
  siteUrl: string,
  days: number,
  limit: number
): Promise<GSCPage[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["page"],
        rowLimit: limit,
        type: "web",
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => {
      const fullUrl = row.keys[0];
      let page = fullUrl;
      try {
        page = new URL(fullUrl).pathname;
      } catch {
        // keep as-is
      }
      return {
        page,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: Math.round(row.position * 10) / 10,
      };
    }
  );
}

async function fetchDaily(
  accessToken: string,
  siteUrl: string,
  days: number
): Promise<GSCDailyData[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["date"],
        type: "web",
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: Math.round(row.position * 10) / 10,
    })
  );
}

async function fetchDevices(
  accessToken: string,
  siteUrl: string,
  days: number
): Promise<GSCDevice[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["device"],
        type: "web",
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      device: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: Math.round(row.position * 10) / 10,
    })
  );
}

async function fetchCountries(
  accessToken: string,
  siteUrl: string,
  days: number,
  limit: number
): Promise<GSCCountry[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["country"],
        rowLimit: limit,
        type: "web",
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map(
    (row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      country: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: Math.round(row.position * 10) / 10,
    })
  );
}

// ================================================================
// Main Dashboard Data Fetcher (with 15-min cache)
// ================================================================

export async function fetchGSCDashboardData(
  projectId: string
): Promise<GSCDashboardData> {
  if (!hasGSCOAuthCredentials()) return EMPTY_GSC;

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return EMPTY_GSC;

  const propertyUrl = await getPropertyUrl(user.id, projectId);
  if (!propertyUrl) return EMPTY_GSC;

  const accessToken = await getValidAccessToken(user.id, projectId);
  if (!accessToken) return EMPTY_GSC;

  const supabase = createAdminClient();

  // Check cache: today's snapshot < 15 min old
  const today = new Date().toISOString().slice(0, 10);
  const { data: cached } = await supabase
    .from("gsc_snapshots")
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
          totalClicks: cached.total_clicks,
          totalImpressions: cached.total_impressions,
          avgCTR: cached.avg_ctr ?? 0,
          avgPosition: cached.avg_position ?? 0,
        },
        topQueries: (cached.top_queries as GSCQuery[]) ?? [],
        topPages: (cached.top_pages as GSCPage[]) ?? [],
        dailyData: (cached.daily_data as GSCDailyData[]) ?? [],
        devices: (cached.devices as GSCDevice[]) ?? [],
        countries: (cached.countries as GSCCountry[]) ?? [],
        lastSynced: cached.created_at,
      };
    }
  }

  // Fetch fresh data in parallel
  const [overview, topQueries, topPages, dailyData, devices, countries] =
    await Promise.all([
      fetchOverview(accessToken, propertyUrl, 28).catch(() => null),
      fetchQueries(accessToken, propertyUrl, 28, 50).catch(() => [] as GSCQuery[]),
      fetchPages(accessToken, propertyUrl, 28, 30).catch(() => [] as GSCPage[]),
      fetchDaily(accessToken, propertyUrl, 28).catch(() => [] as GSCDailyData[]),
      fetchDevices(accessToken, propertyUrl, 28).catch(() => [] as GSCDevice[]),
      fetchCountries(accessToken, propertyUrl, 28, 15).catch(() => [] as GSCCountry[]),
    ]);

  // Upsert snapshot
  const now = new Date().toISOString();
  await supabase.from("gsc_snapshots").upsert(
    {
      project_id: projectId,
      snapshot_date: today,
      total_clicks: overview?.totalClicks ?? 0,
      total_impressions: overview?.totalImpressions ?? 0,
      avg_ctr: overview?.avgCTR ?? null,
      avg_position: overview?.avgPosition ?? null,
      top_queries: topQueries,
      top_pages: topPages,
      daily_data: dailyData,
      devices: devices,
      countries: countries,
      period_days: 28,
      created_at: now,
    },
    { onConflict: "project_id,snapshot_date,period_days" }
  );

  return {
    connected: true,
    overview,
    topQueries,
    topPages,
    dailyData,
    devices,
    countries,
    lastSynced: now,
  };
}
