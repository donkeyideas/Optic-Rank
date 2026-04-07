import * as webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;

/**
 * Configure VAPID: try DB (admin_settings) first, then env vars.
 */
async function configureVAPID(): Promise<boolean> {
  if (configured) return true;

  let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;

  // Try DB if env vars missing
  if (!publicKey || !privateKey) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]);

      for (const row of data ?? []) {
        if (row.key === "VAPID_PUBLIC_KEY") publicKey = row.value;
        if (row.key === "VAPID_PRIVATE_KEY") privateKey = row.value;
      }
    } catch {
      /* DB lookup failed, continue with whatever we have */
    }
  }

  const email = process.env.VAPID_CONTACT_EMAIL ?? "admin@opticrank.com";
  if (!publicKey || !privateKey) {
    console.warn("[Web Push] VAPID keys not configured (checked DB + env)");
    return false;
  }
  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
  configured = true;
  return true;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: { title: string; body: string; icon?: string; data?: Record<string, unknown> }
): Promise<{ success: boolean; error?: string }> {
  if (!(await configureVAPID())) return { success: false, error: "VAPID not configured" };
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? "/branding/opticrank-logo-512.png",
        data: payload.data ?? {},
      })
    );
    return { success: true };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; message?: string };
    if (e.statusCode === 410) return { success: false, error: "INVALID_SUBSCRIPTION" };
    return { success: false, error: e.message ?? "Web Push error" };
  }
}

export async function sendWebPushBatch(
  subscriptions: WebPushSubscription[],
  payload: { title: string; body: string; icon?: string; data?: Record<string, unknown> }
): Promise<{ success: number; failed: number; invalidEndpoints: string[] }> {
  const results = await Promise.allSettled(
    subscriptions.map((s) => sendWebPush(s, payload))
  );

  let success = 0;
  let failed = 0;
  const invalidEndpoints: string[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.success) {
      success++;
    } else {
      failed++;
      const err =
        r.status === "rejected" ? r.reason?.message : r.value.error;
      if (err === "INVALID_SUBSCRIPTION") {
        invalidEndpoints.push(subscriptions[i].endpoint);
      }
    }
  });

  return { success, failed, invalidEndpoints };
}
