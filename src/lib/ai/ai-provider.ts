/**
 * Unified AI provider that reads API keys from platform_api_configs.
 * Priority: User keys (if provided) > DeepSeek > Gemini > env vars.
 * Provides a single aiChat() function for all AI modules.
 *
 * User API key resolution: If the caller doesn't pass an explicit userId,
 * aiChat() will attempt to auto-resolve the current user from the Next.js
 * auth context so that user-configured API keys are always applied.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAPICall } from "@/lib/api/api-logger";

interface AIResponse {
  text: string;
  provider: string;
}

interface AIConfig {
  provider: string;
  api_key: string;
  base_url: string | null;
  config: Record<string, unknown> | null;
}

interface AICallResult {
  text: string | null;
  prompt_tokens: number;
  completion_tokens: number;
}

// Cost per 1K tokens (USD) by provider
const COST_PER_1K: Record<string, { input: number; output: number }> = {
  deepseek: { input: 0.00014, output: 0.00028 },
  openai: { input: 0.00015, output: 0.0006 },
  anthropic: { input: 0.0008, output: 0.004 },
  gemini: { input: 0.0, output: 0.0 },
};

// Cache the config for 60 seconds to avoid hitting DB on every AI call
let cachedConfig: { configs: AIConfig[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000;

async function getAIConfigs(): Promise<AIConfig[]> {
  if (cachedConfig && Date.now() - cachedConfig.timestamp < CACHE_TTL) {
    return cachedConfig.configs;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("platform_api_configs")
      .select("provider, api_key, base_url, config")
      .in("provider", ["deepseek", "gemini", "openai", "anthropic"])
      .eq("is_active", true)
      .not("api_key", "is", null);

    const configs = (data ?? []) as AIConfig[];
    cachedConfig = { configs, timestamp: Date.now() };
    return configs;
  } catch {
    return [];
  }
}

/**
 * Get user-configured API keys (overrides platform defaults).
 */
async function getUserAIConfigs(userId: string): Promise<AIConfig[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_api_configs")
      .select("provider, api_key")
      .eq("user_id", userId)
      .eq("is_active", true)
      .not("api_key", "is", null);

    return (data ?? []).map((d) => ({
      provider: d.provider,
      api_key: d.api_key,
      base_url: null,
      config: null,
    }));
  } catch {
    // Table may not exist yet — fall through silently
    return [];
  }
}

// Provider priority order
const PROVIDER_ORDER = ["deepseek", "openai", "anthropic", "gemini"] as const;

/**
 * Auto-resolve the current user ID from the Next.js auth context.
 * This allows aiChat() to use user-configured API keys automatically
 * without every caller needing to pass userId explicitly.
 */
async function resolveCurrentUserId(): Promise<string | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    // Not in a request context (e.g. cron job, edge function) — skip
    return null;
  }
}

/**
 * Send a chat completion request to the best available AI provider.
 * Priority: User keys > DeepSeek (from DB) > Gemini (from DB) > env var fallbacks.
 *
 * If userId is not passed, it is auto-resolved from the current auth context
 * so user-configured API keys are always applied when available.
 */
export async function aiChat(
  prompt: string,
  options: { temperature?: number; maxTokens?: number; timeout?: number; userId?: string } = {}
): Promise<AIResponse | null> {
  const { temperature = 0.7, maxTokens = 1024, timeout = 60000 } = options;

  // Resolve userId: explicit > auto-resolved from auth context
  const userId = options.userId ?? await resolveCurrentUserId();

  // Merge user configs on top of platform configs
  const platformConfigs = await getAIConfigs();
  const userConfigs = userId ? await getUserAIConfigs(userId) : [];

  // User configs override platform configs for the same provider
  const configMap = new Map<string, AIConfig>();
  for (const c of platformConfigs) configMap.set(c.provider, c);
  for (const c of userConfigs) configMap.set(c.provider, c);
  const configs = Array.from(configMap.values());

  // Try providers in order
  for (const providerName of PROVIDER_ORDER) {
    const config = configs.find((c) => c.provider === providerName);
    if (!config?.api_key) continue;

    const start = Date.now();
    try {
      let callResult: AICallResult;

      if (providerName === "gemini") {
        callResult = await callGemini(config.api_key, prompt, temperature, maxTokens, timeout);
      } else if (providerName === "anthropic") {
        callResult = await callAnthropic(config.api_key, prompt, temperature, maxTokens, timeout);
      } else {
        // OpenAI-compatible: deepseek, openai
        const baseUrl =
          providerName === "deepseek"
            ? config.base_url || "https://api.deepseek.com"
            : config.base_url || "https://api.openai.com/v1";
        const model =
          providerName === "deepseek"
            ? (config.config as Record<string, string>)?.model || "deepseek-chat"
            : (config.config as Record<string, string>)?.model || "gpt-4o-mini";
        callResult = await callOpenAICompatible(baseUrl, config.api_key, model, prompt, temperature, maxTokens, timeout);
      }

      const costs = COST_PER_1K[providerName] ?? { input: 0, output: 0 };
      const costUsd = (callResult.prompt_tokens * costs.input + callResult.completion_tokens * costs.output) / 1000;

      logAPICall({
        provider: providerName,
        endpoint: "/chat/completions",
        method: "POST",
        status_code: 200,
        response_time_ms: Date.now() - start,
        tokens_used: callResult.prompt_tokens + callResult.completion_tokens,
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        cost_usd: costUsd,
        is_success: true,
      });

      if (callResult.text) return { text: callResult.text, provider: providerName };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const statusMatch = errMsg.match(/\b([45]\d{2})\b/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 500;
      logAPICall({
        provider: providerName,
        endpoint: "/chat/completions",
        method: "POST",
        status_code: statusCode,
        response_time_ms: Date.now() - start,
        is_success: false,
        error_message: errMsg,
      });
      console.error(`[aiChat] ${providerName} error:`, err);
    }
  }

  // Fallback: env var Gemini key
  const envGeminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (envGeminiKey) {
    const start = Date.now();
    try {
      const callResult = await callGemini(envGeminiKey, prompt, temperature, maxTokens, timeout);

      logAPICall({
        provider: "gemini",
        endpoint: "/generateContent",
        method: "POST",
        status_code: 200,
        response_time_ms: Date.now() - start,
        tokens_used: callResult.prompt_tokens + callResult.completion_tokens,
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        is_success: true,
      });

      if (callResult.text) return { text: callResult.text, provider: "gemini" };
    } catch (err) {
      logAPICall({
        provider: "gemini",
        endpoint: "/generateContent",
        method: "POST",
        status_code: 500,
        response_time_ms: Date.now() - start,
        is_success: false,
        error_message: err instanceof Error ? err.message : String(err),
      });
      console.error("[aiChat] Gemini env fallback error:", err);
    }
  }

  return null;
}

/**
 * Call any OpenAI-compatible API (DeepSeek, OpenAI, etc.)
 */
async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number = 60000
): Promise<AICallResult> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data?.choices?.[0]?.message?.content ?? null,
    prompt_tokens: data?.usage?.prompt_tokens ?? 0,
    completion_tokens: data?.usage?.completion_tokens ?? 0,
  };
}

/**
 * Call Gemini API (Google's format)
 */
async function callGemini(
  apiKey: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number = 60000
): Promise<AICallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null,
    prompt_tokens: data?.usageMetadata?.promptTokenCount ?? 0,
    completion_tokens: data?.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(
  apiKey: string,
  prompt: string,
  temperature: number,
  maxTokens: number,
  timeout: number = 60000
): Promise<AICallResult> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic API error ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    text: data?.content?.[0]?.text ?? null,
    prompt_tokens: data?.usage?.input_tokens ?? 0,
    completion_tokens: data?.usage?.output_tokens ?? 0,
  };
}
