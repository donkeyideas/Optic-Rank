import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateReportPDF, type ReportTemplate } from "@/lib/pdf/generate-report";
import { sendEmailWithAttachment } from "@/lib/email/resend";
import { reportEmail } from "@/lib/email/templates/report";

/**
 * Cron endpoint: generate and queue scheduled reports.
 * Protected by CRON_SECRET bearer token.
 * Intended to be called by Vercel Cron or an external scheduler.
 */
export async function GET(request: Request) {
  // Verify cron secret (skip in dev when not set)
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  // Create a pending job record
  const { data: job } = await supabase
    .from("job_queue")
    .insert({ job_type: "send_reports", status: "pending", payload: {} })
    .select("id")
    .single();
  const jobId = job?.id;

  // Find reports due to be sent
  const { data: dueReports, error } = await supabase
    .from("scheduled_reports")
    .select("id, project_id, name, schedule, sections, recipients, is_active")
    .eq("is_active", true)
    .lte("next_send_at", new Date().toISOString());

  if (error) {
    console.error("[send-reports cron] Query error:", error);
    if (jobId) {
      await supabase.from("job_queue").update({
        status: "failed", completed_at: new Date().toISOString(),
        last_error: error.message, payload: { processed: 0 },
      }).eq("id", jobId);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dueReports || dueReports.length === 0) {
    if (jobId) {
      await supabase.from("job_queue").update({
        status: "completed", completed_at: new Date().toISOString(),
        payload: { processed: 0, message: "No reports due" },
      }).eq("id", jobId);
    }
    return NextResponse.json({ processed: 0, message: "No reports due." });
  }

  // Mark as processing
  if (jobId) {
    await supabase.from("job_queue").update({
      status: "processing", locked_at: new Date().toISOString(),
    }).eq("id", jobId);
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

      console.log(
        `[send-reports cron] Generated ${template} report for project ${report.project_id} (${buffer.length} bytes)`
      );

      // Email the PDF to all recipients
      const recipients = (report.recipients as string[]) ?? [];
      if (recipients.length > 0) {
        // Fetch project domain for email template
        const { data: project } = await supabase
          .from("projects")
          .select("domain, name")
          .eq("id", report.project_id)
          .single();
        const domain = project?.domain ?? project?.name ?? "your site";
        const reportDate = new Date().toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        });

        const html = reportEmail(report.name, domain, reportDate);
        const filename = `${report.name.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;

        await sendEmailWithAttachment(
          recipients,
          `${report.name} — Optic Rank Report`,
          html,
          [{ filename, content: buffer }]
        );

        console.log(`[send-reports cron] Emailed report to ${recipients.length} recipient(s)`);
      }

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

  // Update job status
  if (jobId) {
    await supabase.from("job_queue").update({
      status: errors.length > 0 && processed === 0 ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      payload: { processed, total: dueReports.length, errors: errors.length },
      last_error: errors.length > 0 ? errors.join("; ").slice(0, 500) : null,
    }).eq("id", jobId);
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
