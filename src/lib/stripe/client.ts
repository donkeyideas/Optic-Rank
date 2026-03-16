import Stripe from "stripe";
import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";
import { createAdminClient } from "@/lib/supabase/admin";

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

export interface PlanLimits {
  maxProjects: number;
  maxKeywords: number;
  maxPagesCrawl: number;
  maxUsers: number;
}

export interface PlanConfig extends PlanLimits {
  name: string;
  priceMonthly: number;
  stripePriceId: string | null;
}

/**
 * Fallback defaults — used only when the pricing_plans table is unreachable.
 * The authoritative source is always the database.
 */
const FALLBACK_LIMITS: Record<PlanId, PlanConfig> = {
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
    priceMonthly: 0,
    stripePriceId: null,
    maxProjects: 1000,
    maxKeywords: 100000,
    maxPagesCrawl: 1000000,
    maxUsers: 200,
  },
};

/** @deprecated Use fetchPlanLimits() for dynamic DB-backed limits */
export const PLAN_LIMITS = FALLBACK_LIMITS;

/**
 * Fetch plan limits from the pricing_plans table (authoritative source).
 * Falls back to hardcoded defaults if DB is unreachable.
 */
export async function fetchPlanLimits(planKey: string): Promise<PlanLimits> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("pricing_plans")
      .select("max_projects, max_keywords, max_pages_crawl, max_users")
      .eq("plan_key", planKey)
      .single();

    if (data) {
      return {
        maxProjects: data.max_projects,
        maxKeywords: data.max_keywords,
        maxPagesCrawl: data.max_pages_crawl,
        maxUsers: data.max_users,
      };
    }
  } catch {
    // Fall through to defaults
  }

  const fallback = FALLBACK_LIMITS[planKey as PlanId];
  return fallback ?? FALLBACK_LIMITS.free;
}

/**
 * Fetch full plan config (with price and Stripe ID) from the database.
 */
export async function fetchPlanConfig(planKey: string): Promise<PlanConfig> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("pricing_plans")
      .select("name, price_monthly, stripe_price_id, max_projects, max_keywords, max_pages_crawl, max_users")
      .eq("plan_key", planKey)
      .single();

    if (data) {
      return {
        name: data.name,
        priceMonthly: data.price_monthly,
        stripePriceId: data.stripe_price_id,
        maxProjects: data.max_projects,
        maxKeywords: data.max_keywords,
        maxPagesCrawl: data.max_pages_crawl,
        maxUsers: data.max_users,
      };
    }
  } catch {
    // Fall through to defaults
  }

  return FALLBACK_LIMITS[planKey as PlanId] ?? FALLBACK_LIMITS.free;
}

/**
 * Look up plan key from Stripe Price ID — queries DB first, falls back to env.
 */
export async function fetchPlanFromPriceId(priceId: string): Promise<PlanId> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("pricing_plans")
      .select("plan_key")
      .eq("stripe_price_id", priceId)
      .single();

    if (data?.plan_key) return data.plan_key as PlanId;
  } catch {
    // Fall through to static lookup
  }

  return planFromPriceId(priceId);
}

/**
 * Look up plan from Stripe Price ID (static fallback using env vars).
 */
export function planFromPriceId(priceId: string): PlanId {
  for (const [plan, config] of Object.entries(FALLBACK_LIMITS)) {
    if (config.stripePriceId === priceId) return plan as PlanId;
  }
  return "free";
}
