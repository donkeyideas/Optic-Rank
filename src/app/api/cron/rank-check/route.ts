/**
 * Cron API route for daily keyword rank checking.
 * Called by Vercel Cron or external scheduler.
 * Checks ranks for all active project keywords using DataForSEO.
 * Falls back gracefully when API keys are missing.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkSERP } from "@/lib/api/dataforseo";
import { logAPICall } from "@/lib/api/api-logger";

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

  // Get all active projects with their domains
  const { data: projects } = await supabase
    .from("projects")
    .select("id, domain")
    .eq("is_active", true)
    .not("domain", "is", null);

  if (!projects || projects.length === 0) {
    return NextResponse.json({ message: "No active projects found.", checked: 0 });
  }

  let totalChecked = 0;
  let totalErrors = 0;

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
              // If API key missing, stop processing this project
              if (result.error.includes("not configured")) {
                return;
              }
            }
          } catch {
            totalErrors++;
          }
        })
      );
    }
  }

  // Log the cron job execution
  await supabase.from("job_queue").insert({
    job_type: "rank_check",
    status: totalErrors === 0 ? "completed" : "completed",
    payload: { totalChecked, totalErrors },
  });

  return NextResponse.json({
    message: "Rank check complete.",
    checked: totalChecked,
    errors: totalErrors,
  });
}
