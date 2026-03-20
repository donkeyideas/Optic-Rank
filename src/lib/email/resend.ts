import { Resend } from "resend";

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

/**
 * Send a simple HTML email.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: getFrom(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Email] Send failed:", message);
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
  attachments: { filename: string; content: Buffer }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: getFrom(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[Email] Send with attachment failed:", message);
    return { success: false, error: message };
  }
}
