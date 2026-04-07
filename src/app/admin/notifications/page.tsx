import { redirect } from "next/navigation";
import {
  requireAdmin,
  getAdminNotifications,
  getUnreadContactCount,
  getPushNotificationLog,
  getPushTokenStats,
  getPushDeliveryStats,
} from "@/lib/dal/admin";
import { getBroadcastHistory } from "@/lib/actions/broadcast";
import { NotificationsClient } from "./notifications-client";

export default async function AdminNotificationsPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const [notifications, unreadCount, broadcastHistory, pushLog, pushTokenStats, pushDeliveryStats] = await Promise.all([
    getAdminNotifications(50),
    getUnreadContactCount(),
    getBroadcastHistory(),
    getPushNotificationLog(50),
    getPushTokenStats(),
    getPushDeliveryStats(),
  ]);

  return (
    <NotificationsClient
      notifications={notifications}
      unreadCount={unreadCount}
      broadcastHistory={broadcastHistory}
      pushLog={pushLog}
      pushTokenStats={pushTokenStats}
      pushDeliveryStats={pushDeliveryStats}
    />
  );
}
