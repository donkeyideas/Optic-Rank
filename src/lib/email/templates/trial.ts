import { emailLayout, sectionLabel, headline, bodyText, ctaButton, divider } from "./base";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://opticrank.com";

export function trialExpiringEmail(name: string, daysLeft: number): string {
  const firstName = name.split(" ")[0] || "there";

  const content = `
    ${sectionLabel("Trial Update")}
    ${headline(`Your Trial Ends in ${daysLeft} Day${daysLeft !== 1 ? "s" : ""}`)}
    ${bodyText(`Hi ${firstName}, your 14-day free trial of Optic Rank is ending soon. Upgrade now to keep access to all your data and features.`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#27ae60;font-weight:600;">&#10003;</span>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#1a1a1a;padding-left:8px;">Unlimited keyword tracking &amp; rank monitoring</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#27ae60;font-weight:600;">&#10003;</span>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#1a1a1a;padding-left:8px;">AI-powered SEO insights &amp; recommendations</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eeeeee;">
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#27ae60;font-weight:600;">&#10003;</span>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#1a1a1a;padding-left:8px;">Full competitor analysis &amp; backlink monitoring</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#27ae60;font-weight:600;">&#10003;</span>
          <span style="font-family:'IBM Plex Sans',sans-serif;font-size:13px;color:#1a1a1a;padding-left:8px;">Automated site audits &amp; technical health reports</span>
        </td>
      </tr>
    </table>

    ${ctaButton("Upgrade Now", `${APP_URL}/dashboard/settings?tab=billing`)}

    ${divider()}

    ${bodyText("Plans start at $29/month. If you have questions about which plan is right for you, just reply to this email.")}
  `;

  return emailLayout(content, {
    preheader: `Your Optic Rank trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Upgrade to keep your data.`,
  });
}

export function trialExpiredEmail(name: string): string {
  const firstName = name.split(" ")[0] || "there";

  const content = `
    ${sectionLabel("Trial Ended")}
    ${headline("Your Free Trial Has Ended")}
    ${bodyText(`Hi ${firstName}, your 14-day Optic Rank trial has expired. Your data is still safe — upgrade to a paid plan to regain full access to your dashboard, keywords, and insights.`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf8f5;border:1px solid #eeeeee;">
      <tr>
        <td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 4px;font-family:'IBM Plex Sans',sans-serif;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999999;">Plans from</p>
          <p style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:900;color:#1a1a1a;">
            $29<span style="font-size:14px;font-weight:400;color:#999999;">/mo</span>
          </p>
        </td>
      </tr>
    </table>

    ${ctaButton("Choose a Plan", `${APP_URL}/pricing`)}

    ${divider()}

    ${bodyText("Need more time to evaluate? Reply to this email and we may be able to extend your trial.")}
  `;

  return emailLayout(content, {
    preheader: `Your Optic Rank trial has ended, ${firstName}. Upgrade to keep access.`,
  });
}
