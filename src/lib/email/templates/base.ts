/**
 * Shared email layout wrapper — editorial newspaper design.
 * All styles are inline for email client compatibility.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://opticrank.com";

export function emailLayout(content: string, options?: { preheader?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <title>Optic Rank</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f2ed;color:#1a1a1a;font-family:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  ${options?.preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${options.preheader}</div>` : ""}

  <!-- Outer Container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2ed;">
    <tr>
      <td align="center" style="padding:24px 16px;">

        <!-- Email Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #dddddd;">

          <!-- Masthead -->
          <tr>
            <td style="background-color:#1a1a1a;padding:12px 24px;text-align:center;">
              <span style="font-family:'IBM Plex Sans',-apple-system,sans-serif;font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#f5f2ed;">
                Optic Rank &mdash; SEO Intelligence
              </span>
            </td>
          </tr>

          <!-- Paper Header -->
          <tr>
            <td style="padding:28px 40px 20px;text-align:center;border-bottom:4px double #1a1a1a;">
              <p style="margin:0 0 6px;font-family:'IBM Plex Sans',sans-serif;font-size:11px;font-weight:400;letter-spacing:2px;text-transform:uppercase;color:#999999;">
                ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h1 style="margin:0;font-family:'Playfair Display',Georgia,serif;font-size:36px;font-weight:900;letter-spacing:-0.5px;line-height:1.1;color:#1a1a1a;">
                Optic <span style="color:#c0392b;">Rank</span>
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:4px double #1a1a1a;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-family:'IBM Plex Sans',sans-serif;font-size:11px;font-weight:400;color:#999999;">
                Optic Rank &mdash; AI-Powered SEO Intelligence
              </p>
              <p style="margin:0;font-family:'IBM Plex Sans',sans-serif;font-size:10px;color:#cccccc;">
                <a href="${APP_URL}/dashboard/settings" style="color:#999999;text-decoration:underline;">Manage Preferences</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}" style="color:#999999;text-decoration:underline;">Visit Optic Rank</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Red CTA button — editorial style (sharp corners, uppercase). */
export function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
  <tr>
    <td style="background-color:#c0392b;text-align:center;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

/** Section label — red uppercase overline. */
export function sectionLabel(text: string): string {
  return `<p style="margin:0 0 8px;font-family:'IBM Plex Sans',sans-serif;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c0392b;">
  ${text}
</p>`;
}

/** Headline — serif bold. */
export function headline(text: string): string {
  return `<h2 style="margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;line-height:1.3;color:#1a1a1a;">
  ${text}
</h2>`;
}

/** Body paragraph. */
export function bodyText(text: string): string {
  return `<p style="margin:0 0 16px;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:400;line-height:1.7;color:#555555;">
  ${text}
</p>`;
}

/** Divider — thin rule. */
export function divider(): string {
  return `<hr style="margin:24px 0;border:none;border-top:1px solid #dddddd;" />`;
}
