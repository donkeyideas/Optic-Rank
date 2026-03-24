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
  const items = insights.slice(0, 15);

  return (
    <View>
      <PDFSectionTitle>AI Insights &amp; Recommendations</PDFSectionTitle>

      <View style={[s.row, s.gap8, s.mb16]}>
        <PDFStatCard label="Total Insights" value={stats.total} />
        <PDFStatCard label="High Priority" value={stats.highPriority} />
        <PDFStatCard label="Implemented" value={stats.implemented} />
      </View>

      {items.length > 0 ? (
        <View>
          {items.map((insight, i) => {
            const borderColor = insight.priority === "high"
              ? colors.red
              : insight.priority === "medium"
              ? colors.gold
              : colors.green;
            const badgeStyle = insight.priority === "high"
              ? s.badgeRed
              : insight.priority === "medium"
              ? s.badgeGold
              : s.badgeGreen;
            const label = typeof insight.priority === "string"
              ? insight.priority.toUpperCase()
              : "MEDIUM";

            return (
              <View
                key={String(i)}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: borderColor,
                  backgroundColor: "#fafafa",
                }}
              >
                <View style={[s.row, s.spaceBetween]}>
                  <Text style={[s.bold, { fontSize: 9 }]}>{String(insight.title)}</Text>
                  <Text style={[s.badge, badgeStyle]}>{label}</Text>
                </View>
                <Text style={[s.body, { marginTop: 3 }]}>{String(insight.description)}</Text>
                <Text style={[s.muted, { marginTop: 2 }]}>{String(insight.category)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function buildInsights(raw: Record<string, unknown>[]): InsightItem[] {
  return raw.map((r) => ({
    title: String(r.title ?? "Insight"),
    description: String(r.description ?? ""),
    priority: normalizePriority(r.priority),
    category: String(r.type ?? "General"),
  }));
}

/** DB stores priority as INT (0-100). Convert to high/medium/low. */
function normalizePriority(val: unknown): InsightItem["priority"] {
  if (typeof val === "string") {
    if (val === "high" || val === "medium" || val === "low") return val;
    return "medium";
  }
  if (typeof val === "number") {
    if (val <= 25) return "high";    // lower number = higher priority
    if (val <= 60) return "medium";
    return "low";
  }
  return "medium";
}

export function buildInsightStats(raw: Record<string, unknown>[]): InsightStats {
  return {
    total: raw.length,
    highPriority: raw.filter((r) => {
      if (r.priority === "high") return true;
      if (typeof r.priority === "number") return r.priority <= 25;
      return false;
    }).length,
    implemented: raw.filter((r) => r.is_dismissed === true).length,
  };
}
