import { redirect } from "next/navigation";
import { requireAdmin, getAllOrgs } from "@/lib/dal/admin";
import { AdminOrgsClient } from "./orgs-client";

export default async function AdminOrgsPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const { data: orgs, count } = await getAllOrgs({ limit: 50 });

  // Compute stats
  const paidOrgs = orgs.filter(
    (o) => o.plan !== "free" && o.subscription_status === "active"
  ).length;
  const trialingOrgs = orgs.filter(
    (o) => o.subscription_status === "trialing"
  ).length;
  const orphanedOrgs = orgs.filter((o) => o.memberCount === 0).length;

  const totalMembers = orgs.reduce((sum, o) => sum + o.memberCount, 0);
  const totalProjects = orgs.reduce((sum, o) => sum + o.projectCount, 0);

  return (
    <AdminOrgsClient
      orgs={orgs}
      totalCount={count}
      stats={{
        paidOrgs,
        trialingOrgs,
        orphanedOrgs,
        totalMembers,
        totalProjects,
      }}
    />
  );
}
