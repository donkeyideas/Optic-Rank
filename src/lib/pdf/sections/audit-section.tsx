import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PDFSectionTitle, PDFStatCard, PDFTable, s, colors } from "../editorial-template";

interface AuditData {
  healthScore: number;
  pagesScanned: number;
  criticalIssues: number;
  warnings: number;
  passed: number;
  issues: AuditIssue[];
}

interface AuditIssue {
  title: string;
  severity: "critical" | "warning" | "info";
  count: number;
  category: string;
}

export function AuditSection({ data }: { data: AuditData }) {
  const issueRows = data.issues.slice(0, 20).map((issue) => [
    issue.title,
    issue.severity.toUpperCase(),
    issue.category,
    issue.count,
  ]);

  return (
    <View>
      <PDFSectionTitle>Site Audit</PDFSectionTitle>

      <View style={[s.row, s.gap8, s.mb16]}>
        <PDFStatCard label="Health Score" value={`${data.healthScore}%`} />
        <PDFStatCard label="Pages Scanned" value={data.pagesScanned} />
        <PDFStatCard label="Critical Issues" value={data.criticalIssues} />
        <PDFStatCard label="Warnings" value={data.warnings} />
      </View>

      {/* Health bar */}
      <View style={[s.mb16]}>
        <View style={{ height: 8, backgroundColor: "#e0e0e0", borderRadius: 4, overflow: "hidden" }}>
          <View
            style={{
              height: 8,
              width: `${data.healthScore}%`,
              backgroundColor:
                data.healthScore >= 80 ? colors.green : data.healthScore >= 50 ? colors.gold : colors.red,
              borderRadius: 4,
            }}
          />
        </View>
      </View>

      {issueRows.length > 0 ? (
        <View>
          <Text style={[s.bold, s.mb8]}>Top Issues</Text>
          <PDFTable
            headers={["Issue", "Severity", "Category", "Count"]}
            rows={issueRows}
            widths={[220, 60, 80, 50]}
          />
        </View>
      ) : null}
    </View>
  );
}

export function buildAuditData(
  audit: Record<string, unknown> | null,
  issues: Record<string, unknown>[]
): AuditData {
  const criticalIssues = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    healthScore: typeof audit?.health_score === "number" ? audit.health_score : 0,
    pagesScanned: typeof audit?.pages_crawled === "number" ? audit.pages_crawled : 0,
    criticalIssues: criticalIssues.length,
    warnings: warnings.length,
    passed: typeof audit?.issues_found === "number" ? audit.issues_found : 0,
    issues: issues.slice(0, 20).map((i) => ({
      title: String(i.title ?? "Unknown"),
      severity: (i.severity as AuditIssue["severity"]) ?? "info",
      count: 1,
      category: String(i.category ?? "General"),
    })),
  };
}
