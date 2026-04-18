import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts, fontSize } from "../../theme/typography";
import { spacing } from "../../theme/spacing";

interface NoProjectGuardProps {
  /** The name of the feature (e.g. "Keywords", "Backlinks") */
  feature: string;
}

/**
 * Full-screen guard shown when no active project exists.
 * Prompts the user to create a project before using the feature.
 */
export default function NoProjectGuard({ feature }: NoProjectGuardProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="folder-plus" size={32} color={colors.red} />
        <Text style={[styles.title, { color: colors.ink }]}>
          Project Required
        </Text>
        <Text style={[styles.message, { color: colors.inkSecondary }]}>
          Create a project to use {feature}. Add your website or app to start tracking SEO performance.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.ink }]}
          onPress={() => navigation.navigate("CreateProject" as any)}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            CREATE PROJECT
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate("Dashboard" as any)}
          activeOpacity={0.7}
        >
          <Text style={[styles.link, { color: colors.red }]}>
            Go to Dashboard
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screenPadding,
  },
  card: {
    width: "100%",
    alignItems: "center",
    padding: 28,
    borderWidth: 1,
    gap: 12,
  },
  title: {
    fontFamily: fonts.serifExtraBold,
    fontSize: fontSize.xl,
  },
  message: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: "center",
    lineHeight: 18,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: "100%",
    marginTop: 4,
  },
  buttonText: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    letterSpacing: 1,
  },
  link: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
    marginTop: 4,
  },
});
