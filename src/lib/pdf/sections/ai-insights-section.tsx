import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PDFSectionTitle, PDFStatCard, s, colors } from "../editorial-template";

interface InsightItem {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
}

interface InsightStats {
  total: number;
  highPriority: number;
  implemented: number;
}

export function AIInsightsSection({
  insights,
  stats,
}: {
  insights: InsightItem[];
  stats: InsightStats;
}) {
  return (
    <View>
      <PDFSectionTitle>AI Insights & Recommendations</PDFSectionTitle>

      <View style={[s.row, s.gap8, s.mb16]}>
        <PDFStatCard label="Total Insights" value={stats.total} />
        <PDFStatCard label="High Priority" value={stats.highPriority} />
        <PDFStatCard label="Implemented" value={stats.implemented} />
      </View>

      {insights.slice(0, 15).map((insight, i) => (
        <View
          key={i}
          style={[
            s.mb8,
            {
              padding: 8,
              borderLeftWidth: 3,
              borderLeftColor:
                insight.priority === "high"
                  ? colors.red
                  : insight.priority === "medium"
                  ? colors.gold
                  : colors.green,
              backgroundColor: "#fafafa",
            },
          ]}
        >
          <View style={[s.row, s.spaceBetween]}>
            <Text style={[s.bold, { fontSize: 9 }]}>{insight.title}</Text>
            <Text
              style={[
                s.badge,
                insight.priority === "high"
                  ? s.badgeRed
                  : insight.priority === "medium"
                  ? s.badgeGold
                  : s.badgeGreen,
              ]}
            >
              {insight.priority.toUpperCase()}
            </Text>
          </View>
          <Text style={[s.body, { marginTop: 3 }]}>{insight.description}</Text>
          <Text style={[s.muted, { marginTop: 2 }]}>{insight.category}</Text>
        </View>
      ))}
    </View>
  );
}

export function buildInsights(raw: Record<string, unknown>[]): InsightItem[] {
  return raw.map((r) => ({
    title: String(r.title ?? "Insight"),
    description: String(r.description ?? r.recommendation ?? ""),
    priority: (r.priority as InsightItem["priority"]) ?? "medium",
    category: String(r.category ?? "General"),
  }));
}

export function buildInsightStats(raw: Record<string, unknown>[]): InsightStats {
  return {
    total: raw.length,
    highPriority: raw.filter((r) => r.priority === "high").length,
    implemented: raw.filter((r) => r.status === "implemented").length,
  };
}
