"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

export async function submitContact(formData: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<{ error: string } | { success: true }> {
  // Public action — no auth required
  const supabase = createAdminClient();
  const { error } = await supabase.from("contact_submissions").insert({
    name: formData.name,
    email: formData.email,
    subject: formData.subject ?? null,
    message: formData.message,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/contacts");
  return { success: true };
}

export async function updateContactStatus(
  id: string,
  status: "new" | "read" | "replied"
): Promise<{ error: string } | { success: true }> {
  const adminId = await requireAdmin();
  if (!adminId) return { error: "Not authorized." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_submissions")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/contacts");
  return { success: true };
}
