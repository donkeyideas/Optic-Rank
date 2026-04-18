import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackNotification, type SlackMessage } from "@/lib/integrations/slack";
import { sendTeamsNotification, type TeamsMessage } from "@/lib/integrations/teams";
import { dispatchWebhook, type WebhookEvent } from "@/lib/webhooks/dispatch";
import { sendEmail } from "@/lib/email/resend";
import { notificationEmail } from "@/lib/email/templates/notification";

export interface NotificationPayload {
  type: WebhookEvent;
  title: string;
  message: string;
  details: Record<string, string | number>;
  projectId: string;
  projectName?: string;
  userId?: string;
  actionUrl?: string;
}

const channelTypeMap: Record<string, SlackMessage["type"] & TeamsMessage["type"]> = {
  "keyword.rank_changed": "rank_change",
  "audit.completed": "audit_alert",
  "prediction.generated": "prediction_update",
  "backlink.new": "new_backlink",
  "backlink.lost": "lost_backlink",
};

/**
 * Dispatch a notification to all configured channels:
 * 1. In-app notification (notifications table)
 * 2a. Slack (if configured)
 * 2b. Microsoft Teams (if configured)
 * 2d. Push notification (Firebase/Web Push)
 * 3. Webhooks (if registered)
 */
export async function dispatchNotification(
  orgId: string,
  payload: NotificationPayload
): Promise<void> {
  const supabase = createAdminClient();

  // 1. In-app notification
  if (payload.userId) {
    await supabase.from("notifications").insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      action_url: payload.actionUrl ?? `/dashboard`,
      is_read: false,
    }).then(() => {});
  }

  // Fetch org features once for Slack + Teams
  let features: Record<string, unknown> = {};
  try {
    const { data: org } = await supabase
      .from("organizations")
      .select("features")
      .eq("id", orgId)
      .single();
    features = (org?.features as Record<string, unknown>) ?? {};
  } catch (err) {
    console.error("[dispatchNotification] Org lookup error:", err);
  }

  const msgType = channelTypeMap[payload.type] ?? "test";

  // 2a. Slack notification
  try {
    const slackUrl = features.slack_webhook_url as string | undefined;
    if (slackUrl) {
      await sendSlackNotification(slackUrl, {
        type: msgType,
        title: payload.title,
        details: payload.details,
        projectName: payload.projectName,
        url: payload.actionUrl,
      });
    }
  } catch (err) {
    console.error("[dispatchNotification] Slack error:", err);
  }

  // 2b. Microsoft Teams notification
  try {
    const teamsUrl = features.teams_webhook_url as string | undefined;
    if (teamsUrl) {
      await sendTeamsNotification(teamsUrl, {
        type: msgType,
        title: payload.title,
        details: payload.details,
        projectName: payload.projectName,
        url: payload.actionUrl,
      });
    }
  } catch (err) {
    console.error("[dispatchNotification] Teams error:", err);
  }

  // 2c. Email notification
  if (payload.userId) {
    try {
      // Check user's email notification preference
      const { data: profile } = await supabase
        .from("profiles")
        .select("notification_prefs")
        .eq("id", payload.userId)
        .single();

      const prefs = profile?.notification_prefs as Record<string, boolean> | null;
      if (prefs?.email !== false) {
        const { data: authUser } = await supabase.auth.admin.getUserById(payload.userId);
        if (authUser?.user?.email) {
          await sendEmail(
            authUser.user.email,
            `${payload.title} — Optic Rank`,
            notificationEmail(payload.type, payload.title, payload.message, payload.actionUrl),
            { userId: payload.userId, emailType: "notification" }
          );
        }
      }
    } catch (err) {
      console.error("[dispatchNotification] Email error:", err);
    }
  }

  // 2d. Push notification
  if (payload.userId) {
    try {
      const { sendPushToUser } = await import("@/lib/notifications/push");
      await sendPushToUser(payload.userId, {
        title: payload.title,
        message: payload.message,
        type: payload.type,
        actionUrl: payload.actionUrl,
      });
    } catch (err) {
      console.error("[dispatchNotification] Push error:", err);
    }
  }

  // 3. Webhook dispatch
  try {
    await dispatchWebhook(orgId, payload.type, {
      title: payload.title,
      message: payload.message,
      project_id: payload.projectId,
      ...payload.details,
    });
  } catch (err) {
    console.error("[dispatchNotification] Webhook error:", err);
  }
}
