/**
 * Base API client utilities.
 * All external API wrappers check for required env vars at call time
 * and throw descriptive errors if missing, allowing the UI to show
 * "Connect [Service] in Settings" empty states.
 */

export class APIKeyMissingError extends Error {
  service: string;

  constructor(service: string, envVar: string) {
    super(
      `${service} API key not configured. Set the ${envVar} environment variable to enable this integration.`
    );
    this.name = "APIKeyMissingError";
    this.service = service;
  }
}

export function requireEnv(envVar: string, service: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new APIKeyMissingError(service, envVar);
  }
  return value;
}

export interface APIResponse<T> {
  data: T | null;
  error: string | null;
  service: string;
}

export function apiSuccess<T>(data: T, service: string): APIResponse<T> {
  return { data, error: null, service };
}

export function apiError<T>(error: string, service: string): APIResponse<T> {
  return { data: null, error, service };
}

/**
 * Wraps an API call with error handling.
 * Returns null data + descriptive error if API key is missing or call fails.
 */
export async function safeAPICall<T>(
  service: string,
  fn: () => Promise<T>
): Promise<APIResponse<T>> {
  try {
    const data = await fn();
    return apiSuccess(data, service);
  } catch (err) {
    if (err instanceof APIKeyMissingError) {
      return apiError(err.message, service);
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return apiError(`${service} API error: ${message}`, service);
  }
}
