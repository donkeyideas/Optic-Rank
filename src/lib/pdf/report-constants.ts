/**
 * Shared report types and constants.
 * This file is safe to import from client components — it has
 * zero dependency on @react-pdf/renderer or Node.js modules.
 */

export type ReportTemplate = "full" | "keywords" | "backlinks" | "audit" | "executive" | "custom";

export type ReportSection = "executive" | "keywords" | "backlinks" | "audit" | "competitors" | "insights";

export const ALL_SECTIONS: { id: ReportSection; label: string }[] = [
  { id: "executive", label: "Overview & Scores" },
  { id: "keywords", label: "Keyword Rankings" },
  { id: "backlinks", label: "Backlinks" },
  { id: "audit", label: "Site Audit" },
  { id: "competitors", label: "Competitors" },
  { id: "insights", label: "AI Insights" },
];
