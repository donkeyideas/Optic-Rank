import { emailLayout, sectionLabel, headline, bodyText, ctaButton, divider } from "./base";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://opticrank.com";

export function reportEmail(
  reportName: string,
  projectDomain: string,
  reportDate: string
): string {
  const content = `
    ${sectionLabel("Scheduled Report")}
    ${headline("Your SEO Report Is Ready")}
    ${bodyText(`The <strong>${reportName}</strong> report for <strong>${projectDomain}</strong> has been generated and is attached to this email as a PDF.`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;border:1px solid #eeeeee;">
      <tr>
        <td style="padding:16px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;border-bottom:1px solid #eeeeee;">
                <span style="font-family:'IBM Plex Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Report</span>
                <span style="float:right;font-family:'IBM Plex Sans',sans-serif;font-size:13px;font-weight:600;color:#1a1a1a;">${reportName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;border-bottom:1px solid #eeeeee;">
                <span style="font-family:'IBM Plex Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Domain</span>
                <span style="float:right;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#555555;">${projectDomain}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-family:'IBM Plex Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Date</span>
                <span style="float:right;font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#555555;">${reportDate}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton("View Full Report in Dashboard", `${APP_URL}/dashboard/reports`)}

    ${divider()}

    ${bodyText("This report was generated automatically based on your schedule. You can manage report settings in your dashboard.")}
  `;

  return emailLayout(content, {
    preheader: `Your ${reportName} report for ${projectDomain} is ready.`,
  });
}
