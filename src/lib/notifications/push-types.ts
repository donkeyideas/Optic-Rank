export type PushNotificationType =
  | "keyword.rank_changed"
  | "audit.completed"
  | "prediction.generated"
  | "backlink.new"
  | "backlink.lost"
  | "app_store.rank_changed"
  | "brief.generated"
  | "report.ready"
  | "trial.expiring"
  | "billing.payment_failed"
  | "billing.subscription_changed"
  | "system.error"
  | "system.announcement"
  | "admin.new_signup";

export const PUSH_TYPE_LABELS: Record<string, string> = {
  "keyword.rank_changed": "Keyword Rank Change",
  "audit.completed": "Audit Complete",
  "prediction.generated": "Prediction Generated",
  "backlink.new": "New Backlink",
  "backlink.lost": "Lost Backlink",
  "app_store.rank_changed": "App Store Rank Change",
  "brief.generated": "AI Brief Ready",
  "report.ready": "Report Ready",
  "trial.expiring": "Trial Expiring",
  "billing.payment_failed": "Payment Failed",
  "billing.subscription_changed": "Subscription Changed",
  "system.error": "System Error",
  "system.announcement": "System Announcement",
  "admin.new_signup": "New Signup",
};
