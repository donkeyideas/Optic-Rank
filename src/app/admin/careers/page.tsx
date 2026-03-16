import { redirect } from "next/navigation";
import { requireAdmin, getAllJobs } from "@/lib/dal/admin";
import { CareersClient } from "./careers-client";

export default async function AdminCareersPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const jobs = await getAllJobs();

  return <CareersClient jobs={jobs} />;
}
