"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { computeGeoScore, type GeoScoreInput } from "@/lib/ai/geo-scoring";

// ================================================================
// GEO Analysis
// ================================================================

export async function runGeoAnalysis(
  projectId: string
): Promise<{ scored: number; error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { scored: 0, error: "Not authenticated" };

  const supabase = createAdminClient();

  // 1. Get content pages
  const { data: pages } = await supabase
    .from("content_pages")
    .select("id, url, title, word_count, content_score, readability_score, entity_coverage")
    .eq("project_id", projectId);

  if (!pages || pages.length === 0) {
    return { scored: 0, error: "No content pages found" };
  }

  // 2. Get latest audit pages for schema info
  const { data: audit } = await supabase
    .from("site_audits")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let auditPagesMap = new Map<string, { has_schema: boolean }>();
  if (audit) {
    const { data: auditPages } = await supabase
      .from("audit_pages")
      .select("url, has_schema")
      .eq("audit_id", audit.id);

    for (const ap of auditPages ?? []) {
      auditPagesMap.set(ap.url, { has_schema: ap.has_schema });
    }
  }

  // 3. Get AI visibility checks aggregated per page
  const { data: visChecks } = await supabase
    .from("ai_visibility_checks")
    .select("citation_url, mentioned, keywords!inner(project_id)")
    .eq("keywords.project_id", projectId);

  const citationCounts = new Map<string, { cited: number; total: number }>();
  for (const check of visChecks ?? []) {
    const url = (check as Record<string, unknown>).citation_url as string | null;
    if (!url) continue;
    const existing = citationCounts.get(url) ?? { cited: 0, total: 0 };
    existing.total++;
    if ((check as Record<string, unknown>).mentioned) existing.cited++;
    citationCounts.set(url, existing);
  }

  // 4. Compute scores and upsert
  let scored = 0;
  for (const page of pages) {
    const auditPage = auditPagesMap.get(page.url);
    const citations = citationCounts.get(page.url) ?? { cited: 0, total: 0 };

    const input: GeoScoreInput = {
      contentScore: page.content_score ? Number(page.content_score) : null,
      readabilityScore: page.readability_score ? Number(page.readability_score) : null,
      entityCoverage: page.entity_coverage ? Number(page.entity_coverage) : null,
      wordCount: page.word_count,
      title: page.title,
      url: page.url,
      hasSchema: auditPage?.has_schema ?? false,
      hasCleanUrl: !page.url.includes("?") && !page.url.includes("#"),
      citationCount: citations.cited,
      totalChecks: citations.total,
    };

    const result = computeGeoScore(input);

    await supabase.from("geo_scores").upsert(
      {
        content_page_id: page.id,
        project_id: projectId,
        geo_score: result.geoScore,
        entity_score: result.entityScore,
        structure_score: result.structureScore,
        schema_score: result.schemaScore,
        ai_citation_score: result.aiCitationScore,
        recommendations: result.recommendations,
        scored_at: new Date().toISOString(),
      },
      { onConflict: "content_page_id" }
    );

    scored++;
  }

  revalidatePath("/dashboard/optimization");
  return { scored };
}

// ================================================================
// CRO Goal CRUD
// ================================================================

export async function createConversionGoal(
  projectId: string,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  const name = formData.get("name") as string;
  const goalType = formData.get("goal_type") as string;
  const targetUrl = (formData.get("target_url") as string) || null;
  const estimatedValue = parseFloat((formData.get("estimated_value") as string) || "0");
  const estimatedConversionRate = parseFloat(
    (formData.get("estimated_conversion_rate") as string) || "0.02"
  );

  if (!name || !goalType) return { error: "Name and goal type are required" };

  const { data, error } = await supabase
    .from("conversion_goals")
    .insert({
      project_id: projectId,
      name,
      goal_type: goalType,
      target_url: targetUrl,
      estimated_value: estimatedValue,
      estimated_conversion_rate: estimatedConversionRate,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/optimization");
  return { id: data.id };
}

export async function updateConversionGoal(
  goalId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = createAdminClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const name = formData.get("name") as string | null;
  if (name) updates.name = name;

  const goalType = formData.get("goal_type") as string | null;
  if (goalType) updates.goal_type = goalType;

  const targetUrl = formData.get("target_url");
  if (targetUrl !== null) updates.target_url = (targetUrl as string) || null;

  const value = formData.get("estimated_value") as string | null;
  if (value !== null) updates.estimated_value = parseFloat(value || "0");

  const rate = formData.get("estimated_conversion_rate") as string | null;
  if (rate !== null) updates.estimated_conversion_rate = parseFloat(rate || "0.02");

  const { error } = await supabase
    .from("conversion_goals")
    .update(updates)
    .eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/optimization");
  return {};
}

export async function deleteConversionGoal(
  goalId: string
): Promise<{ error?: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  const { error } = await supabase.from("conversion_goals").delete().eq("id", goalId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/optimization");
  return {};
}
