"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToAll, sendPushToUser } from "@/lib/notifications/push";
import { revalidatePath } from "next/cache";

async function verifyAdmin(): Promise<string | null> {
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return null;

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("system_role")
    .eq("id", user.id)
    .single();

  if (
    profile?.system_role !== "superadmin" &&
    profile?.system_role !== "admin"
  ) {
    return null;
  }

  return user.id;
}

/** Admin: send a push notification to all users */
export async function adminSendPushToAll(
  title: string,
  message: string,
  actionUrl?: string
): Promise<
  | { error: string }
  | {
      success: true;
      stats: { success: number; failed: number; usersTargeted: number };
    }
> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "Unauthorized" };

  const stats = await sendPushToAll({
    title,
    message,
    type: "system.announcement",
    actionUrl,
    sentBy: adminId,
  });

  revalidatePath("/admin/push-notifications");
  return { success: true, stats };
}

/** Admin: send a push notification to a specific user */
export async function adminSendPushToUser(
  targetUserId: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<
  | { error: string }
  | { success: true; stats: { success: number; failed: number } }
> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "Unauthorized" };

  const stats = await sendPushToUser(targetUserId, {
    title,
    message,
    type: "system.announcement",
    actionUrl,
    sentBy: adminId,
  });

  revalidatePath("/admin/push-notifications");
  return { success: true, stats };
}

/** Admin: send a test push to yourself */
export async function adminSendTestPush(): Promise<
  | { error: string }
  | { success: true; stats: { success: number; failed: number } }
> {
  const adminId = await verifyAdmin();
  if (!adminId) return { error: "Unauthorized" };

  const stats = await sendPushToUser(adminId, {
    title: "Test Notification",
    message:
      "This is a test push notification from the Optic Rank admin panel.",
    type: "system.announcement",
    actionUrl: "/admin/push-notifications",
    sentBy: adminId,
  });

  return { success: true, stats };
}
