import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { FileSearch } from "lucide-react";
import { getOptimizablePages, getAllProjectKeywords, getLatestOptimizationScores } from "@/lib/dal/website-optimizer";
import { WebsiteOptimizerClient } from "./website-optimizer-client";

export default async function WebsiteOptimizerPage() {
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
        icon={FileSearch}
        title="Organization Required"
        description="Set up your organization first to optimize your website."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, domain")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!project) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No Active Project"
        description="Create a project first to optimize your website pages."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch pages, keywords, and optimization history in parallel
  const [pages, keywords, optimizationScores] = await Promise.all([
    getOptimizablePages(project.id),
    getAllProjectKeywords(project.id),
    getLatestOptimizationScores(project.id),
  ]);

  if (pages.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No Pages to Optimize"
        description="Run a site audit first to discover your pages. The optimizer needs crawl data to analyze your pages."
        actionLabel="Run Site Audit"
        actionHref="/dashboard/site-audit"
      />
    );
  }

  // Transform pages for the client
  const pagesData = pages.map((p) => ({
    url: p.url,
    title: p.title,
    metaDescription: p.meta_description,
    h1: p.h1,
    wordCount: p.word_count,
    loadTimeMs: p.load_time_ms,
    lcpMs: p.lcp_ms,
    cls: p.cls,
    hasSchema: p.has_schema,
    auditId: p.audit_id,
    issuesCount: p.issues_count,
  }));

  const keywordsData = keywords.map((k) => ({
    keyword: k.keyword,
    position: k.current_position as number | null,
    volume: k.search_volume as number | null,
    url: k.url as string | null,
  }));

  return (
    <WebsiteOptimizerClient
      projectId={project.id}
      projectName={project.name}
      projectDomain={project.domain}
      pages={pagesData}
      keywords={keywordsData}
      optimizationHistory={optimizationScores}
    />
  );
}
