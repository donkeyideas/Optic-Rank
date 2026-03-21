/**
 * Cron API route for daily keyword rank checking.
 * Called by Vercel Cron or external scheduler.
 * Checks ranks for all active project keywords using DataForSEO.
 * Falls back gracefully when API keys are missing.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSERP, hasDataForSEOCredentials } from "@/lib/api/dataforseo";
import { logAPICall } from "@/lib/api/api-logger";

export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE = 10;

export async function GET(request: Request) {
  // Verify cron secret (skip in dev)
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Create a pending job record
  const { data: job } = await supabase
    .from("job_queue")
    .insert({ job_type: "rank_check", status: "pending", payload: {} })
    .select("id")
    .single();
  const jobId = job?.id;

  // Pre-flight: check if DataForSEO credentials are available
  const hasCredentials = await hasDataForSEOCredentials();
  if (!hasCredentials) {
    if (jobId) {
      await supabase.from("job_queue").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payload: { totalChecked: 0, totalErrors: 0, skipped: true },
        last_error: null,
      }).eq("id", jobId);
    }
    return NextResponse.json({
      message: "Skipped — DataForSEO not configured. Add credentials in Admin → API Management to enable rank tracking.",
      checked: 0,
      errors: 0,
      skipped: true,
    });
  }

  // Get all active projects with their domains
  const { data: projects } = await supabase
    .from("projects")
    .select("id, domain")
    .eq("is_active", true)
    .not("domain", "is", null);

  if (!projects || projects.length === 0) {
    if (jobId) {
      await supabase.from("job_queue").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payload: { totalChecked: 0, totalErrors: 0, message: "No active projects" },
      }).eq("id", jobId);
    }
    return NextResponse.json({ message: "No active projects found.", checked: 0 });
  }

  // Mark as processing
  if (jobId) {
    await supabase.from("job_queue").update({
      status: "processing",
      locked_at: new Date().toISOString(),
    }).eq("id", jobId);
  }

  let totalChecked = 0;
  let totalErrors = 0;
  let firstError = "";

  for (const project of projects) {
    if (!project.domain) continue;

    // Get all keywords for this project
    const { data: keywords } = await supabase
      .from("keywords")
      .select("id, keyword, device, location")
      .eq("project_id", project.id);

    if (!keywords || keywords.length === 0) continue;

    // Process in batches
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (kw) => {
          try {
            const result = await checkSERP(kw.keyword, project.domain!, {
              device: kw.device as "desktop" | "mobile",
              // Only pass location if it's a non-default value (not "US" country code)
              // checkSERP defaults to "United States" which is the correct DataForSEO location_name
              location: kw.location && kw.location !== "US" ? kw.location : undefined,
            });

            if (result.data) {
              // Insert rank record
              await supabase.from("keyword_ranks").insert({
                keyword_id: kw.id,
                position: result.data.position,
                url: result.data.url,
                serp_features: result.data.serp_features,
              });

              // Update keyword with latest position
              const { data: latestRanks } = await supabase
                .from("keyword_ranks")
                .select("position")
                .eq("keyword_id", kw.id)
                .order("checked_at", { ascending: false })
                .limit(2);

              const currentPosition = latestRanks?.[0]?.position ?? null;
              const previousPosition = latestRanks?.[1]?.position ?? null;

              await supabase
                .from("keywords")
                .update({
                  current_position: currentPosition,
                  previous_position: previousPosition,
                })
                .eq("id", kw.id);

              // Log the API call
              await logAPICall({
                provider: "dataforseo",
                endpoint: "/serp/google/organic/live/advanced",
                method: "POST",
                is_success: true,
                cost_usd: 0.002,
                project_id: project.id,
              });

              totalChecked++;
            } else if (result.error) {
              totalErrors++;
              if (!firstError) firstError = result.error;
              console.error(`[rank-check] Keyword "${kw.keyword}" error: ${result.error}`);
              // If API key missing, stop processing this project
              if (result.error.includes("not configured")) {
                return;
              }
            }
          } catch (err) {
            totalErrors++;
            const msg = err instanceof Error ? err.message : "Unknown error";
            if (!firstError) firstError = msg;
            console.error(`[rank-check] Keyword "${kw.keyword}" exception: ${msg}`);
          }
        })
      );
    }
  }

  // Mark job as completed
  const errorDetail = firstError
    ? `${totalErrors} keyword(s) failed. First error: ${firstError.slice(0, 400)}`
    : null;

  if (jobId) {
    await supabase.from("job_queue").update({
      status: totalErrors > 0 && totalChecked === 0 ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      payload: { totalChecked, totalErrors, firstError: firstError?.slice(0, 300) || null },
      last_error: errorDetail,
    }).eq("id", jobId);
  }

  return NextResponse.json({
    message: "Rank check complete.",
    checked: totalChecked,
    errors: totalErrors,
    firstError: firstError || undefined,
  });
}
