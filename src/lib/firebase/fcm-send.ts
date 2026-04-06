import { getMessagingInstance } from "./admin";

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

export async function sendFCMToToken(
  token: string,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  const messaging = await getMessagingInstance();
  if (!messaging) return { success: false, error: "FCM not configured" };

  try {
    await messaging.send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
      android: {
        priority: "high",
        notification: { channelId: "default", sound: "default" },
      },
      apns: {
        payload: {
          aps: {
            alert: { title: payload.title, body: payload.body },
            sound: "default",
          },
        },
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon ?? "/branding/opticrank-logo-512.png",
        },
        fcmOptions: { link: payload.data?.url ?? "/dashboard" },
      },
    });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (
      err.code === "messaging/invalid-registration-token" ||
      err.code === "messaging/registration-token-not-registered"
    ) {
      return { success: false, error: "INVALID_TOKEN" };
    }
    return { success: false, error: err.message ?? "Unknown FCM error" };
  }
}

export async function sendFCMBatch(
  tokens: string[],
  payload: PushPayload
): Promise<{ success: number; failed: number; errors: string[]; invalidTokens: string[] }> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return { success: 0, failed: tokens.length, errors: ["FCM not configured"], invalidTokens: [] };
  }

  const batchSize = 500;
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const invalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: {
          priority: "high",
          notification: { channelId: "default", sound: "default" },
        },
        apns: {
          payload: {
            aps: {
              alert: { title: payload.title, body: payload.body },
              sound: "default",
            },
          },
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon ?? "/branding/opticrank-logo-512.png",
          },
          fcmOptions: { link: payload.data?.url ?? "/dashboard" },
        },
      });

      success += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          errors.push(resp.error.message);
          if (
            resp.error.code === "messaging/invalid-registration-token" ||
            resp.error.code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(batch[idx]);
          }
        }
      });
    } catch (err: unknown) {
      const e = err as { message?: string };
      failed += batch.length;
      errors.push(e.message ?? "Batch error");
    }
  }

  return { success, failed, errors, invalidTokens };
}
