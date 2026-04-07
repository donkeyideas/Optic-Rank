import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

export type WebhookEvent =
  | "keyword.rank_changed"
  | "audit.completed"
  | "prediction.generated"
  | "backlink.new"
  | "backlink.lost"
  | "app_store.rank_changed"
  | "brief.generated"
  | "trial.expiring"
  | "billing.payment_failed"
  | "billing.subscription_changed"
  | "system.announcement"
  | "admin.new_signup";

/**
 * Dispatch a webhook event to all registered endpoints for the given org.
 * Non-blocking — fires and logs results, does not throw on delivery failure.
 */
export async function dispatchWebhook(
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createAdminClient();

  // Find active endpoints subscribed to this event
  const { data: endpoints } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, events")
    .eq("organization_id", orgId)
    .eq("is_active", true);

  if (!endpoints || endpoints.length === 0) return;

  const matchingEndpoints = endpoints.filter((ep) => {
    const events = ep.events as string[] | null;
    return events?.includes(event) || events?.includes("*");
  });

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  for (const endpoint of matchingEndpoints) {
    try {
      // Sign the payload
      const signature = endpoint.secret
        ? createHmac("sha256", endpoint.secret).update(body).digest("hex")
        : undefined;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
      };
      if (signature) {
        headers["X-Webhook-Signature"] = `sha256=${signature}`;
      }

      const response = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body,
        signal: AbortSignal.timeout(10_000),
      });

      // Log delivery
      await supabase.from("webhook_deliveries").insert({
        endpoint_id: endpoint.id,
        event,
        payload: { event, data: payload },
        status_code: response.status,
        response_body: await response.text().catch(() => null),
        delivered_at: new Date().toISOString(),
      });
    } catch (err) {
      // Log failed delivery
      await supabase.from("webhook_deliveries").insert({
        endpoint_id: endpoint.id,
        event,
        payload: { event, data: payload },
        status_code: 0,
        response_body: err instanceof Error ? err.message : "Delivery failed",
        delivered_at: new Date().toISOString(),
      });
    }
  }
}
