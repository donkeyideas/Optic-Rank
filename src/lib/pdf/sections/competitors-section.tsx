import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PDFSectionTitle, PDFTable, s } from "../editorial-template";

interface CompetitorRow {
  domain: string;
  visibilityScore: number;
  totalKeywords: number;
  avgPosition: number;
  commonKeywords: number;
}

export function CompetitorsSection({
  competitors,
}: {
  competitors: CompetitorRow[];
}) {
  const rows = competitors.map((c) => [
    c.domain,
    c.visibilityScore.toFixed(1),
    c.totalKeywords,
    c.avgPosition.toFixed(1),
    c.commonKeywords,
  ]);

  return (
    <View>
      <PDFSectionTitle>Competitor Analysis</PDFSectionTitle>

      {rows.length > 0 ? (
        <PDFTable
          headers={["Competitor", "Visibility", "Keywords", "Avg Position", "Common KWs"]}
          rows={rows}
          widths={[160, 70, 65, 70, 70]}
        />
      ) : (
        <Text style={s.muted}>No competitor data available.</Text>
      )}
    </View>
  );
}

export function buildCompetitorRows(raw: Record<string, unknown>[]): CompetitorRow[] {
  return raw.map((c) => ({
    domain: String(c.competitor_domain ?? c.domain ?? "—"),
    visibilityScore: typeof c.visibility_score === "number" ? c.visibility_score : 0,
    totalKeywords: typeof c.total_keywords === "number" ? c.total_keywords : 0,
    avgPosition: typeof c.avg_position === "number" ? c.avg_position : 0,
    commonKeywords: typeof c.common_keywords === "number" ? c.common_keywords : 0,
  }));
}
