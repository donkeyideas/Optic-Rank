"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type PushPermission = "default" | "granted" | "denied" | "unsupported";
type PushState = "idle" | "loading" | "subscribed" | "unsubscribed" | "error";

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: PushPermission;
  state: PushState;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "iOS";
  if (/android/.test(ua)) return "Android";
  if (/macintosh/.test(ua)) return "Mac";
  if (/windows/.test(ua)) return "Windows";
  if (/linux/.test(ua)) return "Linux";
  return "Unknown";
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermission>("default");
  const [state, setState] = useState<PushState>("loading");
  const [error, setError] = useState<string | null>(null);
  const vapidKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
    if (!supported) {
      setPermission("unsupported");
      setState("idle");
      return;
    }
    setPermission(Notification.permission as PushPermission);
    checkExisting();
  }, []);

  async function checkExisting() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "subscribed" : "unsubscribed");
      } else {
        setState("unsubscribed");
      }
    } catch {
      setState("unsubscribed");
    }
  }

  async function getVapidKey(): Promise<string | null> {
    if (vapidKeyRef.current) return vapidKeyRef.current;
    try {
      const res = await fetch("/api/push/config");
      const data = await res.json();
      if (data.vapidKey) {
        vapidKeyRef.current = data.vapidKey;
        return data.vapidKey;
      }
      return null;
    } catch {
      return null;
    }
  }

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setError(null);
    setState("loading");

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") {
        setState("unsubscribed");
        return false;
      }

      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        setError("Push not configured on server");
        setState("error");
        return false;
      }

      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          device: getDeviceType(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) throw new Error("Failed to register subscription");

      setState("subscribed");
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Failed to subscribe");
      setState("error");
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState("loading");
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch(
            `/api/push/register?token=${encodeURIComponent(
              JSON.stringify(sub.toJSON())
            )}`,
            { method: "DELETE" }
          );
        }
      }
      setState("unsubscribed");
      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? "Failed to unsubscribe");
      setState("error");
      return false;
    }
  }, []);

  return { isSupported, permission, state, error, subscribe, unsubscribe };
}
