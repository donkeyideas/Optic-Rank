import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";
import { SocialIntelligenceClient } from "./social-intelligence-client";
import {
  getSocialProfiles,
  getSocialMetrics,
  getAllLatestAnalyses,
  getSocialCompetitors,
  getSocialGoals,
} from "@/lib/dal/social-intelligence";
import { checkPlanLimit } from "@/lib/stripe/plan-gate";

export default async function SocialIntelligencePage() {
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
        icon={Users}
        title="Organization Required"
        description="Set up your organization first to use Social Intelligence."
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
        icon={Users}
        title="No Active Project"
        description="Create a project first to track social media profiles."
        actionLabel="Go to Settings"
        actionHref="/dashboard/settings"
      />
    );
  }

  // Fetch all social profiles for the active project
  const socialProfiles = await getSocialProfiles(project.id);

  // Fetch data for all profiles in parallel
  const [allMetrics, allAnalyses, allCompetitors, allGoals] = await Promise.all([
    Promise.all(socialProfiles.map((sp) => getSocialMetrics(sp.id, 30))),
    Promise.all(socialProfiles.map((sp) => getAllLatestAnalyses(sp.id))),
    Promise.all(socialProfiles.map((sp) => getSocialCompetitors(sp.id))),
    Promise.all(socialProfiles.map((sp) => getSocialGoals(sp.id))),
  ]);

  // Build a map of profile ID → data
  const metricsMap: Record<string, Awaited<ReturnType<typeof getSocialMetrics>>> = {};
  const analysesMap: Record<string, Awaited<ReturnType<typeof getAllLatestAnalyses>>> = {};
  const competitorsMap: Record<string, Awaited<ReturnType<typeof getSocialCompetitors>>> = {};
  const goalsMap: Record<string, Awaited<ReturnType<typeof getSocialGoals>>> = {};

  socialProfiles.forEach((sp, i) => {
    metricsMap[sp.id] = allMetrics[i];
    analysesMap[sp.id] = allAnalyses[i];
    competitorsMap[sp.id] = allCompetitors[i];
    goalsMap[sp.id] = allGoals[i];
  });

  // Fetch org limits for plan gating (uses superadmin bypass)
  const planCheck = await checkPlanLimit(profile.organization_id, "social_profiles", 0);

  return (
    <SocialIntelligenceClient
      profiles={socialProfiles}
      metricsMap={metricsMap}
      analysesMap={analysesMap}
      competitorsMap={competitorsMap}
      goalsMap={goalsMap}
      projectId={project.id}
      maxProfiles={planCheck.limit}
      plan={planCheck.plan}
    />
  );
}
