"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

/**
 * Manually trigger a cron job from the System Health page.
 * Creates a job_queue entry and calls the cron endpoint internally.
 */
export async function triggerCronJob(
  jobType: "rank_check" | "send_reports"
): Promise<{ error: string } | { success: true; message: string }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4001";
  const cronSecret = process.env.CRON_SECRET;

  const endpoint =
    jobType === "rank_check"
      ? `${appUrl}/api/cron/rank-check`
      : `${appUrl}/api/cron/send-reports`;

  try {
    const headers: Record<string, string> = {};
    if (cronSecret) {
      headers.authorization = `Bearer ${cronSecret}`;
    }

    const res = await fetch(endpoint, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(60000),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? `Cron returned ${res.status}` };
    }

    revalidatePath("/admin/health");

    if (jobType === "rank_check") {
      if (data.skipped) {
        return { success: true, message: data.message ?? "Rank check skipped — DataForSEO not configured." };
      }
      const msg = `Rank check complete. ${data.checked ?? 0} keywords checked, ${data.errors ?? 0} errors.`;
      if (data.firstError) {
        return { error: `${msg}\n\nFirst error: ${data.firstError}` };
      }
      return { success: true, message: msg };
    }

    return {
      success: true,
      message: `Reports processed: ${data.processed ?? 0}/${data.total ?? 0}.`,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to trigger cron job.",
    };
  }
}

/**
 * Clear completed/failed jobs older than N days.
 */
export async function clearOldJobs(
  olderThanDays: number = 30
): Promise<{ error: string } | { success: true; deleted: number }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from("job_queue")
    .delete()
    .in("status", ["completed", "failed"])
    .lt("created_at", cutoff.toISOString())
    .select("id");

  if (error) return { error: error.message };

  revalidatePath("/admin/health");
  return { success: true, deleted: data?.length ?? 0 };
}
