import { Platform } from "react-native";

export const IAP_PRODUCT_IDS = [
  "com.opticrank.starter.monthly",
  "com.opticrank.pro.monthly",
  "com.opticrank.business.monthly",
];

export const PRODUCT_TO_PLAN: Record<string, string> = {
  "com.opticrank.starter.monthly": "starter",
  "com.opticrank.pro.monthly": "pro",
  "com.opticrank.business.monthly": "business",
};

export const PLAN_TO_PRODUCT: Record<string, string> = {
  starter: "com.opticrank.starter.monthly",
  pro: "com.opticrank.pro.monthly",
  business: "com.opticrank.business.monthly",
};

export const isIOS = Platform.OS === "ios";

/** Apple subscription management URL */
export const APPLE_SUBSCRIPTIONS_URL =
  "https://apps.apple.com/account/subscriptions";
