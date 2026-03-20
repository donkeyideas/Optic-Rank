import { emailLayout, sectionLabel, headline, bodyText, ctaButton, divider } from "./base";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://opticrank.com";

export function contactConfirmationEmail(
  name: string,
  subject: string | null,
  message: string
): string {
  const firstName = name.split(" ")[0] || "there";

  const content = `
    ${sectionLabel("Message Received")}
    ${headline("We Received Your Message")}
    ${bodyText(`Hi ${firstName}, thank you for reaching out. Our team has received your message and will get back to you within 24 hours.`)}

    ${divider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;border:1px solid #eeeeee;">
      <tr>
        <td style="padding:20px 24px;">
          ${subject ? `
          <p style="margin:0 0 4px;font-family:'IBM Plex Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Subject</p>
          <p style="margin:0 0 16px;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600;color:#1a1a1a;">${subject}</p>
          ` : ""}
          <p style="margin:0 0 4px;font-family:'IBM Plex Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Your Message</p>
          <p style="margin:0;font-family:'IBM Plex Sans',sans-serif;font-size:13px;line-height:1.6;color:#555555;white-space:pre-wrap;">${message.length > 500 ? message.slice(0, 500) + "…" : message}</p>
        </td>
      </tr>
    </table>

    ${ctaButton("Visit Help Center", `${APP_URL}/help`)}

    ${divider()}

    ${bodyText("If your matter is urgent, you can also reach us at support@opticrank.com.")}
  `;

  return emailLayout(content, {
    preheader: `Thanks for contacting Optic Rank, ${firstName}. We'll respond within 24 hours.`,
  });
}
