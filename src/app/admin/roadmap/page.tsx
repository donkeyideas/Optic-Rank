import { redirect } from "next/navigation";
import { requireAdmin, getAllRoadmap } from "@/lib/dal/admin";
import { RoadmapClient } from "./roadmap-client";

export default async function AdminRoadmapPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const items = await getAllRoadmap();

  return <RoadmapClient items={items} />;
}
