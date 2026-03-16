import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ApiAuth {
  orgId: string;
  keyId: string;
  scopes: string[];
}

type ApiResult = ApiAuth | { error: NextResponse };

// Simple in-memory rate limiter (per-key, per-minute)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per minute

/**
 * Validate an API key from the Authorization header.
 * Returns the authenticated org/key info or an error response.
 */
export async function validateApiKey(request: Request): Promise<ApiResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer <api_key>" },
        { status: 401 }
      ),
    };
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey) {
    return {
      error: NextResponse.json({ error: "API key is empty." }, { status: 401 }),
    };
  }

  // Hash the key to look up in the database
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const supabase = createAdminClient();
  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .select("id, organization_id, scopes, expires_at, is_active")
    .eq("key_hash", keyHash)
    .single();

  if (error || !apiKey) {
    return {
      error: NextResponse.json({ error: "Invalid API key." }, { status: 401 }),
    };
  }

  if (!apiKey.is_active) {
    return {
      error: NextResponse.json({ error: "API key has been revoked." }, { status: 401 }),
    };
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return {
      error: NextResponse.json({ error: "API key has expired." }, { status: 401 }),
    };
  }

  // Rate limiting
  const now = Date.now();
  const bucket = rateBuckets.get(apiKey.id);
  if (bucket && now < bucket.resetAt) {
    if (bucket.count >= RATE_LIMIT) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        error: NextResponse.json(
          { error: "Rate limit exceeded. Try again later." },
          {
            status: 429,
            headers: { "Retry-After": String(retryAfter) },
          }
        ),
      };
    }
    bucket.count++;
  } else {
    rateBuckets.set(apiKey.id, { count: 1, resetAt: now + 60_000 });
  }

  // Update last_used_at (fire and forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {});

  return {
    orgId: apiKey.organization_id,
    keyId: apiKey.id,
    scopes: apiKey.scopes ?? [],
  };
}

/**
 * Check if the authenticated key has the required scope.
 */
export function requireScope(auth: ApiAuth, scope: string): NextResponse | null {
  if (!auth.scopes.includes(scope) && !auth.scopes.includes("*")) {
    return NextResponse.json(
      { error: `Insufficient scope. Required: ${scope}` },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Standard CORS headers for API v1 routes.
 */
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}

/**
 * Handle OPTIONS preflight for CORS.
 */
export function handleOptions() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
