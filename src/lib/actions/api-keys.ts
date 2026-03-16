"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";

/**
 * Create a new API key. Returns the full key ONCE — it cannot be retrieved later.
 */
export async function createApiKey(
  name: string,
  scopes: string[],
  expiresAt?: string | null
): Promise<{ error: string } | { key: string; keyPrefix: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  // Generate a random API key
  const rawKey = `rp_${randomBytes(32).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 10);
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const { error } = await supabase.from("api_keys").insert({
    organization_id: profile.organization_id,
    created_by: user.id,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes,
    expires_at: expiresAt || null,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { key: rawKey, keyPrefix };
}

/**
 * Revoke (delete) an API key.
 */
export async function revokeApiKey(
  keyId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", keyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Get all API keys for the user's organization (never returns the hash).
 */
export async function getApiKeys(): Promise<
  { error: string } | { keys: ApiKeyPublic[] }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, expires_at, last_used_at, is_active, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  return { keys: (data ?? []) as ApiKeyPublic[] };
}

export interface ApiKeyPublic {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}
