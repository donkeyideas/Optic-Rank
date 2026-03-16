"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, PLAN_LIMITS, type PlanId } from "@/lib/stripe/client";
import { getUsageSummary, type GatedResource } from "@/lib/stripe/plan-gate";
import { revalidatePath } from "next/cache";

/**
 * Create a Stripe Checkout session for upgrading to a paid plan.
 */
export async function createCheckoutSession(
  planId: PlanId
): Promise<{ error: string } | { url: string }> {
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

  const planConfig = PLAN_LIMITS[planId];
  if (!planConfig?.stripePriceId) {
    return { error: `No Stripe price configured for ${planId} plan.` };
  }

  try {
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?tab=billing&success=true`,
      cancel_url: `${appUrl}/dashboard/settings?tab=billing&canceled=true`,
      metadata: { organization_id: org.id },
      subscription_data: {
        metadata: { organization_id: org.id },
      },
    });

    if (!session.url) return { error: "Failed to create checkout session." };
    return { url: session.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to create checkout session." };
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
