import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Divider from "../components/ui/Divider";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateProject } from "../hooks/useProjects";
import { useProfile } from "../hooks/useProfile";
import { supabase } from "../lib/supabase";
import type { ProjectType } from "../types";

const PROJECT_TYPES: { value: ProjectType; label: string; icon: keyof typeof Feather.glyphMap; description: string }[] = [
  { value: "website", label: "Website", icon: "globe", description: "Track rankings, traffic & SEO health" },
  { value: "ios_app", label: "iOS App", icon: "smartphone", description: "App Store Optimization & rankings" },
  { value: "android_app", label: "Android App", icon: "smartphone", description: "Play Store Optimization & rankings" },
  { value: "both", label: "Website + App", icon: "layers", description: "Combined web & mobile tracking" },
];

export default function CreateProjectScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("website");
  const [domain, setDomain] = useState("");
  const [url, setUrl] = useState("");
  const [appStoreId, setAppStoreId] = useState("");
  const [playStoreId, setPlayStoreId] = useState("");

  const showDomainFields = type === "website" || type === "both";
  const showIosFields = type === "ios_app" || type === "both";
  const showAndroidFields = type === "android_app" || type === "both";

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter a project name.");
      return;
    }

    if (showDomainFields && !domain.trim()) {
      Alert.alert("Required", "Please enter your website domain.");
      return;
    }

    try {
      // Use RPC function that handles org creation + project creation server-side
      const { data, error } = await supabase.rpc("create_project_with_org", {
        p_name: name.trim(),
        p_type: type,
        p_domain: domain.trim() || null,
        p_url: url.trim() || null,
        p_app_store_id: showIosFields && appStoreId.trim() ? appStoreId.trim() : null,
        p_play_store_id: showAndroidFields && playStoreId.trim() ? playStoreId.trim() : null,
      });

      if (error) throw error;

      // Invalidate caches so the app picks up the new project + org
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activeProject"] });

      Alert.alert("Project Created", "Your project is ready. Start tracking your SEO performance!", [
        { text: "Let's Go", onPress: () => navigation.navigate("Dashboard" as any) },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not create project. Please try again.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={[styles.scroll, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backButton}
            >
              <Feather name="arrow-left" size={20} color={colors.ink} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.ink }]}>
              New Project
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
              Add your website or app to start tracking
            </Text>
          </View>

          <View style={styles.body}>
            {/* Project Name */}
            <Input
              label="Project Name"
              value={name}
              onChangeText={setName}
              placeholder="My Website"
            />

            {/* Project Type */}
            <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>
              PROJECT TYPE
            </Text>
            <View style={styles.typeGrid}>
              {PROJECT_TYPES.map((pt) => {
                const isSelected = type === pt.value;
                return (
                  <TouchableOpacity
                    key={pt.value}
                    style={[
                      styles.typeCard,
                      {
                        borderColor: isSelected ? colors.red : colors.border,
                        backgroundColor: isSelected
                          ? colors.surface
                          : colors.surfaceInset,
                      },
                    ]}
                    onPress={() => setType(pt.value)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={pt.icon}
                      size={20}
                      color={isSelected ? colors.red : colors.inkSecondary}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? colors.red : colors.ink },
                        isSelected && styles.typeLabelSelected,
                      ]}
                    >
                      {pt.label}
                    </Text>
                    <Text
                      style={[styles.typeDesc, { color: colors.inkMuted }]}
                      numberOfLines={2}
                    >
                      {pt.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Divider style={{ marginVertical: spacing.lg }} />

            {/* Website Fields */}
            {showDomainFields && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                  Website Details
                </Text>
                <Input
                  label="Domain"
                  value={domain}
                  onChangeText={setDomain}
                  placeholder="example.com"
                  keyboardType="url"
                />
                <Input
                  label="URL"
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://example.com"
                  keyboardType="url"
                />
              </>
            )}

            {/* iOS App Fields */}
            {showIosFields && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                  iOS App
                </Text>
                <Input
                  label="App Store ID / Bundle ID"
                  value={appStoreId}
                  onChangeText={setAppStoreId}
                  placeholder="com.example.app"
                />
              </>
            )}

            {/* Android App Fields */}
            {showAndroidFields && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.ink }]}>
                  Android App
                </Text>
                <Input
                  label="Play Store ID / Package Name"
                  value={playStoreId}
                  onChangeText={setPlayStoreId}
                  placeholder="com.example.app"
                />
              </>
            )}

            {/* Create Button */}
            <Button
              title={createProject.isPending ? "Creating..." : "Create Project"}
              onPress={handleCreate}
              variant="primary"
              disabled={createProject.isPending}
              style={styles.createButton}
            />

            <Text style={[styles.hint, { color: colors.inkMuted }]}>
              You can add keywords, run audits, and configure integrations after creating your project.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: spacing.xl,
  },
  backButton: {
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: fonts.serifExtraBold,
    fontSize: 24,
  },
  headerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  body: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: 60,
  },
  fieldLabel: {
    fontSize: fontSize.label,
    fontFamily: fonts.sansBold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  typeLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: fontSize.sm,
  },
  typeLabelSelected: {
    fontFamily: fonts.sansBold,
  },
  typeDesc: {
    fontFamily: fonts.sans,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  sectionTitle: {
    fontFamily: fonts.serif,
    fontSize: fontSize.lg,
    marginBottom: spacing.md,
  },
  createButton: {
    marginTop: spacing.xl,
  },
  hint: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    textAlign: "center",
    marginTop: spacing.lg,
    lineHeight: 16,
  },
});
