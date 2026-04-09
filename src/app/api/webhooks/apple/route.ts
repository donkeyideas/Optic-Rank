import { NextResponse } from "next/server";
import { NotificationTypeV2 } from "@apple/app-store-server-library";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAppleVerifier,
  planFromAppleProductId,
} from "@/lib/apple/server-api";
import { fetchPlanLimits } from "@/lib/stripe/client";

/**
 * POST /api/webhooks/apple
 * Receives App Store Server Notifications v2.
 * Apple sends a signed JWS payload for subscription lifecycle events.
 */
export async function POST(request: Request) {
  const supabase = createAdminClient();

  let body: { signedPayload?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.signedPayload) {
    return NextResponse.json(
      { error: "Missing signedPayload" },
      { status: 400 }
    );
  }

  let notification;
  try {
    const verifier = getAppleVerifier();
    notification = await verifier.verifyAndDecodeNotification(
      body.signedPayload
    );
  } catch (err) {
    console.error("[Apple Webhook] Verification failed:", err);
    return NextResponse.json(
      { error: "Notification verification failed" },
      { status: 400 }
    );
  }

  const notificationType = notification.notificationType;
  const notificationId = notification.notificationUUID;

  // Dedup — skip if already processed
  if (notificationId) {
    const { data: existing } = await supabase
      .from("billing_events")
      .select("id")
      .eq("apple_notification_id", notificationId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, deduplicated: true });
    }
  }

  // Extract transaction info
  const signedTransactionInfo =
    notification.data?.signedTransactionInfo;
  if (!signedTransactionInfo) {
    // Some notification types (TEST, RENEWAL_EXTENSION) may not have transaction data
    if (notificationType === NotificationTypeV2.TEST) {
      console.log("[Apple Webhook] Test notification received");
      return NextResponse.json({ received: true });
    }
    console.warn(
      `[Apple Webhook] No transaction data for ${notificationType}`
    );
    return NextResponse.json({ received: true });
  }

  let transaction;
  try {
    const verifier = getAppleVerifier();
    transaction = await verifier.verifyAndDecodeTransaction(
      signedTransactionInfo
    );
  } catch (err) {
    console.error("[Apple Webhook] Transaction verification failed:", err);
    return NextResponse.json(
      { error: "Transaction verification failed" },
      { status: 400 }
    );
  }

  const originalTransactionId = transaction.originalTransactionId;
  if (!originalTransactionId) {
    console.error("[Apple Webhook] No originalTransactionId");
    return NextResponse.json({ received: true });
  }

  // Find the organization by Apple transaction ID
  const { data: org } = await supabase
    .from("organizations")
    .select("id, plan")
    .eq("apple_original_transaction_id", originalTransactionId)
    .maybeSingle();

  if (!org) {
    // First purchase may not be linked yet (validated via /api/iap/validate)
    console.warn(
      `[Apple Webhook] No org for originalTransactionId ${originalTransactionId}`
    );
    return NextResponse.json({ received: true });
  }

  try {
    switch (notificationType) {
      case NotificationTypeV2.DID_RENEW:
      case NotificationTypeV2.SUBSCRIBED: {
        // Subscription renewed or new subscription
        const productId = transaction.productId;
        if (productId) {
          const { planKey, limits } = await planFromAppleProductId(productId);
          await supabase
            .from("organizations")
            .update({
              plan: planKey,
              subscription_status: "active",
              apple_subscription_expires_at: transaction.expiresDate
                ? new Date(transaction.expiresDate).toISOString()
                : null,
              max_projects: limits.maxProjects,
              max_keywords: limits.maxKeywords,
              max_pages_crawl: limits.maxPagesCrawl,
              max_users: limits.maxUsers,
            })
            .eq("id", org.id);
        }
        await logAppleEvent(
          supabase,
          org.id,
          notificationId,
          `apple.${notificationType}`,
          transaction.price,
          transaction.currency
        );
        break;
      }

      case NotificationTypeV2.DID_CHANGE_RENEWAL_PREF: {
        // Upgrade or downgrade — takes effect at next renewal
        // The new product is in renewalInfo, not transaction
        const signedRenewalInfo = notification.data?.signedRenewalInfo;
        if (signedRenewalInfo) {
          const verifier = getAppleVerifier();
          const renewalInfo =
            await verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo);
          const newProductId = renewalInfo.autoRenewProductId;
          if (newProductId) {
            // If it's an upgrade (immediate), update now. Otherwise Apple handles at renewal.
            if (notification.subtype === "UPGRADE") {
              const { planKey, limits } =
                await planFromAppleProductId(newProductId);
              await supabase
                .from("organizations")
                .update({
                  plan: planKey,
                  subscription_status: "active",
                  max_projects: limits.maxProjects,
                  max_keywords: limits.maxKeywords,
                  max_pages_crawl: limits.maxPagesCrawl,
                  max_users: limits.maxUsers,
                })
                .eq("id", org.id);
            }
          }
        }
        await logAppleEvent(
          supabase,
          org.id,
          notificationId,
          "apple.plan_change",
          null,
          null
        );
        break;
      }

      case NotificationTypeV2.EXPIRED:
      case NotificationTypeV2.REVOKE: {
        // Subscription expired or revoked — downgrade to free
        const freeLimits = await fetchPlanLimits("free");
        await supabase
          .from("organizations")
          .update({
            plan: "free",
            subscription_status: "canceled",
            apple_subscription_expires_at: null,
            max_projects: freeLimits.maxProjects,
            max_keywords: freeLimits.maxKeywords,
            max_pages_crawl: freeLimits.maxPagesCrawl,
            max_users: freeLimits.maxUsers,
          })
          .eq("id", org.id);
        await logAppleEvent(
          supabase,
          org.id,
          notificationId,
          `apple.${notificationType}`,
          null,
          null
        );
        break;
      }

      case NotificationTypeV2.DID_FAIL_TO_RENEW: {
        // Payment failed — set past_due
        await supabase
          .from("organizations")
          .update({ subscription_status: "past_due" })
          .eq("id", org.id);
        await logAppleEvent(
          supabase,
          org.id,
          notificationId,
          "apple.payment_failed",
          null,
          null
        );
        break;
      }

      case NotificationTypeV2.GRACE_PERIOD_EXPIRED: {
        // Grace period ended — downgrade to free
        const freeLimits = await fetchPlanLimits("free");
        await supabase
          .from("organizations")
          .update({
            plan: "free",
            subscription_status: "canceled",
            apple_subscription_expires_at: null,
            max_projects: freeLimits.maxProjects,
            max_keywords: freeLimits.maxKeywords,
            max_pages_crawl: freeLimits.maxPagesCrawl,
            max_users: freeLimits.maxUsers,
          })
          .eq("id", org.id);
        await logAppleEvent(
          supabase,
          org.id,
          notificationId,
          "apple.grace_period_expired",
          null,
          null
        );
        break;
      }

      case NotificationTypeV2.REFUND: {
        // Refund issued — downgrade to free
        const freeLimits = await fetchPlanLimits("free");
        await supabase
          .from("organizations")
          .update({
            plan: "free",
            subscription_status: "canceled",
            max_projects: freeLimits.maxProjects,
            max_keywords: freeLimits.maxKeywords,
            max_pages_crawl: freeLimits.maxPagesCrawl,
            max_users: freeLimits.maxUsers,
          })
          .eq("id", org.id);
        await logAppleEvent(
          supabase,
          org.id,
          notificationId,
          "apple.refund",
          transaction.price,
          transaction.currency
        );
        break;
      }

      default:
        console.log(
          `[Apple Webhook] Unhandled notification type: ${notificationType}`
        );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Apple Webhook] Processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// --- Helpers ---

async function logAppleEvent(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  notificationId: string | undefined,
  eventType: string,
  amountCents: number | null | undefined,
  currency: string | null | undefined
) {
  await supabase.from("billing_events").insert({
    organization_id: orgId,
    event_type: eventType,
    billing_source: "apple",
    apple_notification_id: notificationId ?? null,
    amount_cents: amountCents ?? null,
    currency: currency ?? "usd",
  });
}
