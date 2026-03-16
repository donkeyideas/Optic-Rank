import { createAdminClient } from "@/lib/supabase/admin";
import { sendSlackNotification, type SlackMessage } from "@/lib/integrations/slack";
import { dispatchWebhook, type WebhookEvent } from "@/lib/webhooks/dispatch";

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

/**
 * Dispatch a notification to all configured channels:
 * 1. In-app notification (notifications table)
 * 2. Slack (if configured)
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

  // 2. Slack notification
  try {
    const { data: org } = await supabase
      .from("organizations")
      .select("features")
      .eq("id", orgId)
      .single();

    const features = (org?.features as Record<string, unknown>) ?? {};
    const slackUrl = features.slack_webhook_url as string | undefined;

    if (slackUrl) {
      const slackTypeMap: Record<string, SlackMessage["type"]> = {
        "keyword.rank_changed": "rank_change",
        "audit.completed": "audit_alert",
        "prediction.generated": "prediction_update",
        "backlink.new": "new_backlink",
        "backlink.lost": "new_backlink",
      };

      await sendSlackNotification(slackUrl, {
        type: slackTypeMap[payload.type] ?? "test",
        title: payload.title,
        details: payload.details,
        projectName: payload.projectName,
        url: payload.actionUrl,
      });
    }
  } catch (err) {
    console.error("[dispatchNotification] Slack error:", err);
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
