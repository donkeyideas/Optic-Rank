import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import Divider from "../components/ui/Divider";
import SectionLabel from "../components/ui/SectionLabel";
import type { AppStackParamList } from "../navigation/AppStack";

type Nav = NativeStackNavigationProp<AppStackParamList>;

interface MenuItem {
  screen: keyof AppStackParamList;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  description: string;
}

const SEO_TOOLS: MenuItem[] = [
  { screen: "Backlinks", label: "Backlinks", icon: "link", description: "Backlink analysis & monitoring" },
  { screen: "SiteAudit", label: "Site Audit", icon: "check-circle", description: "Technical SEO health check" },
  { screen: "Content", label: "Content", icon: "file-text", description: "Content analysis & optimization" },
  { screen: "Compete", label: "Competitors", icon: "users", description: "Competitor intelligence" },
  { screen: "Optimization", label: "SEO & Analytics", icon: "sliders", description: "GEO, AEO & CRO tools" },
];

const AI_FEATURES: MenuItem[] = [
  { screen: "AIVisibility", label: "Visibility Tracker", icon: "eye", description: "LLM brand visibility tracking" },
  { screen: "Predictions", label: "Predictions", icon: "trending-up", description: "Rank forecasting" },
  { screen: "AIBriefs", label: "Intelligence Briefs", icon: "book-open", description: "Automated intelligence reports" },
  { screen: "AdvancedAI", label: "Command Center", icon: "cpu", description: "Multi-source AI analysis" },
  { screen: "SearchAI", label: "Search AI", icon: "globe", description: "Search intelligence crossover" },
  { screen: "Entities", label: "Entities", icon: "tag", description: "Entity & knowledge graph" },
];

const CHANNELS: MenuItem[] = [
  { screen: "AppStore", label: "App Store", icon: "smartphone", description: "ASO optimization & reviews" },
  { screen: "SocialIntelligence", label: "Social", icon: "share-2", description: "Social media intelligence" },
];

const ACCOUNT: MenuItem[] = [
  { screen: "Reports", label: "Reports", icon: "bar-chart-2", description: "Scheduled reports & history" },
  { screen: "Settings", label: "Settings", icon: "settings", description: "Project & app settings" },
  { screen: "Billing", label: "Billing", icon: "credit-card", description: "Plans & payment" },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();

  function renderSection(title: string, items: MenuItem[]) {
    return (
      <>
        <SectionLabel text={title} style={styles.sectionSpacing} />
        <View style={[styles.grid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {items.map((item, i) => (
            <React.Fragment key={item.screen}>
              {i > 0 && <Divider />}
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.6}
                onPress={() => navigation.navigate(item.screen as any)}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.surfaceInset }]}>
                  <Feather name={item.icon} size={18} color={colors.red} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuLabel, { color: colors.ink }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.menuDesc, { color: colors.inkMuted }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.inkMuted} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.ink }]}>
            Tools & Features
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.inkMuted }]}>
            All platform capabilities
          </Text>
          <Divider variant="thick" />
        </View>

        <View style={styles.body}>
          {renderSection("SEO Tools", SEO_TOOLS)}
          {renderSection("Optic Rank", AI_FEATURES)}
          {renderSection("Channels", CHANNELS)}
          {renderSection("Account", ACCOUNT)}
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.xxl,
  },
  headerSubtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  body: {
    paddingHorizontal: spacing.screenPadding,
  },
  sectionSpacing: {
    marginTop: spacing.lg,
  },
  grid: {
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.md,
  },
  menuDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  bottomSpacer: { height: 100 },
});
