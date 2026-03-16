import { redirect } from "next/navigation";
import { requireAdmin, getAllPricingPlans } from "@/lib/dal/admin";
import { SubscriptionsClient } from "./subscriptions-client";

export default async function AdminSubscriptionsPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const plans = await getAllPricingPlans();

  return <SubscriptionsClient plans={plans} />;
}
