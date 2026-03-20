/**
 * Test email sending via Resend.
 * Run: npx tsx scripts/test-email.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { Resend } from "resend";

// Load .env.local
const envPath = resolve(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

// Import templates after env is loaded
const { welcomeEmail } = require("../src/lib/email/templates/welcome");
const { contactConfirmationEmail } = require("../src/lib/email/templates/contact-confirmation");
const { trialExpiringEmail, trialExpiredEmail } = require("../src/lib/email/templates/trial");
const { notificationEmail } = require("../src/lib/email/templates/notification");

const resend = new Resend(process.env.RESEND_API_KEY!);
const from = process.env.RESEND_FROM_EMAIL ?? "Optic Rank <noreply@opticrank.com>";
const to = "info@kamioi.com"; // Your email

async function main() {
  const template = process.argv[2] ?? "welcome";

  const templates: Record<string, { subject: string; html: string }> = {
    welcome: {
      subject: "Welcome to Optic Rank",
      html: welcomeEmail("Alain Beltran"),
    },
    contact: {
      subject: "We received your message — Optic Rank",
      html: contactConfirmationEmail("Alain Beltran", "Partnership Inquiry", "I'd love to explore a partnership opportunity with your team."),
    },
    "trial-expiring": {
      subject: "Your trial ends in 3 days — Optic Rank",
      html: trialExpiringEmail("Alain Beltran", 3),
    },
    "trial-expired": {
      subject: "Your free trial has ended — Optic Rank",
      html: trialExpiredEmail("Alain Beltran"),
    },
    notification: {
      subject: "Keyword Rank Change — Optic Rank",
      html: notificationEmail("rank_change", "3 Keywords Moved to Page 1", "Your keywords 'seo tools', 'rank tracker', and 'keyword research' have improved to positions 4, 7, and 9 respectively.", "/dashboard/keywords"),
    },
  };

  if (!templates[template]) {
    console.log(`Available templates: ${Object.keys(templates).join(", ")}`);
    console.log(`Usage: npx tsx scripts/test-email.ts <template>`);
    return;
  }

  const { subject, html } = templates[template];
  console.log(`Sending "${template}" email to ${to}...`);

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Failed:", error);
  } else {
    console.log("Sent successfully! ID:", data?.id);
    console.log("Check your inbox at", to);
  }
}

main().catch(console.error);
