"use client";

import { useState, useTransition } from "react";
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
  Zap,
  Check,
  CreditCard,
  Key,
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
import { updateProfileSettings, updateOrganizationSettings } from "@/lib/actions/settings";
import {
  saveUserApiKey,
  deleteUserApiKey,
  toggleUserApiKey,
  type UserApiKey,
} from "@/lib/actions/user-api-keys";
import { BillingTab } from "./billing-tab";
import { ApiKeysTab } from "./api-keys-tab";
import { IntegrationsTab } from "./integrations-tab";
import type { ApiKeyPublic } from "@/lib/actions/api-keys";
import type { IntegrationSettings } from "@/lib/actions/integrations";
import type { Profile, Organization } from "@/types";
import type { GatedResource } from "@/lib/stripe/plan-gate";

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
    description: "Gemini 2.0 Flash. For fast AI analysis.",
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
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

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
                    </div>
                  </div>
                </>
              )}

              {!organization && (
                <>
                  <div className="border-t border-rule" />
                  <EmptyState
                    icon={Shield}
                    title="No Organization"
                    description="You are not part of an organization yet. Create one to start using Optic Rank."
                    actionLabel="Create Organization"
                    actionHref="/dashboard/settings"
                  />
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
                              onClick={() => {
                                if (!confirm("Delete this project? This cannot be undone.")) return;
                                const id = project.id as string;
                                setDeletingId(id);
                                startTransition(async () => {
                                  const result = await deleteProject(id);
                                  setDeletingId(null);
                                  if (result && "error" in result) {
                                    setProjectError(result.error);
                                  }
                                });
                              }}
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
                              ? new Date(member.created_at as string).toLocaleDateString()
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
                                  ? new Date(invite.created_at as string).toLocaleDateString()
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
            <IntegrationsTab settings={integrationSettings} />
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
      </Tabs>

      {/* ============================================================
          Add Project Dialog
          ============================================================ */}
      <Dialog open={showAddProject} onOpenChange={setShowAddProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>
              Create a new project to start tracking SEO performance.
            </DialogDescription>
          </DialogHeader>

          <form
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
            className="flex flex-col gap-4 p-5"
          >
            {projectError && (
              <div className="border border-editorial-red/30 bg-editorial-red/5 px-4 py-3 text-sm text-editorial-red">
                {projectError}
              </div>
            )}

            <Input
              name="name"
              label="Project Name"
              placeholder="My Website"
              required
            />

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

            <Input
              name="url"
              label="URL"
              placeholder="https://example.com"
            />

            <DialogFooter className="border-t-0 px-0 pb-0">
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
