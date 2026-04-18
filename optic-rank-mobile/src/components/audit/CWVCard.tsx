import React from "react";
import { Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import Card from "../ui/Card";

type CWVStatus = "good" | "warn" | "bad";

interface CWVCardProps {
  label: string;
  value: string;
  status: CWVStatus;
}

export default function CWVCard({ label, value, status }: CWVCardProps) {
  const { colors } = useTheme();

  const valueColor = (() => {
    switch (status) {
      case "good":
        return colors.green;
      case "warn":
        return colors.gold;
      case "bad":
        return colors.red;
      default:
        return colors.inkMuted;
    }
  })();

  return (
    <Card variant="sm" style={styles.card}>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.inkMuted }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  value: {
    fontSize: fontSize.lg,
    fontFamily: fonts.mono,
    fontWeight: "700",
  },
  label: {
    fontSize: fontSize.label,
    fontFamily: fonts.sans,
    textTransform: "uppercase",
    marginTop: 4,
  },
});
