"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { predictKeywordRanks, type PredictionInput } from "@/lib/ai/rank-predictor";

/**
 * Generate rank predictions for all keywords in a project.
 * Uses historical rank data + statistical methods + AI narratives.
 */
export async function generatePredictions(
  projectId: string,
  horizonDays: number = 7
): Promise<{ error: string } | { success: true; predicted: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Fetch project domain for AI estimation
    const { data: project } = await supabase
      .from("projects")
      .select("domain, name")
      .eq("id", projectId)
      .single();

    const domain = project?.domain ?? project?.name ?? undefined;

    // Fetch keywords for project
    const { data: keywords, error: kwError } = await supabase
      .from("keywords")
      .select("id, keyword, current_position, search_volume, difficulty")
      .eq("project_id", projectId);

    if (kwError) {
      console.error("[generatePredictions] keywords query error:", kwError);
      return { error: `Failed to fetch keywords: ${kwError.message}` };
    }

    if (!keywords || keywords.length === 0) {
      return { error: "No keywords found. Add keywords first." };
    }

    // Fetch rank history for all keywords (last 90 days)
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const keywordIds = keywords.map((k) => k.id);

    const { data: ranks } = await supabase
      .from("keyword_ranks")
      .select("keyword_id, position, checked_at")
      .in("keyword_id", keywordIds)
      .gte("checked_at", since.toISOString())
      .order("checked_at", { ascending: true });

    // Group ranks by keyword
    const ranksByKeyword = new Map<string, Array<{ position: number | null; checked_at: string }>>();
    for (const r of ranks ?? []) {
      const existing = ranksByKeyword.get(r.keyword_id) ?? [];
      existing.push({ position: r.position, checked_at: r.checked_at });
      ranksByKeyword.set(r.keyword_id, existing);
    }

    // Build prediction inputs
    const inputs: PredictionInput[] = keywords.map((kw) => ({
      keywordId: kw.id,
      keyword: kw.keyword,
      currentPosition: kw.current_position,
      searchVolume: kw.search_volume,
      difficulty: kw.difficulty,
      rankHistory: ranksByKeyword.get(kw.id) ?? [],
      serpFeatures: [],
    }));

    // Run predictions (pass domain for AI-powered position estimation)
    const predictions = await predictKeywordRanks(inputs, horizonDays, domain);

    if (predictions.length === 0) {
      return { error: "Insufficient rank history data. Need at least 3 data points per keyword." };
    }

    // Upsert predictions — include current_position_estimate and direction in features_used
    const rows = predictions.map((p) => ({
      keyword_id: p.keywordId,
      predicted_position: p.predictedPosition,
      confidence: p.confidence,
      prediction_date: p.predictedFor.split("T")[0], // DATE column needs YYYY-MM-DD
      features_used: {
        ...p.featuresUsed,
        current_position_estimate: p.currentPosition,
        direction: p.direction,
      },
      model_version: "v1-lr-wma",
    }));

    const { error } = await supabase.from("rank_predictions").upsert(rows, {
      onConflict: "keyword_id,prediction_date",
      ignoreDuplicates: false,
    });

    if (error) {
      // If unique constraint issue, just insert
      const { error: insertError } = await supabase.from("rank_predictions").insert(rows);
      if (insertError) return { error: insertError.message };
    }

    revalidatePath("/dashboard/predictions");
    revalidatePath("/dashboard/advanced-ai");
    return { success: true, predicted: predictions.length };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to generate predictions.",
    };
  }
}

/**
 * Backfill actual positions for past predictions.
 * Compares predicted positions against what actually happened.
 */
export async function backfillPredictionActuals(
  projectId: string
): Promise<{ error: string } | { success: true; updated: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Get predictions where predicted_for is in the past and actual_position is null
    const { data: keywords } = await supabase
      .from("keywords")
      .select("id, current_position")
      .eq("project_id", projectId);

    if (!keywords) return { error: "No keywords found." };

    const keywordMap = new Map(keywords.map((k) => [k.id, k.current_position]));

    const { data: predictions } = await supabase
      .from("rank_predictions")
      .select("id, keyword_id, prediction_date")
      .in("keyword_id", keywords.map((k) => k.id))
      .is("actual_position", null)
      .lte("prediction_date", new Date().toISOString().split("T")[0]);

    if (!predictions || predictions.length === 0) {
      return { success: true, updated: 0 };
    }

    let updated = 0;
    for (const pred of predictions) {
      const actualPos = keywordMap.get(pred.keyword_id);
      if (actualPos != null) {
        await supabase
          .from("rank_predictions")
          .update({ actual_position: actualPos })
          .eq("id", pred.id);
        updated++;
      }
    }

    revalidatePath("/dashboard/predictions");
    revalidatePath("/dashboard/advanced-ai");
    return { success: true, updated };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to backfill actuals.",
    };
  }
}
