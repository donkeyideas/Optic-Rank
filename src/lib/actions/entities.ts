"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  extractEntitiesFromKeywords,
  extractEntitiesFromContent,
  analyzeEntityGaps,
} from "@/lib/ai/entity-extractor";
import { searchKnowledgeGraph } from "@/lib/google/knowledge-graph";

/**
 * Extract entities from a project's keywords and content pages.
 * Uses DeepSeek AI to identify named entities.
 */
export async function extractProjectEntities(
  projectId: string
): Promise<{ error: string } | { success: true; extracted: number }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Get project domain
    const { data: project } = await supabase
      .from("projects")
      .select("domain")
      .eq("id", projectId)
      .single();

    const domain = project?.domain ?? "unknown";

    // Fetch keywords and content pages in parallel
    const [{ data: keywords }, { data: contentPages }] = await Promise.all([
      supabase
        .from("keywords")
        .select("keyword")
        .eq("project_id", projectId)
        .limit(50),
      supabase
        .from("content_pages")
        .select("id, title, url, target_keywords")
        .eq("project_id", projectId)
        .limit(30),
    ]);

    const kwList = (keywords ?? []).map((k) => k.keyword);
    const pages = (contentPages ?? []).map((p) => ({
      title: p.title ?? "",
      url: p.url ?? "",
      primaryKeyword: p.target_keywords?.[0] ?? null,
    }));

    if (kwList.length === 0 && pages.length === 0) {
      return { error: "No keywords or content pages found. Add data first." };
    }

    // Extract entities from both sources in parallel
    const [keywordEntities, contentEntities] = await Promise.all([
      kwList.length > 0 ? extractEntitiesFromKeywords(kwList, domain) : [],
      pages.length > 0 ? extractEntitiesFromContent(pages) : [],
    ]);

    // Merge and deduplicate by name+type
    const entityMap = new Map<string, typeof keywordEntities[0]>();
    for (const e of [...keywordEntities, ...contentEntities]) {
      const key = `${e.name.toLowerCase()}:${e.type}`;
      const existing = entityMap.get(key);
      if (!existing || e.relevance > existing.relevance) {
        entityMap.set(key, e);
      }
    }

    const merged = Array.from(entityMap.values());

    if (merged.length === 0) {
      return { error: "AI could not extract any entities. Try adding more keywords." };
    }

    // Upsert entities
    let insertedCount = 0;
    for (const entity of merged) {
      const { error } = await supabase.from("entities").upsert(
        {
          project_id: projectId,
          name: entity.name,
          entity_type: entity.type,
          description: entity.description,
          relevance_score: entity.relevance,
          source: "ai_extraction",
          wikipedia_url: entity.wikipediaUrl ?? null,
        },
        { onConflict: "project_id,name,entity_type" }
      );
      if (!error) insertedCount++;
    }

    // Enrich top entities via Knowledge Graph API
    const topEntities = merged.slice(0, 20);
    for (const entity of topEntities) {
      try {
        const kgResults = await searchKnowledgeGraph(entity.name, undefined, 1);
        if (kgResults.length > 0) {
          const kg = kgResults[0];
          await supabase
            .from("entities")
            .update({
              source: "knowledge_graph",
              knowledge_panel_data: {
                kgId: kg.kgId,
                types: kg.types,
                description: kg.description,
                detailedDescription: kg.detailedDescription,
                image: kg.image,
                url: kg.url,
                resultScore: kg.resultScore,
              },
              wikipedia_url: kg.wikipediaUrl ?? entity.wikipediaUrl ?? null,
            })
            .eq("project_id", projectId)
            .eq("name", entity.name)
            .eq("entity_type", entity.type);
        }
      } catch {
        // KG enrichment failed for this entity — non-critical
      }
    }

    // Update entity coverage on content pages
    if (contentPages && contentPages.length > 0) {
      const totalEntities = merged.length || 1;
      for (const page of contentPages) {
        // Simple coverage estimate: entities mentioning page keywords / total entities
        const pageKeywords = page.target_keywords ?? [];
        const relevantEntities = merged.filter((e) =>
          pageKeywords.some(
            (kw: string) =>
              e.name.toLowerCase().includes(kw.toLowerCase()) ||
              e.description.toLowerCase().includes(kw.toLowerCase())
          )
        );
        const coverage = Math.round((relevantEntities.length / totalEntities) * 100) / 100;
        await supabase
          .from("content_pages")
          .update({ entity_coverage: coverage })
          .eq("id", page.id);
      }
    }

    revalidatePath("/dashboard/entities");
    revalidatePath("/dashboard/content");
    return { success: true, extracted: insertedCount };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to extract entities.",
    };
  }
}

/**
 * Run entity gap analysis comparing project entities vs competitor landscape.
 */
export async function runEntityGapAnalysis(
  projectId: string
): Promise<{ error: string } | { success: true; gaps: number; recommendations: string[] }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  try {
    // Fetch project entities, competitors, and keywords
    const [{ data: entities }, { data: competitors }, { data: keywords }] = await Promise.all([
      supabase.from("entities").select("name").eq("project_id", projectId),
      supabase.from("competitors").select("domain").eq("project_id", projectId),
      supabase.from("keywords").select("keyword").eq("project_id", projectId).limit(30),
    ]);

    const entityNames = (entities ?? []).map((e) => e.name);
    const competitorDomains = (competitors ?? []).map((c) => c.domain);
    const kwList = (keywords ?? []).map((k) => k.keyword);

    const gapResult = await analyzeEntityGaps(entityNames, competitorDomains, kwList);

    // Insert missing entities as suggestions
    let gapsInserted = 0;
    for (const entity of gapResult.missingEntities) {
      const { error } = await supabase.from("entities").upsert(
        {
          project_id: projectId,
          name: entity.name,
          entity_type: entity.type,
          description: `[GAP] ${entity.description}`,
          relevance_score: entity.relevance,
          source: "ai_extraction",
        },
        { onConflict: "project_id,name,entity_type" }
      );
      if (!error) gapsInserted++;
    }

    revalidatePath("/dashboard/entities");
    return {
      success: true,
      gaps: gapsInserted,
      recommendations: gapResult.recommendations,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to run gap analysis.",
    };
  }
}

/**
 * Delete an entity.
 */
export async function deleteEntity(
  entityId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("entities").delete().eq("id", entityId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/entities");
  return { success: true };
}

/**
 * Enrich a single entity with Knowledge Graph data.
 */
export async function enrichEntityWithKG(
  entityId: string
): Promise<{ error: string } | { success: true; matched: boolean }> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { data: entity } = await supabase
    .from("entities")
    .select("id, name, entity_type")
    .eq("id", entityId)
    .single();

  if (!entity) return { error: "Entity not found." };

  try {
    const kgResults = await searchKnowledgeGraph(entity.name, undefined, 1);
    if (kgResults.length === 0) {
      return { success: true, matched: false };
    }

    const kg = kgResults[0];
    await supabase
      .from("entities")
      .update({
        source: "knowledge_graph",
        knowledge_panel_data: {
          kgId: kg.kgId,
          types: kg.types,
          description: kg.description,
          detailedDescription: kg.detailedDescription,
          image: kg.image,
          url: kg.url,
          resultScore: kg.resultScore,
        },
        wikipedia_url: kg.wikipediaUrl ?? null,
      })
      .eq("id", entityId);

    revalidatePath("/dashboard/entities");
    return { success: true, matched: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "KG enrichment failed." };
  }
}
