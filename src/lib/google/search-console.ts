/**
 * Google Search Console API Integration
 *
 * Uses the Search Console API to fetch real search performance data.
 * Requires service account with Full access on the Search Console property.
 */

import { google } from "googleapis";
import { getGoogleAuth } from "./auth";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

function getClient() {
  const auth = getGoogleAuth(SCOPES);
  return google.searchconsole({ version: "v1", auth });
}

// ================================================================
// Types
// ================================================================

export interface GSCOverview {
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgPosition: number;
}

export interface GSCQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCDailyData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCDevice {
  device: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCCountry {
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// ================================================================
// Discover Site URL
// ================================================================

/**
 * Get the Search Console site URL from env var or try to discover it.
 */
export async function discoverSiteUrl(): Promise<string | null> {
  const envUrl = process.env.GSC_SITE_URL;
  if (envUrl) return envUrl;

  try {
    const client = getClient();
    const res = await client.sites.list();
    const sites = res.data.siteEntry ?? [];

    // Prefer the verified site
    const verified = sites.find(
      (s) => s.permissionLevel === "siteFullUser" || s.permissionLevel === "siteOwner"
    );
    if (verified?.siteUrl) return verified.siteUrl;

    // Fall back to first site
    if (sites.length > 0 && sites[0].siteUrl) return sites[0].siteUrl;
  } catch (err) {
    console.error("GSC discover error:", err);
  }

  return null;
}

// ================================================================
// Data Fetching Functions
// ================================================================

/**
 * Get overview metrics (total clicks, impressions, avg CTR, avg position).
 */
export async function getGSCOverview(
  siteUrl: string,
  days: number = 28
): Promise<GSCOverview | null> {
  try {
    const client = getClient();
    const startDate = daysAgo(days);
    const endDate = daysAgo(1);

    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
        rowLimit: 1,
      },
    });

    const rows = res.data.rows;
    if (!rows || rows.length === 0) {
      // Use response-level aggregates if available
      return {
        totalClicks: 0,
        totalImpressions: 0,
        avgCTR: 0,
        avgPosition: 0,
      };
    }

    const row = rows[0];
    return {
      totalClicks: row.clicks ?? 0,
      totalImpressions: row.impressions ?? 0,
      avgCTR: row.ctr ?? 0,
      avgPosition: row.position ?? 0,
    };
  } catch (err) {
    console.error("GSC overview error:", err);
    throw err;
  }
}

/**
 * Get top search queries.
 */
export async function getGSCTopQueries(
  siteUrl: string,
  days: number = 28,
  limit: number = 25
): Promise<GSCQuery[]> {
  try {
    const client = getClient();

    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["query"],
        rowLimit: limit,
        dataState: "all",
      },
    });

    return (res.data.rows ?? []).map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  } catch (err) {
    console.error("GSC top queries error:", err);
    throw err;
  }
}

/**
 * Get top pages by clicks.
 */
export async function getGSCTopPages(
  siteUrl: string,
  days: number = 28,
  limit: number = 20
): Promise<GSCPage[]> {
  try {
    const client = getClient();

    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["page"],
        rowLimit: limit,
        dataState: "all",
      },
    });

    return (res.data.rows ?? []).map((row) => {
      const fullUrl = row.keys?.[0] ?? "";
      // Strip the domain to show just the path
      let page = fullUrl;
      try {
        page = new URL(fullUrl).pathname;
      } catch {
        // keep as-is
      }
      return {
        page,
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      };
    });
  } catch (err) {
    console.error("GSC top pages error:", err);
    throw err;
  }
}

/**
 * Get daily click/impression data for charting.
 */
export async function getGSCDailyData(
  siteUrl: string,
  days: number = 28
): Promise<GSCDailyData[]> {
  try {
    const client = getClient();

    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["date"],
        dataState: "all",
      },
    });

    return (res.data.rows ?? []).map((row) => ({
      date: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  } catch (err) {
    console.error("GSC daily data error:", err);
    throw err;
  }
}

/**
 * Get data broken down by device type.
 */
export async function getGSCDevices(
  siteUrl: string,
  days: number = 28
): Promise<GSCDevice[]> {
  try {
    const client = getClient();

    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["device"],
        dataState: "all",
      },
    });

    return (res.data.rows ?? []).map((row) => ({
      device: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  } catch (err) {
    console.error("GSC devices error:", err);
    throw err;
  }
}

/**
 * Get data broken down by country.
 */
export async function getGSCCountries(
  siteUrl: string,
  days: number = 28,
  limit: number = 10
): Promise<GSCCountry[]> {
  try {
    const client = getClient();

    const res = await client.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: daysAgo(days),
        endDate: daysAgo(1),
        dimensions: ["country"],
        rowLimit: limit,
        dataState: "all",
      },
    });

    return (res.data.rows ?? []).map((row) => ({
      country: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }));
  } catch (err) {
    console.error("GSC countries error:", err);
    throw err;
  }
}

// ================================================================
// Helpers
// ================================================================

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
