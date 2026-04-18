import React from "react";
import { Switch, StyleSheet, Platform } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

interface ToggleProps {
  value: boolean;
  onToggle: () => void;
}

export default function Toggle({ value, onToggle }: ToggleProps) {
  const { colors } = useTheme();

  return (
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{
        false: colors.border,
        true: colors.green,
      }}
      thumbColor="#ffffff"
      ios_backgroundColor={colors.border}
      style={Platform.OS === "ios" ? styles.iosSwitch : undefined}
    />
  );
}

const styles = StyleSheet.create({
  iosSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
});
