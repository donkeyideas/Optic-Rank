/**
 * DataForSEO API Client
 * Primary provider for SERP tracking, keyword data, and traffic analytics.
 * Docs: https://docs.dataforseo.com/
 */

import { requireEnv, safeAPICall, type APIResponse } from "./base";

function getCredentials() {
  const login = requireEnv("DATAFORSEO_LOGIN", "DataForSEO");
  const password = requireEnv("DATAFORSEO_PASSWORD", "DataForSEO");
  return Buffer.from(`${login}:${password}`).toString("base64");
}

const BASE_URL = "https://api.dataforseo.com/v3";

async function request<T>(endpoint: string, body?: unknown): Promise<T> {
  const auth = getCredentials();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`DataForSEO API ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// --- SERP Tracking ---

export interface SERPResult {
  keyword: string;
  position: number | null;
  url: string | null;
  title: string | null;
  serp_features: string[];
  search_volume: number;
  cpc: number;
  competition: number;
}

export async function checkSERP(
  keyword: string,
  domain: string,
  options: {
    location?: string;
    language?: string;
    device?: "desktop" | "mobile";
    searchEngine?: string;
  } = {}
): Promise<APIResponse<SERPResult>> {
  return safeAPICall("DataForSEO", async () => {
    const data = await request<{ tasks: Array<{ result: unknown[] }> }>(
      "/serp/google/organic/live/advanced",
      [
        {
          keyword,
          location_name: options.location || "United States",
          language_name: options.language || "English",
          device: options.device || "desktop",
          depth: 100,
        },
      ]
    );

    const results = data?.tasks?.[0]?.result?.[0] as Record<string, unknown> | undefined;
    const items = (results?.items as Array<Record<string, unknown>>) || [];
    const match = items.find(
      (item) =>
        item.type === "organic" &&
        typeof item.domain === "string" &&
        item.domain.includes(domain)
    );

    const serpFeatures = items
      .filter((item) => item.type !== "organic" && item.type !== "paid")
      .map((item) => item.type as string);

    return {
      keyword,
      position: match ? (match.rank_absolute as number) : null,
      url: match ? (match.url as string) : null,
      title: match ? (match.title as string) : null,
      serp_features: [...new Set(serpFeatures)],
      search_volume: (results?.search_information as Record<string, number>)?.search_volume || 0,
      cpc: 0,
      competition: 0,
    };
  });
}

// --- Keyword Research ---

export interface KeywordSuggestion {
  keyword: string;
  search_volume: number;
  cpc: number;
  competition: number;
  difficulty: number;
}

export async function getKeywordSuggestions(
  seedKeyword: string,
  options: { location?: string; language?: string; limit?: number } = {}
): Promise<APIResponse<KeywordSuggestion[]>> {
  return safeAPICall("DataForSEO", async () => {
    const data = await request<{ tasks: Array<{ result: Array<{ items: unknown[] }> }> }>(
      "/dataforseo_labs/google/related_keywords/live",
      [
        {
          keyword: seedKeyword,
          location_name: options.location || "United States",
          language_name: options.language || "English",
          limit: options.limit || 50,
        },
      ]
    );

    const items = (data?.tasks?.[0]?.result?.[0]?.items || []) as Array<Record<string, unknown>>;

    return items.map((item) => {
      const info = item.keyword_data as Record<string, unknown> | undefined;
      const metrics = info?.keyword_info as Record<string, number> | undefined;
      return {
        keyword: (info?.keyword as string) || "",
        search_volume: metrics?.search_volume || 0,
        cpc: metrics?.cpc || 0,
        competition: metrics?.competition || 0,
        difficulty: (item.keyword_difficulty as number) || 0,
      };
    });
  });
}

// --- Traffic Analytics ---

export interface TrafficEstimate {
  domain: string;
  organic_traffic: number;
  paid_traffic: number;
  organic_keywords: number;
  organic_cost: number;
}

export async function getTrafficEstimate(
  domain: string
): Promise<APIResponse<TrafficEstimate>> {
  return safeAPICall("DataForSEO", async () => {
    const data = await request<{ tasks: Array<{ result: Array<Record<string, unknown>> }> }>(
      "/dataforseo_labs/google/domain_rank_overview/live",
      [
        {
          target: domain,
          location_name: "United States",
          language_name: "English",
        },
      ]
    );

    const result = data?.tasks?.[0]?.result?.[0] || {};
    const metrics = result.metrics as Record<string, Record<string, number>> | undefined;
    const organic = metrics?.organic || {};

    return {
      domain,
      organic_traffic: organic.etv || 0,
      paid_traffic: metrics?.paid?.etv || 0,
      organic_keywords: organic.count || 0,
      organic_cost: organic.estimated_paid_traffic_cost || 0,
    };
  });
}
