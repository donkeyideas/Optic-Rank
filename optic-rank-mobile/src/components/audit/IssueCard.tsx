import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import type { AuditIssue } from "../../types";

interface IssueCardProps {
  issue: AuditIssue;
}

function getSeverityBadgeVariant(
  severity: string
): "red" | "gold" | "blue" {
  switch (severity) {
    case "critical":
      return "red";
    case "warning":
      return "gold";
    case "info":
    default:
      return "blue";
  }
}

function getSeverityBorderColor(
  severity: string,
  colors: { red: string; gold: string; blue: string }
): string {
  switch (severity) {
    case "critical":
      return colors.red;
    case "warning":
      return colors.gold;
    case "info":
    default:
      return colors.blue;
  }
}

export default function IssueCard({ issue }: IssueCardProps) {
  const { colors } = useTheme();

  const borderLeftColor = getSeverityBorderColor(issue.severity, colors);

  return (
    <Card
      variant="sm"
      style={{
        borderLeftWidth: 3,
        borderLeftColor,
      }}
    >
      {/* Badges row */}
      <View style={styles.badgesRow}>
        <Badge
          label={issue.severity}
          variant={getSeverityBadgeVariant(issue.severity)}
        />
        <Badge label={issue.category} variant="outline" />
      </View>

      {/* Title */}
      <Text
        style={[styles.title, { color: colors.ink }]}
        numberOfLines={2}
      >
        {issue.title}
      </Text>

      {/* Description */}
      {issue.description ? (
        <Text
          style={[styles.description, { color: colors.inkMuted }]}
          numberOfLines={3}
        >
          {issue.description}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  badgesRow: {
    flexDirection: "row",
    gap: 6,
  },
  title: {
    fontSize: fontSize.sm,
    fontFamily: fonts.sansBold,
    marginTop: 6,
  },
  description: {
    fontSize: 11,
    fontFamily: fonts.sans,
    lineHeight: 16,
    marginTop: 4,
  },
});
