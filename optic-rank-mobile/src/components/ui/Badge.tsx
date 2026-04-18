import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";

type BadgeVariant = "red" | "green" | "gold" | "dark" | "outline" | "blue";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export default function Badge({ label, variant = "dark" }: BadgeProps) {
  const { colors } = useTheme();

  const getStyles = (): { bg: string; textColor: string; borderWidth: number; borderColor: string } => {
    switch (variant) {
      case "red":
        return { bg: colors.red, textColor: "#ffffff", borderWidth: 0, borderColor: "transparent" };
      case "green":
        return { bg: colors.green, textColor: "#ffffff", borderWidth: 0, borderColor: "transparent" };
      case "gold":
        return {
          bg: `rgba(184, 134, 11, 0.15)`,
          textColor: colors.gold,
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "dark":
        return { bg: colors.ink, textColor: colors.surface, borderWidth: 0, borderColor: "transparent" };
      case "outline":
        return {
          bg: "transparent",
          textColor: colors.inkSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "blue":
        return { bg: colors.blue, textColor: "#ffffff", borderWidth: 0, borderColor: "transparent" };
      default:
        return { bg: colors.ink, textColor: colors.surface, borderWidth: 0, borderColor: "transparent" };
    }
  };

  const badgeStyles = getStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: badgeStyles.bg,
          borderWidth: badgeStyles.borderWidth,
          borderColor: badgeStyles.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: badgeStyles.textColor }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 0,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: fontSize.label,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
