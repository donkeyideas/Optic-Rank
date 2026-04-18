import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/typography";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  initials: string;
  size?: AvatarSize;
  color?: string;
}

const sizeMap = {
  sm: { dimension: 32, fontSize: 12 },
  md: { dimension: 48, fontSize: 18 },
  lg: { dimension: 72, fontSize: 28 },
};

export default function Avatar({
  initials,
  size = "md",
  color,
}: AvatarProps) {
  const { colors } = useTheme();

  const { dimension, fontSize } = sizeMap[size];
  const bgColor = color || colors.ink;

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            fontSize,
            color: colors.surface,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontFamily: fonts.serif,
    fontWeight: "700",
  },
});
