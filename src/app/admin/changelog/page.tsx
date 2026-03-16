import { redirect } from "next/navigation";
import { requireAdmin, getAllChangelog } from "@/lib/dal/admin";
import { ChangelogClient } from "./changelog-client";

export default async function AdminChangelogPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const entries = await getAllChangelog();

  return <ChangelogClient entries={entries} />;
}
