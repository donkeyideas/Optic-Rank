import { createClient } from "@/lib/supabase/server";
import type { DashboardVolume } from "@/types";

/**
 * Get a specific volume by volume number for a project.
 */
export async function getVolume(
  projectId: string,
  volumeNumber: number
): Promise<DashboardVolume | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dashboard_volumes")
    .select("*")
    .eq("project_id", projectId)
    .eq("volume_number", volumeNumber)
    .maybeSingle();
  if (!data) return null;
  return data as DashboardVolume;
}

/**
 * Get volume navigation info: min, max volume numbers and total count.
 */
export async function getVolumeNav(
  projectId: string
): Promise<{ min: number; max: number; count: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dashboard_volumes")
    .select("volume_number")
    .eq("project_id", projectId)
    .order("volume_number", { ascending: true });

  if (!data || data.length === 0) {
    return { min: 0, max: 0, count: 0 };
  }
  return {
    min: data[0].volume_number,
    max: data[data.length - 1].volume_number,
    count: data.length,
  };
}
