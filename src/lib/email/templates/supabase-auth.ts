/**
 * Branded Supabase auth email templates.
 * These use Go template syntax ({{ .Variable }}) for Supabase to interpolate.
 * Apply via scripts/setup-supabase-emails.ts or paste into Supabase Dashboard > Auth > Email Templates.
 */

function authEmailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#f5f2ed;color:#1a1a1a;font-family:'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f2ed;">
    <tr>
      <td align="center" style="padding:24px 16px;">
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
                <a href="{{ .SiteURL }}" style="color:#999999;text-decoration:underline;">Visit Optic Rank</a>
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

function authButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
  <tr>
    <td style="background-color:#c0392b;text-align:center;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:'IBM Plex Sans',sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function authLabel(text: string): string {
  return `<p style="margin:0 0 8px;font-family:'IBM Plex Sans',sans-serif;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c0392b;">${text}</p>`;
}

function authHeadline(text: string): string {
  return `<h2 style="margin:0 0 16px;font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;line-height:1.3;color:#1a1a1a;">${text}</h2>`;
}

function authBody(text: string): string {
  return `<p style="margin:0 0 16px;font-family:'IBM Plex Sans',sans-serif;font-size:14px;font-weight:400;line-height:1.7;color:#555555;">${text}</p>`;
}

function authDivider(): string {
  return `<hr style="margin:24px 0;border:none;border-top:1px solid #dddddd;" />`;
}

/** Password Reset / Recovery email */
export const passwordResetTemplate = authEmailLayout(`
  ${authLabel("Account Security")}
  ${authHeadline("Reset Your Password")}
  ${authBody("We received a request to reset the password for your Optic Rank account. Click the button below to create a new password.")}
  ${authButton("Reset Password", "{{ .ConfirmationURL }}")}
  ${authDivider()}
  ${authBody("If you didn't request a password reset, you can safely ignore this email. This link will expire in 24 hours.")}
`);

/** Email Confirmation / Signup Confirmation */
export const emailConfirmationTemplate = authEmailLayout(`
  ${authLabel("Email Verification")}
  ${authHeadline("Confirm Your Email Address")}
  ${authBody("Thank you for creating an Optic Rank account. Please confirm your email address by clicking the button below.")}
  ${authButton("Confirm Email", "{{ .ConfirmationURL }}")}
  ${authDivider()}
  ${authBody("If you didn't create an account with Optic Rank, you can safely ignore this email.")}
`);

/** Magic Link / Passwordless Sign-In */
export const magicLinkTemplate = authEmailLayout(`
  ${authLabel("Secure Sign-In")}
  ${authHeadline("Your Sign-In Link")}
  ${authBody("Click the button below to securely sign in to your Optic Rank account. This link is valid for a single use and will expire shortly.")}
  ${authButton("Sign In to Optic Rank", "{{ .ConfirmationURL }}")}
  ${authDivider()}
  ${authBody("If you didn't request this sign-in link, you can safely ignore this email. Someone may have entered your email address by mistake.")}
`);

/** Team Invite */
export const inviteTemplate = authEmailLayout(`
  ${authLabel("Team Invitation")}
  ${authHeadline("You've Been Invited to Optic Rank")}
  ${authBody("You've been invited to join a team on Optic Rank — the AI-powered SEO intelligence platform. Click below to accept the invitation and set up your account.")}
  ${authButton("Accept Invitation", "{{ .ConfirmationURL }}")}
  ${authDivider()}
  ${authBody("Optic Rank provides keyword tracking, competitor analysis, site audits, and AI-powered insights — all in one platform.")}
`);

/** Email Change Confirmation */
export const emailChangeTemplate = authEmailLayout(`
  ${authLabel("Account Update")}
  ${authHeadline("Confirm Your New Email")}
  ${authBody("You requested to change your email address on Optic Rank. Click the button below to confirm this change.")}
  ${authButton("Confirm New Email", "{{ .ConfirmationURL }}")}
  ${authDivider()}
  ${authBody("If you didn't request this change, please contact support immediately at support@opticrank.com.")}
`);

/** All templates for easy access */
export const supabaseAuthTemplates = {
  recovery: {
    subject: "Reset your password — Optic Rank",
    content: passwordResetTemplate,
  },
  confirmation: {
    subject: "Confirm your email — Optic Rank",
    content: emailConfirmationTemplate,
  },
  magicLink: {
    subject: "Your sign-in link — Optic Rank",
    content: magicLinkTemplate,
  },
  invite: {
    subject: "You've been invited — Optic Rank",
    content: inviteTemplate,
  },
  emailChange: {
    subject: "Confirm email change — Optic Rank",
    content: emailChangeTemplate,
  },
};
