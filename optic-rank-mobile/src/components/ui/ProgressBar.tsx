import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface ProgressBarProps {
  value: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

export default function ProgressBar({ value, color, style }: ProgressBarProps) {
  const { colors, isDark } = useTheme();

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.surface : "#eeeeee" },
        style,
      ]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clampedValue}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    borderRadius: 0,
    overflow: "hidden",
    marginTop: 4,
  },
  fill: {
    height: "100%",
    borderRadius: 0,
  },
});
