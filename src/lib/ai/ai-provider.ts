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

/** Context for logging full AI interactions to the knowledge base */
export interface AIInteractionContext {
  feature: string;         // e.g. 'content_generator', 'aso_optimizer', 'review_reply'
  sub_type?: string;       // e.g. 'title_variant', 'hashtag_analysis', '30_day_plan'
  project_id?: string;
  user_id?: string;
  organization_id?: string;
  metadata?: Record<string, unknown>;
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

// Circuit breaker: skip providers that failed recently (5 min cooldown)
const failedProviders = new Map<string, number>();
const CIRCUIT_BREAKER_TTL = 5 * 60_000;

function markProviderFailed(provider: string) {
  failedProviders.set(provider, Date.now());
}

function isProviderAvailable(provider: string): boolean {
  const failedAt = failedProviders.get(provider);
  if (!failedAt) return true;
  if (Date.now() - failedAt > CIRCUIT_BREAKER_TTL) {
    failedProviders.delete(provider);
    return true;
  }
  return false;
}

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

/**
 * Log full AI interaction to the ai_interactions knowledge base.
 * Fire-and-forget — never blocks the main flow.
 */
function logAIInteraction(params: {
  prompt: string;
  response: string | null;
  provider: string;
  model?: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  response_time_ms: number;
  is_success: boolean;
  error_message?: string;
  context?: AIInteractionContext;
}) {
  // Always log — use "uncategorized" when no explicit context provided
  const ctx = params.context ?? { feature: "uncategorized" };
  try {
    const supabase = createAdminClient();
    supabase.from("ai_interactions").insert({
      organization_id: ctx.organization_id ?? null,
      project_id: ctx.project_id ?? null,
      user_id: ctx.user_id ?? null,
      feature: ctx.feature,
      sub_type: ctx.sub_type ?? null,
      prompt_text: params.prompt,
      response_text: params.response,
      prompt_tokens: params.prompt_tokens,
      completion_tokens: params.completion_tokens,
      total_tokens: params.prompt_tokens + params.completion_tokens,
      cost_usd: params.cost_usd,
      provider: params.provider,
      model: params.model ?? null,
      response_time_ms: params.response_time_ms,
      is_success: params.is_success,
      error_message: params.error_message ?? null,
      metadata: ctx.metadata ?? {},
    }).then(() => {}, () => {});
  } catch {
    // Silent fail — logging should never break the main flow
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
  options: { temperature?: number; maxTokens?: number; timeout?: number; userId?: string; context?: AIInteractionContext; jsonMode?: boolean } = {}
): Promise<AIResponse | null> {
  const { temperature = 0.7, maxTokens = 1024, timeout = 30000, jsonMode = false } = options;

  // Auto-inject learning context when feature context is provided
  let enrichedPrompt = prompt;
  const ctx = options.context;
  if (ctx?.feature) {
    try {
      const { buildContextBlock } = await import("@/lib/ai/context-retrieval");
      const contextBlock = await buildContextBlock(ctx.feature, {
        projectId: ctx.project_id,
        subType: ctx.sub_type,
        limit: 3,
      });
      if (contextBlock) {
        enrichedPrompt = prompt + contextBlock;
      }
    } catch {
      // Context retrieval should never block the main call
    }
  }

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

  // Try providers in order, skipping recently-failed ones
  console.log(`[aiChat] Found ${configs.length} AI configs: ${configs.map(c => c.provider).join(", ") || "none"}`);
  for (const providerName of PROVIDER_ORDER) {
    const config = configs.find((c) => c.provider === providerName);
    if (!config?.api_key) {
      console.log(`[aiChat] Skipping ${providerName}: no API key in DB`);
      continue;
    }
    if (!isProviderAvailable(providerName)) {
      console.log(`[aiChat] Skipping ${providerName}: circuit breaker active`);
      continue;
    }
    console.log(`[aiChat] Trying ${providerName}...`);

    const start = Date.now();
    try {
      let callResult: AICallResult;

      if (providerName === "gemini") {
        callResult = await callGemini(config.api_key, enrichedPrompt, temperature, maxTokens, timeout, jsonMode);
      } else if (providerName === "anthropic") {
        callResult = await callAnthropic(config.api_key, enrichedPrompt, temperature, maxTokens, timeout);
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
        callResult = await callOpenAICompatible(baseUrl, config.api_key, model, enrichedPrompt, temperature, maxTokens, timeout, jsonMode);
      }

      const costs = COST_PER_1K[providerName] ?? { input: 0, output: 0 };
      const costUsd = (callResult.prompt_tokens * costs.input + callResult.completion_tokens * costs.output) / 1000;

      const elapsedMs = Date.now() - start;

      logAPICall({
        provider: providerName,
        endpoint: "/chat/completions",
        method: "POST",
        status_code: 200,
        response_time_ms: elapsedMs,
        tokens_used: callResult.prompt_tokens + callResult.completion_tokens,
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        cost_usd: costUsd,
        is_success: true,
      });

      // Log full interaction to knowledge base
      logAIInteraction({
        prompt,
        response: callResult.text,
        provider: providerName,
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        cost_usd: costUsd,
        response_time_ms: elapsedMs,
        is_success: true,
        context: options.context,
      });

      if (callResult.text) return { text: callResult.text, provider: providerName };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const statusMatch = errMsg.match(/\b([45]\d{2})\b/);
      const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 500;
      const elapsedMs = Date.now() - start;
      logAPICall({
        provider: providerName,
        endpoint: "/chat/completions",
        method: "POST",
        status_code: statusCode,
        response_time_ms: elapsedMs,
        is_success: false,
        error_message: errMsg,
      });

      // Log failed interaction to knowledge base
      logAIInteraction({
        prompt,
        response: null,
        provider: providerName,
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        response_time_ms: elapsedMs,
        is_success: false,
        error_message: errMsg,
        context: options.context,
      });

      console.error(`[aiChat] ${providerName} error:`, err);
      markProviderFailed(providerName);
    }
  }

  console.log("[aiChat] All DB providers exhausted, trying env var fallbacks...");

  // Fallback: env var DeepSeek key (bypass circuit breaker — different key source)
  const envDeepSeekKey = process.env.DEEPSEEK_API_KEY;
  if (envDeepSeekKey) {
    const start = Date.now();
    try {
      const callResult = await callOpenAICompatible(
        "https://api.deepseek.com",
        envDeepSeekKey,
        "deepseek-chat",
        enrichedPrompt,
        temperature,
        maxTokens,
        timeout,
        jsonMode
      );

      const elapsedMs = Date.now() - start;
      const costs = COST_PER_1K.deepseek;
      const costUsd = (callResult.prompt_tokens * costs.input + callResult.completion_tokens * costs.output) / 1000;
      logAPICall({
        provider: "deepseek",
        endpoint: "/chat/completions",
        method: "POST",
        status_code: 200,
        response_time_ms: elapsedMs,
        tokens_used: callResult.prompt_tokens + callResult.completion_tokens,
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        cost_usd: costUsd,
        is_success: true,
      });

      logAIInteraction({
        prompt,
        response: callResult.text,
        provider: "deepseek",
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        cost_usd: costUsd,
        response_time_ms: elapsedMs,
        is_success: true,
        context: options.context,
      });

      if (callResult.text) return { text: callResult.text, provider: "deepseek" };
    } catch (err) {
      const elapsedMs = Date.now() - start;
      logAPICall({
        provider: "deepseek",
        endpoint: "/chat/completions",
        method: "POST",
        status_code: 500,
        response_time_ms: elapsedMs,
        is_success: false,
        error_message: err instanceof Error ? err.message : String(err),
      });

      logAIInteraction({
        prompt,
        response: null,
        provider: "deepseek",
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        response_time_ms: elapsedMs,
        is_success: false,
        error_message: err instanceof Error ? err.message : String(err),
        context: options.context,
      });

      console.error("[aiChat] DeepSeek env fallback error:", err);
      markProviderFailed("deepseek");
    }
  }

  // Fallback: env var Gemini key
  const envGeminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (envGeminiKey) {
    const start = Date.now();
    try {
      const callResult = await callGemini(envGeminiKey, enrichedPrompt, temperature, maxTokens, timeout, jsonMode);

      const elapsedMs = Date.now() - start;
      logAPICall({
        provider: "gemini",
        endpoint: "/generateContent",
        method: "POST",
        status_code: 200,
        response_time_ms: elapsedMs,
        tokens_used: callResult.prompt_tokens + callResult.completion_tokens,
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        is_success: true,
      });

      logAIInteraction({
        prompt,
        response: callResult.text,
        provider: "gemini",
        prompt_tokens: callResult.prompt_tokens,
        completion_tokens: callResult.completion_tokens,
        cost_usd: 0,
        response_time_ms: elapsedMs,
        is_success: true,
        context: options.context,
      });

      if (callResult.text) return { text: callResult.text, provider: "gemini" };
    } catch (err) {
      const elapsedMs = Date.now() - start;
      logAPICall({
        provider: "gemini",
        endpoint: "/generateContent",
        method: "POST",
        status_code: 500,
        response_time_ms: elapsedMs,
        is_success: false,
        error_message: err instanceof Error ? err.message : String(err),
      });

      logAIInteraction({
        prompt,
        response: null,
        provider: "gemini",
        prompt_tokens: 0,
        completion_tokens: 0,
        cost_usd: 0,
        response_time_ms: elapsedMs,
        is_success: false,
        error_message: err instanceof Error ? err.message : String(err),
        context: options.context,
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
  timeout: number = 60000,
  jsonMode: boolean = false
): Promise<AICallResult> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
  timeout: number = 60000,
  jsonMode: boolean = false
): Promise<AICallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const genConfig: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens };
  if (jsonMode) genConfig.responseMimeType = "application/json";

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: genConfig,
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
