import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/dal/admin";
import { EmailTemplatesClient } from "./email-templates-client";

export default async function AdminEmailTemplatesPage() {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/login");

  return <EmailTemplatesClient />;
}
