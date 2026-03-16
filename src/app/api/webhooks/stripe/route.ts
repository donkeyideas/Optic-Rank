import { NextResponse } from "next/server";
import { getStripe, fetchPlanLimits, fetchPlanFromPriceId } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = createAdminClient();

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const orgId = session.metadata?.organization_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!orgId) {
          console.error("[Stripe Webhook] No organization_id in session metadata");
          break;
        }

        // Retrieve subscription to get the price/plan
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? await fetchPlanFromPriceId(priceId) : "starter";
        const limits = await fetchPlanLimits(plan);

        await supabase
          .from("organizations")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
            trial_ends_at: null, // Clear trial on paid subscription
            plan,
            max_projects: limits.maxProjects,
            max_keywords: limits.maxKeywords,
            max_pages_crawl: limits.maxPagesCrawl,
            max_users: limits.maxUsers,
          })
          .eq("id", orgId);

        await logBillingEvent(supabase, orgId, event.id, "checkout.session.completed", session.amount_total, session.currency);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        const subscriptionId = (
          invoice.parent?.subscription_details?.subscription ?? null
        ) as string | null;
        const org = await findOrgByCustomer(supabase, customerId);

        if (org && subscriptionId) {
          // Retrieve subscription to get plan details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price?.id;
          const plan = priceId ? await fetchPlanFromPriceId(priceId) : org.plan;
          const limits = await fetchPlanLimits(plan);

          await supabase
            .from("organizations")
            .update({
              subscription_status: "active",
              stripe_subscription_id: subscriptionId,
              trial_ends_at: null,
              plan,
              max_projects: limits.maxProjects,
              max_keywords: limits.maxKeywords,
              max_pages_crawl: limits.maxPagesCrawl,
              max_users: limits.maxUsers,
            })
            .eq("id", org.id);

          await logBillingEvent(supabase, org.id, event.id, "invoice.paid", invoice.amount_paid, invoice.currency);
        } else if (org) {
          await supabase
            .from("organizations")
            .update({ subscription_status: "active" })
            .eq("id", org.id);

          await logBillingEvent(supabase, org.id, event.id, "invoice.paid", invoice.amount_paid, invoice.currency);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        const org = await findOrgByCustomer(supabase, customerId);

        if (org) {
          await supabase
            .from("organizations")
            .update({ subscription_status: "past_due" })
            .eq("id", org.id);

          await logBillingEvent(supabase, org.id, event.id, "invoice.payment_failed", invoice.amount_due, invoice.currency);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const org = await findOrgByCustomer(supabase, customerId);

        if (org) {
          const priceId = subscription.items.data[0]?.price?.id;
          const plan = priceId ? await fetchPlanFromPriceId(priceId) : org.plan;
          const limits = await fetchPlanLimits(plan);
          const status = subscription.status === "active" ? "active"
            : subscription.status === "trialing" ? "trialing"
            : subscription.status === "past_due" ? "past_due"
            : subscription.status === "canceled" ? "canceled"
            : "paused";

          const subUpdate: Record<string, unknown> = {
            plan,
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            max_projects: limits.maxProjects,
            max_keywords: limits.maxKeywords,
            max_pages_crawl: limits.maxPagesCrawl,
            max_users: limits.maxUsers,
          };
          if (status === "active") {
            subUpdate.trial_ends_at = null;
          }

          await supabase
            .from("organizations")
            .update(subUpdate)
            .eq("id", org.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const org = await findOrgByCustomer(supabase, customerId);

        if (org) {
          const freeLimits = await fetchPlanLimits("free");
          await supabase
            .from("organizations")
            .update({
              plan: "free",
              subscription_status: "canceled",
              stripe_subscription_id: null,
              max_projects: freeLimits.maxProjects,
              max_keywords: freeLimits.maxKeywords,
              max_pages_crawl: freeLimits.maxPagesCrawl,
              max_users: freeLimits.maxUsers,
            })
            .eq("id", org.id);

          await logBillingEvent(supabase, org.id, event.id, "subscription.deleted", 0, "usd");
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// --- Helpers ---

async function findOrgByCustomer(
  supabase: ReturnType<typeof createAdminClient>,
  customerId: string
) {
  const { data } = await supabase
    .from("organizations")
    .select("id, plan")
    .eq("stripe_customer_id", customerId)
    .single();
  return data;
}

async function logBillingEvent(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  stripeEventId: string,
  eventType: string,
  amountCents: number | null,
  currency: string | null
) {
  await supabase.from("billing_events").insert({
    organization_id: orgId,
    stripe_event_id: stripeEventId,
    event_type: eventType,
    amount_cents: amountCents,
    currency: currency ?? "usd",
  });
}
