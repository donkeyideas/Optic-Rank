import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/shared/empty-state";
import { Settings } from "lucide-react";
import { SettingsClient } from "./settings-client";
import { getUserApiKeys, type UserApiKey } from "@/lib/actions/user-api-keys";
import { getUsageSummary } from "@/lib/stripe/plan-gate";
import { createAdminClient } from "@/lib/supabase/admin";
import type { IntegrationSettings } from "@/lib/actions/integrations";
import { getMFAStatus } from "@/lib/actions/two-fa";
import { getGSCConnectionStatus } from "@/lib/actions/gsc";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch full profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <EmptyState
        icon={Settings}
        title="Profile Not Found"
        description="Your user profile could not be loaded. Please contact support."
      />
    );
  }

  // If no organization, we still render settings so they can create one
  let organization = null;
  let projects: Array<Record<string, unknown>> = [];
  let team: Array<Record<string, unknown>> = [];
  let invites: Array<Record<string, unknown>> = [];

  if (profile.organization_id) {
    // Fetch org, projects, team, and invites in parallel
    const [orgRes, projectsRes, teamRes, invitesRes] = await Promise.all([
      supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .maybeSingle(),
      supabase
        .from("projects")
        .select("*")
        .eq("organization_id", profile.organization_id),
      supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", profile.organization_id),
      supabase
        .from("organization_invites")
        .select("*")
        .eq("organization_id", profile.organization_id),
    ]);

    organization = orgRes.data;
    projects = (projectsRes.data as Array<Record<string, unknown>>) ?? [];
    team = (teamRes.data as Array<Record<string, unknown>>) ?? [];
    invites = (invitesRes.data as Array<Record<string, unknown>>) ?? [];
  }

  // Fetch user API keys (may return empty if table doesn't exist yet)
  let userApiKeys: UserApiKey[] = [];
  try {
    userApiKeys = await getUserApiKeys();
  } catch {
    // Table may not exist yet
  }

  // Fetch platform API keys (for public REST API)
  let apiKeys: Array<{
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    expires_at: string | null;
    last_used_at: string | null;
    is_active: boolean;
    created_at: string;
  }> = [];

  if (profile.organization_id) {
    try {
      const admin = createAdminClient();
      const { data: keys } = await admin
        .from("api_keys")
        .select("id, name, key_prefix, scopes, expires_at, last_used_at, is_active, created_at")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });
      apiKeys = (keys ?? []) as typeof apiKeys;
    } catch {
      // API keys table may not exist yet
    }
  }

  // Fetch integration settings
  let integrationSettings: IntegrationSettings | undefined = undefined;
  if (profile.organization_id) {
    try {
      const admin = createAdminClient();
      const { data: org } = await admin
        .from("organizations")
        .select("features")
        .eq("id", profile.organization_id)
        .maybeSingle();

      const features = (org?.features as Record<string, unknown>) ?? {};

      const { data: webhookEndpoints } = await admin
        .from("webhook_endpoints")
        .select("id, url, events, is_active, created_at")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      integrationSettings = {
        slackWebhookUrl: (features.slack_webhook_url as string) ?? null,
        teamsWebhookUrl: (features.teams_webhook_url as string) ?? null,
        slackEvents: (features.slack_events as string[]) ?? [
          "rank_change", "audit_alert", "prediction_update", "new_backlink",
        ],
        webhookEndpoints: (webhookEndpoints ?? []) as IntegrationSettings["webhookEndpoints"],
      };
    } catch {
      // Integration settings fetch failed — non-critical
    }
  }

  // Fetch MFA status
  let mfaEnabled = false;
  let mfaFactors: Array<{ id: string; friendlyName: string | null; status: string }> = [];
  try {
    const mfaStatus = await getMFAStatus();
    mfaEnabled = mfaStatus.enabled;
    mfaFactors = mfaStatus.factors;
  } catch {
    // MFA status fetch failed — non-critical
  }

  // Find the first active project for GSC integration
  const activeProject = projects.find((p) => p.is_active !== false);
  const activeProjectId = activeProject?.id as string | undefined;

  // Fetch GSC connection status
  let gscConnected = false;
  let gscConfigured = false;
  let gscPropertyUrl: string | null = null;
  if (activeProjectId) {
    try {
      const gscStatus = await getGSCConnectionStatus(activeProjectId);
      gscConnected = gscStatus.connected;
      gscConfigured = gscStatus.configured;
      gscPropertyUrl = gscStatus.propertyUrl;
    } catch {
      // GSC status fetch failed — non-critical
    }
  }

  // Fetch billing data
  let usage = undefined;
  let billingEvents: Array<{
    id: string;
    event_type: string;
    amount_cents: number | null;
    currency: string;
    created_at: string;
  }> = [];

  if (profile.organization_id) {
    try {
      usage = await getUsageSummary(profile.organization_id);
      const admin = createAdminClient();
      const { data: events } = await admin
        .from("billing_events")
        .select("id, event_type, amount_cents, currency, created_at")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false })
        .limit(10);
      billingEvents = (events ?? []) as typeof billingEvents;
    } catch {
      // Billing data fetch failed — non-critical
    }
  }

  return (
    <SettingsClient
      profile={profile}
      organization={organization}
      projects={projects}
      team={team}
      invites={invites}
      userId={user.id}
      userApiKeys={userApiKeys}
      usage={usage}
      billingEvents={billingEvents}
      apiKeys={apiKeys}
      integrationSettings={integrationSettings}
      mfaEnabled={mfaEnabled}
      mfaFactors={mfaFactors}
      gscConnected={gscConnected}
      gscConfigured={gscConfigured}
      gscPropertyUrl={gscPropertyUrl}
      activeProjectId={activeProjectId}
    />
  );
}
