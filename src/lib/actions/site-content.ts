"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

const PAGE_PATH_MAP: Record<string, string> = {
  homepage: "/",
  features: "/features",
  "search-ai": "/search-ai",
  "social-intelligence": "/social-intelligence",
};

/**
 * Update a site content section.
 */
export async function updateSiteContent(
  page: string,
  section: string,
  content: unknown
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("site_content")
    .update({
      content: typeof content === "string" ? JSON.parse(content) : content,
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })
    .eq("page", page)
    .eq("section", section);

  if (error) return { error: error.message };

  const pagePath = PAGE_PATH_MAP[page] ?? "/";
  revalidatePath(pagePath);
  revalidatePath("/admin/content");
  return { success: true };
}
