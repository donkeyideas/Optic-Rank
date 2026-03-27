/**
 * Google Knowledge Graph Search API Client
 *
 * Free API (same key as PageSpeed Insights).
 * Returns structured data about entities from Google's Knowledge Graph.
 */

const KG_API_URL = "https://kgsearch.googleapis.com/v1/entities:search";

export interface KGEntity {
  kgId: string;
  name: string;
  types: string[];
  description: string | null;
  detailedDescription: string | null;
  image: string | null;
  url: string | null;
  wikipediaUrl: string | null;
  resultScore: number;
}

/**
 * Search the Knowledge Graph for entities matching a query.
 */
export async function searchKnowledgeGraph(
  query: string,
  types?: string[],
  limit = 5
): Promise<KGEntity[]> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    console.warn("[KG] PAGESPEED_API_KEY not set — Knowledge Graph unavailable");
    return [];
  }

  const params = new URLSearchParams({
    query,
    key: apiKey,
    limit: String(limit),
    indent: "false",
  });

  if (types && types.length > 0) {
    params.set("types", types.join(","));
  }

  try {
    const res = await fetch(`${KG_API_URL}?${params}`);
    if (!res.ok) return [];

    const data = await res.json();
    const elements = data.itemListElement ?? [];

    return elements.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el: any): KGEntity => {
        const result = el.result ?? {};
        const detailed = result.detailedDescription ?? {};
        return {
          kgId: result["@id"] ?? "",
          name: result.name ?? "",
          types: result["@type"] ?? [],
          description: result.description ?? null,
          detailedDescription: detailed.articleBody ?? null,
          image: result.image?.contentUrl ?? null,
          url: result.url ?? null,
          wikipediaUrl: detailed.url ?? null,
          resultScore: el.resultScore ?? 0,
        };
      }
    );
  } catch (err) {
    console.error("[KG] Search failed:", err);
    return [];
  }
}
