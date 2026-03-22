"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateCompetitorSuggestions } from "@/lib/ai/generate-competitors";
import { estimateCompetitorMetrics } from "@/lib/competitors/enrichment";

/**
 * Enrich a single competitor with estimated metrics.
 */
async function enrichCompetitor(competitorId: string, domain: string) {
  const supabase = createAdminClient();
  const metrics = estimateCompetitorMetrics(domain);

  // Update the competitor record directly
  await supabase
    .from("competitors")
    .update({
      authority_score: metrics.authority_score,
      organic_traffic: metrics.organic_traffic,
      keywords_count: metrics.keywords_count,
      backlinks_count: metrics.backlinks_count,
    })
    .eq("id", competitorId);

  // Also create a snapshot for historical tracking
  const today = new Date().toISOString().split("T")[0];
  await supabase.from("competitor_snapshots").upsert(
    {
      competitor_id: competitorId,
      authority_score: metrics.authority_score,
      organic_traffic: metrics.organic_traffic,
      keywords_count: metrics.keywords_count,
      backlinks_count: metrics.backlinks_count,
      snapshot_date: today,
    },
    { onConflict: "competitor_id,snapshot_date" }
  );
}

/**
 * Enrich all competitors for a project that are missing metrics.
 */
async function enrichAllCompetitors(projectId: string) {
  const supabase = createAdminClient();

  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, domain, authority_score")
    .eq("project_id", projectId)
    .is("authority_score", null);

  if (!competitors || competitors.length === 0) return;

  for (const comp of competitors) {
    await enrichCompetitor(comp.id, comp.domain);
  }
}

/**
 * Add a competitor to a project.
 * Auto-enriches with estimated metrics.
 */
export async function addCompetitor(
  projectId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const name = formData.get("name") as string;
  const domain = formData.get("domain") as string;

  if (!name || !domain) {
    return { error: "Competitor name and domain are required." };
  }

  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  const supabase = createAdminClient();
  const { data: inserted, error } = await supabase.from("competitors").insert({
    project_id: projectId,
    name,
    domain: cleanDomain,
    url: formData.get("url") as string | null,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This competitor domain is already being tracked." };
    }
    return { error: error.message };
  }

  // Auto-enrich with estimated metrics
  if (inserted?.id) {
    await enrichCompetitor(inserted.id, cleanDomain);
  }

  revalidatePath("/dashboard/competitors");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * AI-generate competitor suggestions for a project.
 * Auto-enriches with estimated metrics.
 */
export async function generateCompetitorsAI(
  projectId: string
): Promise<{ error: string } | { success: true; added: number; source: string }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  // Get the project name and domain
  const { data: project } = await supabase
    .from("projects")
    .select("name, domain")
    .eq("id", projectId)
    .single();

  if (!project?.domain) return { error: "Project has no domain configured." };

  // Get existing competitor domains
  const { data: existing } = await supabase
    .from("competitors")
    .select("domain")
    .eq("project_id", projectId);

  const existingDomains = (existing ?? []).map((c) => c.domain);

  const result = await generateCompetitorSuggestions(
    project.domain,
    existingDomains,
    5,
    project.name
  );

  if (result.competitors.length === 0) {
    return { error: "Could not generate competitor suggestions. Try adding them manually." };
  }

  // Insert all suggested competitors
  const rows = result.competitors.map((c) => ({
    project_id: projectId,
    name: c.name,
    domain: c.domain,
  }));

  const { error } = await supabase.from("competitors").insert(rows);

  if (error) return { error: error.message };

  // Auto-enrich all newly added competitors
  await enrichAllCompetitors(projectId);

  revalidatePath("/dashboard/competitors");
  revalidatePath("/dashboard");
  return { success: true, added: result.competitors.length, source: result.source };
}

/**
 * Remove a competitor by ID.
 */
export async function removeCompetitor(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/competitors");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Manually trigger enrichment for all competitors in a project.
 */
export async function enrichProjectCompetitors(
  projectId: string
): Promise<{ error: string } | { success: true; enriched: number }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: competitors } = await supabase
    .from("competitors")
    .select("id, domain")
    .eq("project_id", projectId);

  if (!competitors || competitors.length === 0) return { error: "No competitors to enrich." };

  for (const comp of competitors) {
    await enrichCompetitor(comp.id, comp.domain);
  }

  revalidatePath("/dashboard/competitors");
  revalidatePath("/dashboard");
  return { success: true, enriched: competitors.length };
}
