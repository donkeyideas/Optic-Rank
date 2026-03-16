import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReportPDF, type ReportTemplate } from "@/lib/pdf/generate-report";

/**
 * Cron endpoint: generate and queue scheduled reports.
 * Protected by CRON_SECRET bearer token.
 * Intended to be called by Vercel Cron or an external scheduler.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find reports due to be sent
  const { data: dueReports, error } = await supabase
    .from("scheduled_reports")
    .select("id, project_id, name, schedule, sections, recipients, is_active")
    .eq("is_active", true)
    .lte("next_send_at", new Date().toISOString());

  if (error) {
    console.error("[send-reports cron] Query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dueReports || dueReports.length === 0) {
    return NextResponse.json({ processed: 0, message: "No reports due." });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const report of dueReports) {
    try {
      // Determine template from sections
      const sections = report.sections as { type?: string }[] | null;
      const template = (sections?.[0]?.type ?? "full") as ReportTemplate;

      // Generate the PDF
      const buffer = await generateReportPDF(report.project_id, template);

      // For now, store the report as a generated record.
      // Email delivery would integrate with Resend/SendGrid here.
      // For MVP: log the generation and update the schedule.
      console.log(
        `[send-reports cron] Generated ${template} report for project ${report.project_id} (${buffer.length} bytes)`
      );

      // Update last_sent_at and calculate next_send_at
      const now = new Date();
      const nextSend = getNextRunDate(report.schedule, now);

      await supabase
        .from("scheduled_reports")
        .update({
          last_sent_at: now.toISOString(),
          next_send_at: nextSend,
        })
        .eq("id", report.id);

      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[send-reports cron] Error for report ${report.id}:`, msg);
      errors.push(`${report.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    processed,
    total: dueReports.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}

function getNextRunDate(frequency: string, from: Date): string {
  const next = new Date(from);
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      next.setDate(next.getDate() + 7);
  }
  return next.toISOString();
}
