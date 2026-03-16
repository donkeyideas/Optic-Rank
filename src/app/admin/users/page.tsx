import { redirect } from "next/navigation";
import { requireAdmin, getAllUsers } from "@/lib/dal/admin";
import { AdminUsersClient } from "./users-client";

export default async function AdminUsersPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const { data: users, count } = await getAllUsers({ limit: 50 });

  return <AdminUsersClient users={users} totalCount={count} />;
}
