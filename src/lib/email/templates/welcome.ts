import { emailLayout, sectionLabel, headline, bodyText, ctaButton, divider } from "./base";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://opticrank.com";

export function welcomeEmail(name: string): string {
  const firstName = name.split(" ")[0] || "there";

  const content = `
    ${sectionLabel("Welcome Aboard")}
    ${headline(`Welcome to Optic Rank, ${firstName}`)}
    ${bodyText("Your account is ready and your 14-day free trial has started. You now have full access to every feature on the platform — no credit card required.")}

    ${divider()}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eeeeee;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:32px;height:32px;background-color:#c0392b;text-align:center;vertical-align:middle;">
                <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;color:#ffffff;">1</span>
              </td>
              <td style="padding-left:16px;">
                <p style="margin:0;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600;color:#1a1a1a;">Create Your First Project</p>
                <p style="margin:4px 0 0;font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#999999;">Add your website domain to start tracking rankings.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eeeeee;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:32px;height:32px;background-color:#1a1a1a;text-align:center;vertical-align:middle;">
                <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;color:#f5f2ed;">2</span>
              </td>
              <td style="padding-left:16px;">
                <p style="margin:0;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600;color:#1a1a1a;">Add Keywords to Track</p>
                <p style="margin:4px 0 0;font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#999999;">Import or enter the keywords that matter to your business.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:32px;height:32px;background-color:#27ae60;text-align:center;vertical-align:middle;">
                <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;color:#ffffff;">3</span>
              </td>
              <td style="padding-left:16px;">
                <p style="margin:0;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:600;color:#1a1a1a;">Run a Site Audit</p>
                <p style="margin:4px 0 0;font-family:'IBM Plex Sans',sans-serif;font-size:12px;color:#999999;">Get a full technical health check of your website in one click.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton("Go to Your Dashboard", `${APP_URL}/dashboard`)}

    ${divider()}

    ${bodyText("Your trial includes unlimited access to keyword tracking, competitor analysis, AI-powered insights, site audits, and more. If you have questions, just reply to this email.")}
  `;

  return emailLayout(content, {
    preheader: `Welcome to Optic Rank, ${firstName}! Your 14-day free trial is active.`,
  });
}
