import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from "@apple/app-store-server-library";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/lib/stripe/client";

// --- Singletons ---

let apiClient: AppStoreServerAPIClient | null = null;
let verifier: SignedDataVerifier | null = null;

function getEnv() {
  const key = process.env.APPLE_IAP_KEY;
  const keyId = process.env.APPLE_IAP_KEY_ID;
  const issuerId = process.env.APPLE_IAP_ISSUER_ID;
  const bundleId = process.env.APPLE_BUNDLE_ID ?? "com.opticrank.mobile";
  const appAppleId = Number(process.env.APPLE_APP_ID ?? "6760938335");
  const environment =
    process.env.NODE_ENV === "production"
      ? Environment.PRODUCTION
      : Environment.SANDBOX;

  if (!key || !keyId || !issuerId) {
    throw new Error(
      "Missing Apple IAP env vars: APPLE_IAP_KEY, APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID"
    );
  }

  return { key, keyId, issuerId, bundleId, appAppleId, environment };
}

export function getAppleClient(): AppStoreServerAPIClient {
  if (!apiClient) {
    const { key, keyId, issuerId, bundleId, environment } = getEnv();
    apiClient = new AppStoreServerAPIClient(
      key,
      keyId,
      issuerId,
      bundleId,
      environment
    );
  }
  return apiClient;
}

export function getAppleVerifier(): SignedDataVerifier {
  if (!verifier) {
    const { bundleId, appAppleId, environment } = getEnv();
    // Apple root certificates are fetched online when enableOnlineChecks=true
    verifier = new SignedDataVerifier(
      [], // root certs — empty array with online checks enabled
      true, // enableOnlineChecks
      environment,
      bundleId,
      appAppleId
    );
  }
  return verifier;
}

// --- Plan mapping ---

export async function planFromAppleProductId(
  productId: string
): Promise<{ planKey: PlanId; limits: { maxProjects: number; maxKeywords: number; maxPagesCrawl: number; maxUsers: number } }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pricing_plans")
    .select(
      "plan_key, max_projects, max_keywords, max_pages_crawl, max_users"
    )
    .eq("apple_product_id", productId)
    .single();

  if (!data) {
    throw new Error(`No plan found for Apple product ID: ${productId}`);
  }

  return {
    planKey: data.plan_key as PlanId,
    limits: {
      maxProjects: data.max_projects,
      maxKeywords: data.max_keywords,
      maxPagesCrawl: data.max_pages_crawl,
      maxUsers: data.max_users,
    },
  };
}
