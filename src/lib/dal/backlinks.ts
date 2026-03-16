import { createClient } from "@/lib/supabase/server";
import type { Backlink } from "@/types";

interface GetBacklinksOptions {
  search?: string;
  linkType?: "dofollow" | "nofollow" | "ugc" | "sponsored";
  status?: "active" | "lost" | "new";
  limit?: number;
  offset?: number;
}

interface BacklinkStats {
  total: number;
  referringDomains: number;
  dofollowPct: number;
  toxicCount: number;
  newThisWeek: number;
}

interface BacklinkSnapshot {
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

/**
 * Get paginated backlinks for a project with optional filters.
 */
export async function getBacklinks(
  projectId: string,
  opts: GetBacklinksOptions = {}
): Promise<{ data: Backlink[]; count: number }> {
  const { search, linkType, status, limit = 50, offset = 0 } = opts;
  const supabase = await createClient();

  let query = supabase
    .from("backlinks")
    .select(
      "id, project_id, source_url, source_domain, target_url, anchor_text, link_type, domain_authority, trust_flow, citation_flow, is_toxic, first_seen, last_seen, status",
      { count: "exact" }
    )
    .eq("project_id", projectId);

  if (search) {
    query = query.or(
      `source_url.ilike.%${search}%,source_domain.ilike.%${search}%,anchor_text.ilike.%${search}%`
    );
  }

  if (linkType) {
    query = query.eq("link_type", linkType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("first_seen", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { data: [], count: 0 };

  return { data: data as Backlink[], count: count ?? 0 };
}

/**
 * Get aggregate backlink statistics for a project.
 */
export async function getBacklinkStats(
  projectId: string
): Promise<BacklinkStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("backlinks")
    .select("id, source_domain, link_type, is_toxic, status, first_seen")
    .eq("project_id", projectId);

  if (error || !data) {
    return {
      total: 0,
      referringDomains: 0,
      dofollowPct: 0,
      toxicCount: 0,
      newThisWeek: 0,
    };
  }

  const total = data.length;
  const uniqueDomains = new Set(data.map((b) => b.source_domain));
  const referringDomains = uniqueDomains.size;
  const dofollowCount = data.filter((b) => b.link_type === "dofollow").length;
  const dofollowPct = total > 0 ? (dofollowCount / total) * 100 : 0;
  const toxicCount = data.filter((b) => b.is_toxic).length;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newThisWeek = data.filter(
    (b) => new Date(b.first_seen) >= oneWeekAgo
  ).length;

  return { total, referringDomains, dofollowPct, toxicCount, newThisWeek };
}

/**
 * Get historical backlink snapshots for a project, ordered by date.
 */
export async function getBacklinkSnapshots(
  projectId: string
): Promise<BacklinkSnapshot[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("backlink_snapshots")
    .select(
      "id, project_id, total_backlinks, referring_domains, new_backlinks, lost_backlinks, avg_domain_authority, snapshot_date, created_at"
    )
    .eq("project_id", projectId)
    .order("snapshot_date", { ascending: true });

  if (error || !data) return [];

  return data as BacklinkSnapshot[];
}
