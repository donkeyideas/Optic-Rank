import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import { spacing } from "../../theme/spacing";

export type ModalVariant = "info" | "success" | "error" | "confirm" | "loading";

interface ModalButton {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "red";
}

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  variant?: ModalVariant;
  buttons?: ModalButton[];
  loading?: boolean;
  loadingText?: string;
  children?: React.ReactNode;
}

export default function AppModal({
  visible,
  onClose,
  title,
  message,
  variant = "info",
  buttons,
  loading = false,
  loadingText,
  children,
}: AppModalProps) {
  const { colors } = useTheme();

  const accentColor = (() => {
    switch (variant) {
      case "success":
        return colors.green;
      case "error":
        return colors.red;
      case "confirm":
        return colors.gold;
      case "loading":
        return colors.ink;
      default:
        return colors.red;
    }
  })();

  const defaultButtons: ModalButton[] = buttons ?? [
    { label: "OK", onPress: onClose, variant: "primary" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.container, { backgroundColor: colors.surface }]}
          onPress={() => {}}
        >
          {/* Accent top line */}
          <View style={[styles.accentLine, { backgroundColor: accentColor }]} />

          {/* Title */}
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>

          {/* Message — hide when loading to avoid duplicating loadingText */}
          {message && !loading ? (
            <Text style={[styles.message, { color: colors.inkSecondary }]}>
              {message}
            </Text>
          ) : null}

          {/* Custom children */}
          {children}

          {/* Loading state */}
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={accentColor} size="small" />
              <Text style={[styles.loadingText, { color: colors.inkMuted }]}>
                {loadingText || "Processing..."}
              </Text>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              {defaultButtons.map((btn, i) => {
                const btnBg =
                  btn.variant === "red"
                    ? colors.red
                    : btn.variant === "outline"
                    ? "transparent"
                    : colors.red;
                const btnText =
                  btn.variant === "outline" ? colors.ink : "#ffffff";
                const btnBorder =
                  btn.variant === "outline" ? colors.border : btnBg;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.button,
                      {
                        backgroundColor: btnBg,
                        borderColor: btnBorder,
                        borderWidth: btn.variant === "outline" ? 1 : 0,
                        flex: defaultButtons.length > 1 ? 1 : undefined,
                      },
                    ]}
                    onPress={btn.onPress}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.buttonText, { color: btnText }]}>
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    overflow: "hidden",
  },
  accentLine: {
    height: 3,
    width: "100%",
  },
  title: {
    fontFamily: fonts.serifExtraBold,
    fontSize: fontSize.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.md,
  },
  buttonRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
