import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PDFSectionTitle, PDFStatCard, PDFTable, s, colors } from "../editorial-template";

interface KeywordRow {
  keyword: string;
  position: number | null;
  previous_position: number | null;
  search_volume: number | null;
  difficulty: number | null;
  url: string | null;
}

interface KeywordStats {
  total: number;
  top3: number;
  top10: number;
  avgPosition: number;
}

export function KeywordsSection({
  keywords,
  stats,
}: {
  keywords: KeywordRow[];
  stats: KeywordStats;
}) {
  const rows = keywords.slice(0, 30).map((k) => {
    const change = k.previous_position && k.position
      ? k.previous_position - k.position
      : 0;
    const changeStr = change > 0 ? `+${change}` : change < 0 ? `${change}` : "—";
    return [
      k.keyword,
      k.position ?? "—",
      changeStr,
      k.search_volume?.toLocaleString() ?? "—",
      k.difficulty ?? "—",
    ];
  });

  return (
    <View>
      <PDFSectionTitle>Keyword Rankings</PDFSectionTitle>

      <View style={[s.row, s.gap8, s.mb16]}>
        <PDFStatCard label="Total Keywords" value={stats.total} />
        <PDFStatCard label="Top 3" value={stats.top3} />
        <PDFStatCard label="Top 10" value={stats.top10} />
        <PDFStatCard label="Avg. Position" value={stats.avgPosition.toFixed(1)} />
      </View>

      <PDFTable
        headers={["Keyword", "Position", "Change", "Volume", "KD"]}
        rows={rows}
        widths={[200, 55, 50, 65, 40]}
      />

      {keywords.length > 30 ? (
        <Text style={[s.muted, { marginTop: 4 }]}>
          Showing top 30 of {keywords.length} tracked keywords.
        </Text>
      ) : null}
    </View>
  );
}

export function buildKeywordRows(rawKeywords: Record<string, unknown>[]): KeywordRow[] {
  return rawKeywords.map((k) => ({
    keyword: String(k.keyword ?? ""),
    position: typeof k.current_position === "number" ? k.current_position : null,
    previous_position: typeof k.previous_position === "number" ? k.previous_position : null,
    search_volume: typeof k.search_volume === "number" ? k.search_volume : null,
    difficulty: typeof k.difficulty === "number" ? k.difficulty : null,
    url: null,
  }));
}

export function buildKeywordStats(keywords: KeywordRow[]): KeywordStats {
  const positions = keywords
    .map((k) => k.position)
    .filter((p): p is number => p !== null);
  return {
    total: keywords.length,
    top3: positions.filter((p) => p <= 3).length,
    top10: positions.filter((p) => p <= 10).length,
    avgPosition: positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0,
  };
}
