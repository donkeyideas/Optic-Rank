import { redirect } from "next/navigation";
import { requireAdmin, getAllOrgs } from "@/lib/dal/admin";
import { AdminOrgsClient } from "./orgs-client";

export default async function AdminOrgsPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const { data: orgs, count } = await getAllOrgs({ limit: 50 });

  return <AdminOrgsClient orgs={orgs} totalCount={count} />;
}
