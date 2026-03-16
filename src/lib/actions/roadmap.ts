"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

export async function createRoadmapItem(formData: {
  title: string;
  description?: string;
  status?: "planned" | "in_progress" | "completed";
  quarter?: string;
  category?: "feature" | "improvement" | "integration";
  sort_order?: number;
}): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("roadmap_items").insert({
    title: formData.title,
    description: formData.description ?? null,
    status: formData.status ?? "planned",
    quarter: formData.quarter ?? null,
    category: formData.category ?? "feature",
    sort_order: formData.sort_order ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/roadmap");
  revalidatePath("/admin/roadmap");
  return { success: true };
}

export async function updateRoadmapItem(
  id: string,
  formData: {
    title?: string;
    description?: string;
    status?: "planned" | "in_progress" | "completed";
    quarter?: string;
    category?: "feature" | "improvement" | "integration";
    sort_order?: number;
  }
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("roadmap_items")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/roadmap");
  revalidatePath("/admin/roadmap");
  return { success: true };
}

export async function deleteRoadmapItem(
  id: string
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("roadmap_items")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/roadmap");
  revalidatePath("/admin/roadmap");
  return { success: true };
}
