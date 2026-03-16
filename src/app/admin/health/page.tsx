import { redirect } from "next/navigation";
import { requireAdmin, getSystemHealth } from "@/lib/dal/admin";
import { HealthClient } from "./health-client";

export default async function AdminHealthPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  const health = await getSystemHealth();

  return (
    <HealthClient
      pendingJobs={health.pendingJobs}
      processingJobs={health.processingJobs}
      failedJobs={health.failedJobs}
      completedJobs={health.completedJobs}
      recentJobs={health.recentJobs}
      recentErrors={health.recentErrors}
    />
  );
}
