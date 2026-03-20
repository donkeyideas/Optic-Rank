/**
 * Configure Supabase SMTP (Resend) and branded email templates.
 *
 * Prerequisites:
 *   1. RESEND_API_KEY in .env.local
 *   2. SUPABASE_PROJECT_REF in .env.local (e.g. "abcdefghijklmnop")
 *   3. SUPABASE_ACCESS_TOKEN in .env.local (from https://supabase.com/dashboard/account/tokens)
 *
 * Run: npx tsx scripts/setup-supabase-emails.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

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

const {
  supabaseAuthTemplates,
} = require("../src/lib/email/templates/supabase-auth");

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function main() {
  if (!PROJECT_REF || !ACCESS_TOKEN) {
    console.log("Missing required environment variables:");
    console.log("  SUPABASE_PROJECT_REF  — Your Supabase project reference ID");
    console.log("  SUPABASE_ACCESS_TOKEN — From https://supabase.com/dashboard/account/tokens");
    console.log("\nAdd them to .env.local and try again.");
    console.log("\n--- MANUAL INSTRUCTIONS ---");
    console.log("\n1. Go to Supabase Dashboard > Authentication > Email Templates");
    console.log("2. For each template type, paste the corresponding HTML (see src/lib/email/templates/supabase-auth.ts)");
    console.log("\n3. Go to Supabase Dashboard > Project Settings > Authentication > SMTP Settings");
    console.log("4. Enable Custom SMTP and fill in:");
    console.log("   Host:          smtp.resend.com");
    console.log("   Port:          465");
    console.log("   Username:      resend");
    console.log(`   Password:      ${RESEND_API_KEY ?? "<your RESEND_API_KEY>"}`);
    console.log("   Sender email:  noreply@opticrank.com");
    console.log("   Sender name:   Optic Rank");
    return;
  }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

  const payload: Record<string, string> = {
    // SMTP settings (Resend)
    smtp_admin_email: "noreply@opticrank.com",
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: RESEND_API_KEY!,
    smtp_sender_name: "Optic Rank",

    // Subject lines
    mailer_subjects_confirmation: supabaseAuthTemplates.confirmation.subject,
    mailer_subjects_recovery: supabaseAuthTemplates.recovery.subject,
    mailer_subjects_magic_link: supabaseAuthTemplates.magicLink.subject,
    mailer_subjects_email_change: supabaseAuthTemplates.emailChange.subject,
    mailer_subjects_invite: supabaseAuthTemplates.invite.subject,

    // HTML templates
    mailer_templates_confirmation_content: supabaseAuthTemplates.confirmation.content,
    mailer_templates_recovery_content: supabaseAuthTemplates.recovery.content,
    mailer_templates_magic_link_content: supabaseAuthTemplates.magicLink.content,
    mailer_templates_email_change_content: supabaseAuthTemplates.emailChange.content,
    mailer_templates_invite_content: supabaseAuthTemplates.invite.content,
  };

  console.log("Updating Supabase auth config...");

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Failed (${res.status}):`, body);
    return;
  }

  console.log("Supabase auth config updated successfully!");
  console.log("  - SMTP configured (Resend via smtp.resend.com:465)");
  console.log("  - Sender: Optic Rank <noreply@opticrank.com>");
  console.log("  - All 5 email templates updated with branded design");
  console.log("\nPassword reset, confirmation, magic link, invite, and email change emails");
  console.log("will now use the Optic Rank editorial design.");
}

main().catch(console.error);
