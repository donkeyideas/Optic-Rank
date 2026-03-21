/**
 * Cron API route for weekly data collection refresh.
 * Loops all active projects and refreshes keyword suggestions,
 * PageSpeed data, and traffic estimates.
 * Scheduled: 4 AM every Monday (vercel.json).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  collectKeywordSuggestions,
  collectPageSpeed,
  collectTrafficEstimate,
} from "@/lib/actions/collect";

export const maxDuration = 300;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Create a pending job record
  const { data: job } = await supabase
    .from("job_queue")
    .insert({ job_type: "collect_data", status: "pending", payload: {} })
    .select("id")
    .single();
  const jobId = job?.id;

  // Get all active projects
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, domain, name")
    .eq("is_active", true);

  if (error) {
    console.error("[collect-data cron] Query error:", error.message);
    if (jobId) {
      await supabase.from("job_queue").update({
        status: "failed",
        completed_at: new Date().toISOString(),
        last_error: error.message,
        payload: { processed: 0 },
      }).eq("id", jobId);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!projects || projects.length === 0) {
    if (jobId) {
      await supabase.from("job_queue").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        payload: { processed: 0, message: "No active projects" },
      }).eq("id", jobId);
    }
    return NextResponse.json({ processed: 0, message: "No active projects." });
  }

  if (jobId) {
    await supabase.from("job_queue").update({
      status: "processing",
      locked_at: new Date().toISOString(),
    }).eq("id", jobId);
  }

  let processed = 0;
  const errors: string[] = [];

  // Process projects sequentially to avoid rate-limiting external APIs
  for (const project of projects) {
    try {
      console.log(`[collect-data cron] Processing project ${project.name ?? project.id}...`);

      const results = await Promise.allSettled([
        collectKeywordSuggestions(project.id),
        collectPageSpeed(project.id),
        collectTrafficEstimate(project.id),
      ]);

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        const msgs = failed.map((r) =>
          r.status === "rejected" ? (r.reason as Error)?.message ?? "Unknown" : ""
        );
        errors.push(`${project.id}: ${msgs.join(", ")}`);
      }

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[collect-data cron] Error for project ${project.id}:`, msg);
      errors.push(`${project.id}: ${msg}`);
    }
  }

  if (jobId) {
    await supabase.from("job_queue").update({
      status: errors.length > 0 && processed === 0 ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      payload: { processed, total: projects.length, errors: errors.length },
      last_error: errors.length > 0 ? errors.join("; ").slice(0, 500) : null,
    }).eq("id", jobId);
  }

  return NextResponse.json({
    processed,
    total: projects.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
