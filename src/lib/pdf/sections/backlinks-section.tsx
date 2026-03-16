import React from "react";
import { View, Text } from "@react-pdf/renderer";
import { PDFSectionTitle, PDFStatCard, PDFTable, s } from "../editorial-template";

interface BacklinkStats {
  totalBacklinks: number;
  referringDomains: number;
  toxicLinks: number;
  avgTrustFlow: number;
}

interface BacklinkRow {
  source_url: string;
  target_url: string;
  trust_flow: number | null;
  citation_flow: number | null;
  anchor_text: string | null;
  is_toxic: boolean;
}

export function BacklinksSection({
  backlinks,
  stats,
}: {
  backlinks: BacklinkRow[];
  stats: BacklinkStats;
}) {
  const rows = backlinks.slice(0, 25).map((b) => [
    truncate(b.source_url, 40),
    b.trust_flow ?? "—",
    b.citation_flow ?? "—",
    truncate(b.anchor_text ?? "—", 20),
    b.is_toxic ? "TOXIC" : "OK",
  ]);

  return (
    <View>
      <PDFSectionTitle>Backlink Profile</PDFSectionTitle>

      <View style={[s.row, s.gap8, s.mb16]}>
        <PDFStatCard label="Total Backlinks" value={stats.totalBacklinks.toLocaleString()} />
        <PDFStatCard label="Referring Domains" value={stats.referringDomains.toLocaleString()} />
        <PDFStatCard label="Toxic Links" value={stats.toxicLinks} />
        <PDFStatCard label="Avg Trust Flow" value={stats.avgTrustFlow.toFixed(1)} />
      </View>

      <PDFTable
        headers={["Source URL", "TF", "CF", "Anchor", "Status"]}
        rows={rows}
        widths={[200, 40, 40, 100, 40]}
      />

      {backlinks.length > 25 && (
        <Text style={[s.muted, { marginTop: 4 }]}>
          Showing top 25 of {backlinks.length} backlinks.
        </Text>
      )}
    </View>
  );
}

export function buildBacklinkRows(raw: Record<string, unknown>[]): BacklinkRow[] {
  return raw.map((b) => ({
    source_url: String(b.source_url ?? ""),
    target_url: String(b.target_url ?? ""),
    trust_flow: typeof b.trust_flow === "number" ? b.trust_flow : null,
    citation_flow: typeof b.citation_flow === "number" ? b.citation_flow : null,
    anchor_text: typeof b.anchor_text === "string" ? b.anchor_text : null,
    is_toxic: Boolean(b.is_toxic),
  }));
}

export function buildBacklinkStats(backlinks: BacklinkRow[]): BacklinkStats {
  const domains = new Set(backlinks.map((b) => new URL(b.source_url).hostname).filter(Boolean));
  const trustFlows = backlinks.map((b) => b.trust_flow).filter((t): t is number => t !== null);

  return {
    totalBacklinks: backlinks.length,
    referringDomains: domains.size,
    toxicLinks: backlinks.filter((b) => b.is_toxic).length,
    avgTrustFlow: trustFlows.length > 0 ? trustFlows.reduce((a, b) => a + b, 0) / trustFlows.length : 0,
  };
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
