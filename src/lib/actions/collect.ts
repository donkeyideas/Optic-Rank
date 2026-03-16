"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getKeywordSuggestions } from "@/lib/api/dataforseo";
import { getTrafficEstimate } from "@/lib/api/dataforseo";
import { getPageSpeedData } from "@/lib/api/pagespeed";
import { processPageSpeedAudit } from "@/lib/actions/audit-utils";
import { APIKeyMissingError } from "@/lib/api/base";
import { revalidatePath } from "next/cache";

/**
 * Collect keyword suggestions for a project from DataForSEO.
 * Fetches related keywords using the project's domain as the seed,
 * then inserts them into the keywords table.
 */
export async function collectKeywordSuggestions(
  projectId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Fetch the project to get its domain
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("domain")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) {
    console.error(
      `[collect] Failed to fetch project ${projectId}:`,
      fetchError?.message
    );
    return;
  }

  if (!project.domain) {
    console.warn(
      `[collect] Project ${projectId} has no domain — skipping keyword suggestions.`
    );
    return;
  }

  const result = await getKeywordSuggestions(project.domain, { limit: 30 });

  if (result.error) {
    // If it's a missing API key, just log and skip — don't crash
    console.warn(
      `[collect] Keyword suggestions skipped for ${project.domain}: ${result.error}`
    );
    return;
  }

  if (!result.data || result.data.length === 0) {
    console.log(
      `[collect] No keyword suggestions returned for ${project.domain}.`
    );
    return;
  }

  // Build rows matching the keywords table schema
  const rows = result.data.map((kw) => ({
    project_id: projectId,
    keyword: kw.keyword,
    search_engine: "google",
    device: "desktop" as const,
    location: "US",
    search_volume: kw.search_volume || null,
    cpc: kw.cpc || null,
    difficulty: kw.difficulty || null,
  }));

  const { error: insertError } = await supabase.from("keywords").upsert(rows, {
    onConflict: "project_id,keyword,search_engine,device,location",
    ignoreDuplicates: true,
  });

  if (insertError) {
    console.error(
      `[collect] Failed to insert keywords for project ${projectId}:`,
      insertError.message
    );
    return;
  }

  console.log(
    `[collect] Inserted ${rows.length} keyword suggestions for project ${projectId}.`
  );
}

/**
 * Collect Core Web Vitals / PageSpeed data for a project.
 * Runs a mobile PageSpeed audit and stores results in the site_audits table.
 */
export async function collectPageSpeed(projectId: string): Promise<void> {
  const supabase = createAdminClient();

  // Fetch the project to get its URL (fall back to domain)
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("url, domain")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) {
    console.error(
      `[collect] Failed to fetch project ${projectId}:`,
      fetchError?.message
    );
    return;
  }

  const targetUrl = project.url || (project.domain ? `https://${project.domain}` : null);

  if (!targetUrl) {
    console.warn(
      `[collect] Project ${projectId} has no URL or domain — skipping PageSpeed.`
    );
    return;
  }

  const result = await getPageSpeedData(targetUrl, "mobile");

  if (result.error) {
    console.warn(
      `[collect] PageSpeed skipped for ${targetUrl}: ${result.error}`
    );
    return;
  }

  if (!result.data) {
    console.log(`[collect] No PageSpeed data returned for ${targetUrl}.`);
    return;
  }

  const cwv = result.data;

  try {
    const { issues } = await processPageSpeedAudit(supabase, projectId, cwv, undefined, targetUrl);
    console.log(
      `[collect] Stored PageSpeed audit (score: ${cwv.performance_score}, ${issues} issues) for project ${projectId}.`
    );
  } catch (err) {
    console.error(
      `[collect] Failed to process PageSpeed audit for project ${projectId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Collect traffic estimates for a project from DataForSEO.
 * Fetches organic/paid traffic data and updates the project's settings
 * with the latest traffic snapshot.
 */
export async function collectTrafficEstimate(projectId: string): Promise<void> {
  const supabase = createAdminClient();

  // Fetch the project to get its domain
  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("domain, settings")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) {
    console.error(
      `[collect] Failed to fetch project ${projectId}:`,
      fetchError?.message
    );
    return;
  }

  if (!project.domain) {
    console.warn(
      `[collect] Project ${projectId} has no domain — skipping traffic estimate.`
    );
    return;
  }

  const result = await getTrafficEstimate(project.domain);

  if (result.error) {
    console.warn(
      `[collect] Traffic estimate skipped for ${project.domain}: ${result.error}`
    );
    return;
  }

  if (!result.data) {
    console.log(
      `[collect] No traffic data returned for ${project.domain}.`
    );
    return;
  }

  const traffic = result.data;

  // Store traffic data in the project's settings JSONB field
  const currentSettings =
    (project.settings as Record<string, unknown>) || {};

  const { error: updateError } = await supabase
    .from("projects")
    .update({
      settings: {
        ...currentSettings,
        traffic_estimate: {
          organic_traffic: traffic.organic_traffic,
          paid_traffic: traffic.paid_traffic,
          organic_keywords: traffic.organic_keywords,
          organic_cost: traffic.organic_cost,
          collected_at: new Date().toISOString(),
        },
      },
      authority_score: traffic.organic_keywords > 0
        ? Math.min(
            100,
            Math.round(
              Math.log10(traffic.organic_traffic + 1) * 15
            )
          )
        : null,
    })
    .eq("id", projectId);

  if (updateError) {
    console.error(
      `[collect] Failed to update traffic data for project ${projectId}:`,
      updateError.message
    );
    return;
  }

  console.log(
    `[collect] Stored traffic estimate (organic: ${traffic.organic_traffic}) for project ${projectId}.`
  );
}

/**
 * Orchestrate all data collection steps for a project.
 * Runs keyword suggestions, PageSpeed, and traffic estimate in parallel.
 * Uses Promise.allSettled so one failure doesn't block the others.
 */
export async function collectProjectData(projectId: string): Promise<void> {
  console.log(`[collect] Starting data collection for project ${projectId}...`);

  const results = await Promise.allSettled([
    collectKeywordSuggestions(projectId).catch((err) => {
      if (err instanceof APIKeyMissingError) {
        console.warn(`[collect] Keyword suggestions skipped — API key not configured.`);
      } else {
        console.error(`[collect] Keyword suggestions failed:`, err);
      }
    }),
    collectPageSpeed(projectId).catch((err) => {
      if (err instanceof APIKeyMissingError) {
        console.warn(`[collect] PageSpeed skipped — API key not configured.`);
      } else {
        console.error(`[collect] PageSpeed collection failed:`, err);
      }
    }),
    collectTrafficEstimate(projectId).catch((err) => {
      if (err instanceof APIKeyMissingError) {
        console.warn(`[collect] Traffic estimate skipped — API key not configured.`);
      } else {
        console.error(`[collect] Traffic estimate failed:`, err);
      }
    }),
  ]);

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  console.log(
    `[collect] Data collection complete for project ${projectId}: ${succeeded} succeeded, ${failed} failed.`
  );

  revalidatePath("/dashboard", "layout");
}
