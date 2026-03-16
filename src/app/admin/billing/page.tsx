import { redirect } from "next/navigation";
import { requireAdmin, getBillingOverview, getRevenueAnalytics, getSubscriptionDetails } from "@/lib/dal/admin";
import { BillingClient } from "./billing-client";

export default async function AdminBillingPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const [billing, revenue, subscriptions] = await Promise.all([
    getBillingOverview(),
    getRevenueAnalytics(),
    getSubscriptionDetails(),
  ]);

  return (
    <BillingClient
      totalOrgs={billing.totalOrgs}
      paidOrgs={billing.paidOrgs}
      planCounts={billing.planCounts}
      billingEvents={billing.billingEvents}
      orgs={billing.orgs}
      revenue={revenue}
      subscriptions={subscriptions}
    />
  );
}
