import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/dal/admin";

import { welcomeEmail } from "@/lib/email/templates/welcome";
import { contactConfirmationEmail } from "@/lib/email/templates/contact-confirmation";
import { notificationEmail } from "@/lib/email/templates/notification";
import { reportEmail } from "@/lib/email/templates/report";
import { trialExpiringEmail, trialExpiredEmail } from "@/lib/email/templates/trial";
import {
  passwordResetTemplate,
  emailConfirmationTemplate,
  magicLinkTemplate,
  inviteTemplate,
  emailChangeTemplate,
} from "@/lib/email/templates/supabase-auth";

/** Sample data for rendering previews */
const samplePreviews: Record<string, { subject: string; html: string }> = {
  welcome: {
    subject: "Welcome to Optic Rank",
    html: welcomeEmail("Jane Smith"),
  },
  "contact-confirmation": {
    subject: "We received your message — Optic Rank",
    html: contactConfirmationEmail(
      "Jane Smith",
      "Partnership Inquiry",
      "I'd love to explore a partnership opportunity with your team. We're building a complementary product and think there could be great synergy."
    ),
  },
  notification: {
    subject: "3 Keywords Moved to Page 1 — Optic Rank",
    html: notificationEmail(
      "rank_change",
      "3 Keywords Moved to Page 1",
      "Your keywords 'seo tools', 'rank tracker', and 'keyword research' have improved to positions 4, 7, and 9 respectively.",
      "/dashboard/keywords"
    ),
  },
  report: {
    subject: "Your SEO Report is Ready — Optic Rank",
    html: reportEmail("Weekly Rankings Report", "example.com", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })),
  },
  "trial-expiring": {
    subject: "Your trial ends in 3 days — Optic Rank",
    html: trialExpiringEmail("Jane Smith", 3),
  },
  "trial-expired": {
    subject: "Your free trial has ended — Optic Rank",
    html: trialExpiredEmail("Jane Smith"),
  },
  "password-reset": {
    subject: "Reset your password — Optic Rank",
    html: passwordResetTemplate,
  },
  "email-confirmation": {
    subject: "Confirm your email — Optic Rank",
    html: emailConfirmationTemplate,
  },
  "magic-link": {
    subject: "Your sign-in link — Optic Rank",
    html: magicLinkTemplate,
  },
  invite: {
    subject: "You've been invited — Optic Rank",
    html: inviteTemplate,
  },
  "email-change": {
    subject: "Confirm email change — Optic Rank",
    html: emailChangeTemplate,
  },
};

export async function GET(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("id");

  if (!templateId || !samplePreviews[templateId]) {
    return NextResponse.json(
      { error: "Invalid template ID", available: Object.keys(samplePreviews) },
      { status: 400 }
    );
  }

  const preview = samplePreviews[templateId];
  return NextResponse.json(preview);
}
