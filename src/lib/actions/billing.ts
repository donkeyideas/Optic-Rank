"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, fetchPlanLimits, fetchPlanConfig, fetchPlanFromPriceId, type PlanId } from "@/lib/stripe/client";
import { getUsageSummary, type GatedResource } from "@/lib/stripe/plan-gate";
import { revalidatePath } from "next/cache";

/**
 * Create a Stripe Subscription with incomplete status.
 * Returns a client_secret from the PaymentIntent so the client
 * can collect payment using the fully-stylable Payment Element.
 */
export async function createCheckoutSession(
  planId: PlanId
): Promise<{ error: string } | { clientSecret: string; subscriptionId: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, stripe_customer_id, plan")
    .eq("id", profile.organization_id)
    .single();

  if (!org) return { error: "Organization not found." };

  const planConfig = await fetchPlanConfig(planId);
  if (!planConfig?.stripePriceId) {
    return { error: `No Stripe price configured for ${planId} plan.` };
  }

  try {
    const stripe = getStripe();

    // Create or reuse Stripe customer
    let customerId = org.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: org.name,
        metadata: { organization_id: org.id },
      });
      customerId = customer.id;

      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", org.id);
    }

    // Create subscription with incomplete status
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: planConfig.stripePriceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice"],
      metadata: { organization_id: org.id },
    });

    const invoice = subscription.latest_invoice;
    if (!invoice || typeof invoice === "string") {
      return { error: "Failed to create subscription invoice." };
    }

    // In Stripe Clover API, PaymentIntent is accessed via invoicePayments
    const payments = await stripe.invoicePayments.list({
      invoice: invoice.id,
      expand: ["data.payment.payment_intent"],
      limit: 1,
    });

    const paymentIntent = payments.data[0]?.payment?.payment_intent;
    if (!paymentIntent || typeof paymentIntent === "string") {
      return { error: "Failed to create payment intent." };
    }

    if (!paymentIntent.client_secret) {
      return { error: "Payment intent has no client secret." };
    }

    return {
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create subscription." };
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription.
 */
export async function createPortalSession(): Promise<{ error: string } | { url: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", profile.organization_id)
    .single();

  if (!org?.stripe_customer_id) {
    return { error: "No billing account. Subscribe to a plan first." };
  }

  try {
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4001";

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/dashboard/settings?tab=billing`,
    });

    return { url: session.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create portal session." };
  }
}

/**
 * Activate a subscription after successful payment.
 * Called client-side after stripe.confirmPayment succeeds.
 * This ensures the org is updated even if the webhook hasn't fired yet.
 */
export async function activateSubscription(
  subscriptionId: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Verify this subscription belongs to this org's customer
    const { data: org } = await supabase
      .from("organizations")
      .select("id, stripe_customer_id")
      .eq("id", profile.organization_id)
      .single();

    if (!org) return { error: "Organization not found." };
    if (org.stripe_customer_id && org.stripe_customer_id !== subscription.customer) {
      return { error: "Subscription does not belong to this organization." };
    }

    const priceId = subscription.items.data[0]?.price?.id;
    const plan = priceId ? await fetchPlanFromPriceId(priceId) : "free";
    const limits = await fetchPlanLimits(plan);

    // Only activate if subscription is active or has succeeded payment
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    if (!isActive) {
      // Even if not fully active yet, still link the subscription
      await supabase
        .from("organizations")
        .update({
          stripe_subscription_id: subscriptionId,
        })
        .eq("id", org.id);
      return { error: "Subscription is not yet active. Status: " + subscription.status };
    }

    await supabase
      .from("organizations")
      .update({
        plan,
        subscription_status: "active",
        stripe_subscription_id: subscriptionId,
        trial_ends_at: null,
        max_projects: limits.maxProjects,
        max_keywords: limits.maxKeywords,
        max_pages_crawl: limits.maxPagesCrawl,
        max_users: limits.maxUsers,
      })
      .eq("id", org.id);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to activate subscription." };
  }
}

/**
 * Get current usage for the authenticated user's organization.
 */
export async function getCurrentUsage(): Promise<
  { error: string } | { usage: Record<GatedResource, { current: number; limit: number }> }
> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return { error: "No organization found." };

  const usage = await getUsageSummary(profile.organization_id);
  return { usage };
}

/**
 * Track a usage increment for a metric.
 */
export async function trackUsage(
  orgId: string,
  metric: string,
  increment: number = 1
): Promise<void> {
  const supabase = createAdminClient();

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  // Try to increment existing row
  const { data: existing } = await supabase
    .from("usage_tracking")
    .select("id, value")
    .eq("organization_id", orgId)
    .eq("metric", metric)
    .eq("period_start", periodStart)
    .single();

  if (existing) {
    await supabase
      .from("usage_tracking")
      .update({ value: existing.value + increment })
      .eq("id", existing.id);
  } else {
    await supabase.from("usage_tracking").insert({
      organization_id: orgId,
      metric,
      value: increment,
      period_start: periodStart,
      period_end: periodEnd,
    });
  }

  revalidatePath("/dashboard/settings");
}
