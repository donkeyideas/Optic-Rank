"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Update user profile settings (name, timezone).
 */
export async function updateProfileSettings(
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const fullName = formData.get("full_name") as string;
  const timezone = formData.get("timezone") as string;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName?.trim() || null,
      timezone: timezone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}

/**
 * Update organization settings (name).
 */
export async function updateOrganizationSettings(
  orgId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const name = formData.get("org_name") as string;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: name?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings");
  return { success: true };
}
