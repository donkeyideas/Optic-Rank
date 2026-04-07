import { createAdminClient } from "@/lib/supabase/admin";
import { sendFCMBatch, type PushPayload } from "@/lib/firebase/fcm-send";
import {
  sendWebPushBatch,
  type WebPushSubscription,
} from "@/lib/web-push/vapid-push";

export interface PushNotificationOptions {
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  sentBy?: string; // admin userId who triggered (null = automatic)
}

/* ---------- Token categorization ---------- */

interface TokenRow {
  id: string;
  token: string;
  user_id?: string;
}

function categorizeTokens(tokens: TokenRow[]): {
  webPush: { id: string; subscription: WebPushSubscription }[];
  fcm: { id: string; token: string }[];
} {
  const webPush: { id: string; subscription: WebPushSubscription }[] = [];
  const fcm: { id: string; token: string }[] = [];

  for (const t of tokens) {
    try {
      const parsed = JSON.parse(t.token);
      if (parsed?.endpoint && parsed?.keys?.p256dh && parsed?.keys?.auth) {
        webPush.push({ id: t.id, subscription: parsed });
        continue;
      }
    } catch {
      /* not JSON — treat as FCM token */
    }
    if (t.token.length > 20) fcm.push(t);
  }

  return { webPush, fcm };
}

/* ---------- Send to single user ---------- */

export async function sendPushToUser(
  userId: string,
  options: PushNotificationOptions
): Promise<{ success: number; failed: number }> {
  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("id, token")
    .eq("user_id", userId);

  if (!tokens || tokens.length === 0) return { success: 0, failed: 0 };

  // Check user's push preference
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", userId)
    .single();

  const prefs = profile?.notification_prefs as Record<string, boolean> | null;
  if (prefs?.push === false) return { success: 0, failed: 0 };

  const { webPush, fcm } = categorizeTokens(tokens);
  let totalSuccess = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  const pushData: Record<string, string> = {
    url: options.actionUrl ?? "/dashboard",
    type: options.type ?? "system",
  };

  // Web Push
  if (webPush.length > 0) {
    const result = await sendWebPushBatch(
      webPush.map((w) => w.subscription),
      {
        title: options.title,
        body: options.message,
        data: pushData,
      }
    );
    totalSuccess += result.success;
    totalFailed += result.failed;

    // Clean up invalid subscriptions
    if (result.invalidEndpoints.length > 0) {
      const idsToDelete = webPush
        .filter((w) =>
          result.invalidEndpoints.includes(w.subscription.endpoint)
        )
        .map((w) => w.id);
      if (idsToDelete.length > 0) {
        await supabase.from("push_tokens").delete().in("id", idsToDelete);
      }
    }
  }

  // FCM
  if (fcm.length > 0) {
    const result = await sendFCMBatch(
      fcm.map((f) => f.token),
      {
        title: options.title,
        body: options.message,
        data: pushData,
      }
    );
    totalSuccess += result.success;
    totalFailed += result.failed;
    allErrors.push(...result.errors);

    // Clean up invalid tokens
    if (result.invalidTokens.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .in("token", result.invalidTokens);
    }
  }

  // Log to push_notification_log
  await supabase.from("push_notification_log").insert({
    user_id: userId,
    title: options.title,
    message: options.message,
    type: options.type ?? "system",
    action_url: options.actionUrl,
    target: `user:${userId}`,
    tokens_targeted: tokens.length,
    tokens_success: totalSuccess,
    tokens_failed: totalFailed,
    errors: allErrors.length > 0 ? allErrors : null,
    sent_by: options.sentBy ?? null,
  });

  return { success: totalSuccess, failed: totalFailed };
}

/* ---------- Send to ALL users (broadcast) ---------- */

export async function sendPushToAll(
  options: PushNotificationOptions
): Promise<{ success: number; failed: number; usersTargeted: number }> {
  const supabase = createAdminClient();

  const { data: allTokens } = await supabase
    .from("push_tokens")
    .select("id, user_id, token");

  console.log(`[sendPushToAll] Found ${allTokens?.length ?? 0} push tokens in DB`);
  if (!allTokens || allTokens.length === 0)
    return { success: 0, failed: 0, usersTargeted: 0 };

  // Get users who have push enabled
  const userIds = [...new Set(allTokens.map((t) => t.user_id))];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, notification_prefs")
    .in("id", userIds);

  const pushEnabledUsers = new Set(
    (profiles ?? [])
      .filter((p) => {
        const prefs = p.notification_prefs as Record<string, boolean> | null;
        return prefs?.push !== false; // default to enabled
      })
      .map((p) => p.id)
  );

  const eligibleTokens = allTokens.filter((t) =>
    pushEnabledUsers.has(t.user_id)
  );

  const { webPush, fcm } = categorizeTokens(eligibleTokens);
  let totalSuccess = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  const pushData: Record<string, string> = {
    url: options.actionUrl ?? "/dashboard",
    type: options.type ?? "system",
  };

  // Web Push
  if (webPush.length > 0) {
    const result = await sendWebPushBatch(
      webPush.map((w) => w.subscription),
      { title: options.title, body: options.message, data: pushData }
    );
    totalSuccess += result.success;
    totalFailed += result.failed;

    if (result.invalidEndpoints.length > 0) {
      const idsToDelete = webPush
        .filter((w) =>
          result.invalidEndpoints.includes(w.subscription.endpoint)
        )
        .map((w) => w.id);
      if (idsToDelete.length > 0) {
        await supabase.from("push_tokens").delete().in("id", idsToDelete);
      }
    }
  }

  // FCM
  if (fcm.length > 0) {
    const result = await sendFCMBatch(
      fcm.map((f) => f.token),
      { title: options.title, body: options.message, data: pushData }
    );
    totalSuccess += result.success;
    totalFailed += result.failed;
    allErrors.push(...result.errors);

    if (result.invalidTokens.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .in("token", result.invalidTokens);
    }
  }

  // Log
  await supabase.from("push_notification_log").insert({
    user_id: null,
    title: options.title,
    message: options.message,
    type: options.type ?? "system.announcement",
    action_url: options.actionUrl,
    target: "all",
    tokens_targeted: eligibleTokens.length,
    tokens_success: totalSuccess,
    tokens_failed: totalFailed,
    errors: allErrors.length > 0 ? allErrors : null,
    sent_by: options.sentBy ?? null,
  });

  return {
    success: totalSuccess,
    failed: totalFailed,
    usersTargeted: pushEnabledUsers.size,
  };
}
