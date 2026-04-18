import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/dal/admin";
import { sendEmail } from "@/lib/email/resend";

import { welcomeEmail } from "@/lib/email/templates/welcome";
import { contactConfirmationEmail } from "@/lib/email/templates/contact-confirmation";
import { notificationEmail } from "@/lib/email/templates/notification";
import { reportEmail } from "@/lib/email/templates/report";
import { trialExpiringEmail, trialExpiredEmail } from "@/lib/email/templates/trial";

const templateRenderers: Record<string, { subject: string; html: string }> = {
  welcome: {
    subject: "Welcome to Optic Rank",
    html: welcomeEmail("Test User"),
  },
  "contact-confirmation": {
    subject: "We received your message — Optic Rank",
    html: contactConfirmationEmail("Test User", "Test Subject", "This is a test message from the admin email template preview."),
  },
  notification: {
    subject: "Keyword Rank Change — Optic Rank",
    html: notificationEmail("rank_change", "3 Keywords Moved to Page 1", "Your keywords have improved their positions.", "/dashboard/keywords"),
  },
  report: {
    subject: "Your SEO Report is Ready — Optic Rank",
    html: reportEmail("Weekly Rankings Report", "example.com", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })),
  },
  "trial-expiring": {
    subject: "Your trial ends in 3 days — Optic Rank",
    html: trialExpiringEmail("Test User", 3),
  },
  "trial-expired": {
    subject: "Your free trial has ended — Optic Rank",
    html: trialExpiredEmail("Test User"),
  },
};

export async function POST(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { templateId, email } = body as { templateId: string; email: string };

  if (!templateId || !email) {
    return NextResponse.json({ error: "Missing templateId or email" }, { status: 400 });
  }

  const template = templateRenderers[templateId];
  if (!template) {
    return NextResponse.json({ error: "Template not found. Auth templates cannot be sent as test emails — configure those in Supabase Dashboard." }, { status: 400 });
  }

  const result = await sendEmail(email, `[TEST] ${template.subject}`, template.html, {
    emailType: "test_template",
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Send failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
