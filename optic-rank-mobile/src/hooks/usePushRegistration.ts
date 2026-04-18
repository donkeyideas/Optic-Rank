import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";
import { APP_CONFIG } from "../lib/config";

const isExpoGo = Constants.appOwnership === "expo";

let Notifications: typeof import("expo-notifications") | null = null;
if (!isExpoGo) {
  Notifications = require("expo-notifications");
}

/**
 * Registers the device for push notifications when the user is signed in.
 * Uses native FCM/APNs tokens (not Expo Push tokens) and registers them
 * with the server via POST /api/push/register.
 */
export function usePushRegistration(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !Notifications) return;

    async function registerPush() {
      try {
        // Request permission
        const { status: existingStatus } =
          await Notifications!.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications!.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        // Get native FCM/APNs token
        const tokenData = await Notifications!.getDevicePushTokenAsync();
        const pushToken = tokenData.data as string;
        const device = Platform.OS === "ios" ? "ios" : "android";

        // Get Supabase JWT for auth
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Register with server
        const res = await fetch(
          `${APP_CONFIG.WEB_APP_URL}/api/push/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              token: pushToken,
              device,
              userAgent: `OpticRank-Mobile/${Platform.OS}`,
            }),
          }
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.log("Push registration failed:", err);
        }
      } catch (err) {
        console.log("Push registration error:", err);
      }
    }

    registerPush();
  }, [userId]);

  // Set up Android notification channel
  useEffect(() => {
    if (!Notifications || Platform.OS !== "android") return;
    Notifications.setNotificationChannelAsync("default", {
      name: "Optic Rank",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }, []);
}
