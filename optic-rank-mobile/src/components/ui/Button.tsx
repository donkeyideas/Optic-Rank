import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";

type ButtonVariant =
  | "primary"
  | "outline"
  | "red"
  | "sm-primary"
  | "sm-outline"
  | "sm-red";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}: ButtonProps) {
  const { colors } = useTheme();

  const isSmall = variant.startsWith("sm-");
  const baseVariant = isSmall ? variant.replace("sm-", "") : variant;

  const variantStyles: ViewStyle = (() => {
    switch (baseVariant) {
      case "primary":
        return {
          backgroundColor: disabled ? colors.inkMuted : colors.ink,
          borderWidth: 0,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: disabled ? colors.inkMuted : colors.ink,
        };
      case "red":
        return {
          backgroundColor: disabled ? colors.inkMuted : colors.red,
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.ink,
          borderWidth: 0,
        };
    }
  })();

  const textColor = (() => {
    switch (baseVariant) {
      case "primary":
        return colors.surface;
      case "outline":
        return disabled ? colors.inkMuted : colors.ink;
      case "red":
        return "#ffffff";
      default:
        return colors.surface;
    }
  })();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        variantStyles,
        isSmall ? styles.small : styles.regular,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          isSmall ? styles.textSmall : styles.textRegular,
          { color: textColor },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  regular: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  textRegular: {
    fontSize: fontSize.sm,
  },
  textSmall: {
    fontSize: fontSize.xs,
  },
});
