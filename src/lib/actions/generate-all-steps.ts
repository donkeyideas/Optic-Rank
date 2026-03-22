export interface StepResult {
  status: "done" | "error";
  message: string;
}

export interface StepDef {
  key: string;
  name: string;
  phase: number;
}

/**
 * Steps grouped into phases. Steps within the same phase run in PARALLEL.
 * Phases run sequentially (phase 1 must finish before phase 2 starts).
 *
 * Phase 1: Data collection (can all run at once — independent external APIs)
 * Phase 2: Enrichment (depends on Phase 1 data)
 * Phase 3: AI analysis (all independent, run in parallel with concurrency)
 * Phase 4: External platform sync (ASO + Social — independent)
 * Phase 5: Final reports (depends on all above data)
 */
export const GENERATE_ALL_STEPS: StepDef[] = [
  // Phase 1: Data Collection & Crawling (parallel)
  { key: "data-collection", name: "Data Collection", phase: 1 },
  { key: "site-audit", name: "Site Audit", phase: 1 },
  { key: "backlinks", name: "Backlink Discovery & Analysis", phase: 1 },

  // Phase 2: Enrichment (parallel, depends on Phase 1)
  { key: "keyword-enrichment", name: "Keyword Enrichment", phase: 2 },
  { key: "competitor-enrichment", name: "Competitor Enrichment", phase: 2 },

  // Phase 3: AI Generation (parallel with concurrency limit)
  { key: "keywords", name: "AI Keywords", phase: 3 },
  { key: "competitors", name: "AI Competitors", phase: 3 },
  { key: "content-score", name: "Content Scoring", phase: 3 },
  { key: "content-decay", name: "Content Decay Detection", phase: 3 },
  { key: "cannibalization", name: "Cannibalization Detection", phase: 3 },
  { key: "content-briefs", name: "Content Briefs", phase: 3 },
  { key: "content-calendar", name: "Content Calendar", phase: 3 },
  { key: "internal-links", name: "Internal Link Suggestions", phase: 3 },
  { key: "entities", name: "Entity Extraction", phase: 3 },
  { key: "predictions", name: "Rank Predictions", phase: 3 },
  { key: "visibility", name: "LLM Visibility Check", phase: 3 },
  { key: "geo-analysis", name: "GEO Readiness Scoring", phase: 3 },

  // Phase 4: External Platform Sync (parallel)
  { key: "aso-sync", name: "App Store Full Sync", phase: 4 },
  { key: "social-intel", name: "Social Intelligence", phase: 4 },

  // Phase 5: Intelligence Reports (parallel, depends on all above)
  { key: "insights", name: "AI Insights", phase: 5 },
  { key: "brief", name: "AI Intelligence Brief", phase: 5 },
  { key: "recommendations", name: "Smart Recommendations", phase: 5 },
] as const;

export type StepKey = (typeof GENERATE_ALL_STEPS)[number]["key"];

/** Get the maximum phase number */
export const MAX_PHASE = Math.max(...GENERATE_ALL_STEPS.map((s) => s.phase));

/** Get steps for a specific phase */
export function getPhaseSteps(phase: number): StepDef[] {
  return GENERATE_ALL_STEPS.filter((s) => s.phase === phase);
}

/** Phase labels */
export const PHASE_LABELS: Record<number, string> = {
  1: "Data Collection",
  2: "Enrichment",
  3: "AI Analysis",
  4: "Platform Sync",
  5: "Reports",
};
