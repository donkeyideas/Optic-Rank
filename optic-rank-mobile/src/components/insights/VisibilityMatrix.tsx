import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/typography";

interface VisibilityRow {
  keyword: string;
  providers: Record<string, "mentioned" | "partial" | "not_found">;
}

interface VisibilityMatrixProps {
  data: VisibilityRow[];
}

const PROVIDER_ABBREVS = [
  { key: "openai", label: "GPT" },
  { key: "gemini", label: "Gem" },
  { key: "anthropic", label: "Cld" },
  { key: "perplexity", label: "Pplx" },
  { key: "deepseek", label: "DS" },
];

function StatusDot({ status }: { status: "mentioned" | "partial" | "not_found" | undefined }) {
  let color: string;
  switch (status) {
    case "mentioned":
      color = "#27ae60";
      break;
    case "partial":
      color = "#b8860b";
      break;
    case "not_found":
    default:
      color = "#c0392b";
      break;
  }

  return (
    <View style={[styles.dot, { backgroundColor: color }]} />
  );
}

export default function VisibilityMatrix({ data }: VisibilityMatrixProps) {
  const { colors } = useTheme();

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
          No visibility data available yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={[styles.table, { borderColor: colors.border }]}>
        {/* Header row */}
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <View style={[styles.keywordCell, { borderRightColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.inkSecondary }]}>
              Keyword
            </Text>
          </View>
          {PROVIDER_ABBREVS.map((p) => (
            <View
              key={p.key}
              style={[styles.providerCell, { borderRightColor: colors.border }]}
            >
              <Text style={[styles.headerText, { color: colors.inkSecondary }]}>
                {p.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Data rows */}
        {data.map((row, index) => (
          <View
            key={row.keyword + index}
            style={[
              styles.row,
              index < data.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
            ]}
          >
            <View style={[styles.keywordCell, { borderRightColor: colors.border }]}>
              <Text
                style={[styles.keywordText, { color: colors.ink }]}
                numberOfLines={1}
              >
                {row.keyword}
              </Text>
            </View>
            {PROVIDER_ABBREVS.map((p) => (
              <View
                key={p.key}
                style={[styles.providerCell, { borderRightColor: colors.border }]}
              >
                <StatusDot status={row.providers[p.key]} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderRadius: 0,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  keywordCell: {
    width: 120,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    justifyContent: "center",
  },
  providerCell: {
    width: 48,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  keywordText: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    textAlign: "center",
  },
});
