import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";
import type { Competitor } from "../../types";

interface CompetitorCardProps {
  competitor: Competitor;
}

function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return "--";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function CompetitorCard({ competitor }: CompetitorCardProps) {
  const { colors } = useTheme();

  const score = competitor.authority_score;
  const scoreColor =
    score !== null
      ? score >= 70
        ? colors.red
        : score >= 60
        ? colors.gold
        : colors.green
      : colors.inkMuted;

  const progressColor =
    score !== null
      ? score >= 70
        ? colors.red
        : score >= 60
        ? colors.gold
        : colors.green
      : colors.border;

  return (
    <Card variant="sm">
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.leftCol}>
          <Text
            style={[styles.domain, { color: colors.ink }]}
            numberOfLines={1}
          >
            {competitor.domain}
          </Text>
          {competitor.name ? (
            <Text
              style={[styles.description, { color: colors.inkMuted }]}
              numberOfLines={1}
            >
              {competitor.name}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.authorityScore, { color: scoreColor }]}>
          {score !== null ? score : "--"}
        </Text>
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.ink }]}>
            {formatNumber(competitor.organic_traffic)}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.inkMuted }]}>
            Traffic
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.ink }]}>
            {formatNumber(competitor.keywords_count)}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.inkMuted }]}>
            Keywords
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <ProgressBar
        value={score ?? 0}
        color={progressColor}
        style={styles.progressBar}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  leftCol: {
    flex: 1,
    marginRight: 12,
  },
  domain: {
    fontSize: fontSize.sm,
    fontFamily: fonts.sansBold,
  },
  description: {
    fontSize: 11,
    fontFamily: fonts.sans,
    marginTop: 2,
  },
  authorityScore: {
    fontSize: 22,
    fontFamily: fonts.mono,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  metric: {
    alignItems: "flex-start",
  },
  metricValue: {
    fontSize: fontSize.sm,
    fontFamily: fonts.monoMedium,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.sans,
    marginTop: 1,
  },
  progressBar: {
    marginTop: 8,
  },
});
