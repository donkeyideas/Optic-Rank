"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGA4TopPages, getGA4Overview } from "@/lib/google/analytics";
import {
  hasGA4OAuthCredentials,
  refreshAccessToken,
  fetchGA4Properties,
  type GA4PropertySummary,
} from "@/lib/google/oauth";

// ================================================================
// Helpers
// ================================================================

/**
 * Resolve the GA4 property ID for a project.
 * Priority: project record → global env var → null.
 */
async function resolvePropertyId(projectId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("projects")
    .select("ga4_property_id")
    .eq("id", projectId)
    .maybeSingle();

  const fromDb = data?.ga4_property_id?.trim();
  if (fromDb) return fromDb;

  return process.env.GA4_PROPERTY_ID?.trim() ?? null;
}

/**
 * Get a valid OAuth access token for a user/project, refreshing if expired.
 */
async function getValidGA4AccessToken(
  userId: string,
  projectId: string
): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: token } = await supabase
    .from("ga4_oauth_tokens")
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
      .from("ga4_oauth_tokens")
      .update({
        access_token: refreshed.access_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", token.id);

    return refreshed.access_token;
  } catch (err) {
    console.error("[ga4] Token refresh failed:", err);
    return null;
  }
}

// ================================================================
// OAuth Connection Actions
// ================================================================

/**
 * Check if a user has connected GA4 OAuth for a project.
 */
export async function getGA4ConnectionStatus(
  projectId: string
): Promise<{ connected: boolean; configured: boolean; googleEmail: string | null }> {
  const configured = hasGA4OAuthCredentials();

  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { connected: false, configured, googleEmail: null };

  if (!configured) return { connected: false, configured, googleEmail: null };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ga4_oauth_tokens")
    .select("google_email")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .single();

  return {
    connected: !!data,
    configured,
    googleEmail: data?.google_email ?? null,
  };
}

/**
 * Disconnect GA4 OAuth for a project.
 */
export async function disconnectGA4(
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ga4_oauth_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("project_id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/keywords");
  return { success: true };
}

/**
 * List GA4 properties accessible by the user's OAuth token.
 */
export async function listGA4Properties(
  projectId: string
): Promise<{ error: string } | { properties: GA4PropertySummary[] }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const accessToken = await getValidGA4AccessToken(user.id, projectId);
  if (!accessToken) return { error: "GA4 not connected or token expired. Please reconnect." };

  try {
    const properties = await fetchGA4Properties(accessToken);
    return { properties };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to fetch GA4 properties." };
  }
}

/**
 * Select which GA4 property to use for a project.
 */
export async function selectGA4Property(
  projectId: string,
  propertyId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmed = propertyId.trim();
  if (trimmed && !/^\d+$/.test(trimmed)) {
    return { error: "GA4 Property ID must be numeric." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("projects")
    .update({ ga4_property_id: trimmed || null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/keywords");
  return { success: true };
}

// ================================================================
// Data Import Actions
// ================================================================

/**
 * Import top pages and traffic data from Google Analytics 4.
 * Uses OAuth token if available, falls back to service account.
 */
export async function importFromGoogleAnalytics(
  projectId: string
): Promise<{ error: string } | { success: true; pagesImported: number; totalSessions: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const propertyId = await resolvePropertyId(projectId);
  if (!propertyId) {
    return {
      error:
        "Google Analytics not configured. Go to Settings → Integrations and connect Google Analytics.",
    };
  }

  // Try to get OAuth access token for richer access
  const accessToken = await getValidGA4AccessToken(user.id, projectId);

  try {
    const [topPages, overview] = await Promise.all([
      getGA4TopPages(propertyId, 28, 50, accessToken ?? undefined),
      getGA4Overview(propertyId, 28, accessToken ?? undefined),
    ]);

    if (topPages.length === 0) {
      return { error: "No page data found in Google Analytics for the last 28 days." };
    }

    const supabase = createAdminClient();

    const { data: latestAudit } = await supabase
      .from("site_audits")
      .select("id")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let pagesImported = 0;

    if (latestAudit) {
      for (const page of topPages) {
        if (!page.path || page.path.startsWith("/api/")) continue;

        const { error: upsertError } = await supabase
          .from("audit_pages")
          .upsert(
            {
              audit_id: latestAudit.id,
              url: page.path,
              title: page.title || page.path,
              status_code: 200,
              word_count: null,
              load_time: page.avgTimeOnPage > 0 ? Math.round(page.avgTimeOnPage * 1000) : null,
            },
            { onConflict: "audit_id,url", ignoreDuplicates: false }
          );

        if (!upsertError) pagesImported++;
      }
    }

    const totalSessions = overview?.totalSessions ?? 0;
    if (totalSessions > 0) {
      await supabase
        .from("projects")
        .update({ organic_traffic: totalSessions })
        .eq("id", projectId);
    }

    revalidatePath("/dashboard/keywords");
    revalidatePath("/dashboard/content");
    revalidatePath("/dashboard");

    return {
      success: true,
      pagesImported,
      totalSessions,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to import from Google Analytics.";
    return { error: msg };
  }
}

/**
 * Test the GA4 connection for a project.
 * Uses OAuth token if available, falls back to service account.
 */
export async function testGA4Connection(
  projectId: string
): Promise<{ error: string } | { success: true; totalSessions: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const propertyId = await resolvePropertyId(projectId);
  if (!propertyId) {
    return { error: "No GA4 Property ID configured. Please select a property after connecting." };
  }

  const accessToken = await getValidGA4AccessToken(user.id, projectId);

  try {
    const overview = await getGA4Overview(propertyId, 7, accessToken ?? undefined);
    return {
      success: true,
      totalSessions: overview?.totalSessions ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed.";
    if (msg.includes("PERMISSION_DENIED") || msg.includes("sufficient permissions")) {
      return {
        error: "Permission denied. Please reconnect Google Analytics or verify the property selection.",
      };
    }
    return { error: msg };
  }
}

/**
 * Save a GA4 Property ID to a project (manual entry fallback).
 */
export async function saveGA4PropertyId(
  projectId: string,
  propertyId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const trimmed = propertyId.trim();
  if (trimmed && !/^\d+$/.test(trimmed)) {
    return { error: "GA4 Property ID must be a numeric value (e.g. 528445226)." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("projects")
    .update({ ga4_property_id: trimmed || null })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/keywords");

  return { success: true };
}
