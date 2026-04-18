import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Sparkline from "../charts/Sparkline";
import type { Keyword } from "../../types";

interface KeywordCardProps {
  keyword: Keyword;
  rankHistory?: number[];
}

function formatVolume(vol: number | null): string {
  if (vol === null || vol === undefined) return "--";
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return vol.toString();
}

function formatCpc(cpc: number | null): string {
  if (cpc === null || cpc === undefined) return "--";
  return `$${cpc.toFixed(2)}`;
}

function getSerpFeatureBadgeVariant(feature: string): "dark" | "outline" {
  return feature === "Featured" ? "dark" : "outline";
}

export default function KeywordCard({ keyword, rankHistory }: KeywordCardProps) {
  const { colors } = useTheme();

  const position = keyword.current_position;
  const previous = keyword.previous_position;

  // Delta calculation: positive = improved (moved up in rank)
  const delta =
    position !== null && previous !== null ? previous - position : null;

  const positionColor =
    position !== null
      ? position <= 3
        ? colors.red
        : position <= 10
        ? colors.green
        : colors.ink
      : colors.inkMuted;

  // Sparkline color logic
  const sparklineColor =
    delta !== null && delta > 0
      ? colors.green
      : delta !== null && delta < 0
      ? colors.red
      : colors.inkMuted;

  return (
    <Card variant="sm">
      {/* Top row */}
      <View style={styles.topRow}>
        {/* Left: keyword name + metadata */}
        <View style={styles.leftCol}>
          <Text
            style={[styles.keywordName, { color: colors.ink }]}
            numberOfLines={1}
          >
            {keyword.keyword}
          </Text>
          <Text style={[styles.metadata, { color: colors.inkMuted }]}>
            Vol: {formatVolume(keyword.search_volume)} · CPC:{" "}
            {formatCpc(keyword.cpc)}
          </Text>
        </View>

        {/* Right: position + delta */}
        <View style={styles.rightCol}>
          <Text style={[styles.position, { color: positionColor }]}>
            {position !== null ? position : "--"}
          </Text>
          {delta !== null && delta !== 0 && (
            <Text
              style={[
                styles.delta,
                { color: delta > 0 ? colors.green : colors.red },
              ]}
            >
              {delta > 0 ? `\u25B2 ${delta}` : `\u25BC ${Math.abs(delta)}`}
            </Text>
          )}
        </View>
      </View>

      {/* SERP Features badges */}
      {keyword.serp_features && keyword.serp_features.length > 0 && (
        <View style={styles.badgesRow}>
          {keyword.serp_features.map((feature, index) => (
            <Badge
              key={`${feature}-${index}`}
              label={feature}
              variant={getSerpFeatureBadgeVariant(feature)}
            />
          ))}
        </View>
      )}

      {/* Sparkline */}
      {rankHistory && rankHistory.length >= 2 && (
        <View style={styles.sparklineContainer}>
          <Sparkline
            data={rankHistory}
            color={sparklineColor}
            width={280}
            height={28}
          />
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  leftCol: {
    flex: 1,
    marginRight: 12,
  },
  rightCol: {
    alignItems: "flex-end",
  },
  keywordName: {
    fontSize: fontSize.sm,
    fontFamily: fonts.sansBold,
  },
  metadata: {
    fontSize: 11,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
  position: {
    fontSize: fontSize.xxl,
    fontFamily: fonts.mono,
    fontWeight: "700",
  },
  delta: {
    fontSize: fontSize.xs,
    fontFamily: fonts.mono,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  sparklineContainer: {
    marginTop: 8,
  },
});
