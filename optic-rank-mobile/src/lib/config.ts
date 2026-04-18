/**
 * Centralized app configuration.
 * All URLs and keys that vary by environment live here.
 */

export const APP_CONFIG = {
  WEB_APP_URL: "https://www.opticrank.com",
  SUPABASE_URL: "https://rkwrrvizkoipctdqsoby.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrd3Jydml6a29pcGN0ZHFzb2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODcxNTksImV4cCI6MjA4OTE2MzE1OX0.5FL1UoOIMCRPPKKGd_aEKrBMnSZzlNNbIo0E6P5ZQ6A",
  WEB_DASHBOARD_URL: "https://www.opticrank.com/dashboard",
  WEB_SETTINGS_URL: "https://www.opticrank.com/dashboard/settings",
  WEB_BILLING_URL: "https://www.opticrank.com/dashboard/billing",
  TERMS_URL: "https://www.opticrank.com/terms",
  PRIVACY_URL: "https://www.opticrank.com/privacy",
} as const;
