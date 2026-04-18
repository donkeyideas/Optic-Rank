import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import type { AIInsight, InsightType } from "../../types";

interface InsightCardProps {
  insight: AIInsight;
}

function getBorderColor(type: InsightType, colors: ReturnType<typeof useTheme>["colors"]): string {
  switch (type) {
    case "opportunity":
    case "win":
      return colors.green;
    case "alert":
      return colors.red;
    case "prediction":
    case "content":
      return colors.gold;
    case "technical":
    case "backlinks":
      return colors.blue;
    default:
      return colors.gold;
  }
}

function getBadgeVariant(type: InsightType): "green" | "red" | "gold" | "blue" {
  switch (type) {
    case "opportunity":
    case "win":
      return "green";
    case "alert":
      return "red";
    case "prediction":
    case "content":
      return "gold";
    case "technical":
    case "backlinks":
      return "blue";
    default:
      return "gold";
  }
}

export default function InsightCard({ insight }: InsightCardProps) {
  const { colors } = useTheme();

  return (
    <Card
      variant="sm"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: getBorderColor(insight.type, colors),
      }}
    >
      <Badge label={insight.type} variant={getBadgeVariant(insight.type)} />

      <Text
        style={[styles.title, { color: colors.ink }]}
        numberOfLines={2}
      >
        {insight.title}
      </Text>

      <Text
        style={[styles.description, { color: colors.inkSecondary }]}
        numberOfLines={3}
      >
        {insight.description}
      </Text>

      {insight.action_label ? (
        <Text style={[styles.actionLabel, { color: colors.red }]}>
          {insight.action_label}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    marginTop: 4,
  },
  description: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  actionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },
});
