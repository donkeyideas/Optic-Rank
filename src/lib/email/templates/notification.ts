import { emailLayout, sectionLabel, headline, bodyText, ctaButton, divider } from "./base";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://opticrank.com";

const TYPE_LABELS: Record<string, string> = {
  rank_change: "Rank Change Alert",
  audit_complete: "Audit Complete",
  backlink_found: "New Backlink",
  ai_insight: "AI Insight",
  prediction: "Rank Prediction",
  report_ready: "Report Ready",
  system: "System Notice",
};

export function notificationEmail(
  type: string,
  title: string,
  message: string,
  actionUrl?: string
): string {
  const label = TYPE_LABELS[type] ?? "Notification";
  const href = actionUrl
    ? actionUrl.startsWith("http") ? actionUrl : `${APP_URL}${actionUrl}`
    : `${APP_URL}/dashboard`;

  const content = `
    ${sectionLabel(label)}
    ${headline(title)}
    ${bodyText(message)}
    ${ctaButton("View in Dashboard", href)}
    ${divider()}
    ${bodyText("You're receiving this because you have email notifications enabled. You can manage your notification preferences in your dashboard settings.")}
  `;

  return emailLayout(content, {
    preheader: `${label}: ${title}`,
  });
}
