import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, message, icon }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.inkMuted }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 18,
  },
});
