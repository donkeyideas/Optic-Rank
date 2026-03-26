/**
 * Google Analytics 4 Data API Integration
 *
 * Supports two auth modes:
 * 1. Service account (env vars) — for admin/cron jobs
 * 2. OAuth access token — for user-initiated requests
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";

let _client: BetaAnalyticsDataClient | null = null;

function getClient(): BetaAnalyticsDataClient {
  if (_client) return _client;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!email || !key) {
    throw new Error("Missing Google credentials for GA4");
  }

  _client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: email,
      private_key: key,
    },
    // Use REST instead of gRPC — gRPC fails on Vercel serverless
    fallback: "rest",
  });

  return _client;
}

/**
 * Run a GA4 report via REST API using an OAuth access token.
 */
async function runReportWithToken(
  propertyId: string,
  accessToken: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 API error (${res.status}): ${text}`);
  }

  return res.json();
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
  const envPropId = process.env.GA4_PROPERTY_ID?.trim();
  if (envPropId) return envPropId;
  return null;
}

// ================================================================
// Data Fetching Functions
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RowData = { dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> };

export async function getGA4Overview(
  propertyId: string,
  days: number = 30,
  accessToken?: string
): Promise<GA4Overview | null> {
  try {
    const startDate = `${days}daysAgo`;
    const reportBody = {
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "newUsers" },
      ],
    };

    let row: RowData | undefined;

    if (accessToken) {
      const response = await runReportWithToken(propertyId, accessToken, reportBody);
      const rows = response.rows as RowData[] | undefined;
      row = rows?.[0];
    } else {
      const client = getClient();
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        ...reportBody,
      });
      row = response.rows?.[0] as RowData | undefined;
    }

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
  limit: number = 20,
  accessToken?: string
): Promise<GA4PageData[]> {
  try {
    const reportBody = {
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
      ],
      orderBys: [
        { metric: { metricName: "screenPageViews" }, desc: true },
      ],
      limit,
    };

    let rows: RowData[];

    if (accessToken) {
      const response = await runReportWithToken(propertyId, accessToken, reportBody);
      rows = (response.rows as RowData[]) ?? [];
    } else {
      const client = getClient();
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        ...reportBody,
      });
      rows = (response.rows ?? []) as RowData[];
    }

    return rows.map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? "",
      title: row.dimensionValues?.[1]?.value ?? "",
      pageviews: parseInt(row.metricValues?.[0]?.value ?? "0"),
      users: parseInt(row.metricValues?.[1]?.value ?? "0"),
      avgTimeOnPage: parseFloat(row.metricValues?.[2]?.value ?? "0"),
      bounceRate: parseFloat(row.metricValues?.[3]?.value ?? "0"),
      entrances: 0,
    }));
  } catch (err) {
    console.error("GA4 top pages error:", err);
    throw err;
  }
}

export async function getGA4TrafficSources(
  propertyId: string,
  days: number = 30,
  accessToken?: string
): Promise<GA4TrafficSource[]> {
  try {
    const reportBody = {
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
    };

    let rows: RowData[];

    if (accessToken) {
      const response = await runReportWithToken(propertyId, accessToken, reportBody);
      rows = (response.rows as RowData[]) ?? [];
    } else {
      const client = getClient();
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        ...reportBody,
      });
      rows = (response.rows ?? []) as RowData[];
    }

    return rows.map((row) => ({
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
  days: number = 30,
  accessToken?: string
): Promise<GA4DailyData[]> {
  try {
    const reportBody = {
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
    };

    let rows: RowData[];

    if (accessToken) {
      const response = await runReportWithToken(propertyId, accessToken, reportBody);
      rows = (response.rows as RowData[]) ?? [];
    } else {
      const client = getClient();
      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        ...reportBody,
      });
      rows = (response.rows ?? []) as RowData[];
    }

    return rows.map((row) => {
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
