import { redirect } from "next/navigation";
import { requireAdmin, getAllUsers } from "@/lib/dal/admin";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const { data: users, count } = await getAllUsers({ limit: 50 });

  // Compute stats for the cards
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const newThisWeek = users.filter(u => new Date(u.created_at) >= sevenDaysAgo).length;
  const newThisMonth = users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length;

  const providerCounts: Record<string, number> = {};
  users.forEach(u => {
    const provider = (u as Record<string, unknown>).provider as string ?? "email";
    providerCounts[provider] = (providerCounts[provider] ?? 0) + 1;
  });

  const adminCount = users.filter(u =>
    u.system_role === "superadmin" || u.system_role === "admin"
  ).length;

  return (
    <AdminUsersClient
      users={users}
      totalCount={count}
      stats={{
        newThisWeek,
        newThisMonth,
        providerCounts,
        adminCount,
      }}
    />
  );
}
