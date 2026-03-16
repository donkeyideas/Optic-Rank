"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

/**
 * Update a pricing plan's configuration.
 */
export async function updatePricingPlan(
  planKey: string,
  data: {
    name?: string;
    description?: string;
    price_monthly?: number;
    stripe_price_id?: string;
    max_projects?: number;
    max_keywords?: number;
    max_pages_crawl?: number;
    max_users?: number;
    features?: string[];
    comparison?: Record<string, string | boolean>;
    is_highlighted?: boolean;
    highlight_label?: string;
    cta_text?: string;
    cta_href?: string;
    is_active?: boolean;
  }
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price_monthly !== undefined) updateData.price_monthly = data.price_monthly;
  if (data.stripe_price_id !== undefined) updateData.stripe_price_id = data.stripe_price_id || null;
  if (data.max_projects !== undefined) updateData.max_projects = data.max_projects;
  if (data.max_keywords !== undefined) updateData.max_keywords = data.max_keywords;
  if (data.max_pages_crawl !== undefined) updateData.max_pages_crawl = data.max_pages_crawl;
  if (data.max_users !== undefined) updateData.max_users = data.max_users;
  if (data.features !== undefined) updateData.features = JSON.stringify(data.features);
  if (data.comparison !== undefined) updateData.comparison = JSON.stringify(data.comparison);
  if (data.is_highlighted !== undefined) updateData.is_highlighted = data.is_highlighted;
  if (data.highlight_label !== undefined) updateData.highlight_label = data.highlight_label || null;
  if (data.cta_text !== undefined) updateData.cta_text = data.cta_text;
  if (data.cta_href !== undefined) updateData.cta_href = data.cta_href;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { error } = await supabase
    .from("pricing_plans")
    .update(updateData)
    .eq("plan_key", planKey);

  if (error) return { error: error.message };

  // Sync updated limits to all existing organizations on this plan.
  // This ensures admin changes take effect immediately for current subscribers.
  const limitsChanged =
    data.max_projects !== undefined ||
    data.max_keywords !== undefined ||
    data.max_pages_crawl !== undefined ||
    data.max_users !== undefined;

  if (limitsChanged) {
    // Fetch the full updated plan to get all current limit values
    const { data: updatedPlan } = await supabase
      .from("pricing_plans")
      .select("max_projects, max_keywords, max_pages_crawl, max_users")
      .eq("plan_key", planKey)
      .single();

    if (updatedPlan) {
      await supabase
        .from("organizations")
        .update({
          max_projects: updatedPlan.max_projects,
          max_keywords: updatedPlan.max_keywords,
          max_pages_crawl: updatedPlan.max_pages_crawl,
          max_users: updatedPlan.max_users,
        })
        .eq("plan", planKey);
    }
  }

  revalidatePath("/pricing");
  revalidatePath("/dashboard/settings");
  revalidatePath("/admin/subscriptions");
  return { success: true };
}
