import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/typography";

type ScoreStatus = "good" | "warn" | "bad";

interface ScoreRingProps {
  score: number;
  size?: number;
  status: ScoreStatus;
}

export default function ScoreRing({
  score,
  size = 64,
  status,
}: ScoreRingProps) {
  const { colors } = useTheme();

  const borderColor = (() => {
    switch (status) {
      case "good":
        return colors.green;
      case "warn":
        return colors.gold;
      case "bad":
        return colors.red;
      default:
        return colors.border;
    }
  })();

  const scoreFontSize = size * 0.28;

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.score,
          {
            fontSize: scoreFontSize,
            color: colors.ink,
          },
        ]}
      >
        {score}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  score: {
    fontFamily: fonts.monoMedium,
    fontWeight: "700",
  },
});
