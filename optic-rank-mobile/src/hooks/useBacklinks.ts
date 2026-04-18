import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface BacklinkStats {
  total: number;
  referringDomains: number;
  dofollowPct: number;
  toxicCount: number;
  newThisWeek: number;
}

/**
 * Fetch aggregate backlink statistics using server-side counts.
 */
export function useBacklinkStats(projectId: string | undefined) {
  return useQuery<BacklinkStats>({
    queryKey: ["backlinkStats", projectId],
    queryFn: async () => {
      if (!projectId) {
        return { total: 0, referringDomains: 0, dofollowPct: 0, toxicCount: 0, newThisWeek: 0 };
      }

      // Run parallel count queries instead of fetching all rows
      const [totalRes, dofollowRes, toxicRes, newRes] = await Promise.all([
        supabase
          .from("backlinks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("backlinks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("link_type", "dofollow"),
        supabase
          .from("backlinks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .eq("is_toxic", true),
        supabase
          .from("backlinks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .gte("first_seen", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const total = totalRes.count ?? 0;
      const dofollowCount = dofollowRes.count ?? 0;
      const toxicCount = toxicRes.count ?? 0;
      const newThisWeek = newRes.count ?? 0;
      const dofollowPct = total > 0 ? (dofollowCount / total) * 100 : 0;

      // Get unique referring domains count
      const { data: domainData } = await supabase
        .from("backlinks")
        .select("source_domain")
        .eq("project_id", projectId)
        .limit(1000);

      const referringDomains = new Set(domainData?.map((b) => b.source_domain) ?? []).size;

      return { total, referringDomains, dofollowPct, toxicCount, newThisWeek };
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
  });
}
