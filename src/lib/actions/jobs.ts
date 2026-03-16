"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

export async function createJob(formData: {
  title: string;
  department?: string;
  location?: string;
  type?: "full-time" | "part-time" | "contract";
  description: string;
  requirements?: string[];
  is_active?: boolean;
}): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("job_listings").insert({
    title: formData.title,
    department: formData.department ?? null,
    location: formData.location ?? "Remote",
    type: formData.type ?? "full-time",
    description: formData.description,
    requirements: formData.requirements ?? [],
    is_active: formData.is_active ?? true,
  });

  if (error) return { error: error.message };

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return { success: true };
}

export async function updateJob(
  id: string,
  formData: {
    title?: string;
    department?: string;
    location?: string;
    type?: "full-time" | "part-time" | "contract";
    description?: string;
    requirements?: string[];
    is_active?: boolean;
  }
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_listings")
    .update({ ...formData, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return { success: true };
}

export async function deleteJob(
  id: string
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("job_listings")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/careers");
  revalidatePath("/admin/careers");
  return { success: true };
}
