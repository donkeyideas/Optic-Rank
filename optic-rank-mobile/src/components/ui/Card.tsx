import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

type CardVariant = "default" | "sm" | "highlighted";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
}

export default function Card({
  children,
  style,
  variant = "default",
}: CardProps) {
  const { colors } = useTheme();

  const variantStyles: ViewStyle = (() => {
    switch (variant) {
      case "sm":
        return {
          padding: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.border,
        };
      case "highlighted":
        return {
          padding: 16,
          marginBottom: 12,
          borderWidth: 2,
          borderColor: colors.borderDark,
        };
      case "default":
      default:
        return {
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        };
    }
  })();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.surface },
        variantStyles,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 0,
  },
});
