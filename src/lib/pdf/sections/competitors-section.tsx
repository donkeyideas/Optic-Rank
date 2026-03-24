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
    c.visibilityScore.toFixed(0),
    c.totalKeywords.toLocaleString(),
    c.commonKeywords.toLocaleString(),
  ]);

  return (
    <View>
      <PDFSectionTitle>Competitor Analysis</PDFSectionTitle>

      {rows.length > 0 ? (
        <PDFTable
          headers={["Competitor", "Authority", "Keywords", "Organic Traffic"]}
          rows={rows}
          widths={[180, 70, 80, 100]}
        />
      ) : (
        <Text style={s.muted}>No competitor data available.</Text>
      )}
    </View>
  );
}

export function buildCompetitorRows(raw: Record<string, unknown>[]): CompetitorRow[] {
  return raw.map((c) => ({
    domain: String(c.domain ?? c.name ?? "—"),
    visibilityScore: typeof c.authority_score === "number" ? c.authority_score : 0,
    totalKeywords: typeof c.keywords_count === "number" ? c.keywords_count : 0,
    avgPosition: 0,
    commonKeywords: typeof c.organic_traffic === "number" ? c.organic_traffic : 0,
  }));
}
