/**
 * LLM Visibility Tracking
 * Checks if a brand/domain is mentioned by various AI assistants
 * for target keywords. Resolves API keys from DB (platform + user configs)
 * with env var fallback.
 */

import { safeAPICall, type APIResponse } from "../api/base";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAPICall } from "@/lib/api/api-logger";

export interface LLMVisibilityResult {
  llm_provider: string;
  query: string;
  brand_mentioned: boolean;
  mention_position: number | null;
  url_cited: boolean;
  sentiment: "positive" | "neutral" | "negative" | null;
  response_excerpt: string;
  competitor_mentions: string[];
}

export interface AggregatedVisibility {
  keyword: string;
  results: LLMVisibilityResult[];
  total_llms_checked: number;
  llms_with_mention: number;
  visibility_score: number; // 0-100
  label: string; // e.g., "4/6"
}

// --- API Key Resolution ---

/** Provider name → DB provider key mapping */
const PROVIDER_DB_KEYS: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  gemini: "gemini",
  perplexity: "perplexity",
  deepseek: "deepseek",
};

/** Provider name → env var fallback */
const PROVIDER_ENV_KEYS: Record<string, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_AI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

/**
 * Resolve all available API keys from:
 * 1. user_api_configs (user's own keys, highest priority)
 * 2. platform_api_configs (system keys)
 * 3. environment variables (fallback)
 */
async function resolveAPIKeys(userId?: string): Promise<Map<string, string>> {
  const keys = new Map<string, string>();
  const supabase = createAdminClient();

  // 1. Platform configs (system defaults)
  const { data: platformKeys } = await supabase
    .from("platform_api_configs")
    .select("provider, api_key")
    .eq("is_active", true);

  if (platformKeys) {
    for (const pk of platformKeys) {
      keys.set(pk.provider, pk.api_key);
    }
  }

  // 2. User configs (override platform)
  if (userId) {
    try {
      const { data: userKeys } = await supabase
        .from("user_api_configs")
        .select("provider, api_key")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (userKeys) {
        for (const uk of userKeys) {
          keys.set(uk.provider, uk.api_key);
        }
      }
    } catch {
      // user_api_configs table may not exist yet
    }
  }

  // 3. Env var fallbacks
  for (const [provider, envVar] of Object.entries(PROVIDER_ENV_KEYS)) {
    if (!keys.has(provider) && process.env[envVar]) {
      keys.set(provider, process.env[envVar]!);
    }
  }

  return keys;
}

// --- Helpers ---

function constructQuery(keyword: string): string {
  const templates = [
    `What are the best ${keyword}?`,
    `Can you recommend ${keyword}?`,
    `What should I know about ${keyword}?`,
    `What tools should I use for ${keyword}?`,
    `Compare the top ${keyword} solutions`,
    `Which ${keyword} do experts recommend in 2026?`,
    `What are the pros and cons of different ${keyword}?`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function analyzeMention(
  response: string,
  brand: string,
  domain: string
): { mentioned: boolean; position: number | null; cited: boolean; sentiment: "positive" | "neutral" | "negative" | null } {
  const lowerResponse = response.toLowerCase();
  const lowerBrand = brand.toLowerCase();
  const lowerDomain = domain.toLowerCase();

  const mentioned = lowerResponse.includes(lowerBrand) || lowerResponse.includes(lowerDomain);
  const cited = lowerResponse.includes(lowerDomain);

  let position: number | null = null;
  if (mentioned) {
    const idx = Math.min(
      lowerResponse.includes(lowerBrand) ? lowerResponse.indexOf(lowerBrand) : Infinity,
      lowerResponse.includes(lowerDomain) ? lowerResponse.indexOf(lowerDomain) : Infinity
    );
    const relativePosition = idx / response.length;
    position = relativePosition < 0.33 ? 1 : relativePosition < 0.66 ? 2 : 3;
  }

  return { mentioned, position, cited, sentiment: mentioned ? "neutral" : null };
}

function buildResult(
  provider: string,
  query: string,
  text: string,
  brand: string,
  domain: string
): LLMVisibilityResult {
  const analysis = analyzeMention(text, brand, domain);
  return {
    llm_provider: provider,
    query,
    brand_mentioned: analysis.mentioned,
    mention_position: analysis.position,
    url_cited: analysis.cited,
    sentiment: analysis.sentiment,
    response_excerpt: text.slice(0, 500),
    competitor_mentions: [],
  };
}

// --- Provider Checkers (all use pre-resolved API keys) ---

async function checkOpenAI(
  apiKey: string, query: string, brand: string, domain: string
): Promise<LLMVisibilityResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: query }],
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`OpenAI API ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return buildResult("openai", query, text, brand, domain);
}

async function checkAnthropic(
  apiKey: string, query: string, brand: string, domain: string
): Promise<LLMVisibilityResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: query }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Anthropic API ${response.status}`);
  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  return buildResult("anthropic", query, text, brand, domain);
}

async function checkGemini(
  apiKey: string, query: string, brand: string, domain: string
): Promise<LLMVisibilityResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: query }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!response.ok) throw new Error(`Gemini API ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return buildResult("gemini", query, text, brand, domain);
}

async function checkPerplexity(
  apiKey: string, query: string, brand: string, domain: string
): Promise<LLMVisibilityResult> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "user", content: query }],
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`Perplexity API ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return buildResult("perplexity", query, text, brand, domain);
}

async function checkDeepSeek(
  apiKey: string, query: string, brand: string, domain: string
): Promise<LLMVisibilityResult> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: query }],
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`DeepSeek API ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return buildResult("deepseek", query, text, brand, domain);
}

// --- Provider Registry ---

const CHECKER_FNS: Record<string, (apiKey: string, query: string, brand: string, domain: string) => Promise<LLMVisibilityResult>> = {
  openai: checkOpenAI,
  anthropic: checkAnthropic,
  gemini: checkGemini,
  perplexity: checkPerplexity,
  deepseek: checkDeepSeek,
};

// --- Main Visibility Check ---

export async function checkLLMVisibility(
  keyword: string,
  brand: string,
  domain: string,
  providers?: string[],
  userId?: string
): Promise<APIResponse<AggregatedVisibility>> {
  return safeAPICall("LLM Visibility", async () => {
    const query = constructQuery(keyword);

    // Resolve all available API keys from DB + env
    const apiKeys = await resolveAPIKeys(userId);

    // Determine which providers to check (only those with keys)
    const providerList = providers ?? Object.keys(CHECKER_FNS);
    const availableProviders = providerList.filter((p) => apiKeys.has(p));

    if (availableProviders.length === 0) {
      throw new Error("No AI provider API keys configured. Add keys in Settings > AI Providers.");
    }

    const results = await Promise.allSettled(
      availableProviders.map(async (provider) => {
        const fn = CHECKER_FNS[provider];
        const key = apiKeys.get(provider)!;
        const start = Date.now();
        try {
          const result = await fn(key, query, brand, domain);
          logAPICall({
            provider,
            endpoint: "/chat/completions",
            method: "POST",
            status_code: 200,
            response_time_ms: Date.now() - start,
            is_success: true,
            metadata: { module: "llm-visibility", keyword },
          });
          return result;
        } catch (err) {
          logAPICall({
            provider,
            endpoint: "/chat/completions",
            method: "POST",
            status_code: 500,
            response_time_ms: Date.now() - start,
            is_success: false,
            error_message: err instanceof Error ? err.message : String(err),
            metadata: { module: "llm-visibility", keyword },
          });
          throw err;
        }
      })
    );

    const successfulResults: LLMVisibilityResult[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        successfulResults.push(result.value);
      }
    }

    const mentionCount = successfulResults.filter((r) => r.brand_mentioned).length;
    const totalChecked = successfulResults.length;

    // Score: weighted average of mention + position + citation
    let score = 0;
    if (totalChecked > 0) {
      for (const r of successfulResults) {
        let itemScore = 0;
        if (r.brand_mentioned) itemScore += 50;
        if (r.url_cited) itemScore += 30;
        if (r.mention_position === 1) itemScore += 20;
        else if (r.mention_position === 2) itemScore += 10;
        else if (r.mention_position === 3) itemScore += 5;
        score += itemScore;
      }
      score = Math.round(score / totalChecked);
    }

    return {
      keyword,
      results: successfulResults,
      total_llms_checked: totalChecked,
      llms_with_mention: mentionCount,
      visibility_score: score,
      label: `${mentionCount}/${totalChecked}`,
    };
  });
}
