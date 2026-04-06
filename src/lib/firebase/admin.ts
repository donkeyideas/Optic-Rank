import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let adminApp: App | null = null;
let messaging: Messaging | null = null;

function getServiceAccount(): object | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    console.error("[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT");
    return null;
  }
}

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;

  const sa = getServiceAccount();
  if (!sa) {
    console.warn("[Firebase] Service account not configured");
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
