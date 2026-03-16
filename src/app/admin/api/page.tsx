import { redirect } from "next/navigation";
import { requireAdmin, getAPIConfigs, getAPIUsageStats, getAPICallLog } from "@/lib/dal/admin";
import { APIManagementClient } from "./api-client";

export default async function AdminAPIPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const [configs, usageStats, callLog] = await Promise.all([
    getAPIConfigs(),
    getAPIUsageStats(),
    getAPICallLog(50),
  ]);

  return (
    <APIManagementClient
      configs={configs}
      usageStats={usageStats}
      callLog={callLog}
    />
  );
}
