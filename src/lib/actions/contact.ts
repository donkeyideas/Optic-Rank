"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

export async function submitContact(formData: {
  name: string;
  email: string;
  subject?: string;
  message: string;
  _hp?: string;
}): Promise<{ error: string } | { success: true }> {
  // Honeypot check — bots fill hidden fields, humans don't
  if (formData._hp) {
    // Silently "succeed" so bots think it worked
    return { success: true };
  }

  // Public action — no auth required
  const supabase = createAdminClient();
  const { error } = await supabase.from("contact_submissions").insert({
    name: formData.name,
    email: formData.email,
    subject: formData.subject ?? null,
    message: formData.message,
  });

  if (error) return { error: error.message };

  // Notify all admin users about the new submission
  try {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user_id: admin.id,
        type: "contact.new",
        title: `New contact from ${formData.name}`,
        message: formData.subject
          ? `${formData.subject} — ${formData.message.slice(0, 120)}`
          : formData.message.slice(0, 150),
        action_url: "/admin/contacts",
        is_read: false,
      }));

      await supabase.from("notifications").insert(notifications);
    }
  } catch {
    // Non-critical — don't fail the submission if notification fails
  }

  revalidatePath("/admin/contacts");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin/notifications");
  revalidatePath("/admin", "layout");
  return { success: true };
}
