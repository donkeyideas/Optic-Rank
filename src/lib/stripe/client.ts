import Stripe from "stripe";
import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";

// --- Server-side Stripe instance ---

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeInstance = new Stripe(key, { apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion });
  }
  return stripeInstance;
}

// --- Client-side Stripe promise ---

let stripePromise: Promise<StripeClient | null> | null = null;

export function getStripePromise(): Promise<StripeClient | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) return Promise.resolve(null);
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

// --- Plan configuration ---

export type PlanId = "free" | "starter" | "pro" | "business" | "enterprise";

export interface PlanConfig {
  name: string;
  priceMonthly: number;
  stripePriceId: string | null;
  maxProjects: number;
  maxKeywords: number;
  maxPagesCrawl: number;
  maxUsers: number;
}

/**
 * Plan limits. stripe_price_id values should be set from env or Stripe dashboard.
 * Using placeholder IDs — replace with real Stripe Price IDs when configured.
 */
export const PLAN_LIMITS: Record<PlanId, PlanConfig> = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: null,
    maxProjects: 1,
    maxKeywords: 50,
    maxPagesCrawl: 100,
    maxUsers: 1,
  },
  starter: {
    name: "Starter",
    priceMonthly: 29,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? null,
    maxProjects: 3,
    maxKeywords: 500,
    maxPagesCrawl: 5000,
    maxUsers: 3,
  },
  pro: {
    name: "Pro",
    priceMonthly: 79,
    stripePriceId: process.env.STRIPE_PRICE_PRO ?? null,
    maxProjects: 10,
    maxKeywords: 5000,
    maxPagesCrawl: 50000,
    maxUsers: 10,
  },
  business: {
    name: "Business",
    priceMonthly: 199,
    stripePriceId: process.env.STRIPE_PRICE_BUSINESS ?? null,
    maxProjects: 100,
    maxKeywords: 25000,
    maxPagesCrawl: 500000,
    maxUsers: 50,
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 0, // Custom pricing
    stripePriceId: null,
    maxProjects: 1000,
    maxKeywords: 100000,
    maxPagesCrawl: 1000000,
    maxUsers: 200,
  },
};

/**
 * Look up plan from Stripe Price ID.
 */
export function planFromPriceId(priceId: string): PlanId {
  for (const [plan, config] of Object.entries(PLAN_LIMITS)) {
    if (config.stripePriceId === priceId) return plan as PlanId;
  }
  return "free";
}
