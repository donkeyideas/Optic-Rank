"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

export async function createChangelogEntry(formData: {
  title: string;
  slug: string;
  content: string;
  version?: string;
  type?: "feature" | "improvement" | "fix";
}): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("changelog_entries").insert({
    title: formData.title,
    slug: formData.slug,
    content: formData.content,
    version: formData.version ?? null,
    type: formData.type ?? "improvement",
    published_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return { success: true };
}

export async function updateChangelogEntry(
  id: string,
  formData: {
    title?: string;
    slug?: string;
    content?: string;
    version?: string;
    type?: "feature" | "improvement" | "fix";
  }
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("changelog_entries")
    .update(formData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return { success: true };
}

export async function deleteChangelogEntry(
  id: string
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("changelog_entries")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/changelog");
  revalidatePath("/admin/changelog");
  return { success: true };
}
