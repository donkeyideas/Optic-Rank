import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../theme/ThemeContext";
import { fonts, fontSize } from "../theme/typography";
import { spacing } from "../theme/spacing";
import { supabase } from "../lib/supabase";

import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import SectionLabel from "../components/ui/SectionLabel";
import Divider from "../components/ui/Divider";
import Toggle from "../components/ui/Toggle";
import ProgressBar from "../components/ui/ProgressBar";
import LoadingScreen from "../components/ui/LoadingScreen";
import EmptyState from "../components/ui/EmptyState";
import AppModal from "../components/ui/AppModal";
import KPIBox from "../components/ui/KPIBox";

import { useActiveProject, useProjects } from "../hooks/useProjects";
import { useProfile, useOrganization, useTeamMembers } from "../hooks/useProfile";
import { useAuth } from "../hooks/useAuth";
import { useOrgInvites, useUserApiKeys, useIntegrationSettings } from "../hooks/useQueries";
import { useBillingEvents, useCurrentUsage } from "../hooks/useBilling";

import type { Project, Profile, Organization } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS = ["General", "Projects", "Team", "AI", "API Keys", "Integrations", "Billing", "Security", "Notifications", "Extension"] as const;
type SettingsTab = (typeof TABS)[number];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];

const AI_PROVIDERS = [
  {
    key: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4 Turbo",
    color: "#10a37f",
  },
  {
    key: "anthropic",
    name: "Anthropic",
    description: "Claude 3.5 Sonnet, Claude 3 Opus",
    color: "#d97706",
  },
  {
    key: "gemini",
    name: "Google Gemini",
    description: "Gemini 1.5 Pro, Gemini 1.5 Flash",
    color: "#4285F4",
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek V3, DeepSeek Chat",
    color: "#5865F2",
  },
  {
    key: "perplexity",
    name: "Perplexity",
    description: "Sonar Pro, Sonar",
    color: "#20808d",
  },
] as const;

const INTEGRATIONS = [
  {
    key: "gsc",
    letter: "S",
    color: "#34A853",
    name: "Google Search Console",
    description: "Search performance data",
  },
  {
    key: "ga4",
    letter: "G",
    color: "#4285F4",
    name: "Google Analytics 4",
    description: "Traffic and conversion data",
  },
  {
    key: "gpc",
    letter: "P",
    color: "#EA4335",
    name: "Google Play Console",
    description: "Android app analytics",
  },
] as const;

import { APP_CONFIG } from "../lib/config";
import { openURL } from "../lib/openURL";

const WEB_BASE = APP_CONFIG.WEB_SETTINGS_URL;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function planBadgeVariant(plan: string | undefined): "dark" | "blue" | "gold" | "green" | "outline" {
  switch (plan) {
    case "free":
      return "dark";
    case "starter":
      return "blue";
    case "pro":
      return "gold";
    case "business":
      return "gold";
    case "enterprise":
      return "green";
    default:
      return "outline";
  }
}

function statusBadgeVariant(status: string | undefined): "green" | "blue" | "gold" | "red" | "outline" {
  switch (status) {
    case "active":
      return "green";
    case "trialing":
      return "blue";
    case "past_due":
      return "gold";
    case "canceled":
    case "paused":
      return "red";
    default:
      return "outline";
  }
}

function roleBadgeVariant(role: string | undefined): "gold" | "red" | "dark" | "outline" {
  switch (role) {
    case "owner":
      return "gold";
    case "admin":
      return "red";
    case "member":
      return "dark";
    case "viewer":
      return "outline";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function ToggleRow({
  name,
  description,
  value,
  onToggle,
}: {
  name: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <Text style={[styles.toggleName, { color: colors.ink }]}>{name}</Text>
        <Text style={[styles.toggleDesc, { color: colors.inkMuted }]}>{description}</Text>
      </View>
      <Toggle value={value} onToggle={onToggle} />
    </View>
  );
}

function SettingsRow({
  label,
  onPress,
  isDestructive = false,
}: {
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <Text
        style={[
          styles.settingsRowLabel,
          { color: isDestructive ? colors.red : colors.ink },
        ]}
      >
        {label}
      </Text>
      <Feather name="chevron-right" size={16} color={colors.inkMuted} />
    </TouchableOpacity>
  );
}

function WebCTA({
  title,
  url,
  variant = "outline",
}: {
  title: string;
  url: string;
  variant?: "outline" | "primary" | "sm-outline";
}) {
  return (
    <View style={styles.sectionSpacing}>
      <Button
        title={title}
        onPress={() => openURL(url)}
        variant={variant}
      />
    </View>
  );
}

function UsageBar({
  label,
  used,
  max,
  color,
  colors,
}: {
  label: string;
  used: number;
  max: number;
  color: string;
  colors: any;
}) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;

  return (
    <View style={styles.usageBarContainer}>
      <View style={styles.usageBarHeader}>
        <Text style={[styles.usageBarLabel, { color: colors.ink }]}>{label}</Text>
        <Text style={[styles.usageBarCount, { color: colors.inkSecondary }]}>
          {used}/{max}
        </Text>
      </View>
      <ProgressBar value={pct} color={color} />
    </View>
  );
}

// ===========================================================================
// MAIN COMPONENT
// ===========================================================================

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, signOut, deleteAccount } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [refreshing, setRefreshing] = useState(false);

  // Data hooks
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: org, isLoading: orgLoading, refetch: refetchOrg } = useOrganization();
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: activeProject } = useActiveProject();

  const orgId = profile?.organization_id ?? undefined;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProfile(), refetchOrg(), refetchProjects()]);
    setRefreshing(false);
  }, [refetchProfile, refetchOrg, refetchProjects]);

  if (profileLoading || orgLoading) {
    return <LoadingScreen />;
  }

  // ---------------------------------------------------------------------------
  // Sign out handler
  // ---------------------------------------------------------------------------

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, all projects, and all associated data. This action cannot be undone.\n\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            // Second confirmation
            Alert.alert(
              "Final Confirmation",
              "Type DELETE to confirm. This is irreversible.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete Everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                    } catch (e: any) {
                      Alert.alert(
                        "Deletion Failed",
                        e.message ?? "Could not delete account. Please try again or contact support@opticrank.com."
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------------------------
  // Tab content dispatcher
  // ---------------------------------------------------------------------------

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return (
          <GeneralTab
            profile={profile}
            org={org}
            user={user}
            isDark={isDark}
            toggleTheme={toggleTheme}
            onSignOut={handleSignOut}
          />
        );
      case "Projects":
        return (
          <ProjectsTab
            projects={projects ?? []}
            activeProject={activeProject}
          />
        );
      case "Team":
        return <TeamTab orgId={orgId} />;
      case "AI":
        return <AIProvidersTab orgId={orgId} />;
      case "API Keys":
        return <APIKeysTab orgId={orgId} />;
      case "Integrations":
        return <IntegrationsTab orgId={orgId} />;
      case "Billing":
        return <BillingTab org={org} orgId={orgId} />;
      case "Security":
        return <SecurityTab onDeleteAccount={handleDeleteAccount} />;
      case "Notifications":
        return <NotificationsTab />;
      case "Extension":
        return <ExtensionTab />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBarContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabPill,
                  isActive && { borderBottomColor: colors.red, borderBottomWidth: 2 },
                ]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isActive ? colors.ink : colors.inkMuted },
                    isActive && { fontFamily: fonts.sansBold },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab content */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.red} />
        }
      >
        <View style={styles.body}>{renderTabContent()}</View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// ===========================================================================
// TAB 1: General
// ===========================================================================

function GeneralTab({
  profile,
  org,
  user,
  isDark,
  toggleTheme,
  onSignOut,
}: {
  profile: Profile | null | undefined;
  org: Organization | null | undefined;
  user: any;
  isDark: boolean;
  toggleTheme: () => void;
  onSignOut: () => void;
}) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Editable fields
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.full_name ?? "");
  const [savingName, setSavingName] = useState(false);

  const [editingOrgName, setEditingOrgName] = useState(false);
  const [orgNameValue, setOrgNameValue] = useState(org?.name ?? "");
  const [savingOrgName, setSavingOrgName] = useState(false);

  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState(profile?.timezone ?? "UTC");
  const [savingTimezone, setSavingTimezone] = useState(false);

  const [compactView, setCompactView] = useState(false);

  useEffect(() => {
    setNameValue(profile?.full_name ?? "");
    setOrgNameValue(org?.name ?? "");
    setSelectedTimezone(profile?.timezone ?? "UTC");
  }, [profile?.full_name, org?.name, profile?.timezone]);

  const saveName = async () => {
    if (!profile?.id || !nameValue.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: nameValue.trim() })
        .eq("id", profile.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingName(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save name");
    } finally {
      setSavingName(false);
    }
  };

  const saveOrgName = async () => {
    if (!org?.id || !orgNameValue.trim()) return;
    setSavingOrgName(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: orgNameValue.trim() })
        .eq("id", org.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setEditingOrgName(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save organization name");
    } finally {
      setSavingOrgName(false);
    }
  };

  const saveTimezone = async (tz: string) => {
    if (!profile?.id) return;
    setSavingTimezone(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ timezone: tz })
        .eq("id", profile.id);
      if (error) throw error;
      setSelectedTimezone(tz);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setShowTimezonePicker(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save timezone");
    } finally {
      setSavingTimezone(false);
    }
  };

  return (
    <>
      {/* ---- Account Section ---- */}
      <SectionLabel text="Account" />
      <Card>
        {/* Full Name */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Full Name</Text>
          {editingName ? (
            <View style={styles.inlineEditRow}>
              <TextInput
                value={nameValue}
                onChangeText={setNameValue}
                style={[
                  styles.inlineInput,
                  { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surfaceInset },
                ]}
                autoFocus
              />
              <TouchableOpacity onPress={saveName} disabled={savingName} activeOpacity={0.7}>
                {savingName ? (
                  <ActivityIndicator size="small" color={colors.green} />
                ) : (
                  <Feather name="check" size={16} color={colors.green} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setNameValue(profile?.full_name ?? "");
                  setEditingName(false);
                }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={16} color={colors.red} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)} style={styles.fieldValueRow} activeOpacity={0.7}>
              <Text style={[styles.fieldValue, { color: colors.ink }]}>
                {profile?.full_name ?? "Not set"}
              </Text>
              <Feather name="edit-2" size={12} color={colors.inkMuted} />
            </TouchableOpacity>
          )}
        </View>

        <Divider />

        {/* Email */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Email</Text>
          <Text style={[styles.fieldValue, { color: colors.ink }]}>
            {user?.email ?? "N/A"}
          </Text>
        </View>

        <Divider />

        {/* Timezone */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Timezone</Text>
          <TouchableOpacity
            onPress={() => setShowTimezonePicker(true)}
            style={styles.fieldValueRow}
            activeOpacity={0.7}
          >
            <Text style={[styles.fieldValueMono, { color: colors.ink }]}>
              {selectedTimezone}
            </Text>
            <Feather name="chevron-down" size={12} color={colors.inkMuted} />
          </TouchableOpacity>
        </View>

        <Divider />

        {/* Role */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Role</Text>
          <Badge
            label={(profile?.role ?? "member").toUpperCase()}
            variant={roleBadgeVariant(profile?.role)}
          />
        </View>
      </Card>

      {/* ---- Organization Section ---- */}
      <SectionLabel text="Organization" style={styles.sectionSpacing} />
      <Card>
        {/* Org Name */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Name</Text>
          {editingOrgName ? (
            <View style={styles.inlineEditRow}>
              <TextInput
                value={orgNameValue}
                onChangeText={setOrgNameValue}
                style={[
                  styles.inlineInput,
                  { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surfaceInset },
                ]}
                autoFocus
              />
              <TouchableOpacity onPress={saveOrgName} disabled={savingOrgName} activeOpacity={0.7}>
                {savingOrgName ? (
                  <ActivityIndicator size="small" color={colors.green} />
                ) : (
                  <Feather name="check" size={16} color={colors.green} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setOrgNameValue(org?.name ?? "");
                  setEditingOrgName(false);
                }}
                activeOpacity={0.7}
              >
                <Feather name="x" size={16} color={colors.red} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingOrgName(true)} style={styles.fieldValueRow} activeOpacity={0.7}>
              <Text style={[styles.fieldValue, { color: colors.ink }]}>
                {org?.name ?? "Not set"}
              </Text>
              <Feather name="edit-2" size={12} color={colors.inkMuted} />
            </TouchableOpacity>
          )}
        </View>

        <Divider />

        {/* Slug */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Slug</Text>
          <Text style={[styles.fieldValueMono, { color: colors.inkMuted }]}>
            {org?.slug ?? "N/A"}
          </Text>
        </View>

        <Divider />

        {/* Plan */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Plan</Text>
          <Badge
            label={(org?.plan ?? "free").toUpperCase()}
            variant={planBadgeVariant(org?.plan)}
          />
        </View>

        <Divider />

        {/* Subscription Status */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: colors.inkSecondary }]}>Status</Text>
          <Badge
            label={(org?.subscription_status ?? "unknown").toUpperCase()}
            variant={statusBadgeVariant(org?.subscription_status)}
          />
        </View>
      </Card>

      {/* ---- Appearance Section ---- */}
      <SectionLabel text="Appearance" style={styles.sectionSpacing} />
      <Card>
        <ToggleRow
          name="Dark Mode"
          description="Switch between light and dark theme"
          value={isDark}
          onToggle={toggleTheme}
        />
        <Divider />
        <ToggleRow
          name="Compact View"
          description="Reduce spacing and font sizes throughout the app"
          value={compactView}
          onToggle={() => setCompactView(!compactView)}
        />
      </Card>

      {/* ---- Sign Out ---- */}
      <View style={styles.sectionSpacing}>
        <Button title="Sign Out" onPress={onSignOut} variant="red" />
      </View>

      {/* Timezone Picker Modal */}
      <AppModal
        visible={showTimezonePicker}
        onClose={() => setShowTimezonePicker(false)}
        title="Select Timezone"
        variant="info"
        buttons={[{ label: "Cancel", onPress: () => setShowTimezonePicker(false), variant: "outline" }]}
      >
        <ScrollView style={styles.pickerList} nestedScrollEnabled>
          {TIMEZONES.map((tz) => (
            <TouchableOpacity
              key={tz}
              style={[
                styles.pickerItem,
                selectedTimezone === tz && { backgroundColor: colors.surfaceInset },
              ]}
              onPress={() => saveTimezone(tz)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  { color: selectedTimezone === tz ? colors.red : colors.ink },
                ]}
              >
                {tz}
              </Text>
              {selectedTimezone === tz && (
                <Feather name="check" size={14} color={colors.red} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </AppModal>
    </>
  );
}

// ===========================================================================
// TAB 2: Projects
// ===========================================================================

function ProjectsTab({
  projects,
  activeProject,
}: {
  projects: Project[];
  activeProject: Project | null | undefined;
}) {
  const { colors } = useTheme();

  const typeBadgeVariant = (type: string | undefined): "dark" | "blue" | "green" | "gold" | "outline" => {
    switch (type) {
      case "website":
        return "dark";
      case "ios_app":
        return "blue";
      case "android_app":
        return "green";
      case "both":
        return "gold";
      default:
        return "outline";
    }
  };

  return (
    <>
      <SectionLabel text="Active Project" />

      {activeProject ? (
        <Card>
          <View style={styles.projectCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.projectName, { color: colors.ink }]}>
                {activeProject.name}
              </Text>
              {activeProject.domain && (
                <Text style={[styles.projectDomain, { color: colors.inkMuted }]}>
                  {activeProject.domain}
                </Text>
              )}
            </View>
            <View style={styles.badgeRow}>
              <Badge
                label={activeProject.type.replace("_", " ").toUpperCase()}
                variant={typeBadgeVariant(activeProject.type)}
              />
              <Badge label="ACTIVE" variant="green" />
            </View>
          </View>

          <Divider />

          <View style={styles.projectDetail}>
            <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Domain</Text>
            <Text style={[styles.detailValueMono, { color: colors.ink }]}>
              {activeProject.domain ?? "N/A"}
            </Text>
          </View>

          <View style={styles.projectDetail}>
            <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>Created</Text>
            <Text style={[styles.detailValueMono, { color: colors.ink }]}>
              {formatDate(activeProject.created_at)}
            </Text>
          </View>

          {activeProject.url && (
            <View style={styles.projectDetail}>
              <Text style={[styles.detailLabel, { color: colors.inkSecondary }]}>URL</Text>
              <Text style={[styles.detailValueMono, { color: colors.ink }]} numberOfLines={1}>
                {activeProject.url}
              </Text>
            </View>
          )}
        </Card>
      ) : (
        <EmptyState
          title="No Active Project"
          message="Set an active project to start tracking SEO performance."
          icon={<Feather name="folder" size={32} color={colors.inkMuted} />}
        />
      )}

      {/* Other projects summary */}
      {projects.length > 1 && (
        <>
          <SectionLabel text="All Projects" style={styles.sectionSpacing} />
          <Card>
            {projects.map((project, index) => (
              <React.Fragment key={project.id}>
                {index > 0 && <Divider />}
                <View style={styles.projectListRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.projectListName, { color: colors.ink }]}>
                      {project.name}
                    </Text>
                    {project.domain && (
                      <Text style={[styles.projectListDomain, { color: colors.inkMuted }]}>
                        {project.domain}
                      </Text>
                    )}
                  </View>
                  <View style={styles.badgeRow}>
                    <Badge
                      label={project.type.replace("_", " ").toUpperCase()}
                      variant={typeBadgeVariant(project.type)}
                    />
                    {project.is_active && <Badge label="ACTIVE" variant="green" />}
                  </View>
                </View>
              </React.Fragment>
            ))}
          </Card>
        </>
      )}

      {/* Note */}
      <Card variant="sm" style={styles.sectionSpacing}>
        <View style={styles.noteRow}>
          <Feather name="info" size={14} color={colors.inkMuted} />
          <Text style={[styles.noteText, { color: colors.inkMuted }]}>
            Project creation and management is available on the web dashboard.
          </Text>
        </View>
      </Card>

      <WebCTA title="Manage Projects" url={`${WEB_BASE}/projects`} />
    </>
  );
}

// ===========================================================================
// TAB 3: Team
// ===========================================================================

function TeamTab({ orgId }: { orgId: string | undefined }) {
  const { colors } = useTheme();
  const { data: members, isLoading: membersLoading } = useTeamMembers(orgId);
  const { data: invites, isLoading: invitesLoading } = useOrgInvites(orgId);

  const memberCount = members?.length ?? 0;
  const inviteCount = invites?.length ?? 0;

  if (membersLoading) return <LoadingScreen />;

  return (
    <>
      {/* Summary KPIs */}
      <View style={styles.kpiRow}>
        <KPIBox value={String(memberCount)} label="Members" />
        <KPIBox value={String(inviteCount)} label="Pending" />
      </View>

      {/* ---- Team Members ---- */}
      <SectionLabel text="Team Members" style={styles.sectionSpacing} />

      {memberCount === 0 ? (
        <EmptyState
          title="No Team Members"
          message="Invite your team to collaborate on SEO projects."
          icon={<Feather name="users" size={32} color={colors.inkMuted} />}
        />
      ) : (
        <Card>
          {members?.map((member, index) => (
            <React.Fragment key={member.id}>
              {index > 0 && <Divider />}
              <View style={styles.memberRow}>
                <View style={[styles.avatarCircle, { backgroundColor: colors.red }]}>
                  <Text style={styles.avatarLetter}>
                    {(member.full_name ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.ink }]}>
                    {member.full_name ?? "Unnamed"}
                  </Text>
                  <Text style={[styles.memberMeta, { color: colors.inkMuted }]}>
                    Joined {formatDate(member.created_at)}
                  </Text>
                </View>
                <Badge
                  label={(member.role ?? "member").toUpperCase()}
                  variant={roleBadgeVariant(member.role)}
                />
              </View>
            </React.Fragment>
          ))}
        </Card>
      )}

      {/* ---- Pending Invitations ---- */}
      {inviteCount > 0 && (
        <>
          <SectionLabel text="Pending Invitations" style={styles.sectionSpacing} />
          <Card>
            {invites?.map((invite: any, index: number) => (
              <React.Fragment key={invite.id}>
                {index > 0 && <Divider />}
                <View style={styles.memberRow}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.gold }]}>
                    <Feather name="mail" size={12} color="#ffffff" />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.ink }]}>
                      {invite.email}
                    </Text>
                    <Text style={[styles.memberMeta, { color: colors.inkMuted }]}>
                      Sent {formatDate(invite.created_at)}
                    </Text>
                  </View>
                  <Badge
                    label={(invite.status ?? "pending").toUpperCase()}
                    variant={invite.status === "pending" ? "gold" : "outline"}
                  />
                </View>
              </React.Fragment>
            ))}
          </Card>
        </>
      )}

      <WebCTA title="Manage Team" url={`${WEB_BASE}/team`} />
    </>
  );
}

// ===========================================================================
// TAB 4: AI Providers
// ===========================================================================

function AIProvidersTab({ orgId }: { orgId: string | undefined }) {
  const { colors } = useTheme();

  // Load existing provider configs to determine status
  const [providerStatuses, setProviderStatuses] = useState<Record<string, boolean>>({});
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoadingConfigs(false);
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("api_configs")
          .select("provider, is_active")
          .eq("organization_id", orgId);
        if (error) throw error;
        const statuses: Record<string, boolean> = {};
        (data ?? []).forEach((row: any) => {
          statuses[row.provider] = row.is_active === true;
        });
        setProviderStatuses(statuses);
      } catch {
        // Silently fail -- just show "not configured" for all
      } finally {
        setLoadingConfigs(false);
      }
    })();
  }, [orgId]);

  if (loadingConfigs) return <LoadingScreen />;

  return (
    <>
      <SectionLabel text="AI Providers" />
      <Text style={[styles.sectionSubtitle, { color: colors.inkMuted }]}>
        AI provider configurations power content generation, analysis, and recommendations across the platform.
      </Text>

      {AI_PROVIDERS.map((provider) => {
        const isConfigured = providerStatuses[provider.key] === true;

        return (
          <Card key={provider.key}>
            <View style={styles.providerHeader}>
              <View style={[styles.providerIcon, { backgroundColor: provider.color }]}>
                <Text style={styles.providerIconLetter}>
                  {provider.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.providerName, { color: colors.ink }]}>
                  {provider.name}
                </Text>
                <Text style={[styles.providerDesc, { color: colors.inkMuted }]}>
                  {provider.description}
                </Text>
              </View>
              <Badge
                label={isConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
                variant={isConfigured ? "green" : "outline"}
              />
            </View>
          </Card>
        );
      })}

      {/* Note */}
      <Card variant="sm" style={styles.sectionSpacing}>
        <View style={styles.noteRow}>
          <Feather name="lock" size={14} color={colors.inkMuted} />
          <Text style={[styles.noteText, { color: colors.inkMuted }]}>
            API key management is handled on the web dashboard for security.
          </Text>
        </View>
      </Card>

      <WebCTA title="Configure on Web" url={`${WEB_BASE}/ai`} />
    </>
  );
}

// ===========================================================================
// TAB 5: API Keys
// ===========================================================================

function APIKeysTab({ orgId }: { orgId: string | undefined }) {
  const { colors } = useTheme();
  const { data: apiKeys, isLoading } = useUserApiKeys(orgId);

  if (isLoading) return <LoadingScreen />;

  return (
    <>
      <SectionLabel text="API Keys" />

      {(!apiKeys || apiKeys.length === 0) ? (
        <EmptyState
          title="No API Keys"
          message="Create API keys on the web dashboard to integrate with external services."
          icon={<Feather name="key" size={32} color={colors.inkMuted} />}
        />
      ) : (
        apiKeys.map((key: any) => (
          <Card key={key.id}>
            <View style={styles.apiKeyHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.apiKeyName, { color: colors.ink }]}>
                  {key.name}
                </Text>
                <Text style={[styles.apiKeyPrefix, { color: colors.inkMuted }]}>
                  {key.key_prefix}****
                </Text>
              </View>
              <Badge
                label={key.is_active ? "ACTIVE" : "INACTIVE"}
                variant={key.is_active ? "green" : "outline"}
              />
            </View>

            {/* Scopes */}
            {key.scopes && key.scopes.length > 0 && (
              <View style={styles.scopeRow}>
                {key.scopes.map((scope: string, i: number) => (
                  <Badge key={i} label={scope.toUpperCase()} variant="outline" />
                ))}
              </View>
            )}

            {/* Metadata */}
            <View style={styles.apiKeyMeta}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.inkSecondary }]}>Last Used</Text>
                <Text style={[styles.metaValue, { color: colors.ink }]}>
                  {formatDate(key.last_used_at)}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.inkSecondary }]}>Expires</Text>
                <Text style={[styles.metaValue, { color: colors.ink }]}>
                  {key.expires_at ? formatDate(key.expires_at) : "Never"}
                </Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Note */}
      <Card variant="sm" style={styles.sectionSpacing}>
        <View style={styles.noteRow}>
          <Feather name="lock" size={14} color={colors.inkMuted} />
          <Text style={[styles.noteText, { color: colors.inkMuted }]}>
            API key creation and deletion is handled on the web dashboard for security.
          </Text>
        </View>
      </Card>

      <WebCTA title="Manage API Keys" url={`${WEB_BASE}/api-keys`} />
    </>
  );
}

// ===========================================================================
// TAB 6: Integrations
// ===========================================================================

function IntegrationsTab({ orgId }: { orgId: string | undefined }) {
  const { colors } = useTheme();
  const { data: integrationSettings } = useIntegrationSettings(orgId);

  const getConnectionStatus = (key: string): { connected: boolean; info?: string } => {
    if (!integrationSettings) return { connected: false };
    const settings = integrationSettings as any;
    switch (key) {
      case "ga4":
        return {
          connected: !!settings.ga4_property_id,
          info: settings.ga4_property_id ? `Property: ${settings.ga4_property_id}` : undefined,
        };
      case "gsc":
        return {
          connected: !!settings.gsc_site_url,
          info: settings.gsc_site_url ? `Site: ${settings.gsc_site_url}` : undefined,
        };
      case "gpc":
        return {
          connected: !!settings.gpc_package_name,
          info: settings.gpc_package_name ? `Package: ${settings.gpc_package_name}` : undefined,
        };
      default:
        return { connected: false };
    }
  };

  return (
    <>
      <SectionLabel text="Integrations" />
      <Text style={[styles.sectionSubtitle, { color: colors.inkMuted }]}>
        Connect third-party services to enrich your SEO data and analytics.
      </Text>

      {INTEGRATIONS.map((integration) => {
        const status = getConnectionStatus(integration.key);

        return (
          <Card key={integration.key}>
            <View style={styles.integrationRow}>
              <View style={[styles.integrationIcon, { backgroundColor: integration.color }]}>
                <Text style={styles.integrationLetter}>{integration.letter}</Text>
              </View>
              <View style={styles.integrationInfo}>
                <Text style={[styles.integrationName, { color: colors.ink }]}>
                  {integration.name}
                </Text>
                <Text style={[styles.integrationDesc, { color: colors.inkMuted }]}>
                  {integration.description}
                </Text>
                {status.connected && status.info && (
                  <Text style={[styles.integrationMeta, { color: colors.inkSecondary }]}>
                    {status.info}
                  </Text>
                )}
              </View>
              <Badge
                label={status.connected ? "ACTIVE" : "NOT CONNECTED"}
                variant={status.connected ? "green" : "outline"}
              />
            </View>

            {!status.connected && (
              <View style={{ marginTop: 8 }}>
                <Button
                  title="Connect on Web"
                  onPress={() =>
                    openURL(
                      `${WEB_BASE}/integrations?connect=${integration.key}`
                    )
                  }
                  variant="sm-outline"
                />
              </View>
            )}
          </Card>
        );
      })}
    </>
  );
}

// ===========================================================================
// TAB 7: Billing
// ===========================================================================

function BillingTab({
  org,
  orgId,
}: {
  org: Organization | null | undefined;
  orgId: string | undefined;
}) {
  const { colors } = useTheme();
  const { data: billingEvents, isLoading: eventsLoading } = useBillingEvents(orgId);
  const { data: currentUsage } = useCurrentUsage(orgId);
  const { data: projects } = useProjects();
  const { data: members } = useTeamMembers(org?.id);

  const planPrice = (() => {
    switch (org?.plan) {
      case "starter":
        return "$29/mo";
      case "pro":
        return "$79/mo";
      case "business":
        return "$199/mo";
      case "enterprise":
        return "Custom";
      default:
        return "Free";
    }
  })();

  // Usage calculations
  const projectsUsed = projects?.length ?? 0;
  const maxProjects = org?.max_projects ?? 1;
  const keywordsUsed = currentUsage?.keywords_used ?? 0;
  const maxKeywords = org?.max_keywords ?? 50;
  const pagesCrawled = currentUsage?.pages_crawled ?? 0;
  const maxPages = org?.max_pages_crawl ?? 100;
  const membersUsed = members?.length ?? 1;
  const maxMembers = org?.max_users ?? 1;

  return (
    <>
      {/* ---- Current Plan ---- */}
      <SectionLabel text="Current Plan" />
      <Card>
        <View style={styles.planHeader}>
          <View>
            <Text style={[styles.planName, { color: colors.ink }]}>
              {(org?.plan ?? "free").charAt(0).toUpperCase() + (org?.plan ?? "free").slice(1)} Plan
            </Text>
            <Text style={[styles.planPrice, { color: colors.inkSecondary }]}>{planPrice}</Text>
          </View>
          <Badge
            label={(org?.subscription_status ?? "unknown").toUpperCase()}
            variant={statusBadgeVariant(org?.subscription_status)}
          />
        </View>
        {org?.trial_ends_at && org?.subscription_status === "trialing" && (
          <View style={styles.trialRow}>
            <Feather name="clock" size={12} color={colors.gold} />
            <Text style={[styles.trialText, { color: colors.gold }]}>
              Trial ends: {formatDate(org.trial_ends_at)}
            </Text>
          </View>
        )}
      </Card>

      {/* ---- Usage ---- */}
      <SectionLabel text="Usage" style={styles.sectionSpacing} />
      <Card>
        <UsageBar label="Projects" used={projectsUsed} max={maxProjects} color={colors.blue} colors={colors} />
        <Divider />
        <UsageBar label="Keywords" used={keywordsUsed} max={maxKeywords} color={colors.green} colors={colors} />
        <Divider />
        <UsageBar label="Pages Crawled" used={pagesCrawled} max={maxPages} color={colors.red} colors={colors} />
        <Divider />
        <UsageBar label="Team Members" used={membersUsed} max={maxMembers} color={colors.gold} colors={colors} />
      </Card>

      {/* ---- Billing History ---- */}
      <SectionLabel text="Billing History" style={styles.sectionSpacing} />
      {eventsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.red} />
        </View>
      ) : !billingEvents || billingEvents.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.inkMuted }]}>
            No billing events yet.
          </Text>
        </Card>
      ) : (
        <Card>
          {billingEvents.map((event: any, index: number) => (
            <React.Fragment key={event.id ?? index}>
              {index > 0 && <Divider />}
              <View style={styles.billingEventRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.billingEventType, { color: colors.ink }]}>
                    {(event.event_type ?? event.description ?? "payment").replace(/_/g, " ")}
                  </Text>
                  <Text style={[styles.billingEventDate, { color: colors.inkMuted }]}>
                    {formatDate(event.created_at)}
                  </Text>
                </View>
                {event.amount != null && (
                  <Text style={[styles.billingAmount, { color: colors.ink }]}>
                    ${(event.amount / 100).toFixed(2)}
                  </Text>
                )}
              </View>
            </React.Fragment>
          ))}
        </Card>
      )}

      <WebCTA title="Manage Subscription" url={`${WEB_BASE}/billing`} />
    </>
  );
}

// ===========================================================================
// TAB 8: Security
// ===========================================================================

function SecurityTab({ onDeleteAccount }: { onDeleteAccount: () => void }) {
  const { colors } = useTheme();

  return (
    <>
      {/* ---- MFA ---- */}
      <SectionLabel text="Two-Factor Authentication" />
      <Card>
        <View style={styles.securityRow}>
          <View style={[styles.securityIcon, { backgroundColor: colors.ink }]}>
            <Feather name="shield" size={14} color={colors.surface} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.securityTitle, { color: colors.ink }]}>
              Multi-Factor Authentication
            </Text>
            <Text style={[styles.securityDesc, { color: colors.inkMuted }]}>
              Add an extra layer of security to your account by requiring a second form of verification.
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Button
            title="Enable 2FA"
            onPress={() => openURL(`${WEB_BASE}/security`)}
            variant="sm-outline"
          />
        </View>
      </Card>

      {/* ---- Password ---- */}
      <SectionLabel text="Password" style={styles.sectionSpacing} />
      <Card>
        <View style={styles.securityRow}>
          <View style={[styles.securityIcon, { backgroundColor: colors.gold }]}>
            <Feather name="lock" size={14} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.securityTitle, { color: colors.ink }]}>Change Password</Text>
            <Text style={[styles.securityDesc, { color: colors.inkMuted }]}>
              Update your password on the web dashboard for security.
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Button
            title="Change Password"
            onPress={() => openURL(`${WEB_BASE}/security`)}
            variant="sm-outline"
          />
        </View>
      </Card>

      {/* ---- Active Sessions ---- */}
      <SectionLabel text="Active Sessions" style={styles.sectionSpacing} />
      <Card>
        <View style={styles.securityRow}>
          <View style={[styles.sessionIcon, { backgroundColor: colors.green }]}>
            <Feather name="smartphone" size={14} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.securityTitle, { color: colors.ink }]}>Current Device</Text>
            <Text style={[styles.securityDesc, { color: colors.inkMuted }]}>
              OpticRank Mobile -- Active now
            </Text>
          </View>
          <Badge label="CURRENT" variant="green" />
        </View>
      </Card>

      <Card variant="sm" style={styles.sectionSpacing}>
        <View style={styles.noteRow}>
          <Feather name="info" size={14} color={colors.inkMuted} />
          <Text style={[styles.noteText, { color: colors.inkMuted }]}>
            View and manage all active sessions from the web dashboard.
          </Text>
        </View>
      </Card>

      {/* ---- Danger Zone ---- */}
      <SectionLabel text="Danger Zone" style={styles.sectionSpacing} />
      <Card>
        <SettingsRow
          label="Export All Data"
          onPress={() => openURL(`${WEB_BASE}`)}
          isDestructive={false}
        />
        <Divider />
        <SettingsRow
          label="Delete Account"
          onPress={onDeleteAccount}
          isDestructive
        />
      </Card>
    </>
  );
}

// ===========================================================================
// TAB 9: Notifications
// ===========================================================================

function NotificationsTab() {
  const { colors } = useTheme();

  // Local state toggles (would persist via AsyncStorage / Supabase in production)
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailReports, setEmailReports] = useState(true);
  const [rankDropAlerts, setRankDropAlerts] = useState(true);
  const [competitorAlerts, setCompetitorAlerts] = useState(false);
  const [appStoreAlerts, setAppStoreAlerts] = useState(true);
  const [socialMediaAlerts, setSocialMediaAlerts] = useState(false);

  return (
    <>
      <SectionLabel text="Notification Preferences" />
      <Card>
        <ToggleRow
          name="Push Notifications"
          description="Receive push alerts for important updates"
          value={pushNotifications}
          onToggle={() => setPushNotifications(!pushNotifications)}
        />
        <Divider />
        <ToggleRow
          name="Email Reports"
          description="Weekly email performance summaries"
          value={emailReports}
          onToggle={() => setEmailReports(!emailReports)}
        />
        <Divider />
        <ToggleRow
          name="Rank Drop Alerts"
          description="Get notified when rankings drop significantly"
          value={rankDropAlerts}
          onToggle={() => setRankDropAlerts(!rankDropAlerts)}
        />
        <Divider />
        <ToggleRow
          name="Competitor Alerts"
          description="Alerts when competitors make moves"
          value={competitorAlerts}
          onToggle={() => setCompetitorAlerts(!competitorAlerts)}
        />
        <Divider />
        <ToggleRow
          name="App Store Alerts"
          description="Notifications for app store ranking and review changes"
          value={appStoreAlerts}
          onToggle={() => setAppStoreAlerts(!appStoreAlerts)}
        />
        <Divider />
        <ToggleRow
          name="Social Media Alerts"
          description="Alerts for social media performance and engagement changes"
          value={socialMediaAlerts}
          onToggle={() => setSocialMediaAlerts(!socialMediaAlerts)}
        />
      </Card>
    </>
  );
}

// ===========================================================================
// Extension Tab
// ===========================================================================

function ExtensionTab() {
  const { colors } = useTheme();

  const features = [
    "On-page SEO analysis for any webpage",
    "Quick keyword lookup and SERP preview",
    "Competitor domain metrics at a glance",
    "One-click site audit for current page",
  ];

  return (
    <>
      <SectionLabel text="Browser Extension" />
      <Card>
        <Text
          style={{
            fontFamily: fonts.serifBlack,
            fontSize: fontSize.lg,
            color: colors.ink,
            marginBottom: 8,
          }}
        >
          Optic Rank Browser Extension
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSize.sm,
            color: colors.inkSecondary,
            lineHeight: 22,
            marginBottom: 16,
          }}
        >
          Get SEO insights directly in your browser. View keyword data, check
          page health, and analyze competitors without leaving the page you're
          visiting.
        </Text>

        <View style={{ marginBottom: 16 }}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: fontSize.sm,
                  color: colors.inkSecondary,
                  marginRight: 8,
                  lineHeight: 22,
                }}
              >
                {"\u2022"}
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: fontSize.sm,
                  color: colors.ink,
                  lineHeight: 22,
                  flex: 1,
                }}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginBottom: 12 }}>
          <Badge label="Coming Soon" variant="gold" />
        </View>

        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: fontSize.sm,
            color: colors.inkSecondary,
            lineHeight: 20,
          }}
        >
          The browser extension is currently in development. Sign up for early
          access on the web dashboard.
        </Text>
      </Card>
    </>
  );
}

// ===========================================================================
// Styles
// ===========================================================================

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
  body: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
  },

  // Tab bar
  tabBarContainer: {
    borderBottomWidth: 1,
  },
  tabBarContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    gap: 4,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 10,
  },
  tabPillText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  sectionSpacing: {
    marginTop: 16,
  },

  sectionSubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginBottom: 12,
  },

  // Field rows (General tab)
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    minHeight: 36,
  },
  fieldLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fieldValue: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
  },
  fieldValueMono: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  fieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  // Inline editing
  inlineEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  inlineInput: {
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 140,
    borderRadius: 0,
  },

  // Timezone picker
  pickerList: {
    maxHeight: 250,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  pickerItemText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },

  // KPI row
  kpiRow: {
    flexDirection: "row",
    gap: 12,
  },

  // Project cards
  projectCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  projectName: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.xl,
    marginBottom: 2,
  },
  projectDomain: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  projectDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  detailValueMono: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  projectListRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  projectListName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  projectListDomain: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 1,
  },

  // Note row
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    lineHeight: 16,
    flex: 1,
  },

  // Team members
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.sm,
    color: "#ffffff",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  memberMeta: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 1,
  },

  // AI Providers
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  providerIcon: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  providerIconLetter: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
    color: "#ffffff",
  },
  providerName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  providerDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 1,
  },

  // API Keys
  apiKeyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  apiKeyName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  apiKeyPrefix: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  scopeRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  apiKeyMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },

  // Integrations
  integrationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  integrationIcon: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  integrationLetter: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: "#ffffff",
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  integrationDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  integrationMeta: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  // Billing
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planName: {
    fontFamily: fonts.serifBlack,
    fontSize: fontSize.xl,
  },
  planPrice: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    marginTop: 2,
  },
  trialRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  trialText: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },
  usageBarContainer: {
    paddingVertical: 4,
  },
  usageBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  usageBarLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
  },
  usageBarCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
  },
  billingEventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  billingEventType: {
    fontFamily: fonts.sansMedium,
    fontSize: fontSize.sm,
    textTransform: "capitalize",
  },
  billingEventDate: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  billingAmount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    fontWeight: "700",
  },

  // Loading
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },

  // Security
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  securityIcon: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  securityDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
    lineHeight: 16,
  },
  sessionIcon: {
    width: 28,
    height: 28,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  // Toggle rows
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  toggleLeft: {
    flex: 1,
    marginRight: 12,
  },
  toggleName: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },
  toggleDesc: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  // Settings rows
  settingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  settingsRowLabel: {
    fontFamily: fonts.sansBold,
    fontSize: fontSize.base,
  },

  // Empty text
  emptyText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: 8,
  },

  bottomSpacer: {
    height: 40,
  },
});
