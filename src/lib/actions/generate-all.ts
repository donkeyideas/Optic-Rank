"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import { generateKeywordsAI } from "./keywords";
import { generateCompetitorsAI } from "./competitors";
import { generateInsightsForProject } from "./insights";
import { generateBrief } from "./briefs";
import { runVisibilityCheck } from "./ai-visibility";
import { extractProjectEntities } from "./entities";
import { generatePredictions } from "./predictions";
import { scoreContentPages, detectContentDecay, detectCannibalization, suggestInternalLinks } from "./content";
import { runGeoAnalysis } from "./optimization";
import type { StepResult, StepKey } from "./generate-all-steps";

/**
 * Run a single AI generation step. Called by the client one at a time
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
      case "insights":
        result = (await generateInsightsForProject(projectId)) as typeof result;
        break;
      case "brief":
        result = (await generateBrief(projectId, "on_demand")) as typeof result;
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
    if ("atRisk" in result) msgs.push(`${result.atRisk} at risk`);
    if ("groups" in result) msgs.push(`${result.groups} groups`);
    if ("suggestions" in result) msgs.push(`${result.suggestions} suggestions`);
    if ("extracted" in result) msgs.push(`${result.extracted} extracted`);
    if ("predicted" in result) msgs.push(`${result.predicted} predicted`);
    if ("checksRun" in result) msgs.push(`${result.checksRun} checks`);
    if ("briefId" in result) msgs.push("Brief created");
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
  revalidatePath("/dashboard/ai-insights");
  revalidatePath("/dashboard/ai-briefs");
  revalidatePath("/dashboard/ai-visibility");
  revalidatePath("/dashboard/entities");
  revalidatePath("/dashboard/predictions");
  revalidatePath("/dashboard/advanced-ai");
  revalidatePath("/dashboard/optimization");
}
