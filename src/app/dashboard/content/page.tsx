import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";
import { ContentClient } from "./content-client";

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return (
      <EmptyState
        icon={FileText}
        title="Organization Required"
        description="Set up your organization first to manage content."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return (
      <EmptyState
        icon={FileText}
        title="No Active Project"
        description="Create a project first to manage content."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch content pages, briefs, calendar, and keyword data in parallel
  const [contentPagesRes, contentBriefsRes, calendarRes, keywordsRes] = await Promise.all([
    supabase.from("content_pages").select("*").eq("project_id", project.id),
    supabase.from("content_briefs").select("*").eq("project_id", project.id),
    supabase.from("content_calendar").select("*").eq("project_id", project.id).order("target_date", { ascending: true }),
    supabase.from("keywords").select("id, search_volume, current_position").eq("project_id", project.id).eq("is_active", true).not("current_position", "is", null),
  ]);

  // Build keyword_ranks URL→traffic map to enrich content pages
  const CTR: Record<number, number> = { 1: 0.284, 2: 0.155, 3: 0.11, 4: 0.081, 5: 0.062, 6: 0.047, 7: 0.038, 8: 0.031, 9: 0.026, 10: 0.022 };
  const getCtr = (pos: number) => (pos >= 1 && pos <= 10 ? CTR[pos] ?? 0.005 : pos > 10 ? 0.005 : 0);

  // Fetch latest keyword_ranks to find which URLs rank for which keywords
  const kwIds = (keywordsRes.data ?? []).map((k) => k.id);
  let urlTrafficMap = new Map<string, number>();

  if (kwIds.length > 0) {
    const { data: ranks } = await supabase
      .from("keyword_ranks")
      .select("keyword_id, position, url")
      .in("keyword_id", kwIds)
      .not("url", "is", null)
      .order("checked_at", { ascending: false });

    // Use only the latest rank per keyword
    const kwMap = new Map<string, { search_volume: number }>();
    for (const kw of keywordsRes.data ?? []) {
      kwMap.set(kw.id, { search_volume: kw.search_volume ?? 0 });
    }

    const seenKw = new Set<string>();
    for (const rank of ranks ?? []) {
      if (seenKw.has(rank.keyword_id)) continue;
      seenKw.add(rank.keyword_id);
      const kw = kwMap.get(rank.keyword_id);
      if (!kw || !rank.url) continue;
      const traffic = Math.round(kw.search_volume * getCtr(rank.position));
      if (traffic > 0) {
        urlTrafficMap.set(rank.url, (urlTrafficMap.get(rank.url) ?? 0) + traffic);
      }
    }
  }

  // Enrich content pages with estimated traffic
  const contentPages = (contentPagesRes.data ?? []).map((page) => {
    if (page.organic_traffic != null && page.organic_traffic > 0) return page;
    const estTraffic = urlTrafficMap.get(page.url) ?? null;
    return estTraffic ? { ...page, organic_traffic: estTraffic } : page;
  });

  return (
    <ContentClient
      contentPages={contentPages}
      contentBriefs={contentBriefsRes.data ?? []}
      calendarEntries={calendarRes.data ?? []}
      projectId={project.id}
    />
  );
}
