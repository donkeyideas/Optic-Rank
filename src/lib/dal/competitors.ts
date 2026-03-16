import { createClient } from "@/lib/supabase/server";
import type { Competitor } from "@/types";

interface CompetitorSnapshot {
  id: string;
  competitor_id: string;
  authority_score: number | null;
  organic_traffic: number | null;
  keywords_count: number | null;
  backlinks_count: number | null;
  snapshot_date: string;
  created_at: string;
}

/**
 * Get all competitors for a project.
 */
export async function getCompetitors(
  projectId: string
): Promise<Competitor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitors")
    .select(
      "id, project_id, name, domain, authority_score, organic_traffic, keywords_count, created_at"
    )
    .eq("project_id", projectId)
    .order("authority_score", { ascending: false, nullsFirst: false });

  if (error || !data) return [];

  // The DB may not have organic_traffic/keywords_count directly on competitors.
  // We return whatever columns are available; the snapshot table has historical data.
  return data as Competitor[];
}

/**
 * Get historical snapshots for a specific competitor, ordered by date.
 */
export async function getCompetitorSnapshots(
  competitorId: string
): Promise<CompetitorSnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitor_snapshots")
    .select(
      "id, competitor_id, authority_score, organic_traffic, keywords_count, backlinks_count, snapshot_date, created_at"
    )
    .eq("competitor_id", competitorId)
    .order("snapshot_date", { ascending: true });

  if (error || !data) return [];

  return data as CompetitorSnapshot[];
}
