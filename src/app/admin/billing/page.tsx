import { redirect } from "next/navigation";
import { requireAdmin, getBillingOverview, getRevenueAnalytics, getSubscriptionDetails } from "@/lib/dal/admin";
import { BillingClient } from "./billing-client";

export default async function AdminBillingPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const [billing, revenue, subscriptions] = await Promise.all([
    getBillingOverview().catch(() => ({
      totalOrgs: 0, paidOrgs: 0, planCounts: {}, billingEvents: [], orgs: [],
    })),
    getRevenueAnalytics().catch(() => ({
      mrr: 0, arr: 0, arpu: 0, totalRevenue: 0, activeSubscriptions: 0,
      trialingOrgs: 0, canceledOrgs: 0, pastDueOrgs: 0, churnRate: 0,
      trialConversion: 0, revenueByPlan: {}, monthlyRevenue: {},
    })),
    getSubscriptionDetails().catch(() => []),
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
