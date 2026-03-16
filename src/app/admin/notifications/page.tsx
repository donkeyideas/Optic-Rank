import { redirect } from "next/navigation";
import { requireAdmin, getAdminNotifications, getUnreadContactCount } from "@/lib/dal/admin";
import { NotificationsClient } from "./notifications-client";

export default async function AdminNotificationsPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    getAdminNotifications(50),
    getUnreadContactCount(),
  ]);

  return (
    <NotificationsClient
      notifications={notifications}
      unreadCount={unreadCount}
    />
  );
}
