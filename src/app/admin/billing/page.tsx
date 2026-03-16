import { redirect } from "next/navigation";
import { requireAdmin, getBillingOverview } from "@/lib/dal/admin";
import { BillingClient } from "./billing-client";

export default async function AdminBillingPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const billing = await getBillingOverview();

  return (
    <BillingClient
      totalOrgs={billing.totalOrgs}
      paidOrgs={billing.paidOrgs}
      planCounts={billing.planCounts}
      billingEvents={billing.billingEvents}
      orgs={billing.orgs}
    />
  );
}
