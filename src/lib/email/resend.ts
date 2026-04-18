import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

const getFrom = () =>
  process.env.RESEND_FROM_EMAIL ?? "Optic Rank <noreply@opticrank.com>";

interface EmailMeta {
  userId?: string;
  emailType?: string;
}

/**
 * Log an email send to the email_log table (fire-and-forget).
 */
async function logEmail(
  resendId: string | null,
  recipientEmail: string,
  subject: string,
  meta: EmailMeta
) {
  try {
    const admin = createAdminClient();
    await admin.from("email_log").insert({
      resend_id: resendId,
      user_id: meta.userId ?? null,
      recipient_email: recipientEmail,
      subject,
      email_type: meta.emailType ?? "general",
      status: "sent",
    });
  } catch (err) {
    console.error("[Email] Failed to log email:", err);
  }
}

/**
 * Send a simple HTML email.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  meta?: EmailMeta
): Promise<{ success: boolean; error?: string; resendId?: string }> {
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: getFrom(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    const resendId = result.data?.id ?? null;
    const recipient = Array.isArray(to) ? to[0] : to;
    if (meta?.emailType) {
      logEmail(resendId, recipient, subject, meta);
    }
    return { success: true, resendId: resendId ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Email] Send failed:", message);
    if (meta?.emailType) {
      const recipient = Array.isArray(to) ? to[0] : to;
      try {
        const admin = createAdminClient();
        await admin.from("email_log").insert({
          resend_id: null,
          user_id: meta.userId ?? null,
          recipient_email: recipient,
          subject,
          email_type: meta.emailType ?? "general",
          status: "failed",
          error_message: message,
        });
      } catch {
        // ignore logging errors
      }
    }
    return { success: false, error: message };
  }
}

/**
 * Send an email with file attachments (e.g., PDF reports).
 */
export async function sendEmailWithAttachment(
  to: string | string[],
  subject: string,
  html: string,
  attachments: { filename: string; content: Buffer }[],
  meta?: EmailMeta
): Promise<{ success: boolean; error?: string; resendId?: string }> {
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: getFrom(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments,
    });
    const resendId = result.data?.id ?? null;
    const recipient = Array.isArray(to) ? to[0] : to;
    if (meta?.emailType) {
      logEmail(resendId, recipient, subject, meta);
    }
    return { success: true, resendId: resendId ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Email] Send with attachment failed:", message);
    return { success: false, error: message };
  }
}
