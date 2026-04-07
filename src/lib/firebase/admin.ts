import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { createAdminClient } from "@/lib/supabase/admin";

let adminApp: App | null = null;
let messaging: Messaging | null = null;

/**
 * Load Firebase service account from admin_settings DB table first,
 * then fall back to FIREBASE_SERVICE_ACCOUNT env var.
 * This matches the Argufight pattern and avoids Vercel env var issues.
 */
async function getServiceAccount(): Promise<object | null> {
  // 1. Try database (admin_settings table)
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "FIREBASE_SERVICE_ACCOUNT")
      .single();

    if (data?.value) {
      const parsed = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      if (parsed?.project_id) {
        console.log("[Firebase] Loaded service account from DB");
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Firebase] DB lookup failed, trying env var:", (err as Error).message);
  }

  // 2. Fall back to environment variable
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    console.log("[Firebase] Loaded service account from env var");
    return parsed;
  } catch {
    console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var");
    return null;
  }
}

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;

  const sa = await getServiceAccount();
  if (!sa) {
    console.warn("[Firebase] Service account not configured (checked DB + env)");
    return null;
  }

  if (getApps().length === 0) {
    adminApp = initializeApp({ credential: cert(sa as Parameters<typeof cert>[0]) });
  } else {
    adminApp = getApps()[0];
  }

  messaging = getMessaging(adminApp);
  return messaging;
}
