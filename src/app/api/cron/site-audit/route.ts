/**
 * Cron API route for scheduled site audits.
 * Checks for due scheduled audits and runs them.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runSiteAudit } from "@/lib/actions/site-audit";

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
    .insert({ job_type: "scheduled_audit", status: "pending", payload: {} })
    .select("id")
    .single();

  const jobId = job?.id;

  try {
    // Find all due scheduled audits
    const { data: dueAudits, error } = await supabase
      .from("scheduled_audits")
      .select("id, project_id, frequency")
      .eq("is_active", true)
      .lte("next_run_at", new Date().toISOString());

    if (error || !dueAudits || dueAudits.length === 0) {
      if (jobId) {
        await supabase
          .from("job_queue")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", jobId);
      }
      return NextResponse.json({ message: "No audits due", count: 0 });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const audit of dueAudits) {
      try {
        const result = await runSiteAudit(audit.project_id);
        if ("error" in result) {
          console.error(`[cron/site-audit] Failed for project ${audit.project_id}: ${result.error}`);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`[cron/site-audit] Error for project ${audit.project_id}:`, err);
        errorCount++;
      }

      // Calculate next run time based on frequency
      const nextRun = calculateNextRun(audit.frequency);
      await supabase
        .from("scheduled_audits")
        .update({ next_run_at: nextRun.toISOString() })
        .eq("id", audit.id);
    }

    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          payload: { success: successCount, errors: errorCount },
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      message: `Processed ${dueAudits.length} scheduled audits`,
      success: successCount,
      errors: errorCount,
    });
  } catch (err) {
    console.error("[cron/site-audit] Fatal error:", err);

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

function calculateNextRun(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case "daily":
      now.setDate(now.getDate() + 1);
      break;
    case "weekly":
      now.setDate(now.getDate() + 7);
      break;
    case "biweekly":
      now.setDate(now.getDate() + 14);
      break;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      break;
    default:
      now.setDate(now.getDate() + 7);
  }
  // Set to 3 AM UTC
  now.setHours(3, 0, 0, 0);
  return now;
}
