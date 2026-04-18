import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

type DividerVariant = "thin" | "thick";

interface DividerProps {
  variant?: DividerVariant;
  style?: StyleProp<ViewStyle>;
}

export default function Divider({ variant = "thin", style }: DividerProps) {
  const { colors } = useTheme();

  if (variant === "thick") {
    return (
      <View style={[styles.thickContainer, style]}>
        <View style={[styles.thickLine, { borderColor: colors.borderDark }]} />
        <View style={[styles.thickLineInner, { borderColor: colors.borderDark }]} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.thin,
        { borderTopColor: colors.border },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  thin: {
    borderTopWidth: 1,
    marginVertical: 12,
  },
  thickContainer: {
    marginVertical: 16,
  },
  thickLine: {
    borderTopWidth: 1,
    marginBottom: 2,
  },
  thickLineInner: {
    borderTopWidth: 1,
  },
});
