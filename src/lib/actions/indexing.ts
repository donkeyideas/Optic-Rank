"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  submitUrlForIndexing,
  submitBatchForIndexing,
  type IndexingAction,
} from "@/lib/google/indexing";

const DAILY_QUOTA = 200;

/**
 * Request indexing for one or more URLs.
 */
export async function requestIndexing(
  projectId: string,
  urls: string[],
  action: IndexingAction = "URL_UPDATED"
): Promise<{ error: string } | { success: true; submitted: number; failed: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  if (urls.length === 0) return { error: "No URLs provided." };

  // Check daily quota
  const quota = await getIndexingQuota(projectId);
  if ("error" in quota) return quota;

  if (quota.remaining < urls.length) {
    return {
      error: `Daily quota exceeded. ${quota.remaining} of ${DAILY_QUOTA} URLs remaining today. Requested: ${urls.length}.`,
    };
  }

  const supabase = createAdminClient();

  // Submit URLs
  let submitted = 0;
  let failed = 0;

  if (urls.length === 1) {
    const result = await submitUrlForIndexing(urls[0], action);
    await supabase.from("indexing_submissions").insert({
      project_id: projectId,
      url: urls[0],
      action,
      status: result.success ? "submitted" : "error",
      error_message: result.error ?? null,
      notify_time: result.notifyTime ?? null,
      submitted_by: user.id,
    });
    if (result.success) submitted++;
    else failed++;
  } else {
    const results = await submitBatchForIndexing(urls, action);
    const rows = results.map((r) => ({
      project_id: projectId,
      url: r.url,
      action,
      status: r.success ? "submitted" : "error",
      error_message: r.error ?? null,
      notify_time: r.notifyTime ?? null,
      submitted_by: user.id,
    }));
    await supabase.from("indexing_submissions").insert(rows);
    submitted = results.filter((r) => r.success).length;
    failed = results.filter((r) => !r.success).length;
  }

  revalidatePath("/dashboard/site-audit");
  return { success: true, submitted, failed };
}

/**
 * Get remaining daily quota for a project.
 */
export async function getIndexingQuota(
  projectId: string
): Promise<{ error: string } | { used: number; remaining: number; total: number }> {
  const supabase = createAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("indexing_submissions")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("submitted_at", todayStart.toISOString());

  if (error) return { error: error.message };

  const used = count ?? 0;
  return { used, remaining: Math.max(0, DAILY_QUOTA - used), total: DAILY_QUOTA };
}

/**
 * Get recent indexing submissions for a project.
 */
export async function getIndexingHistory(
  projectId: string,
  limit = 20
): Promise<
  Array<{
    id: string;
    url: string;
    action: string;
    status: string;
    error_message: string | null;
    submitted_at: string;
  }>
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("indexing_submissions")
    .select("id, url, action, status, error_message, submitted_at")
    .eq("project_id", projectId)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as Array<{
    id: string;
    url: string;
    action: string;
    status: string;
    error_message: string | null;
    submitted_at: string;
  }>;
}
