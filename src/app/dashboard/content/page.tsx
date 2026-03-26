import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";
import { ContentClient } from "./content-client";
import { scoreContent } from "@/lib/ai/score-content";

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
  let [contentPagesRes, contentBriefsRes, calendarRes, keywordsRes] = await Promise.all([
    supabase.from("content_pages").select("*").eq("project_id", project.id),
    supabase.from("content_briefs").select("*").eq("project_id", project.id),
    supabase.from("content_calendar").select("*").eq("project_id", project.id).order("target_date", { ascending: true }),
    supabase.from("keywords").select("id, keyword, search_volume, current_position").eq("project_id", project.id).eq("is_active", true).not("current_position", "is", null),
  ]);

  // Auto-populate content_pages from latest site audit if empty
  if (!contentPagesRes.data || contentPagesRes.data.length === 0) {
    const { data: latestAudit } = await supabase
      .from("site_audits")
      .select("id")
      .eq("project_id", project.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAudit) {
      const { data: auditPages } = await supabase
        .from("audit_pages")
        .select("url, title, word_count, status_code")
        .eq("audit_id", latestAudit.id)
        .eq("status_code", 200);

      if (auditPages && auditPages.length > 0) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        await admin.from("content_pages").insert(
          auditPages.map((ap) => ({
            project_id: project.id,
            url: ap.url,
            title: ap.title ?? null,
            word_count: ap.word_count ?? null,
            status: "published" as const,
          }))
        );
        // Re-fetch after populating
        contentPagesRes = await supabase
          .from("content_pages")
          .select("*")
          .eq("project_id", project.id);
      }
    }
  }

  // Auto-score any content pages that don't have a content_score yet
  const unscoredPages = (contentPagesRes.data ?? []).filter((p) => p.content_score == null);
  if (unscoredPages.length > 0) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    await Promise.all(
      unscoredPages.map((page) => {
        const scores = scoreContent({
          url: page.url,
          title: page.title,
          wordCount: page.word_count,
          primaryKeyword: page.primary_keyword,
        });
        return admin
          .from("content_pages")
          .update({
            content_score: scores.contentScore,
            readability_score: scores.readabilityScore,
            freshness_score: scores.freshnessScore,
          })
          .eq("id", page.id);
      })
    );
    // Re-fetch so the client receives the updated scores
    contentPagesRes = await supabase
      .from("content_pages")
      .select("*")
      .eq("project_id", project.id);
  }

  // Build estimated traffic for content pages
  const CTR: Record<number, number> = { 1: 0.284, 2: 0.155, 3: 0.11, 4: 0.081, 5: 0.062, 6: 0.047, 7: 0.038, 8: 0.031, 9: 0.026, 10: 0.022 };
  const getCtr = (pos: number) => (pos >= 1 && pos <= 10 ? CTR[pos] ?? 0.005 : pos > 10 ? 0.005 : 0);

  const keywords = keywordsRes.data ?? [];
  const kwIds = keywords.map((k) => k.id);
  const urlTrafficMap = new Map<string, number>();

  if (kwIds.length > 0) {
    // Strategy 1: Match via keyword_ranks URL field (if available)
    const { data: ranks } = await supabase
      .from("keyword_ranks")
      .select("keyword_id, position, url")
      .in("keyword_id", kwIds)
      .not("url", "is", null)
      .order("checked_at", { ascending: false });

    const kwMap = new Map<string, { search_volume: number }>();
    for (const kw of keywords) {
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

    // Strategy 2: If no content pages matched any keyword_ranks URLs,
    // distribute total keyword traffic proportionally by word count
    const pages = contentPagesRes.data ?? [];
    const pageUrls = new Set(pages.map((p) => p.url));
    const hasMatchingPages = [...urlTrafficMap.keys()].some((u) => pageUrls.has(u));
    if (!hasMatchingPages) {
      urlTrafficMap.clear();
      // Calculate total estimated site traffic from all ranked keywords
      let totalTraffic = 0;
      for (const kw of keywords) {
        if (!kw.current_position || !kw.search_volume) continue;
        totalTraffic += Math.round(kw.search_volume * getCtr(kw.current_position));
      }

      if (totalTraffic > 0 && pages.length > 0) {
        // Weight by word count — pages with more content get more traffic share
        const totalWords = pages.reduce((sum, p) => sum + (p.word_count ?? 1), 0);
        for (const page of pages) {
          const weight = (page.word_count ?? 1) / totalWords;
          const pageTraffic = Math.max(1, Math.round(totalTraffic * weight));
          urlTrafficMap.set(page.url, pageTraffic);
        }
      }
    }
  }

  // Overlay real GA4 per-page traffic when available
  let ga4PageMap = new Map<string, number>();
  try {
    const { fetchGA4DashboardData } = await import("@/lib/actions/ga4-import");
    const ga4Data = await fetchGA4DashboardData(project.id);
    if (ga4Data.connected && ga4Data.topPages.length > 0) {
      for (const ga4Page of ga4Data.topPages) {
        const normalized = (ga4Page.path ?? "").replace(/\/$/, "") || "/";
        ga4PageMap.set(normalized, ga4Page.pageviews);
      }
    }
  } catch {
    // GA4 not available — continue with estimates
  }

  // Enrich content pages with estimated traffic, then overlay GA4 real data
  const contentPages = (contentPagesRes.data ?? []).map((page) => {
    // Check for GA4 real traffic first — extract path from full URL to match GA4 paths
    let pagePath = "/";
    try {
      pagePath = new URL(page.url ?? "").pathname.replace(/\/$/, "") || "/";
    } catch {
      pagePath = (page.url ?? "").replace(/\/$/, "") || "/";
    }
    const ga4Traffic = ga4PageMap.get(pagePath);
    if (ga4Traffic != null && ga4Traffic > 0) {
      return { ...page, organic_traffic: ga4Traffic, traffic_source: "ga4" as const };
    }

    // Fallback to existing value or estimated
    if (page.organic_traffic != null && page.organic_traffic > 0) return { ...page, traffic_source: "estimated" as const };
    const estTraffic = urlTrafficMap.get(page.url) ?? null;
    return estTraffic ? { ...page, organic_traffic: estTraffic, traffic_source: "estimated" as const } : { ...page, traffic_source: null };
  });

  return (
    <ContentClient
      contentPages={contentPages}
      contentBriefs={contentBriefsRes.data ?? []}
      calendarEntries={calendarRes.data ?? []}
      projectId={project.id}
      hasKeywords={kwIds.length > 0}
    />
  );
}
