/**
 * DataForSEO API Client
 * Primary provider for SERP tracking, keyword data, and traffic analytics.
 * Docs: https://docs.dataforseo.com/
 *
 * Credential resolution:
 *   1. platform_api_configs (admin panel) — api_key = login, api_secret = password
 *   2. Environment variables — DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { safeAPICall, type APIResponse } from "./base";

// Cache DB credentials for 60 seconds
let credCache: { value: string; ts: number } | null = null;
const CRED_TTL = 60_000;

async function getCredentials(): Promise<string> {
  // 1. Try cached value
  if (credCache && Date.now() - credCache.ts < CRED_TTL) {
    return credCache.value;
  }

  // 2. Try platform_api_configs (DB) — check both active and inactive rows
  try {
    const supabase = createAdminClient();

    // First try active config
    const { data, error } = await supabase
      .from("platform_api_configs")
      .select("api_key, api_secret, is_active")
      .eq("provider", "dataforseo")
      .single();

    if (error) {
      console.warn("[DataForSEO] DB lookup error:", error.message);
    } else if (data) {
      if (!data.is_active) {
        console.warn("[DataForSEO] Config exists but is_active=false. Enable it in Admin → API Management.");
      } else if (!data.api_key) {
        console.warn("[DataForSEO] Config exists but api_key (login) is empty.");
      } else if (!data.api_secret) {
        console.warn("[DataForSEO] Config exists but api_secret (password) is empty.");
      } else {
        const encoded = Buffer.from(`${data.api_key}:${data.api_secret}`).toString("base64");
        credCache = { value: encoded, ts: Date.now() };
        return encoded;
      }
    }
  } catch (err) {
    console.error("[DataForSEO] DB lookup exception:", err instanceof Error ? err.message : err);
  }

  // 3. Fall back to environment variables
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (login && password) {
    const encoded = Buffer.from(`${login}:${password}`).toString("base64");
    credCache = { value: encoded, ts: Date.now() };
    return encoded;
  }

  throw new Error(
    "DataForSEO credentials not configured. Add your login (api_key) and password (api_secret) in Admin → API Management, or set DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD env vars."
  );
}

/**
 * Check if DataForSEO credentials are available (DB or env) without throwing.
 */
export async function hasDataForSEOCredentials(): Promise<boolean> {
  try {
    await getCredentials();
    return true;
  } catch {
    return false;
  }
}

const BASE_URL = "https://api.dataforseo.com/v3";

async function request<T>(endpoint: string, body?: unknown): Promise<T> {
  const auth = await getCredentials();
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
