"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { generateReportPDF, type ReportTemplate, type ReportSection } from "@/lib/pdf/generate-report";

/**
 * Create a new scheduled report.
 */
export async function createScheduledReport(
  projectId: string,
  formData: FormData
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const name = formData.get("name") as string;
  const frequency = formData.get("frequency") as string;
  const template = formData.get("template") as string;
  const recipientsRaw = formData.get("recipients") as string;

  if (!name?.trim()) return { error: "Report name is required." };

  const recipients = recipientsRaw
    ? recipientsRaw.split(",").map((e) => e.trim()).filter(Boolean)
    : [];

  const supabase = createAdminClient();
  const { error } = await supabase.from("scheduled_reports").insert({
    project_id: projectId,
    created_by: user.id,
    name: name.trim(),
    schedule: frequency || "weekly",
    sections: [{ type: template || "full" }],
    recipients,
    is_active: true,
    next_send_at: getNextRunDate(frequency || "weekly"),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reports");
  return { success: true };
}

/**
 * Delete a scheduled report.
 */
export async function deleteScheduledReport(
  id: string
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("scheduled_reports").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/reports");
  return { success: true };
}

/**
 * Toggle a scheduled report active/inactive.
 */
export async function toggleScheduledReport(
  id: string,
  active: boolean
): Promise<{ error: string } | { success: true }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("scheduled_reports")
    .update({ is_active: active })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/reports");
  return { success: true };
}

/**
 * Generate a PDF report on-demand and return it as base64.
 * Supports both preset templates and custom section lists.
 */
export async function generateReport(
  projectId: string,
  template: ReportTemplate,
  customSections?: ReportSection[]
): Promise<{ error: string } | { data: string; filename: string }> {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  try {
    const buffer = await generateReportPDF(projectId, template, customSections);
    const base64 = Buffer.from(buffer).toString("base64");
    const date = new Date().toISOString().split("T")[0];
    const filename = `rankpulse-${template}-report-${date}.pdf`;
    return { data: base64, filename };
  } catch (err) {
    console.error("[generateReport] Error:", err);
    return { error: err instanceof Error ? err.message : "Failed to generate report." };
  }
}

function getNextRunDate(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case "daily":
      now.setDate(now.getDate() + 1);
      break;
    case "weekly":
      now.setDate(now.getDate() + 7);
      break;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      break;
    default:
      now.setDate(now.getDate() + 7);
  }
  return now.toISOString();
}
