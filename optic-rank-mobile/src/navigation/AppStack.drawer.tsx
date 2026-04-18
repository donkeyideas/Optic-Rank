import React, { Suspense } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Alert } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/typography";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";

// ── Screens ──────────────────────────────────────────────────────────────────
import DashboardScreen from "../screens/DashboardScreen";
import KeywordsScreen from "../screens/KeywordsScreen";
import AIInsightsScreen from "../screens/AIInsightsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CompetitorsScreen from "../screens/CompetitorsScreen";
import SiteAuditScreen from "../screens/SiteAuditScreen";
import SettingsScreen from "../screens/SettingsScreen";
const LazyBillingScreen = React.lazy(() => import("../screens/BillingScreen"));
function BillingScreen(props: any) {
  return (
    <Suspense fallback={<View style={{ flex: 1 }} />}>
      <LazyBillingScreen {...props} />
    </Suspense>
  );
}
import BacklinksScreen from "../screens/BacklinksScreen";
import ContentScreen from "../screens/ContentScreen";
import AIVisibilityScreen from "../screens/AIVisibilityScreen";
import PredictionsScreen from "../screens/PredictionsScreen";
import EntitiesScreen from "../screens/EntitiesScreen";
import AIBriefsScreen from "../screens/AIBriefsScreen";
import OptimizationScreen from "../screens/OptimizationScreen";
import AppStoreScreen from "../screens/AppStoreScreen";
import SearchAIScreen from "../screens/SearchAIScreen";
import SocialIntelligenceScreen from "../screens/SocialIntelligenceScreen";
import ReportsScreen from "../screens/ReportsScreen";
import AdvancedAIScreen from "../screens/AdvancedAIScreen";
import KeywordClustersScreen from "../screens/KeywordClustersScreen";

// ── Param list ───────────────────────────────────────────────────────────────

export type AppStackParamList = {
  Dashboard: undefined;
  Keywords: undefined;
  Compete: undefined;
  Backlinks: undefined;
  SiteAudit: undefined;
  Content: undefined;
  Optimization: undefined;
  KeywordClusters: undefined;
  AIInsights: undefined;
  AIVisibility: undefined;
  Predictions: undefined;
  AIBriefs: undefined;
  AdvancedAI: undefined;
  SearchAI: undefined;
  Entities: undefined;
  AppStore: undefined;
  SocialIntelligence: undefined;
  Profile: undefined;
  Reports: undefined;
  Settings: undefined;
  Billing: undefined;
};

// ── Drawer item config ───────────────────────────────────────────────────────

interface DrawerItem {
  screen: keyof AppStackParamList;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

interface DrawerSection {
  title: string;
  items: DrawerItem[];
}

const DRAWER_SECTIONS: DrawerSection[] = [
  {
    title: "",
    items: [
      { screen: "Dashboard", label: "Dashboard", icon: "home" },
    ],
  },
  {
    title: "SEO TOOLS",
    items: [
      { screen: "Keywords", label: "Keywords", icon: "search" },
      { screen: "Backlinks", label: "Backlinks", icon: "link" },
      { screen: "SiteAudit", label: "Site Audit", icon: "activity" },
      { screen: "Content", label: "Content", icon: "file-text" },
      { screen: "Optimization", label: "Optimization", icon: "sliders" },
      { screen: "KeywordClusters", label: "Keyword Clusters", icon: "layers" },
    ],
  },
  {
    title: "OPTIC RANK",
    items: [
      { screen: "AIInsights", label: "Insights", icon: "zap" },
      { screen: "AIVisibility", label: "Visibility Tracker", icon: "eye" },
      { screen: "Predictions", label: "Predictions", icon: "trending-up" },
      { screen: "Entities", label: "Entities", icon: "tag" },
      { screen: "AIBriefs", label: "Intelligence Briefs", icon: "book-open" },
      { screen: "AdvancedAI", label: "Command Center", icon: "cpu" },
      { screen: "SearchAI", label: "Search Intelligence", icon: "globe" },
      { screen: "Compete", label: "Competitors", icon: "users" },
    ],
  },
  {
    title: "CHANNELS",
    items: [
      { screen: "AppStore", label: "App Store (ASO)", icon: "smartphone" },
      { screen: "SocialIntelligence", label: "Social Intelligence", icon: "share-2" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { screen: "Profile", label: "Profile", icon: "user" },
      { screen: "Settings", label: "Settings", icon: "settings" },
      { screen: "Billing", label: "Billing & Plans", icon: "credit-card" },
      { screen: "Reports", label: "Reports", icon: "bar-chart-2" },
    ],
  },
];

// ── Custom Drawer Content ────────────────────────────────────────────────────

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { colors, isDark } = useTheme();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const insets = useSafeAreaInsets();
  const currentRoute = props.state.routes[props.state.index]?.name;

  return (
    <View style={[drawerStyles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[drawerStyles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <Text style={[drawerStyles.brand, { color: colors.ink }]}>Optic Rank</Text>
        <Text style={[drawerStyles.subtitle, { color: colors.inkMuted }]}>
          {profile?.full_name ?? "SEO Intelligence"}
        </Text>
      </View>

      {/* Navigation */}
      <ScrollView style={drawerStyles.scroll} showsVerticalScrollIndicator={false}>
        {DRAWER_SECTIONS.map((section) => (
          <View key={section.title || "home"} style={drawerStyles.section}>
            {section.title !== "" && (
              <Text style={[drawerStyles.sectionTitle, { color: colors.inkMuted }]}>
                {section.title}
              </Text>
            )}
            {section.items.map((item) => {
              const isActive = currentRoute === item.screen;
              return (
                <TouchableOpacity
                  key={item.screen}
                  style={[
                    drawerStyles.item,
                    isActive && { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
                  ]}
                  onPress={() => props.navigation.navigate(item.screen)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={item.icon}
                    size={16}
                    color={isActive ? "#c0392b" : colors.inkSecondary}
                  />
                  <Text
                    style={[
                      drawerStyles.itemLabel,
                      { color: isActive ? "#c0392b" : colors.ink },
                      isActive && drawerStyles.itemLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Sign out */}
        <TouchableOpacity
          style={drawerStyles.signOut}
          onPress={() => signOut().catch(() => Alert.alert("Error", "Failed to sign out."))}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={16} color={colors.inkMuted} />
          <Text style={[drawerStyles.signOutLabel, { color: colors.inkMuted }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  brand: {
    fontFamily: fonts.serifBlack,
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  section: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
    marginLeft: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 0,
  },
  itemLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  itemLabelActive: {
    fontFamily: fonts.sansBold,
  },
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 32,
  },
  signOutLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
  },
});

// ── Drawer Navigator ─────────────────────────────────────────────────────────

const Drawer = createDrawerNavigator<AppStackParamList>();

export default function AppStack() {
  const { colors } = useTheme();

  const screenOptions = {
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.ink,
    headerTitleStyle: {
      fontFamily: Platform.select({
        ios: "IBMPlexSans-SemiBold",
        android: "IBMPlexSans-SemiBold",
        default: undefined,
      }),
      fontSize: 16,
    },
    drawerType: "slide" as const,
    drawerStyle: {
      width: 260,
      backgroundColor: colors.surface,
    },
  };

  return (
    <Drawer.Navigator
      screenOptions={screenOptions}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* Hub */}
      <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />

      {/* SEO Tools */}
      <Drawer.Screen name="Keywords" component={KeywordsScreen} options={{ title: "Keywords" }} />
      <Drawer.Screen name="Compete" component={CompetitorsScreen} options={{ title: "Competitors" }} />
      <Drawer.Screen name="Backlinks" component={BacklinksScreen} options={{ title: "Backlinks" }} />
      <Drawer.Screen name="SiteAudit" component={SiteAuditScreen} options={{ title: "Site Audit" }} />
      <Drawer.Screen name="Content" component={ContentScreen} options={{ title: "Content" }} />
      <Drawer.Screen name="Optimization" component={OptimizationScreen} options={{ title: "Optimization" }} />
      <Drawer.Screen name="KeywordClusters" component={KeywordClustersScreen} options={{ title: "Keyword Clusters" }} />

      {/* AI Features */}
      <Drawer.Screen name="AIInsights" component={AIInsightsScreen} options={{ title: "Intelligence Hub" }} />
      <Drawer.Screen name="AIVisibility" component={AIVisibilityScreen} options={{ title: "Visibility Tracker" }} />
      <Drawer.Screen name="Predictions" component={PredictionsScreen} options={{ title: "Predictions" }} />
      <Drawer.Screen name="AIBriefs" component={AIBriefsScreen} options={{ title: "Intelligence Briefs" }} />
      <Drawer.Screen name="AdvancedAI" component={AdvancedAIScreen} options={{ title: "Command Center" }} />
      <Drawer.Screen name="SearchAI" component={SearchAIScreen} options={{ title: "Search Intelligence" }} />
      <Drawer.Screen name="Entities" component={EntitiesScreen} options={{ title: "Entities" }} />

      {/* Channels */}
      <Drawer.Screen name="AppStore" component={AppStoreScreen} options={{ title: "App Store" }} />
      <Drawer.Screen name="SocialIntelligence" component={SocialIntelligenceScreen} options={{ title: "Social Intelligence" }} />

      {/* Account */}
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Drawer.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <Drawer.Screen name="Billing" component={BillingScreen} options={{ title: "Billing" }} />
    </Drawer.Navigator>
  );
}
