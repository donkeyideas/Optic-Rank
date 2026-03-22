"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// AI Generation
import { generateKeywordsAI } from "./keywords";
import { generateCompetitorsAI } from "./competitors";
import { generateInsightsForProject } from "./insights";
import { generateBrief } from "./briefs";
import { generateRecommendations } from "./recommendations";
import { runVisibilityCheck } from "./ai-visibility";
import { extractProjectEntities } from "./entities";
import { generatePredictions } from "./predictions";
import { scoreContentPages, detectContentDecay, detectCannibalization, suggestInternalLinks, generateContentBriefs, generateCalendarEntries } from "./content";
import { runGeoAnalysis } from "./optimization";

// Data Collection & Enrichment
import { collectProjectData } from "./collect";
import { runSiteAudit } from "./site-audit";
import { discoverBacklinks, detectToxicLinks, detectNewLostLinks } from "./backlinks";
import { enrichProjectKeywords } from "./keywords";
import { enrichProjectCompetitors } from "./competitors";

// App Store Full Sync
import { runAsoFullSync } from "./app-store-generate";

// Social Intelligence
import { analyzeSocialProfile } from "./social-intelligence";
import { createAdminClient } from "@/lib/supabase/admin";

import type { StepResult, StepKey } from "./generate-all-steps";

/**
 * Run a single generation/sync step. Called by the client one at a time
 * so the progress modal can update after each step completes.
 */
export async function runGenerateStep(
  projectId: string,
  stepKey: StepKey
): Promise<StepResult> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return { status: "error", message: "Not authenticated" };
  }

  try {
    let result: Record<string, unknown> & { error?: string };

    switch (stepKey) {
      // Phase 1: Data Collection
      case "data-collection":
        await collectProjectData(projectId);
        result = { collectResults: true } as typeof result;
        break;
      case "site-audit":
        result = (await runSiteAudit(projectId)) as typeof result;
        break;
      case "backlinks": {
        // Run discovery first, then analysis
        const discoverResult = await discoverBacklinks(projectId);
        const discovered = "discovered" in discoverResult ? (discoverResult.discovered as number) : 0;
        // Run toxic + new/lost detection (fire-and-forget errors)
        let toxic = 0;
        let newFound = 0;
        let lost = 0;
        try {
          const toxicResult = await detectToxicLinks(projectId);
          if ("flagged" in toxicResult) toxic = toxicResult.flagged as number;
        } catch { /* optional */ }
        try {
          const nlResult = await detectNewLostLinks(projectId);
          if ("newLinks" in nlResult) newFound = nlResult.newLinks as number;
          if ("lostLinks" in nlResult) lost = nlResult.lostLinks as number;
        } catch { /* optional */ }
        result = { discovered, toxic, newFound, lost } as typeof result;
        break;
      }

      // Phase 2: Enrichment
      case "keyword-enrichment":
        result = (await enrichProjectKeywords(projectId)) as typeof result;
        break;
      case "competitor-enrichment":
        result = (await enrichProjectCompetitors(projectId)) as typeof result;
        break;

      // Phase 3: AI Generation
      case "keywords":
        result = (await generateKeywordsAI(projectId)) as typeof result;
        break;
      case "competitors":
        result = (await generateCompetitorsAI(projectId)) as typeof result;
        break;
      case "content-score":
        result = (await scoreContentPages(projectId)) as typeof result;
        break;
      case "content-decay":
        result = (await detectContentDecay(projectId)) as typeof result;
        break;
      case "cannibalization":
        result = (await detectCannibalization(projectId)) as typeof result;
        break;
      case "content-briefs":
        result = (await generateContentBriefs(projectId)) as typeof result;
        break;
      case "content-calendar":
        result = (await generateCalendarEntries(projectId)) as typeof result;
        break;
      case "internal-links":
        result = (await suggestInternalLinks(projectId)) as typeof result;
        break;
      case "entities":
        result = (await extractProjectEntities(projectId)) as typeof result;
        break;
      case "predictions":
        result = (await generatePredictions(projectId)) as typeof result;
        break;
      case "visibility":
        result = (await runVisibilityCheck(projectId)) as typeof result;
        break;
      case "geo-analysis":
        result = (await runGeoAnalysis(projectId)) as typeof result;
        break;

      // Phase 4: App Store Full Sync
      case "aso-sync":
        result = (await runAsoFullSync(projectId)) as typeof result;
        break;

      // Phase 5: Social Intelligence
      case "social-intel": {
        const adminClient = createAdminClient();
        const { data: socialProfiles } = await adminClient
          .from("social_profiles")
          .select("id")
          .eq("project_id", projectId);
        let analyzed = 0;
        if (socialProfiles && socialProfiles.length > 0) {
          const analysisTypes = [
            "growth", "content_strategy", "hashtags", "competitors",
            "insights", "earnings_forecast", "thirty_day_plan",
          ] as const;
          for (const sp of socialProfiles) {
            for (const aType of analysisTypes) {
              try {
                await analyzeSocialProfile(sp.id, aType);
                analyzed++;
              } catch { /* continue on error */ }
            }
          }
        }
        result = { analyzed, profiles: socialProfiles?.length ?? 0 } as typeof result;
        break;
      }

      // Phase 6: Intelligence
      case "insights":
        result = (await generateInsightsForProject(projectId)) as typeof result;
        break;
      case "brief":
        result = (await generateBrief(projectId, "on_demand")) as typeof result;
        break;
      case "recommendations":
        result = (await generateRecommendations(projectId)) as typeof result;
        break;

      default:
        return { status: "error", message: "Unknown step" };
    }

    if ("error" in result && result.error) {
      return { status: "error", message: result.error as string };
    }

    // Build summary message from result fields
    const msgs: string[] = [];
    if ("keywords" in result && Array.isArray(result.keywords))
      msgs.push(`${result.keywords.length} keywords`);
    if ("added" in result) msgs.push(`${result.added} added`);
    if ("generated" in result) msgs.push(`${result.generated} generated`);
    if ("scored" in result) msgs.push(`${result.scored} scored`);
    if ("enriched" in result) msgs.push(`${result.enriched} enriched`);
    if ("atRisk" in result) msgs.push(`${result.atRisk} at risk`);
    if ("groups" in result) msgs.push(`${result.groups} groups`);
    if ("suggestions" in result) msgs.push(`${result.suggestions} suggestions`);
    if ("extracted" in result) msgs.push(`${result.extracted} extracted`);
    if ("predicted" in result) msgs.push(`${result.predicted} predicted`);
    if ("checksRun" in result) msgs.push(`${result.checksRun} checks`);
    if ("briefId" in result) msgs.push("Brief created");
    if ("discovered" in result) msgs.push(`${result.discovered} discovered`);
    if ("toxic" in result && (result.toxic as number) > 0) msgs.push(`${result.toxic} toxic`);
    if ("newFound" in result && (result.newFound as number) > 0) msgs.push(`${result.newFound} new`);
    if ("lost" in result && (result.lost as number) > 0) msgs.push(`${result.lost} lost`);
    if ("analyzed" in result) msgs.push(`${result.analyzed} analyzed`);
    if ("refreshed" in result) msgs.push(`${result.refreshed} refreshed`);
    if ("pagesAudited" in result) msgs.push(`${result.pagesAudited} pages`);
    if ("issues" in result) msgs.push(`${result.issues} issues`);
    if ("collectResults" in result) msgs.push("Data collected");
    if ("profiles" in result && (result.profiles as number) > 0) msgs.push(`${result.profiles} profiles`);
    return { status: "done", message: msgs.join(", ") || "Done" };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Revalidate all dashboard paths after generation is complete.
 */
export async function revalidateAllDashboard() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/keywords");
  revalidatePath("/dashboard/competitors");
  revalidatePath("/dashboard/content");
  revalidatePath("/dashboard/backlinks");
  revalidatePath("/dashboard/site-audit");
  revalidatePath("/dashboard/ai-insights");
  revalidatePath("/dashboard/ai-briefs");
  revalidatePath("/dashboard/ai-visibility");
  revalidatePath("/dashboard/entities");
  revalidatePath("/dashboard/predictions");
  revalidatePath("/dashboard/advanced-ai");
  revalidatePath("/dashboard/optimization");
  revalidatePath("/dashboard/app-store");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/search-ai");
  revalidatePath("/dashboard/social-intelligence");
  revalidatePath("/dashboard/recommendations");
}
