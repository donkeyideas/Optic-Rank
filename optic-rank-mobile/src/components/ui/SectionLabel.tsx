import React from "react";
import { Text, StyleSheet, TextStyle, StyleProp } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";

interface SectionLabelProps {
  text: string;
  style?: StyleProp<TextStyle>;
}

export default function SectionLabel({ text, style }: SectionLabelProps) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.label, { color: colors.red }, style]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.label,
    fontFamily: fonts.sansBold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
});
