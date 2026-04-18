import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "../lib/supabase";
import { APP_CONFIG } from "../lib/config";

// Required for web browser auth redirect handling
WebBrowser.maybeCompleteAuthSession();

/**
 * Ensures a newly-authenticated OAuth/Apple user has an organization.
 * Routes through server-side API to bypass RLS.
 */
async function ensureOrganization(userId: string, displayName?: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${APP_CONFIG.WEB_APP_URL}/api/mobile/ensure-org`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ displayName }),
    });
  } catch (err) {
    console.error("Failed to ensure org:", err);
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen for deep links (OAuth callback from web proxy)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url.includes("auth/callback")) return;

      // Extract tokens from hash fragment
      const hashString = url.includes("#") ? url.split("#")[1] : "";
      if (!hashString) return;

      const hashParams = new URLSearchParams(hashString);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Ensure org exists for new OAuth sign-up users
        if (data.user) {
          await ensureOrganization(data.user.id);
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);
    return () => subscription.remove();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    company: string
  ) => {
    // Route through server-side API to bypass RLS
    const res = await fetch(`${APP_CONFIG.WEB_APP_URL}/api/mobile/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, company: company || undefined }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || "Sign up failed");
    }

    return data;
  };

  const signInWithOAuth = async (provider: "google" | "github") => {
    // Get the mobile app's deep link URL for the callback
    const appUrl = Linking.createURL("auth/callback");
    // Route through the web app which exchanges the code and redirects back with tokens
    const mobileCallbackUrl = `${APP_CONFIG.WEB_APP_URL}/auth/mobile-callback?app_url=${encodeURIComponent(appUrl)}`;

    // Construct the Supabase OAuth URL directly
    const oauthUrl = `${APP_CONFIG.SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(mobileCallbackUrl)}`;

    if (__DEV__) {
      console.log("[OAuth] App URL:", appUrl);
      console.log("[OAuth] Callback URL:", mobileCallbackUrl);
    }

    // Open the browser — after auth, the web callback will redirect back to the app
    await WebBrowser.openBrowserAsync(oauthUrl);
  };

  const signInWithApple = async () => {
    if (Platform.OS !== "ios") {
      throw new Error("Apple Sign-In is only available on iOS.");
    }

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Apple Sign-In is not available on this device.");
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("No identity token returned from Apple.");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });

    if (error) throw error;

    // Update profile with Apple's full name if available (only returned on first sign-in)
    let fullName = "";
    if (credential.fullName?.givenName && data.user) {
      fullName = [credential.fullName.givenName, credential.fullName.familyName]
        .filter(Boolean)
        .join(" ");
      if (fullName) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName })
          .eq("id", data.user.id);
      }
    }

    // Ensure org exists for new Apple sign-up users
    if (data.user) {
      await ensureOrganization(data.user.id, fullName || undefined);
    }

    return data;
  };

  const deleteAccount = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) throw new Error("Not authenticated");

    const res = await fetch(`${APP_CONFIG.WEB_APP_URL}/api/account/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to delete account");
    }

    await supabase.auth.signOut();
  }, []);

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${APP_CONFIG.WEB_APP_URL}/auth/reset-password`,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { session, user, loading, signIn, signUp, signInWithOAuth, signInWithApple, deleteAccount, resetPassword, signOut };
}
