import { useCallback, useRef } from "react";
import { Alert, Platform } from "react-native";
import {
  useIAP,
  type Purchase,
  type PurchaseError,
  type ProductSubscription,
} from "react-native-iap";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { APP_CONFIG } from "../lib/config";
import { IAP_PRODUCT_IDS } from "../lib/iap";

export function useIAPSubscription() {
  const queryClient = useQueryClient();
  const processingRef = useRef(false);

  const handlePurchaseSuccess = useCallback(
    async (purchase: Purchase) => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        // Send the signed transaction (JWS) to our server for validation
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Not authenticated");
        }

        const res = await fetch(
          `${APP_CONFIG.WEB_APP_URL}/api/iap/validate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              transactionId: purchase.purchaseToken ?? purchase.id,
            }),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Validation failed");
        }

        // Finish the transaction with Apple
        await iap.finishTransaction({ purchase, isConsumable: false });

        // Refresh org data
        queryClient.invalidateQueries({ queryKey: ["organization"] });
        queryClient.invalidateQueries({ queryKey: ["billing"] });

        Alert.alert("Success", "Your subscription is now active.");
      } catch (err: any) {
        console.error("[IAP] Purchase validation error:", err);
        Alert.alert(
          "Purchase Error",
          err?.message || "Could not validate purchase. Please try again."
        );
      } finally {
        processingRef.current = false;
      }
    },
    []
  );

  const handlePurchaseError = useCallback((error: PurchaseError) => {
    if (error.code === "user-cancelled") return;
    console.error("[IAP] Purchase error:", error);
    Alert.alert(
      "Purchase Failed",
      error.message || "An error occurred during purchase."
    );
  }, []);

  const iap = useIAP({
    onPurchaseSuccess: handlePurchaseSuccess,
    onPurchaseError: handlePurchaseError,
  });

  // Fetch subscription products on first call
  const fetchSubscriptions = useCallback(async () => {
    if (iap.subscriptions.length > 0) return;
    try {
      await iap.fetchProducts({ skus: IAP_PRODUCT_IDS, type: "subs" });
    } catch (err) {
      console.error("[IAP] Failed to fetch subscriptions:", err);
    }
  }, [iap.subscriptions.length]);

  const purchase = useCallback(
    async (productId: string) => {
      try {
        await iap.requestPurchase({
          type: "subs",
          request: { apple: { sku: productId } },
        });
      } catch (err: any) {
        if (err?.code === "user-cancelled") return;
        console.error("[IAP] Purchase request error:", err);
        Alert.alert(
          "Purchase Error",
          err?.message || "Could not initiate purchase."
        );
      }
    },
    [iap.requestPurchase]
  );

  const restorePurchases = useCallback(async () => {
    try {
      await iap.restorePurchases();

      // Validate each restored purchase
      const purchases = iap.availablePurchases;
      if (purchases.length === 0) {
        Alert.alert(
          "No Purchases Found",
          "No previous subscriptions were found for this Apple ID."
        );
        return;
      }

      // Validate the most recent purchase
      const latest = purchases.sort(
        (a, b) => b.transactionDate - a.transactionDate
      )[0];
      await handlePurchaseSuccess(latest);
    } catch (err: any) {
      console.error("[IAP] Restore error:", err);
      Alert.alert(
        "Restore Failed",
        err?.message || "Could not restore purchases."
      );
    }
  }, [iap.restorePurchases, iap.availablePurchases, handlePurchaseSuccess]);

  // Find a subscription product by product ID
  const getSubscription = useCallback(
    (productId: string): ProductSubscription | undefined => {
      return iap.subscriptions.find((s) => s.id === productId);
    },
    [iap.subscriptions]
  );

  return {
    connected: iap.connected,
    subscriptions: iap.subscriptions,
    purchasing: processingRef.current,
    fetchSubscriptions,
    purchase,
    restorePurchases,
    getSubscription,
  };
}
