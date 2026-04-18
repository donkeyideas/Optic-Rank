/**
 * Option C: Scrollable Top Tabs
 * Horizontally scrollable tab bar at the top with all sections.
 * No bottom bar. Profile accessible via header icon.
 */
import React, { Suspense, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { fonts } from "../theme/typography";

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
  TopTabsHost: undefined;
  Profile: undefined;
  Settings: undefined;
  Billing: undefined;
};

// ── Tab definitions ──────────────────────────────────────────────────────────

interface TabDef {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  component: React.ComponentType<any>;
}

const TABS: TabDef[] = [
  { key: "home", label: "Home", icon: "home", component: DashboardScreen },
  { key: "keywords", label: "Keywords", icon: "search", component: KeywordsScreen },
  { key: "backlinks", label: "Backlinks", icon: "link", component: BacklinksScreen },
  { key: "audit", label: "Site Audit", icon: "activity", component: SiteAuditScreen },
  { key: "content", label: "Content", icon: "file-text", component: ContentScreen },
  { key: "optimization", label: "Optimize", icon: "sliders", component: OptimizationScreen },
  { key: "clusters", label: "Clusters", icon: "layers", component: KeywordClustersScreen },
  { key: "ai", label: "Insights", icon: "zap", component: AIInsightsScreen },
  { key: "visibility", label: "Visibility Tracker", icon: "eye", component: AIVisibilityScreen },
  { key: "predictions", label: "Predictions", icon: "trending-up", component: PredictionsScreen },
  { key: "entities", label: "Entities", icon: "tag", component: EntitiesScreen },
  { key: "briefs", label: "Intelligence Briefs", icon: "book-open", component: AIBriefsScreen },
  { key: "advanced", label: "Command Center", icon: "cpu", component: AdvancedAIScreen },
  { key: "appstore", label: "App Store", icon: "smartphone", component: AppStoreScreen },
  { key: "social", label: "Social", icon: "share-2", component: SocialIntelligenceScreen },
  { key: "searchai", label: "Search Intelligence", icon: "globe", component: SearchAIScreen },
  { key: "compete", label: "Competitors", icon: "users", component: CompetitorsScreen },
  { key: "reports", label: "Reports", icon: "bar-chart-2", component: ReportsScreen },
];

// ── Top Tabs Host ────────────────────────────────────────────────────────────

function TopTabsHost() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const ActiveComponent = TABS[activeTab].component;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header bar */}
      <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={s.headerInner}>
          <Text style={[s.headerTitle, { color: colors.ink }]}>Optic Rank</Text>
          <View style={s.headerIcons}>
            <TouchableOpacity onPress={() => navigation.navigate("Settings")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="settings" size={18} color={colors.inkMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Profile")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="user" size={18} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable tab bar */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabScroll}
          contentContainerStyle={s.tabScrollContent}
        >
          {TABS.map((tab, index) => {
            const isActive = index === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, isActive && { borderBottomColor: "#c0392b", borderBottomWidth: 2 }]}
                onPress={() => setActiveTab(index)}
                activeOpacity={0.7}
              >
                <Feather
                  name={tab.icon}
                  size={14}
                  color={isActive ? "#c0392b" : colors.inkMuted}
                />
                <Text
                  style={[
                    s.tabLabel,
                    { color: isActive ? "#c0392b" : colors.inkMuted },
                    isActive && s.tabLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active screen content */}
      <View style={s.content}>
        <ActiveComponent />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  headerInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: 18,
    fontWeight: "900",
  },
  headerIcons: {
    flexDirection: "row",
    gap: 16,
  },
  tabScroll: {
    marginBottom: -1,
  },
  tabScrollContent: {
    gap: 4,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  tabLabelActive: {
    fontFamily: fonts.sansBold,
  },
  content: {
    flex: 1,
  },
});

// ── Stack navigator ──────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: {
          fontFamily: Platform.select({ ios: "IBMPlexSans-SemiBold", android: "IBMPlexSans-SemiBold", default: undefined }),
          fontSize: 16,
        },
        headerBackButtonDisplayMode: "minimal" as const,
      }}
    >
      <Stack.Screen name="TopTabsHost" component={TopTabsHost} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
      <Stack.Screen name="Billing" component={BillingScreen} options={{ title: "Billing" }} />
    </Stack.Navigator>
  );
}
