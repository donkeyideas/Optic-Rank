"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getPageSpeedData } from "@/lib/api/pagespeed";
import { processPageSpeedAudit } from "@/lib/actions/audit-utils";

/**
 * Run a new site audit for a project.
 * Fetches PageSpeed data, creates a site_audits record with full scores,
 * and generates audit_issues for any failing metrics.
 */
export async function runSiteAudit(
  projectId: string
): Promise<{ error: string } | { success: true }> {
  // Verify the user is authenticated
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Use admin client for DB operations (bypasses RLS)
  const supabase = createAdminClient();

  // Get the project URL/domain
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, domain, url")
    .eq("id", projectId)
    .single();

  if (projectError || !project) return { error: "Project not found." };

  const targetUrl =
    project.url || (project.domain ? `https://${project.domain}` : null);

  if (!targetUrl) return { error: "Project has no URL or domain configured." };

  // Create the audit record in crawling state
  const { data: audit, error: auditInsertError } = await supabase
    .from("site_audits")
    .insert({
      project_id: projectId,
      status: "crawling",
      pages_crawled: 0,
      issues_found: 0,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (auditInsertError || !audit) {
    return { error: auditInsertError?.message ?? "Failed to create audit record." };
  }

  // Call PageSpeed Insights API
  const pageSpeedResult = await getPageSpeedData(targetUrl, "mobile");

  if (pageSpeedResult.error || !pageSpeedResult.data) {
    // Mark audit as failed
    await supabase
      .from("site_audits")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", audit.id);

    revalidatePath("/dashboard/site-audit");
    return { error: pageSpeedResult.error ?? "Failed to fetch PageSpeed data." };
  }

  // Process the CWV data into full audit with scores + issues
  try {
    await processPageSpeedAudit(supabase, projectId, pageSpeedResult.data, audit.id, targetUrl);
  } catch (err) {
    await supabase
      .from("site_audits")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", audit.id);

    revalidatePath("/dashboard/site-audit");
    return { error: err instanceof Error ? err.message : "Audit processing failed." };
  }

  revalidatePath("/dashboard/site-audit");
  revalidatePath("/dashboard");
  return { success: true };
}
