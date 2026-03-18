export interface StepResult {
  status: "done" | "error";
  message: string;
}

/** All step definitions (name + key) */
export const GENERATE_ALL_STEPS = [
  // Phase 1: Data Collection & Crawling
  { key: "data-collection", name: "Data Collection" },
  { key: "site-audit", name: "Site Audit" },
  { key: "backlinks", name: "Backlink Discovery & Analysis" },

  // Phase 2: Enrichment
  { key: "keyword-enrichment", name: "Keyword Enrichment" },
  { key: "competitor-enrichment", name: "Competitor Enrichment" },

  // Phase 3: AI Generation
  { key: "keywords", name: "AI Keywords" },
  { key: "competitors", name: "AI Competitors" },
  { key: "content-score", name: "Content Scoring" },
  { key: "content-decay", name: "Content Decay Detection" },
  { key: "cannibalization", name: "Cannibalization Detection" },
  { key: "content-briefs", name: "Content Briefs" },
  { key: "content-calendar", name: "Content Calendar" },
  { key: "internal-links", name: "Internal Link Suggestions" },
  { key: "entities", name: "Entity Extraction" },
  { key: "predictions", name: "Rank Predictions" },
  { key: "visibility", name: "LLM Visibility Check" },
  { key: "geo-analysis", name: "GEO Readiness Scoring" },

  // Phase 4: App Store Full Sync
  { key: "aso-sync", name: "App Store Full Sync" },

  // Phase 5: Social Intelligence
  { key: "social-intel", name: "Social Intelligence" },

  // Phase 6: Intelligence Reports
  { key: "insights", name: "AI Insights" },
  { key: "brief", name: "AI Intelligence Brief" },
] as const;

export type StepKey = (typeof GENERATE_ALL_STEPS)[number]["key"];
