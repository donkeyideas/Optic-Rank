"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateCompetitorSuggestions } from "@/lib/ai/generate-competitors";
import { estimateCompetitorMetrics } from "@/lib/competitors/enrichment";
import { aiChat } from "@/lib/ai/ai-provider";

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
    return { error: result.failReason ?? "Could not generate competitor suggestions. Try adding them manually." };
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

// ─── Site Explorer: Competitor Page Analysis ────────────────────────────────

/**
 * Analyze a competitor's top pages and keywords using AI estimation.
 * Provides a deep-dive "site explorer" view for a single competitor.
 */
export async function analyzeCompetitorPages(
  projectId: string,
  competitorId: string
): Promise<
  | { error: string }
  | {
      success: true;
      topPages: Array<{
        urlPath: string;
        estimatedTraffic: number;
        topKeyword: string;
        title: string;
      }>;
      topKeywords: Array<{
        keyword: string;
        estimatedPosition: number;
        volume: number;
        difficulty: number;
      }>;
      summary: string;
    }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Fetch the competitor to get their domain
    const { data: competitor } = await supabase
      .from("competitors")
      .select("id, domain, name")
      .eq("id", competitorId)
      .eq("project_id", projectId)
      .single();

    if (!competitor) return { error: "Competitor not found." };

    // Fetch your project's keywords for context
    const { data: keywords } = await supabase
      .from("keywords")
      .select("keyword, search_volume, difficulty")
      .eq("project_id", projectId)
      .limit(30);

    const kwList = (keywords ?? [])
      .map((k) => `"${k.keyword}" (vol: ${k.search_volume ?? "?"})`)
      .join(", ");

    const prompt = `You are an SEO competitive intelligence analyst. Analyze the competitor domain "${competitor.domain}" (${competitor.name}).

${kwList ? `The user's project tracks these keywords: ${kwList}` : "No project keywords available for context."}

Estimate the following for "${competitor.domain}":

1. **Top 10 Pages**: The most likely high-traffic pages on this domain. For each page provide:
   - urlPath: the URL path (e.g., "/blog/seo-guide")
   - estimatedTraffic: estimated monthly organic visits (number)
   - topKeyword: the primary keyword this page likely ranks for
   - title: the likely page title

2. **Top 10 Keywords**: Keywords this competitor most likely ranks for. For each:
   - keyword: the keyword phrase
   - estimatedPosition: estimated Google position (1-100)
   - volume: estimated monthly search volume
   - difficulty: keyword difficulty score (0-100)

3. **Content Strategy Summary**: A 2-3 sentence summary of their content strategy.

Return ONLY valid JSON in this format:
{
  "topPages": [...],
  "topKeywords": [...],
  "summary": "..."
}`;

    const result = await aiChat(prompt, {
      jsonMode: true,
      maxTokens: 2000,
      temperature: 0.5,
      timeout: 90000,
      context: { feature: "competitor-analysis" },
    });

    if (!result?.text) return { error: "AI analysis returned no results. All providers may be unavailable or timed out." };

    const parsed = JSON.parse(result.text);

    revalidatePath("/dashboard/competitors");
    return {
      success: true,
      topPages: parsed.topPages ?? [],
      topKeywords: parsed.topKeywords ?? [],
      summary: parsed.summary ?? "",
    };
  } catch (err) {
    console.error("[analyzeCompetitorPages] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to analyze competitor pages.",
    };
  }
}

// ─── PPC Intelligence ───────────────────────────────────────────────────────

/**
 * Analyze the PPC landscape for all competitors in a project.
 * Estimates ad spend, paid keywords, and PPC strategy for each competitor.
 */
export async function analyzeCompetitorPPC(
  projectId: string
): Promise<
  | { error: string }
  | {
      success: true;
      competitors: Array<{
        name: string;
        domain: string;
        estimatedMonthlySpend: string;
        topPaidKeywords: Array<{ keyword: string; estimatedCPC: number }>;
        adCopyThemes: string[];
        ppcStrategySummary: string;
      }>;
      overallInsights: string;
    }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Fetch competitors for the project (cap at 15 for AI token limits)
    const { data: allCompetitors } = await supabase
      .from("competitors")
      .select("id, name, domain")
      .eq("project_id", projectId)
      .limit(15);

    if (!allCompetitors || allCompetitors.length === 0) {
      return { error: "No competitors to analyze. Add competitors first." };
    }

    // Fetch your project domain for context
    const { data: project } = await supabase
      .from("projects")
      .select("domain, name")
      .eq("id", projectId)
      .single();

    if (!project?.domain) return { error: "Project has no domain configured." };

    const competitorList = allCompetitors
      .map((c) => `- ${c.name} (${c.domain})`)
      .join("\n");

    const prompt = `You are a PPC (Pay-Per-Click) advertising intelligence analyst. Analyze the PPC landscape for these competitors of "${project.domain}" (${project.name}):

${competitorList}

For EACH competitor, estimate:
1. estimatedMonthlySpend: A range string like "$5,000 - $15,000"
2. topPaidKeywords: The top 3 keywords they likely bid on, with estimated CPC (cost per click in USD)
3. adCopyThemes: 2-3 themes/angles they likely use in ad copy
4. ppcStrategySummary: A 1-2 sentence summary of their PPC approach

Also provide an "overallInsights" string (2-3 sentences) comparing the PPC landscape and opportunities for "${project.domain}".

Return ONLY valid JSON in this format:
{
  "competitors": [
    {
      "name": "...",
      "domain": "...",
      "estimatedMonthlySpend": "$X - $Y",
      "topPaidKeywords": [{"keyword": "...", "estimatedCPC": 2.50}],
      "adCopyThemes": ["..."],
      "ppcStrategySummary": "..."
    }
  ],
  "overallInsights": "..."
}`;

    const result = await aiChat(prompt, {
      jsonMode: true,
      maxTokens: 4000,
      temperature: 0.5,
      timeout: 120000,
      context: { feature: "competitor-ppc" },
    });

    if (!result?.text) return { error: "AI analysis returned no results. All providers may be unavailable or timed out." };

    const parsed = JSON.parse(result.text);

    revalidatePath("/dashboard/competitors");
    return {
      success: true,
      competitors: parsed.competitors ?? [],
      overallInsights: parsed.overallInsights ?? "",
    };
  } catch (err) {
    console.error("[analyzeCompetitorPPC] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to analyze PPC landscape.",
    };
  }
}
