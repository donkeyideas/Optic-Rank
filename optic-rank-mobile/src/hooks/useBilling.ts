import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface PricingPlan {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  price_monthly: number;
  stripe_price_id: string | null;
  apple_product_id: string | null;
  max_projects: number;
  max_keywords: number;
  max_pages_crawl: number;
  max_users: number;
  features: Record<string, unknown> | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface BillingEvent {
  id: string;
  organization_id: string;
  event_type: string;
  amount: number | null;
  currency: string | null;
  description: string | null;
  stripe_event_id: string | null;
  created_at: string;
}

interface UsageTracking {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  keywords_used: number;
  pages_crawled: number;
  api_calls: number;
  ai_queries: number;
  created_at: string;
}

/**
 * Fetch all active pricing plans from the pricing_plans table, ordered by display_order.
 */
export function usePricingPlans() {
  return useQuery<PricingPlan[]>({
    queryKey: ["pricingPlans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_plans")
        .select(
          "id, plan_key, name, description, price_monthly, stripe_price_id, apple_product_id, max_projects, max_keywords, max_pages_crawl, max_users, features, display_order, is_active, created_at"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error || !data) return [];

      return data as PricingPlan[];
    },
  });
}

/**
 * Fetch recent billing events for an organization, ordered by created_at descending.
 * Limited to 10 most recent events.
 */
export function useBillingEvents(orgId: string | undefined) {
  return useQuery<BillingEvent[]>({
    queryKey: ["billingEvents", orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from("billing_events")
        .select(
          "id, organization_id, event_type, amount, currency, description, stripe_event_id, created_at"
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !data) return [];

      return data as BillingEvent[];
    },
    enabled: !!orgId,
  });
}

/**
 * Fetch current period usage tracking for an organization.
 * Returns the most recent usage_tracking record (current billing period).
 */
export function useCurrentUsage(orgId: string | undefined) {
  return useQuery<UsageTracking | null>({
    queryKey: ["currentUsage", orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabase
        .from("usage_tracking")
        .select(
          "id, organization_id, period_start, period_end, keywords_used, pages_crawled, api_calls, ai_queries, created_at"
        )
        .eq("organization_id", orgId)
        .order("period_start", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;

      return data as UsageTracking;
    },
    enabled: !!orgId,
  });
}
