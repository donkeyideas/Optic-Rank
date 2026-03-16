export interface StepResult {
  status: "done" | "error";
  message: string;
}

/** All step definitions (name + key) */
export const GENERATE_ALL_STEPS = [
  { key: "keywords", name: "AI Keywords" },
  { key: "competitors", name: "AI Competitors" },
  { key: "content-score", name: "Content Scoring" },
  { key: "content-decay", name: "Content Decay Detection" },
  { key: "cannibalization", name: "Cannibalization Detection" },
  { key: "internal-links", name: "Internal Link Suggestions" },
  { key: "entities", name: "Entity Extraction" },
  { key: "predictions", name: "Rank Predictions" },
  { key: "visibility", name: "LLM Visibility Check" },
  { key: "geo-analysis", name: "GEO Readiness Scoring" },
  { key: "insights", name: "AI Insights" },
  { key: "brief", name: "AI Intelligence Brief" },
] as const;

export type StepKey = (typeof GENERATE_ALL_STEPS)[number]["key"];
