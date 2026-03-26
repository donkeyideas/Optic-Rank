"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildDashboardData, toVolumeSnapshot } from "@/lib/dashboard/build-snapshot";

/**
 * Create a weekly volume snapshot for a single project.
 * Called by the cron job for each active project.
 */
export async function createVolumeForProject(projectId: string): Promise<{
  success: boolean;
  volumeNumber?: number;
  error?: string;
}> {
  const supabase = createAdminClient();

  // Determine previous week boundaries (Monday-Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun,1=Mon...6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const prevMonday = new Date(now);
  prevMonday.setDate(now.getDate() + mondayOffset - 7);
  const prevSunday = new Date(prevMonday);
  prevSunday.setDate(prevMonday.getDate() + 6);

  const weekStartStr = prevMonday.toISOString().split("T")[0];
  const weekEndStr = prevSunday.toISOString().split("T")[0];

  // Check if volume already exists for this week
  const { data: existing } = await supabase
    .from("dashboard_volumes")
    .select("id")
    .eq("project_id", projectId)
    .eq("week_start", weekStartStr)
    .maybeSingle();

  if (existing) {
    return { success: true, error: "Volume already exists for this week" };
  }

  // Determine next volume number
  const { data: lastVol } = await supabase
    .from("dashboard_volumes")
    .select("volume_number")
    .eq("project_id", projectId)
    .order("volume_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVolumeNumber = (lastVol?.volume_number ?? 0) + 1;

  // Get project metadata for authority score fallback
  const { data: project } = await supabase
    .from("projects")
    .select("domain, name, authority_score")
    .eq("id", projectId)
    .single();

  // Build dashboard data snapshot
  const data = await buildDashboardData(projectId, supabase, project ?? undefined);
  const snapshot = toVolumeSnapshot(data);

  // Insert the volume
  const { error } = await supabase.from("dashboard_volumes").insert({
    project_id: projectId,
    volume_number: nextVolumeNumber,
    week_start: weekStartStr,
    week_end: weekEndStr,
    authority_score: data.authorityScore,
    organic_traffic: data.currentEstTraffic,
    keywords_ranked: data.rankedPositions.length,
    backlinks_total: data.headlineStats.find((s) => s.label === "Backlinks")?.value !== "--"
      ? parseInt(String(data.headlineStats.find((s) => s.label === "Backlinks")?.value).replace(/,/g, ""), 10) || null
      : null,
    health_score: data.healthScore || null,
    ai_visibility_avg: data.visibilityStats.avgScore || null,
    snapshot,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, volumeNumber: nextVolumeNumber };
}

/**
 * Create volumes for all active projects. Used by the cron job.
 */
export async function createAllVolumes(): Promise<{
  processed: number;
  created: number;
  errors: string[];
}> {
  const supabase = createAdminClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("is_active", true);

  if (!projects || projects.length === 0) {
    return { processed: 0, created: 0, errors: [] };
  }

  let created = 0;
  const errors: string[] = [];

  for (const project of projects) {
    try {
      const result = await createVolumeForProject(project.id);
      if (result.success && result.volumeNumber) {
        created++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${project.id}: ${msg}`);
    }
  }

  return { processed: projects.length, created, errors };
}
