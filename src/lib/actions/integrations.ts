"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackNotification } from "@/lib/integrations/slack";
import { sendTeamsNotification } from "@/lib/integrations/teams";
import { revalidatePath } from "next/cache";

/**
 * Save a Slack webhook URL to the organization's features JSONB.
 */
export async function saveSlackWebhook(
  webhookUrl: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  // Get current features
  const { data: org } = await supabase
    .from("organizations")
    .select("features")
    .eq("id", profile.organization_id)
    .single();

  const features = (org?.features as Record<string, unknown>) ?? {};
  features.slack_webhook_url = webhookUrl;

  const { error } = await supabase
    .from("organizations")
    .update({ features })
    .eq("id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Test the Slack webhook by sending a test message.
 */
export async function testSlackWebhook(): Promise<
  { error: string } | { success: true }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { data: org } = await supabase
    .from("organizations")
    .select("features, name")
    .eq("id", profile.organization_id)
    .single();

  const features = (org?.features as Record<string, unknown>) ?? {};
  const webhookUrl = features.slack_webhook_url as string | undefined;

  if (!webhookUrl) return { error: "No Slack webhook URL configured." };

  const result = await sendSlackNotification(webhookUrl, {
    type: "test",
    title: "Optic Rank — Test Notification",
    details: {
      Status: "Connected successfully",
      Time: new Date().toLocaleString(),
    },
    projectName: org?.name ?? "Test",
  });

  if (!result.success) return { error: result.error ?? "Test failed." };

  return { success: true };
}

/**
 * Save a Microsoft Teams webhook URL to the organization's features JSONB.
 */
export async function saveTeamsWebhook(
  webhookUrl: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { data: org } = await supabase
    .from("organizations")
    .select("features")
    .eq("id", profile.organization_id)
    .single();

  const features = (org?.features as Record<string, unknown>) ?? {};
  features.teams_webhook_url = webhookUrl;

  const { error } = await supabase
    .from("organizations")
    .update({ features })
    .eq("id", profile.organization_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Test the Teams webhook by sending a test message.
 */
export async function testTeamsWebhook(): Promise<
  { error: string } | { success: true }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { data: org } = await supabase
    .from("organizations")
    .select("features, name")
    .eq("id", profile.organization_id)
    .single();

  const features = (org?.features as Record<string, unknown>) ?? {};
  const webhookUrl = features.teams_webhook_url as string | undefined;

  if (!webhookUrl) return { error: "No Teams webhook URL configured." };

  const result = await sendTeamsNotification(webhookUrl, {
    type: "test",
    title: "Optic Rank — Test Notification",
    details: {
      Status: "Connected successfully",
      Time: new Date().toLocaleString(),
    },
    projectName: org?.name ?? "Test",
  });

  if (!result.success) return { error: result.error ?? "Test failed." };

  return { success: true };
}

/**
 * Get integration settings for the user's organization.
 */
export async function getIntegrationSettings(): Promise<
  { error: string } | { settings: IntegrationSettings }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { data: org } = await supabase
    .from("organizations")
    .select("features")
    .eq("id", profile.organization_id)
    .single();

  const features = (org?.features as Record<string, unknown>) ?? {};

  // Fetch webhook endpoints
  const { data: webhooks } = await supabase
    .from("webhook_endpoints")
    .select("id, url, events, is_active, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  return {
    settings: {
      slackWebhookUrl: (features.slack_webhook_url as string) ?? null,
      teamsWebhookUrl: (features.teams_webhook_url as string) ?? null,
      slackEvents: (features.slack_events as string[]) ?? [
        "rank_change",
        "audit_alert",
        "prediction_update",
        "new_backlink",
      ],
      webhookEndpoints: (webhooks ?? []) as WebhookEndpoint[],
    },
  };
}

/**
 * Register a new webhook endpoint.
 */
export async function registerWebhook(
  url: string,
  events: string[]
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  // Generate a webhook secret
  const { randomBytes } = await import("crypto");
  const secret = `whsec_${randomBytes(24).toString("hex")}`;

  const { error } = await supabase.from("webhook_endpoints").insert({
    organization_id: profile.organization_id,
    url,
    events,
    secret,
    is_active: true,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Delete a webhook endpoint.
 */
export async function deleteWebhook(
  endpointId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("webhook_endpoints")
    .delete()
    .eq("id", endpointId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export interface IntegrationSettings {
  slackWebhookUrl: string | null;
  teamsWebhookUrl: string | null;
  slackEvents: string[];
  webhookEndpoints: WebhookEndpoint[];
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}
