"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UserApiKey {
  id: string;
  provider: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Get all API keys for the current user.
 */
export async function getUserApiKeys(): Promise<UserApiKey[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_api_configs")
    .select("id, provider, api_key, is_active, created_at")
    .eq("user_id", user.id)
    .order("provider");

  return (data ?? []) as UserApiKey[];
}

/**
 * Save (upsert) an API key for a provider.
 */
export async function saveUserApiKey(
  provider: string,
  apiKey: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const validProviders = ["openai", "anthropic", "gemini", "deepseek", "perplexity"];
  if (!validProviders.includes(provider)) {
    return { error: `Invalid provider: ${provider}` };
  }

  if (!apiKey || apiKey.trim().length < 10) {
    return { error: "API key is too short." };
  }

  const { error } = await supabase.from("user_api_configs").upsert(
    {
      user_id: user.id,
      provider,
      api_key: apiKey.trim(),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Delete an API key.
 */
export async function deleteUserApiKey(
  keyId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("user_api_configs")
    .delete()
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Toggle an API key active/inactive.
 */
export async function toggleUserApiKey(
  keyId: string,
  isActive: boolean
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("user_api_configs")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}
