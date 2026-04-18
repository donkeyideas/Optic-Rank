import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

// ── Scheduled Reports ───────────────────────────────────────────────────────

export interface ScheduledReport {
  id: string;
  project_id: string;
  name: string;
  schedule: "daily" | "weekly" | "monthly";
  recipients: string[];
  sections: string[];
  last_sent_at: string | null;
  next_send_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export function useScheduledReports(projectId: string | undefined) {
  return useQuery({
    queryKey: ["scheduledReports", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ScheduledReport[]> => {
      const { data, error } = await supabase
        .from("scheduled_reports")
        .select(
          "id, project_id, name, schedule, recipients, sections, last_sent_at, next_send_at, is_active, created_by, created_at"
        )
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data ?? []) as ScheduledReport[];
    },
  });
}

// ── Audit History (for Reports) ─────────────────────────────────────────────

export function useAuditHistory(projectId: string | undefined) {
  return useQuery({
    queryKey: ["auditHistory", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_audits")
        .select(
          "id, project_id, status, pages_crawled, issues_found, health_score, seo_score, performance_score, accessibility_score, started_at, completed_at"
        )
        .eq("project_id", projectId!)
        .order("started_at", { ascending: false });

      if (error) return [];
      return data ?? [];
    },
  });
}

// ── Backlink Snapshots (for Reports charts) ─────────────────────────────────

export interface BacklinkSnapshot {
  id: string;
  project_id: string;
  total_backlinks: number;
  referring_domains: number;
  new_backlinks: number;
  lost_backlinks: number;
  avg_domain_authority: number | null;
  snapshot_date: string;
  created_at: string;
}

export function useBacklinkSnapshots(projectId: string | undefined) {
  return useQuery({
    queryKey: ["backlinkSnapshots", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<BacklinkSnapshot[]> => {
      const { data, error } = await supabase
        .from("backlink_snapshots")
        .select(
          "id, project_id, total_backlinks, referring_domains, new_backlinks, lost_backlinks, avg_domain_authority, snapshot_date, created_at"
        )
        .eq("project_id", projectId!)
        .order("snapshot_date", { ascending: true });

      if (error) return [];
      return (data ?? []) as BacklinkSnapshot[];
    },
  });
}
