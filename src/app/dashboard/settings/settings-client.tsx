"use client";

import { useState, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  FolderKanban,
  Users,
  Plug,
  Save,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Mail,
  Shield,
  Bell,
  Zap,
  Check,
  CreditCard,
  Key,
  Instagram,
  Youtube,
  Linkedin,
  Hash,
  Target,
  Globe,
  Smartphone,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ColumnHeader } from "@/components/editorial/column-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createProject, deleteProject } from "@/lib/actions/projects";
import { lookupSocialProfile } from "@/lib/actions/social-intelligence";
import { updateProfileSettings, updateOrganizationSettings, createOrganization, updateNotificationPreferences, type NotificationPrefs } from "@/lib/actions/settings";
import {
  saveUserApiKey,
  deleteUserApiKey,
  toggleUserApiKey,
  type UserApiKey,
} from "@/lib/actions/user-api-keys";
import { BillingTab } from "./billing-tab";
import { ApiKeysTab } from "./api-keys-tab";
import { IntegrationsTab } from "./integrations-tab";
import { SecurityTab } from "./security-tab";
import { NotificationsTab } from "./notifications-tab";
import type { ApiKeyPublic } from "@/lib/actions/api-keys";
import type { IntegrationSettings } from "@/lib/actions/integrations";
import type { Profile, Organization } from "@/types";
import type { GatedResource } from "@/lib/stripe/plan-gate";
import { useTimezone } from "@/lib/context/timezone-context";
import { formatDate } from "@/lib/utils/format-date";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Phoenix",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Bogota",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Hong_Kong",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
  "UTC",
];

const AI_PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini. For AI analysis and content generation.",
    placeholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Claude Sonnet, Claude Haiku. For deep reasoning and analysis.",
    placeholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.5 Flash. For fast AI analysis.",
    placeholder: "AIza...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek Chat. Cost-effective AI analysis (system default).",
    placeholder: "sk-...",
    docsUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Perplexity Online. For real-time web search and analysis.",
    placeholder: "pplx-...",
    docsUrl: "https://www.perplexity.ai/settings/api",
  },
];

/* ------------------------------------------------------------------
   Props
   ------------------------------------------------------------------ */

interface SettingsClientProps {
  profile: Profile;
  organization: Organization | null;
  projects: Array<Record<string, unknown>>;
  team: Array<Record<string, unknown>>;
  invites: Array<Record<string, unknown>>;
  userId: string;
  userApiKeys?: UserApiKey[];
  usage?: Record<GatedResource, { current: number; limit: number }>;
  billingEvents?: Array<{
    id: string;
    event_type: string;
    amount_cents: number | null;
    currency: string;
    created_at: string;
  }>;
  apiKeys?: ApiKeyPublic[];
  integrationSettings?: IntegrationSettings;
  mfaEnabled?: boolean;
  mfaFactors?: Array<{ id: string; friendlyName: string | null; status: string }>;
  ga4PropertyId?: string | null;
  ga4Connected?: boolean;
  ga4GoogleEmail?: string | null;
  ga4OAuthConfigured?: boolean;
  gscConnected?: boolean;
  gscPropertyUrl?: string | null;
  gscOAuthConfigured?: boolean;
  activeProjectId?: string;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

function roleBadge(role: string) {
  switch (role) {
    case "owner":
      return { variant: "default" as const, label: "Owner" };
    case "admin":
      return { variant: "danger" as const, label: "Admin" };
    case "member":
      return { variant: "info" as const, label: "Member" };
    case "viewer":
      return { variant: "muted" as const, label: "Viewer" };
    default:
      return { variant: "muted" as const, label: role };
  }
}

function projectTypeBadge(type: string) {
  switch (type) {
    case "website":
      return { variant: "info" as const, label: "Website" };
    case "ios_app":
      return { variant: "default" as const, label: "iOS App" };
    case "android_app":
      return { variant: "success" as const, label: "Android" };
    case "both":
      return { variant: "warning" as const, label: "Both" };
    default:
      return { variant: "muted" as const, label: type };
  }
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

/* ------------------------------------------------------------------
   Settings Client Component
   ------------------------------------------------------------------ */

export function SettingsClient({
  profile,
  organization,
  projects,
  team,
  invites,
  userId,
  userApiKeys = [],
  usage,
  billingEvents = [],
  apiKeys = [],
  integrationSettings,
  mfaEnabled = false,
  mfaFactors = [],
  ga4PropertyId,
  ga4Connected,
  ga4GoogleEmail,
  ga4OAuthConfigured,
  gscConnected,
  gscPropertyUrl,
  gscOAuthConfigured,
  activeProjectId,
}: SettingsClientProps) {
  const timezone = useTimezone();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? "general");
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Add Project form — expanded sections
  const [showAppSection, setShowAppSection] = useState(false);
  const [showSocialSection, setShowSocialSection] = useState(false);
  const [lookingUp, setLookingUp] = useState<string | null>(null);
  const [socialLookupData, setSocialLookupData] = useState<Record<string, Record<string, string | number | null>>>({});
  const [socialLookupMsg, setSocialLookupMsg] = useState<Record<string, string>>({});
  const addProjectFormRef = useRef<HTMLFormElement>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Social profile lookup in Add Project form
  async function handleSocialLookup(platform: string) {
    const form = addProjectFormRef.current;
    if (!form) return;
    const input = form.querySelector<HTMLInputElement>(`[name="social_${platform}"]`);
    const handle = input?.value?.trim();
    if (!handle) return;
    setLookingUp(platform);
    setSocialLookupMsg((prev) => ({ ...prev, [platform]: "" }));
    try {
      const result = await lookupSocialProfile(platform, handle);
      if (result.success) {
        const d = result.data;
        setSocialLookupData((prev) => ({
          ...prev,
          [platform]: {
            followers_count: d.followers_count,
            following_count: d.following_count,
            posts_count: d.posts_count,
            engagement_rate: d.engagement_rate,
            display_name: d.display_name,
            bio: d.bio,
          },
        }));
        // Auto-fill hidden fields
        const fields: Record<string, string> = {
          [`social_${platform}_followers`]: String(d.followers_count ?? ""),
          [`social_${platform}_following`]: String(d.following_count ?? ""),
          [`social_${platform}_posts`]: String(d.posts_count ?? ""),
          [`social_${platform}_engagement`]: String(d.engagement_rate ?? ""),
          [`social_${platform}_display_name`]: String(d.display_name ?? ""),
          [`social_${platform}_bio`]: String(d.bio ?? ""),
        };
        for (const [name, val] of Object.entries(fields)) {
          const el = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
          if (el) el.value = val;
        }
        const followerStr = d.followers_count ? Number(d.followers_count).toLocaleString() : "0";
        setSocialLookupMsg((prev) => ({
          ...prev,
          [platform]: `Found — ${followerStr} followers`,
        }));
      } else {
        setSocialLookupMsg((prev) => ({
          ...prev,
          [platform]: result.error || "Could not find profile. Enter stats manually.",
        }));
      }
    } catch {
      setSocialLookupMsg((prev) => ({
        ...prev,
        [platform]: "Lookup failed. Enter stats manually.",
      }));
    }
    setLookingUp(null);
  }

  // AI Provider state
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  function handleSaveApiKey(providerId: string) {
    const key = apiKeyInputs[providerId];
    if (!key || key.trim().length < 10) {
      setApiKeyStatus((prev) => ({ ...prev, [providerId]: "error:API key is too short" }));
      return;
    }

    setSavingProvider(providerId);
    setApiKeyStatus((prev) => ({ ...prev, [providerId]: "" }));
    startTransition(async () => {
      const result = await saveUserApiKey(providerId, key.trim());
      if ("error" in result) {
        setApiKeyStatus((prev) => ({ ...prev, [providerId]: `error:${result.error}` }));
      } else {
        setApiKeyStatus((prev) => ({ ...prev, [providerId]: "saved" }));
        setApiKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
        setTimeout(() => {
          setApiKeyStatus((prev) => ({ ...prev, [providerId]: "" }));
        }, 3000);
      }
      setSavingProvider(null);
    });
  }

  function handleDeleteApiKey(keyId: string, providerId: string) {
    startTransition(async () => {
      const result = await deleteUserApiKey(keyId);
      if ("error" in result) {
        setApiKeyStatus((prev) => ({ ...prev, [providerId]: `error:${result.error}` }));
      }
    });
  }

  function handleToggleApiKey(keyId: string, isActive: boolean) {
    startTransition(async () => {
      await toggleUserApiKey(keyId, isActive);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-rule pb-4">
        <h1 className="font-serif text-2xl font-bold text-ink">Settings</h1>
        <p className="mt-1 font-sans text-sm text-ink-secondary">
          Manage your account, team, integrations, and billing
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="general">
            <Settings size={12} className="mr-1.5" />
            General
          </TabsTrigger>
          <TabsTrigger value="projects">
            <FolderKanban size={12} className="mr-1.5" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users size={12} className="mr-1.5" />
            Team
          </TabsTrigger>
          <TabsTrigger value="ai-providers">
            <Zap size={12} className="mr-1.5" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <Key size={12} className="mr-1.5" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug size={12} className="mr-1.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard size={12} className="mr-1.5" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield size={12} className="mr-1.5" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell size={12} className="mr-1.5" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* ============================================================
            TAB: General
            ============================================================ */}
        <TabsContent value="general">
          <div className="max-w-2xl">
            <ColumnHeader title="Account Settings" subtitle="Personal information and preferences" />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSaveStatus("saving");
                setSaveError(null);
                const formData = new FormData(e.currentTarget);
                startTransition(async () => {
                  const result = await updateProfileSettings(formData);
                  if ("error" in result) {
                    setSaveStatus("error");
                    setSaveError(result.error);
                  } else {
                    // Also update org if present
                    if (organization) {
                      const orgResult = await updateOrganizationSettings(organization.id, formData);
                      if ("error" in orgResult) {
                        setSaveStatus("error");
                        setSaveError(orgResult.error);
                        return;
                      }
                    }
                    setSaveStatus("saved");
                    setTimeout(() => setSaveStatus("idle"), 2000);
                  }
                });
              }}
              className="mt-6 flex flex-col gap-5"
            >
              {saveError && (
                <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
                  {saveError}
                </div>
              )}

              {saveStatus === "saved" && (
                <div className="border border-editorial-green/30 bg-editorial-green/5 px-4 py-3 text-sm text-editorial-green">
                  Settings saved successfully.
                </div>
              )}

              {/* Profile Section */}
              <div className="flex flex-col gap-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                  Profile
                </span>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    name="full_name"
                    label="Full Name"
                    defaultValue={profile.full_name ?? ""}
                    placeholder="Your name"
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Timezone
                    </label>
                    <select
                      name="timezone"
                      defaultValue={profile.timezone ?? "UTC"}
                      className="h-10 w-full border border-rule bg-surface-card px-3 text-sm text-ink focus:border-editorial-red focus:outline-none"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Organization Section */}
              {organization && (
                <>
                  <div className="border-t border-rule" />
                  <div className="flex flex-col gap-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Organization
                    </span>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        name="org_name"
                        label="Organization Name"
                        defaultValue={organization.name ?? ""}
                        placeholder="Your organization"
                      />
                      <Input
                        label="Slug"
                        defaultValue={organization.slug ?? ""}
                        placeholder="org-slug"
                        disabled
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      {profile.comp_account ? (
                        <Badge variant="success">Unlimited — Complimentary</Badge>
                      ) : (
                        <>
                          <Badge variant="default">{organization.plan} Plan</Badge>
                          <Badge
                            variant={
                              organization.subscription_status === "active"
                                ? "success"
                                : organization.subscription_status === "trialing"
                                  ? "info"
                                  : "warning"
                            }
                          >
                            {organization.subscription_status}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!organization && (
                <>
                  <div className="border-t border-rule" />
                  <div className="flex flex-col gap-4">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                      Organization
                    </span>
                    <div className="border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3 text-sm text-ink">
                      <strong>No organization yet.</strong> Create one to start using Optic Rank.
                      You&apos;ll get a <strong>14-day free trial</strong> with full access.
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setSaveStatus("saving");
                        setSaveError(null);
                        const formData = new FormData(e.currentTarget);
                        startTransition(async () => {
                          const result = await createOrganization(formData);
                          if ("error" in result) {
                            setSaveStatus("error");
                            setSaveError(result.error);
                          } else {
                            setSaveStatus("saved");
                          }
                        });
                      }}
                      className="flex items-end gap-3"
                    >
                      <div className="flex-1">
                        <Input
                          name="org_name"
                          label="Organization Name"
                          placeholder="My Company"
                          required
                        />
                      </div>
                      <Button type="submit" variant="primary" size="md" loading={isPending}>
                        <Plus size={14} />
                        Create Organization
                      </Button>
                    </form>
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="border-t border-rule" />

              {/* Save Button */}
              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary" size="md" loading={saveStatus === "saving"}>
                  <Save size={14} />
                  {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* ============================================================
            TAB: Projects
            ============================================================ */}
        <TabsContent value="projects">
          {!organization ? (
            <EmptyState
              icon={FolderKanban}
              title="Organization Required"
              description="Create an organization first to manage projects."
              actionLabel="Go to General Settings"
              actionHref="/dashboard/settings"
            />
          ) : projects.length === 0 ? (
            <>
              <div className="flex items-end justify-between">
                <ColumnHeader
                  title="Projects"
                  subtitle="No projects created yet"
                />
                <Button variant="primary" size="sm" onClick={() => setShowAddProject(true)}>
                  <Plus size={14} />
                  Add Project
                </Button>
              </div>
              <EmptyState
                icon={FolderKanban}
                title="No Projects Yet"
                description="Create your first project to start tracking SEO performance."
                actionLabel="Add Project"
                onAction={() => setShowAddProject(true)}
              />
            </>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <ColumnHeader
                  title="Projects"
                  subtitle={`${projects.length} project${projects.length !== 1 ? "s" : ""}`}
                />
                <Button variant="primary" size="sm" onClick={() => setShowAddProject(true)}>
                  <Plus size={14} />
                  Add Project
                </Button>
              </div>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => {
                      const pType = (project.type as string) ?? "website";
                      const typeBadge = projectTypeBadge(pType);
                      const isActive = project.is_active as boolean;
                      return (
                        <TableRow key={project.id as string}>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-sans text-sm font-semibold text-ink">
                                {(project.name as string) ?? "Untitled"}
                              </span>
                              <span className="font-mono text-[11px] text-ink-muted">
                                {(project.domain as string) ?? (project.url as string) ?? "---"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActive ? "success" : "muted"}>
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-ink-muted hover:text-editorial-red"
                              disabled={deletingId === (project.id as string)}
                              onClick={() => setDeleteConfirmId(project.id as string)}
                            >
                              {deletingId === (project.id as string) ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
                              ) : (
                                <Trash2 size={13} />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Delete Project Confirmation Modal */}
          <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Project</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this project? All associated data including keywords,
                  audits, and analytics will be permanently removed. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={!!deletingId}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!!deletingId}
                  onClick={() => {
                    if (!deleteConfirmId) return;
                    setDeletingId(deleteConfirmId);
                    startTransition(async () => {
                      const result = await deleteProject(deleteConfirmId);
                      setDeletingId(null);
                      setDeleteConfirmId(null);
                      if (result && "error" in result) {
                        setProjectError(result.error);
                      }
                    });
                  }}
                >
                  {deletingId ? (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Delete Project
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============================================================
            TAB: Team
            ============================================================ */}
        <TabsContent value="team">
          {!organization ? (
            <EmptyState
              icon={Users}
              title="Organization Required"
              description="Create an organization first to manage team members."
              actionLabel="Go to General Settings"
              actionHref="/dashboard/settings"
            />
          ) : team.length === 0 ? (
            <>
              <div className="flex items-end justify-between">
                <ColumnHeader title="Team Members" subtitle="No team members" />
                <Button variant="primary" size="sm">
                  <Mail size={14} />
                  Invite Member
                </Button>
              </div>
              <EmptyState
                icon={Users}
                title="No Team Members"
                description="Invite your team to collaborate on SEO projects."
                actionLabel="Invite Member"
                actionHref="/dashboard/settings"
              />
            </>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <ColumnHeader
                  title="Team Members"
                  subtitle={`${team.length} member${team.length !== 1 ? "s" : ""}`}
                />
                <Button variant="primary" size="sm">
                  <Mail size={14} />
                  Invite Member
                </Button>
              </div>
              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map((member) => {
                      const memberRole = (member.role as string) ?? "member";
                      const badge = roleBadge(memberRole);
                      const memberId = member.id as string;
                      const fullName = (member.full_name as string) ?? "Unknown";

                      return (
                        <TableRow key={memberId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center border border-rule bg-surface-raised font-serif text-sm font-bold text-ink">
                                {fullName.charAt(0)}
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-sans text-sm font-semibold text-ink">
                                  {fullName}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-ink-muted">
                            {(member.created_at as string)
                              ? formatDate(member.created_at as string, timezone)
                              : "---"}
                          </TableCell>
                          <TableCell>
                            {memberRole !== "owner" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-ink-muted hover:text-editorial-red"
                              >
                                <Trash2 size={13} />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div className="mt-6">
                  <ColumnHeader
                    title="Pending Invites"
                    subtitle={`${invites.length} invite${invites.length !== 1 ? "s" : ""} pending`}
                  />
                  <div className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites.map((invite) => {
                          const inviteRole = (invite.role as string) ?? "member";
                          const badge = roleBadge(inviteRole);
                          return (
                            <TableRow key={invite.id as string}>
                              <TableCell className="font-mono text-sm text-ink">
                                {(invite.email as string) ?? "---"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={badge.variant}>{badge.label}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-ink-muted">
                                {(invite.created_at as string)
                                  ? formatDate(invite.created_at as string, timezone)
                                  : "---"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-ink-muted hover:text-editorial-red"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ============================================================
            TAB: AI Providers
            ============================================================ */}
        <TabsContent value="ai-providers">
          <div className="max-w-3xl">
            <ColumnHeader
              title="AI Provider API Keys"
              subtitle="Add your own API keys to use different AI providers. Your keys override the system default (DeepSeek)."
            />

            <div className="mt-2 border border-editorial-gold/30 bg-editorial-gold/5 px-4 py-3 text-sm text-editorial-gold">
              <Zap size={14} className="mr-1.5 inline" />
              DeepSeek is pre-configured as the default AI provider. Add your own keys below to use additional providers or override the default.
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {AI_PROVIDERS.map((provider) => {
                const existingKey = userApiKeys.find((k) => k.provider === provider.id);
                const status = apiKeyStatus[provider.id] ?? "";
                const isError = status.startsWith("error:");
                const isSaved = status === "saved";
                const inputValue = apiKeyInputs[provider.id] ?? "";
                const isKeyVisible = showKeys[provider.id] ?? false;

                return (
                  <div
                    key={provider.id}
                    className="border border-rule bg-surface-card"
                  >
                    <div className="flex items-start justify-between border-b border-rule p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-sans text-sm font-semibold text-ink">
                            {provider.name}
                          </h3>
                          {existingKey && (
                            <Badge variant={existingKey.is_active ? "success" : "muted"}>
                              {existingKey.is_active ? "Active" : "Inactive"}
                            </Badge>
                          )}
                          {provider.id === "deepseek" && !existingKey && (
                            <Badge variant="info">System Default</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 font-sans text-[12px] text-ink-secondary">
                          {provider.description}
                        </p>
                      </div>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 font-sans text-[11px] font-semibold text-editorial-red hover:underline"
                      >
                        Get API Key
                      </a>
                    </div>

                    <div className="p-4">
                      {/* Show existing key */}
                      {existingKey && (
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex-1 border border-rule bg-surface-cream/30 px-3 py-2 font-mono text-xs text-ink-muted">
                            {isKeyVisible ? existingKey.api_key : maskApiKey(existingKey.api_key)}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !isKeyVisible }))}
                            className="text-ink-muted hover:text-ink"
                          >
                            {isKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleApiKey(existingKey.id, !existingKey.is_active)}
                            className={`text-xs font-semibold ${existingKey.is_active ? "text-editorial-green hover:text-editorial-red" : "text-ink-muted hover:text-editorial-green"}`}
                          >
                            {existingKey.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteApiKey(existingKey.id, provider.id)}
                            className="text-ink-muted hover:text-editorial-red"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {/* Input for new/update key */}
                      <div className="flex items-center gap-2">
                        <input
                          type={isKeyVisible ? "text" : "password"}
                          value={inputValue}
                          onChange={(e) => setApiKeyInputs((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                          placeholder={existingKey ? "Enter new key to replace..." : provider.placeholder}
                          className="h-9 flex-1 border border-rule bg-surface-card px-3 font-mono text-xs text-ink placeholder:text-ink-muted/50 focus:border-editorial-red focus:outline-none"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!inputValue || savingProvider === provider.id || isPending}
                          onClick={() => handleSaveApiKey(provider.id)}
                        >
                          {savingProvider === provider.id ? (
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink-muted border-t-transparent" />
                          ) : isSaved ? (
                            <Check size={14} className="text-editorial-green" />
                          ) : (
                            <Save size={14} />
                          )}
                          {existingKey ? "Update" : "Save"}
                        </Button>
                      </div>

                      {/* Status Messages */}
                      {isError && (
                        <p className="mt-2 text-xs text-editorial-red">
                          {status.replace("error:", "")}
                        </p>
                      )}
                      {isSaved && (
                        <p className="mt-2 text-xs text-editorial-green">
                          API key saved successfully.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-rule pt-4">
              <p className="font-sans text-[11px] leading-relaxed text-ink-muted">
                Your API keys are encrypted and stored securely. They are only used server-side for AI-powered features
                (visibility tracking, predictions, entity extraction, and intelligence briefs). Keys you add here will
                override the system default provider for your account only.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================
            TAB: API Keys
            ============================================================ */}
        <TabsContent value="api-keys">
          <ApiKeysTab initialKeys={apiKeys} />
        </TabsContent>

        {/* ============================================================
            TAB: Integrations
            ============================================================ */}
        <TabsContent value="integrations">
          {integrationSettings ? (
            <IntegrationsTab settings={integrationSettings} projectId={activeProjectId} ga4Connected={ga4Connected} ga4GoogleEmail={ga4GoogleEmail} ga4PropertyId={ga4PropertyId} ga4OAuthConfigured={ga4OAuthConfigured} gscConnected={gscConnected} gscPropertyUrl={gscPropertyUrl} gscOAuthConfigured={gscOAuthConfigured} />
          ) : (
            <EmptyState
              icon={Plug}
              title="Organization Required"
              description="Create an organization first to configure integrations."
              actionLabel="Go to General Settings"
              actionHref="/dashboard/settings"
            />
          )}
        </TabsContent>

        {/* ============================================================
            TAB: Billing
            ============================================================ */}
        <TabsContent value="billing">
          {organization && usage ? (
            <BillingTab
              organization={organization}
              usage={usage}
              billingEvents={billingEvents}
              isCompAccount={profile.comp_account}
            />
          ) : (
            <EmptyState
              icon={CreditCard}
              title="Organization Required"
              description="Create an organization first to manage billing."
              actionLabel="Go to General Settings"
              actionHref="/dashboard/settings"
            />
          )}
        </TabsContent>

        {/* ============================================================
            TAB: Security
            ============================================================ */}
        <TabsContent value="security">
          <SecurityTab initialEnabled={mfaEnabled} initialFactors={mfaFactors} />
        </TabsContent>

        {/* ============================================================
            TAB: Notifications
            ============================================================ */}
        <TabsContent value="notifications">
          <NotificationsTab profile={profile} />
        </TabsContent>
      </Tabs>

      {/* ============================================================
          Add Project Dialog — Unified: Website + Apps + Social Media
          ============================================================ */}
      <Dialog open={showAddProject} onOpenChange={(open) => {
        setShowAddProject(open);
        if (!open) {
          setProjectError(null);
          setShowAppSection(false);
          setShowSocialSection(false);
          setSocialLookupData({});
          setSocialLookupMsg({});
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>
              Set up your website, apps, and social media profiles all at once.
            </DialogDescription>
          </DialogHeader>

          <form
            ref={addProjectFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              setProjectError(null);
              const formData = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await createProject(formData);
                if (result && "error" in result) {
                  setProjectError(result.error);
                } else {
                  setShowAddProject(false);
                }
              });
            }}
          >
            <div className="max-h-[calc(85vh-10rem)] space-y-5 overflow-y-auto px-5 py-4">
              {projectError && (
                <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
                  {projectError}
                </div>
              )}

              {/* ─── Section 1: Project Details ─── */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-ink-muted" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                    Project Details
                  </span>
                </div>
                <div className="space-y-3">
                  <Input
                    name="name"
                    label="Project Name"
                    placeholder="My Website"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-ink-muted">
                        Project Type
                      </label>
                      <select
                        name="type"
                        required
                        className="h-10 w-full border border-rule bg-surface-card px-3 text-sm text-ink focus:border-editorial-red focus:outline-none"
                      >
                        <option value="website">Website</option>
                        <option value="ios_app">iOS App</option>
                        <option value="android_app">Android App</option>
                        <option value="both">Website + App</option>
                      </select>
                    </div>
                    <Input
                      name="domain"
                      label="Domain"
                      placeholder="example.com"
                    />
                  </div>
                  <Input
                    name="url"
                    label="URL"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* ─── Section 2: App Store ─── */}
              <div className="border-t border-rule pt-4">
                <button
                  type="button"
                  onClick={() => setShowAppSection(!showAppSection)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-ink-muted" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      App Store Listings
                    </span>
                    <span className="text-[10px] text-ink-muted/60">(optional)</span>
                  </div>
                  {showAppSection ? <ChevronUp className="h-4 w-4 text-ink-muted" /> : <ChevronDown className="h-4 w-4 text-ink-muted" />}
                </button>

                {showAppSection && (
                  <div className="mt-3 space-y-4">
                    {/* iOS App */}
                    <div className="space-y-2 rounded border border-rule/50 bg-surface-card/50 p-3">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                        iOS App (Apple App Store)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="ios_app_name" placeholder="App Name" />
                        <Input name="ios_app_id" placeholder="Bundle ID (com.example.app)" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="ios_app_url" placeholder="App Store URL (optional)" />
                        <Input name="ios_category" placeholder="Category (optional)" />
                      </div>
                    </div>

                    {/* Android App */}
                    <div className="space-y-2 rounded border border-rule/50 bg-surface-card/50 p-3">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                        Android App (Google Play)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="android_app_name" placeholder="App Name" />
                        <Input name="android_app_id" placeholder="Package ID (com.example.app)" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input name="android_app_url" placeholder="Play Store URL (optional)" />
                        <Input name="android_category" placeholder="Category (optional)" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Section 3: Social Media Profiles ─── */}
              <div className="border-t border-rule pt-4">
                <button
                  type="button"
                  onClick={() => setShowSocialSection(!showSocialSection)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-ink-muted" />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                      Social Media Profiles
                    </span>
                    <span className="text-[10px] text-ink-muted/60">(optional)</span>
                  </div>
                  {showSocialSection ? <ChevronUp className="h-4 w-4 text-ink-muted" /> : <ChevronDown className="h-4 w-4 text-ink-muted" />}
                </button>

                {showSocialSection && (
                  <div className="mt-3 space-y-3">
                    {[
                      { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-600", placeholder: "@username or profile URL" },
                      { id: "tiktok", label: "TikTok", icon: Target, color: "text-ink", placeholder: "@username or profile URL" },
                      { id: "youtube", label: "YouTube", icon: Youtube, color: "text-red-600", placeholder: "Channel URL or @handle" },
                      { id: "twitter", label: "X (Twitter)", icon: Hash, color: "text-blue-500", placeholder: "@username or profile URL" },
                      { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700", placeholder: "Profile URL or company name" },
                    ].map((p) => {
                      const Icon = p.icon;
                      const lookupData = socialLookupData[p.id];
                      const lookupMessage = socialLookupMsg[p.id];
                      return (
                        <div key={p.id} className="rounded border border-rule/50 bg-surface-card/50 p-3">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${p.color}`} />
                            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted">
                              {p.label}
                            </span>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <div className="flex-1">
                              <Input
                                name={`social_${p.id}`}
                                placeholder={p.placeholder}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSocialLookup(p.id)}
                              disabled={lookingUp === p.id}
                              className="flex shrink-0 items-center gap-1 self-end border border-rule px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-50"
                            >
                              <Search className="h-3 w-3" />
                              {lookingUp === p.id ? "..." : "Lookup"}
                            </button>
                          </div>
                          {lookupMessage && (
                            <p className={`mt-1 text-[10px] ${
                              lookupMessage.includes("Found") ? "text-editorial-green" : "text-ink-muted"
                            }`}>
                              {lookupMessage}
                            </p>
                          )}
                          {lookupData && (
                            <div className="mt-1.5 flex gap-3 text-[10px] text-ink-muted">
                              {lookupData.followers_count != null && (
                                <span>{Number(lookupData.followers_count).toLocaleString()} followers</span>
                              )}
                              {lookupData.engagement_rate != null && (
                                <span>{Number(lookupData.engagement_rate).toFixed(1)}% engagement</span>
                              )}
                              {lookupData.posts_count != null && Number(lookupData.posts_count) > 0 && (
                                <span>{Number(lookupData.posts_count).toLocaleString()} posts</span>
                              )}
                            </div>
                          )}
                          {/* Hidden fields for auto-filled stats */}
                          <input type="hidden" name={`social_${p.id}_followers`} defaultValue="" />
                          <input type="hidden" name={`social_${p.id}_following`} defaultValue="" />
                          <input type="hidden" name={`social_${p.id}_posts`} defaultValue="" />
                          <input type="hidden" name={`social_${p.id}_engagement`} defaultValue="" />
                          <input type="hidden" name={`social_${p.id}_display_name`} defaultValue="" />
                          <input type="hidden" name={`social_${p.id}_bio`} defaultValue="" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setShowAddProject(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" loading={isPending}>
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
