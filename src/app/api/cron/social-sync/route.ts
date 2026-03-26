/**
 * Cron API route for daily social profile sync.
 * Re-fetches stats from platform APIs for all tracked social profiles
 * and records daily metric snapshots for historical tracking.
 * Scheduled: 7 AM daily (vercel.json).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .insert({ job_type: "social_sync", status: "pending", payload: {} })
    .select("id")
    .single();
  const jobId = job?.id;

  if (jobId) {
    await supabase
      .from("job_queue")
      .update({
        status: "processing",
        locked_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  try {
    const { syncAllSocialProfiles } = await import(
      "@/lib/actions/social-intelligence"
    );
    const result = await syncAllSocialProfiles();

    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status:
            result.errors.length > 0 && result.processed === 0
              ? "failed"
              : "completed",
          completed_at: new Date().toISOString(),
          payload: {
            processed: result.processed,
            synced: result.synced,
            errors: result.errors.length,
          },
          last_error:
            result.errors.length > 0
              ? result.errors.join("; ").slice(0, 500)
              : null,
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      processed: result.processed,
      synced: result.synced,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          last_error: msg,
        })
        .eq("id", jobId);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
