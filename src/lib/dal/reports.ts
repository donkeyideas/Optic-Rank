import { createClient } from "@/lib/supabase/server";

interface ScheduledReport {
  id: string;
  project_id: string;
  name: string;
  schedule: string;
  recipients: string[];
  sections: unknown;
  last_sent_at: string | null;
  next_send_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

/**
 * Get all scheduled reports for a project.
 */
export async function getScheduledReports(
  projectId: string
): Promise<ScheduledReport[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scheduled_reports")
    .select(
      "id, project_id, name, schedule, recipients, sections, last_sent_at, next_send_at, is_active, created_by, created_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data as ScheduledReport[];
}
