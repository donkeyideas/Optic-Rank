"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  hasGSCOAuthCredentials,
  refreshAccessToken,
  fetchGSCSites,
  fetchGSCTopQueries,
} from "@/lib/google/oauth";

/**
 * Check if a user has connected GSC for a project.
 */
export async function getGSCConnectionStatus(
  projectId: string
): Promise<{ connected: boolean; propertyUrl: string | null }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { connected: false, propertyUrl: null };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("gsc_tokens")
    .select("gsc_property_url")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .single();

  return {
    connected: !!data,
    propertyUrl: data?.gsc_property_url ?? null,
  };
}

/**
 * Disconnect GSC for a project.
 */
export async function disconnectGSC(
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gsc_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("project_id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/keywords");
  return { success: true };
}

/**
 * Get a valid access token for a user/project, refreshing if expired.
 */
async function getValidAccessToken(
  userId: string,
  projectId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: token } = await supabase
    .from("gsc_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();

  if (!token) return null;

  // Check if token is still valid (with 5-min buffer)
  const expiresAt = new Date(token.expires_at);
  if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return token.access_token;
  }

  // Refresh the token
  try {
    const refreshed = await refreshAccessToken(token.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await supabase
      .from("gsc_tokens")
      .update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", token.id);

    return refreshed.access_token;
  } catch (err) {
    console.error("[gsc] Token refresh failed:", err);
    return null;
  }
}

/**
 * Fetch the user's GSC properties for a project.
 */
export async function listGSCProperties(
  projectId: string
): Promise<{ error: string } | { properties: Array<{ siteUrl: string; permissionLevel: string }> }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const accessToken = await getValidAccessToken(user.id, projectId);
  if (!accessToken) return { error: "GSC not connected or token expired. Please reconnect." };

  try {
    const properties = await fetchGSCSites(accessToken);
    return { properties };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch GSC properties." };
  }
}

/**
 * Set which GSC property URL is associated with a project.
 */
export async function setGSCProperty(
  projectId: string,
  propertyUrl: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gsc_tokens")
    .update({ gsc_property_url: propertyUrl, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("project_id", projectId);

  if (error) return { error: error.message };

  // Also update project's gsc_property_url for service-account fallback
  await supabase
    .from("projects")
    .update({ gsc_property_url: propertyUrl })
    .eq("id", projectId);

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Import top keywords from Google Search Console into the project.
 */
export async function importKeywordsFromGSC(
  projectId: string,
  limit = 50,
  location = "US",
  device: "desktop" | "mobile" = "desktop"
): Promise<{ error: string } | { success: true; imported: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (!hasGSCOAuthCredentials()) {
    return { error: "Google OAuth not configured." };
  }

  const supabase = createAdminClient();

  // Get the stored GSC property URL
  const { data: token } = await supabase
    .from("gsc_tokens")
    .select("gsc_property_url")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .single();

  if (!token?.gsc_property_url) {
    return { error: "No GSC property selected. Connect GSC and select a property first." };
  }

  const accessToken = await getValidAccessToken(user.id, projectId);
  if (!accessToken) return { error: "GSC token expired. Please reconnect." };

  try {
    const queries = await fetchGSCTopQueries(accessToken, token.gsc_property_url, 28, limit);

    if (queries.length === 0) {
      return { error: "No queries found in GSC for this property." };
    }

    // Get existing keywords to avoid duplicates
    const { data: existing } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId);

    const existingSet = new Set((existing ?? []).map((k) => k.keyword.toLowerCase()));
    const newQueries = queries.filter((q) => !existingSet.has(q.query.toLowerCase()));

    if (newQueries.length === 0) {
      return { error: "All GSC keywords are already tracked." };
    }

    const rows = newQueries.map((q) => ({
      project_id: projectId,
      keyword: q.query,
      search_engine: "google",
      device,
      location,
      current_position: Math.round(q.position),
      search_volume: q.impressions, // Use GSC impressions as a volume proxy
    }));

    const { error: insertError } = await supabase.from("keywords").upsert(rows, {
      onConflict: "project_id,keyword,search_engine,device,location",
      ignoreDuplicates: true,
    });

    if (insertError) return { error: insertError.message };

    revalidatePath("/dashboard/keywords");
    revalidatePath("/dashboard");
    return { success: true, imported: newQueries.length };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to import from GSC." };
  }
}
