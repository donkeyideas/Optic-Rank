import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/* ------------------------------------------------------------------ */
/*  Font mapping — PDF built-in fonts                                  */
/*  Times-Roman ≈ Playfair Display (serif headlines)                   */
/*  Helvetica   ≈ IBM Plex Sans    (body text)                         */
/*  Courier     ≈ IBM Plex Mono    (data / monospace)                  */
/* ------------------------------------------------------------------ */
const SERIF = "Times-Roman";
const SANS = "Helvetica";
const MONO = "Courier";

export function ensureFontsRegistered() {
  // Built-in PDF fonts — no registration needed
}

/* ------------------------------------------------------------------ */
/*  Shared colour palette                                             */
/* ------------------------------------------------------------------ */
export const colors = {
  cream: "#f5f2ed",
  ink: "#1a1a1a",
  inkMuted: "#6b6b6b",
  rule: "#d4d0c8",
  red: "#c0392b",
  green: "#27ae60",
  gold: "#b8860b",
  white: "#ffffff",
};

/* ------------------------------------------------------------------ */
/*  Shared styles                                                     */
/* ------------------------------------------------------------------ */
export const s = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: SANS,
    fontSize: 9,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  // --- Typography ---
  headline: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subHeadline: {
    fontFamily: SERIF,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 12,
    fontWeight: "bold",
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingBottom: 3,
    marginBottom: 8,
    marginTop: 16,
  },
  body: { fontSize: 9, lineHeight: 1.5 },
  muted: { fontSize: 8, color: colors.inkMuted },
  mono: { fontFamily: MONO, fontSize: 8 },
  bold: { fontWeight: "bold" },

  // --- Layout ---
  row: { flexDirection: "row" },
  col: { flexDirection: "column" },
  spaceBetween: { justifyContent: "space-between" },
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  mb8: { marginBottom: 8 },
  mb16: { marginBottom: 16 },

  // --- Cards ---
  statCard: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  statLabel: { fontSize: 7, color: colors.inkMuted, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  statValue: { fontFamily: MONO, fontSize: 16, fontWeight: "bold", marginTop: 2 },

  // --- Tables ---
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.rule,
    paddingVertical: 4,
  },
  tableCell: { fontSize: 8 },

  // --- Utilities ---
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    marginVertical: 12,
  },
  badge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  badgeGreen: { backgroundColor: "#e8f5e9", color: colors.green },
  badgeRed: { backgroundColor: "#fce4ec", color: colors.red },
  badgeGold: { backgroundColor: "#fff8e1", color: colors.gold },

  // --- Footer ---
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: colors.rule,
    paddingTop: 6,
    fontSize: 7,
    color: colors.inkMuted,
  },
});

/* ------------------------------------------------------------------ */
/*  Reusable section components                                       */
/* ------------------------------------------------------------------ */

export function PDFHeadline({ children }: { children: React.ReactNode }) {
  return <Text style={s.headline}>{children}</Text>;
}

export function PDFSectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

export function PDFStatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string | number;
  change?: string;
}) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {change ? <Text style={[s.muted, { marginTop: 2 }]}>{change}</Text> : null}
    </View>
  );
}

export function PDFTable({
  headers,
  rows,
  widths,
}: {
  headers: string[];
  rows: (string | number)[][];
  widths: number[];
}) {
  return (
    <View>
      <View style={s.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={[s.tableCell, s.bold, { width: widths[i] }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.tableRow}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[s.tableCell, { width: widths[ci] }]}>
              {String(cell)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Document shell                                                    */
/* ------------------------------------------------------------------ */
export function ReportDocument({
  title,
  projectName,
  generatedAt,
  children,
}: {
  title: string;
  projectName: string;
  generatedAt: string;
  children?: React.ReactNode;
}) {
  return (
    <Document title={title} author="RankPulse AI">
      <Page size="A4" style={s.page}>
        {/* Masthead */}
        <View style={[s.row, s.spaceBetween, { alignItems: "flex-end", marginBottom: 4 }]}>
          <View>
            <Text style={{ fontFamily: SANS, fontSize: 8, letterSpacing: 2, textTransform: "uppercase" as const, color: colors.inkMuted }}>
              RankPulse AI
            </Text>
            <Text style={s.headline}>{title}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.muted}>{projectName}</Text>
            <Text style={s.muted}>{generatedAt}</Text>
          </View>
        </View>
        <View style={{ borderBottomWidth: 3, borderBottomColor: colors.ink, marginBottom: 16 }} />

        {/* Content */}
        {children}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>RankPulse AI — SEO Intelligence Report</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
