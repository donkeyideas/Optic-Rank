/**
 * Cron API route for weekly backlink monitoring.
 * Re-discovers backlinks and detects new/lost links for all active projects.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { discoverBacklinks, detectNewLostLinks } from "@/lib/actions/backlinks";

export const maxDuration = 300;

export async function GET(request: Request) {
  // Verify cron secret (skip in dev)
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
    .insert({ job_type: "backlink_check", status: "pending", payload: {} })
    .select("id")
    .single();

  const jobId = job?.id;

  try {
    // Get all active projects
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, domain")
      .eq("is_active", true);

    if (error || !projects || projects.length === 0) {
      if (jobId) {
        await supabase
          .from("job_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", jobId);
      }
      return NextResponse.json({ message: "No active projects", count: 0 });
    }

    let discoveredTotal = 0;
    let newLinks = 0;
    let lostLinks = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        // Phase 1: Discover new backlinks
        const discoverResult = await discoverBacklinks(project.id);
        if ("success" in discoverResult) {
          discoveredTotal += discoverResult.discovered;
        }

        // Phase 2: Detect new/lost link status changes
        const detectResult = await detectNewLostLinks(project.id);
        if ("success" in detectResult) {
          newLinks += detectResult.newLinks;
          lostLinks += detectResult.lostLinks;
        }
      } catch (err) {
        console.error(`[cron/backlink-check] Error for project ${project.id}:`, err);
        errorCount++;
      }
    }

    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          payload: {
            projects: projects.length,
            discovered: discoveredTotal,
            newLinks,
            lostLinks,
            errors: errorCount,
          },
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      message: `Processed ${projects.length} projects`,
      discovered: discoveredTotal,
      newLinks,
      lostLinks,
      errors: errorCount,
    });
  } catch (err) {
    console.error("[cron/backlink-check] Fatal error:", err);

    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          payload: { error: err instanceof Error ? err.message : String(err) },
        })
        .eq("id", jobId);
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
