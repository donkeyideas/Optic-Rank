import { redirect } from "next/navigation";
import { requireAdmin, getAllSiteContent } from "@/lib/dal/admin";
import { ContentClient } from "./content-client";

export default async function AdminContentPage() {
  const userId = await requireAdmin();
  if (!userId) redirect("/login");

  const content = await getAllSiteContent();

  return <ContentClient content={content} />;
}
