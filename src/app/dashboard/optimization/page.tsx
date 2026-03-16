import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { DollarSign } from "lucide-react";
import { OptimizationClient } from "./optimization-client";
import {
  getConversionGoals,
  getKeywordsWithRevenue,
  getCroStats,
} from "@/lib/dal/optimization";

export default async function OptimizationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return (
      <EmptyState
        icon={DollarSign}
        title="Organization Required"
        description="Set up your organization first to use Optimization features."
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
    .single();

  if (!project) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No Active Project"
        description="Create a project first to use Optimization features."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  const projectDomain = project.domain ?? project.name;

  // Fetch CRO data
  const conversionGoals = await getConversionGoals(project.id);
  const keywordsWithRevenue = await getKeywordsWithRevenue(project.id, conversionGoals);
  const croStats = await getCroStats(project.id, conversionGoals, keywordsWithRevenue);

  // Keyword stats for funnel
  const { data: allKeywords } = await supabase
    .from("keywords")
    .select("id, keyword, current_position, search_volume, intent")
    .eq("project_id", project.id)
    .eq("is_active", true);

  const keywords = allKeywords ?? [];

  return (
    <OptimizationClient
      projectId={project.id}
      projectDomain={projectDomain}
      conversionGoals={conversionGoals}
      keywordsWithRevenue={keywordsWithRevenue}
      croStats={croStats}
      keywords={keywords}
    />
  );
}
