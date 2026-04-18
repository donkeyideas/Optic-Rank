import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";

type DeltaType = "up" | "down" | "neutral";

interface KPIBoxProps {
  value: string;
  label: string;
  delta?: string;
  deltaType?: DeltaType;
}

export default function KPIBox({
  value,
  label,
  delta,
  deltaType = "neutral",
}: KPIBoxProps) {
  const { colors } = useTheme();

  const deltaColor = (() => {
    switch (deltaType) {
      case "up":
        return colors.green;
      case "down":
        return colors.red;
      case "neutral":
      default:
        return colors.inkMuted;
    }
  })();

  const deltaPrefix = (() => {
    switch (deltaType) {
      case "up":
        return "\u25B2 ";
      case "down":
        return "\u25BC ";
      default:
        return "";
    }
  })();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
      {delta != null && (
        <Text style={[styles.delta, { color: deltaColor }]}>
          {deltaPrefix}
          {delta}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 0,
    padding: 12,
    alignItems: "center",
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: "700",
  },
  label: {
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  delta: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginTop: 2,
  },
});
