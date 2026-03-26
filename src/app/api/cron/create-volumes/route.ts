/**
 * Cron API route for weekly dashboard volume creation.
 * Creates a snapshot of each project's dashboard state for the previous week.
 * Scheduled: Monday 2 AM (vercel.json).
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
    .insert({ job_type: "create_volumes", status: "pending", payload: {} })
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
    const { createAllVolumes } = await import("@/lib/actions/volumes");
    const result = await createAllVolumes();

    if (jobId) {
      await supabase
        .from("job_queue")
        .update({
          status:
            result.errors.length > 0 && result.created === 0
              ? "failed"
              : "completed",
          completed_at: new Date().toISOString(),
          payload: {
            processed: result.processed,
            created: result.created,
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
      created: result.created,
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
