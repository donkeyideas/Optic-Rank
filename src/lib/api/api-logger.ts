/**
 * API Call Logger — tracks all external API calls for cost/usage monitoring.
 * Used by all API wrappers to automatically log calls to the api_call_log table.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface LogAPICallParams {
  provider: string;
  endpoint: string;
  method?: string;
  status_code?: number;
  response_time_ms?: number;
  tokens_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  cost_usd?: number;
  is_cached?: boolean;
  is_success?: boolean;
  error_message?: string;
  metadata?: Record<string, unknown>;
  project_id?: string;
  user_id?: string;
}

/**
 * Log an API call to the api_call_log table.
 * Fire-and-forget — errors are silently caught to never block the main flow.
 */
export async function logAPICall(params: LogAPICallParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("api_call_log").insert({
      provider: params.provider,
      endpoint: params.endpoint,
      method: params.method ?? "GET",
      status_code: params.status_code ?? null,
      response_time_ms: params.response_time_ms ?? null,
      tokens_used: params.tokens_used ?? 0,
      prompt_tokens: params.prompt_tokens ?? 0,
      completion_tokens: params.completion_tokens ?? 0,
      cost_usd: params.cost_usd ?? 0,
      is_cached: params.is_cached ?? false,
      is_success: params.is_success ?? true,
      error_message: params.error_message ?? null,
      metadata: params.metadata ?? {},
      project_id: params.project_id ?? null,
      user_id: params.user_id ?? null,
    });
  } catch {
    // Silent fail — logging should never break the main flow
  }
}

/**
 * Wrapper to time and log an API call automatically.
 */
export async function withAPILogging<T>(
  params: Pick<LogAPICallParams, "provider" | "endpoint" | "method" | "project_id" | "user_id">,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    await logAPICall({
      ...params,
      status_code: 200,
      response_time_ms: Date.now() - start,
      is_success: true,
    });
    return result;
  } catch (err) {
    await logAPICall({
      ...params,
      status_code: 500,
      response_time_ms: Date.now() - start,
      is_success: false,
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
