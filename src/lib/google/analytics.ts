/**
 * Google Analytics 4 Data API Integration
 *
 * Uses the GA4 Data API to fetch real traffic data.
 * Requires service account with Viewer access on the GA4 property.
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";

let _client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (_client) return _client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Missing Google credentials for GA4");
  }

  _client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: email,
      private_key: key,
    },
  });

  return _client;
}

// ================================================================
// Types
// ================================================================

export interface GA4Overview {
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
  newUsers: number;
}

export interface GA4PageData {
  path: string;
  title: string;
  pageviews: number;
  users: number;
  avgTimeOnPage: number;
  bounceRate: number;
  entrances: number;
}

export interface GA4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  bounceRate: number;
}

export interface GA4DailyData {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

// ================================================================
// Discover GA4 Property ID
// ================================================================

/**
 * Try to discover the GA4 property ID by listing accessible properties.
 * Falls back to GA4_PROPERTY_ID env var.
 */
export async function discoverPropertyId(): Promise<string | null> {
  // Check env first
  const envPropId = process.env.GA4_PROPERTY_ID;
  if (envPropId) return envPropId;

  // Cannot discover without the admin API — user needs to set GA4_PROPERTY_ID
  return null;
}

// ================================================================
// Data Fetching Functions
// ================================================================

export async function getGA4Overview(
  propertyId: string,
  days: number = 30
): Promise<GA4Overview | null> {
  try {
    const client = getClient();
    const startDate = `${days}daysAgo`;

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "newUsers" },
      ],
    });

    const row = response.rows?.[0];
    if (!row?.metricValues) return null;

    const vals = row.metricValues;
    return {
      totalSessions: parseInt(vals[0]?.value ?? "0"),
      totalUsers: parseInt(vals[1]?.value ?? "0"),
      totalPageviews: parseInt(vals[2]?.value ?? "0"),
      avgSessionDuration: parseFloat(vals[3]?.value ?? "0"),
      bounceRate: parseFloat(vals[4]?.value ?? "0"),
      newUsers: parseInt(vals[5]?.value ?? "0"),
    };
  } catch (err) {
    console.error("GA4 overview error:", err);
    throw err;
  }
}

export async function getGA4TopPages(
  propertyId: string,
  days: number = 30,
  limit: number = 20
): Promise<GA4PageData[]> {
  try {
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [
        { name: "pagePath" },
        { name: "pageTitle" },
      ],
      metrics: [
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "entrances" },
      ],
      orderBys: [
        { metric: { metricName: "screenPageViews" }, desc: true },
      ],
      limit,
    });

    return (response.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "",
      title: row.dimensionValues?.[1]?.value ?? "",
      pageviews: parseInt(row.metricValues?.[0]?.value ?? "0"),
      users: parseInt(row.metricValues?.[1]?.value ?? "0"),
      avgTimeOnPage: parseFloat(row.metricValues?.[2]?.value ?? "0"),
      bounceRate: parseFloat(row.metricValues?.[3]?.value ?? "0"),
      entrances: parseInt(row.metricValues?.[4]?.value ?? "0"),
    }));
  } catch (err) {
    console.error("GA4 top pages error:", err);
    throw err;
  }
}

export async function getGA4TrafficSources(
  propertyId: string,
  days: number = 30
): Promise<GA4TrafficSource[]> {
  try {
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "bounceRate" },
      ],
      orderBys: [
        { metric: { metricName: "sessions" }, desc: true },
      ],
      limit: 15,
    });

    return (response.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? "(direct)",
      medium: row.dimensionValues?.[1]?.value ?? "(none)",
      sessions: parseInt(row.metricValues?.[0]?.value ?? "0"),
      users: parseInt(row.metricValues?.[1]?.value ?? "0"),
      bounceRate: parseFloat(row.metricValues?.[2]?.value ?? "0"),
    }));
  } catch (err) {
    console.error("GA4 traffic sources error:", err);
    throw err;
  }
}

export async function getGA4DailyData(
  propertyId: string,
  days: number = 30
): Promise<GA4DailyData[]> {
  try {
    const client = getClient();

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
      ],
      orderBys: [
        { dimension: { dimensionName: "date" }, desc: false },
      ],
    });

    return (response.rows ?? []).map((row) => {
      const d = row.dimensionValues?.[0]?.value ?? "";
      const formatted = d.length === 8
        ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
        : d;
      return {
        date: formatted,
        sessions: parseInt(row.metricValues?.[0]?.value ?? "0"),
        users: parseInt(row.metricValues?.[1]?.value ?? "0"),
        pageviews: parseInt(row.metricValues?.[2]?.value ?? "0"),
      };
    });
  } catch (err) {
    console.error("GA4 daily data error:", err);
    throw err;
  }
}
