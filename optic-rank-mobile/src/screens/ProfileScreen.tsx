import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../navigation/AppStack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import SectionLabel from "../components/ui/SectionLabel";
import ProgressBar from "../components/ui/ProgressBar";
import Divider from "../components/ui/Divider";
import Button from "../components/ui/Button";
import LoadingScreen from "../components/ui/LoadingScreen";

import { useProfile, useOrganization, useTeamMembers } from "../hooks/useProfile";
import { useAuth } from "../hooks/useAuth";
import { useActiveProject } from "../hooks/useProjects";
import { useLatestAudit } from "../hooks/useSiteAudit";
import { useKeywordStats } from "../hooks/useKeywords";
import { useCurrentUsage } from "../hooks/useBilling";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ProfileNav = NativeStackNavigationProp<AppStackParamList>;

function getInitials(name: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const TEAM_COLORS = ["#c0392b", "#2c7be5", "#27ae60", "#b8860b", "#8e44ad", "#e67e22"];

function formatPlanLabel(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<ProfileNav>();
  const { signOut } = useAuth();

  // --- Data hooks ---
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: org } = useOrganization();
  const { data: teamMembers } = useTeamMembers(org?.id);
  const { data: project } = useActiveProject();
  const { data: audit } = useLatestAudit(project?.id);
  const { data: keywordStats } = useKeywordStats(project?.id);
  const { data: usage } = useCurrentUsage(org?.id);

  const team = teamMembers ?? [];
  const stats = keywordStats ?? { total: 0, top3Count: 0, avgPosition: 0, upCount: 0, downCount: 0 };

  // --- Loading ---
  if (profileLoading) {
    return <LoadingScreen />;
  }

  // Plan usage calculations
  const projectCount = 1; // active project counts as at least 1
  const maxProjects = org?.max_projects ?? 1;
  const maxKeywords = org?.max_keywords ?? 50;
  const maxUsers = org?.max_users ?? 1;
  const maxPagesCrawl = org?.max_pages_crawl ?? 100;

  const keywordsUsed = stats.total;
  const pagesCrawled = usage?.pages_crawled ?? 0;
  const teamCount = team.length;

  const projectsPct = maxProjects > 0 ? (projectCount / maxProjects) * 100 : 0;
  const keywordsPct = maxKeywords > 0 ? (keywordsUsed / maxKeywords) * 100 : 0;
  const teamPct = maxUsers > 0 ? (teamCount / maxUsers) * 100 : 0;
  const pagesPct = maxPagesCrawl > 0 ? (pagesCrawled / maxPagesCrawl) * 100 : 0;

  const planLabel = formatPlanLabel(org?.plan ?? "free");
  const healthScore = audit?.health_score ?? 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ---------------------------------------------------------- */}
        {/* Profile Header                                              */}
        {/* ---------------------------------------------------------- */}
        <View style={styles.profileHeader}>
          <Avatar
            initials={getInitials(profile?.full_name ?? null)}
            size="lg"
          />
          <Text style={[styles.profileName, { color: colors.ink }]}>
            {profile?.full_name ?? "Unknown User"}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.inkMuted }]}>
            {profile?.id ? `User ID: ${profile.id.slice(0, 8)}...` : ""}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={planLabel} variant="dark" />
            <Badge label={profile?.role ?? "member"} variant="outline" />
          </View>
        </View>

        <Divider variant="thick" />

        <View style={styles.body}>
          {/* ---------------------------------------------------------- */}
          {/* Plan Usage                                                  */}
          {/* ---------------------------------------------------------- */}
          <SectionLabel text="Plan Usage" />
          <Card>
            <UsageRow
              label="Projects"
              used={projectCount}
              max={maxProjects}
              pct={projectsPct}
              barColor={colors.green}
              colors={colors}
            />
            <View style={styles.usageSpacer} />
            <UsageRow
              label="Keywords"
              used={keywordsUsed}
              max={maxKeywords}
              pct={keywordsPct}
              barColor={keywordsPct > 50 ? colors.gold : colors.green}
              colors={colors}
            />
            <View style={styles.usageSpacer} />
            <UsageRow
              label="Team Members"
              used={teamCount}
              max={maxUsers}
              pct={teamPct}
              barColor={colors.green}
              colors={colors}
            />
            <View style={styles.usageSpacer} />
            <UsageRow
              label="Pages Crawled"
              used={pagesCrawled}
              max={maxPagesCrawl}
              pct={pagesPct}
              barColor={colors.green}
              colors={colors}
            />
          </Card>

          {/* ---------------------------------------------------------- */}
          {/* Account                                                     */}
          {/* ---------------------------------------------------------- */}
          <SectionLabel text="Account" style={styles.sectionSpacing} />
          <Card>
            <AccountRow
              label="Settings"
              description="Notifications, theme, integrations"
              onPress={() => navigation.navigate("Settings")}
              colors={colors}
            />
            <Divider />
            <AccountRow
              label="Billing & Plans"
              description={`${planLabel} Plan`}
              onPress={() => navigation.navigate("Billing")}
              colors={colors}
            />
            <Divider />
            <AccountRow
              label="Site Audit"
              description={`Health score: ${healthScore}/100`}
              onPress={() => navigation.navigate("SiteAudit")}
              colors={colors}
            />
            <Divider />
            <AccountRow
              label="Reports"
              description="Scheduled reports & audit history"
              onPress={() => navigation.navigate("Reports")}
              colors={colors}
            />
            <Divider />
            <AccountRow
              label="Team Members"
              description={`${teamCount} member${teamCount !== 1 ? "s" : ""}`}
              onPress={() => Alert.alert("Team Management", "Manage team members from the web dashboard at opticrank.com.")}
              colors={colors}
            />
          </Card>

          {/* ---------------------------------------------------------- */}
          {/* Team                                                        */}
          {/* ---------------------------------------------------------- */}
          {team.length > 0 && (
            <>
              <SectionLabel text="Team" style={styles.sectionSpacing} />
              <Card>
                {team.map((member, index) => (
                  <React.Fragment key={member.id}>
                    {index > 0 && <Divider />}
                    <View style={styles.teamRow}>
                      <Avatar
                        initials={getInitials(member.full_name)}
                        size="sm"
                        color={TEAM_COLORS[index % TEAM_COLORS.length]}
                      />
                      <View style={styles.teamInfo}>
                        <Text style={[styles.teamName, { color: colors.ink }]}>
                          {member.full_name ?? "Unknown"}
                        </Text>
                        <Text style={[styles.teamRole, { color: colors.inkMuted }]}>
                          {member.role}
                        </Text>
                      </View>
                      <Badge
                        label={member.role}
                        variant={member.role === "owner" ? "dark" : "outline"}
                      />
                    </View>
                  </React.Fragment>
                ))}
              </Card>
            </>
          )}

          {/* ---------------------------------------------------------- */}
          {/* Sign Out                                                    */}
          {/* ---------------------------------------------------------- */}
          <View style={styles.signOutWrapper}>
            <Button
              title="Sign Out"
              variant="outline"
              onPress={() => signOut().catch(() => Alert.alert("Error", "Failed to sign out. Please try again."))}
            />
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UsageRow({
  label,
  used,
  max,
  pct,
  barColor,
  colors,
}: {
  label: string;
  used: number;
  max: number;
  pct: number;
  barColor: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <View>
      <View style={styles.usageLabelRow}>
        <Text style={[styles.usageLabel, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.usageValue, { color: colors.ink }]}>
          {used} / {max}
        </Text>
      </View>
      <ProgressBar value={pct} color={barColor} />
    </View>
  );
}

function AccountRow({
  label,
  description,
  onPress,
  colors,
}: {
  label: string;
  description: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  return (
    <TouchableOpacity
      style={styles.accountRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.accountInfo}>
        <Text style={[styles.accountLabel, { color: colors.ink }]}>
          {label}
        </Text>
        <Text style={[styles.accountDesc, { color: colors.inkMuted }]}>
          {description}
        </Text>
      </View>
      <Feather name="chevron-right" size={16} color={colors.inkMuted} />
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Profile header
  profileHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: spacing.screenPadding,
  },
  profileName: {
    fontFamily: fonts.serif,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 12,
  },
  profileEmail: {
    fontFamily: fonts.sans,
    fontSize: 12,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  // Body
  body: {
    paddingHorizontal: spacing.screenPadding,
  },

  sectionSpacing: {
    marginTop: 16,
  },

  // Usage
  usageLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  usageLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
  usageValue: {
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  usageSpacer: {
    height: 12,
  },

  // Account rows
  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  accountInfo: {
    flex: 1,
    marginRight: 12,
  },
  accountLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  accountDesc: {
    fontFamily: fonts.sans,
    fontSize: 10,
    marginTop: 2,
  },

  // Team
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
  },
  teamRole: {
    fontFamily: fonts.sans,
    fontSize: 11,
  },

  // Sign out
  signOutWrapper: {
    marginTop: 24,
  },

  bottomSpacer: {
    height: 100,
  },
});
