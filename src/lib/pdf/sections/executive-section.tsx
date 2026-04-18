import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PDFSectionTitle, PDFStatCard, s, colors } from "../editorial-template";

interface ExecutiveSummary {
  projectName: string;
  domain: string | null;
  totalKeywords: number;
  avgPosition: number;
  top10Keywords: number;
  healthScore: number;
  totalBacklinks: number;
  referringDomains: number;
  aiVisibilityAvg: number;
  highPriorityInsights: number;
  highlights: string[];
}

export function ExecutiveSection({ data }: { data: ExecutiveSummary }) {
  return (
    <View>
      <PDFSectionTitle>Executive Summary</PDFSectionTitle>

      {data.domain ? (
        <Text style={[s.muted, s.mb8]}>{data.domain}</Text>
      ) : null}

      {/* Key metrics */}
      <View style={[s.row, s.gap8, s.mb8]}>
        <PDFStatCard label="Keywords Tracked" value={data.totalKeywords} />
        <PDFStatCard label="Avg Position" value={data.avgPosition.toFixed(1)} />
        <PDFStatCard label="Top 10" value={data.top10Keywords} />
        <PDFStatCard label="Health Score" value={`${data.healthScore}%`} />
      </View>

      <View style={[s.row, s.gap8, s.mb16]}>
        <PDFStatCard label="Total Backlinks" value={data.totalBacklinks.toLocaleString()} />
        <PDFStatCard label="Referring Domains" value={data.referringDomains.toLocaleString()} />
        <PDFStatCard label="Visibility" value={`${data.aiVisibilityAvg.toFixed(0)}%`} />
        <PDFStatCard label="High Priority" value={data.highPriorityInsights} />
      </View>

      {/* Highlights */}
      {data.highlights.length > 0 ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[s.bold, s.mb8]}>Key Highlights</Text>
          {data.highlights.map((h, i) => (
            <View key={i} style={[s.row, { marginBottom: 4 }]}>
              <Text style={{ fontSize: 9, marginRight: 6 }}>•</Text>
              <Text style={s.body}>{h}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function buildExecutiveSummary(params: {
  project: Record<string, unknown>;
  keywordCount: number;
  avgPosition: number;
  top10Count: number;
  healthScore: number;
  backlinkCount: number;
  referringDomains: number;
  aiVisibilityAvg: number;
  highPriorityInsights: number;
}): ExecutiveSummary {
  const highlights: string[] = [];

  if (params.top10Count > 0)
    highlights.push(`${params.top10Count} keywords ranking in top 10 positions.`);
  if (params.healthScore >= 80)
    highlights.push(`Site health score is strong at ${params.healthScore}%.`);
  else if (params.healthScore > 0 && params.healthScore < 50)
    highlights.push(`Site health score needs attention at ${params.healthScore}%.`);
  if (params.highPriorityInsights > 0)
    highlights.push(`${params.highPriorityInsights} high-priority AI recommendations pending.`);
  if (params.aiVisibilityAvg > 0)
    highlights.push(`Average AI visibility score: ${params.aiVisibilityAvg.toFixed(0)}%.`);

  return {
    projectName: String(params.project.name ?? ""),
    domain: typeof params.project.domain === "string" ? params.project.domain : null,
    totalKeywords: params.keywordCount,
    avgPosition: params.avgPosition,
    top10Keywords: params.top10Count,
    healthScore: params.healthScore,
    totalBacklinks: params.backlinkCount,
    referringDomains: params.referringDomains,
    aiVisibilityAvg: params.aiVisibilityAvg,
    highPriorityInsights: params.highPriorityInsights,
    highlights,
  };
}
