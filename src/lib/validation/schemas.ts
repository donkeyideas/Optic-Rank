import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(100, "Name must be 100 characters or less"),
  type: z.enum(["website", "ios_app", "android_app", "both"], {
    error: "Invalid project type",
  }),
  domain: z.string().max(253).optional().nullable(),
  url: z.string().url("Invalid URL format").optional().nullable().or(z.literal("")),
});

export const addKeywordsSchema = z.object({
  keywords: z
    .array(z.string().trim().min(1))
    .min(1, "At least one keyword is required")
    .max(500, "Maximum 500 keywords at a time"),
  device: z.enum(["desktop", "mobile"]).optional().default("desktop"),
});

export const createReportSchema = z.object({
  name: z.string().min(1, "Report name is required").max(100),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  template: z.enum(["full", "keywords", "backlinks", "audit", "executive"]),
  recipients: z
    .string()
    .min(1, "At least one recipient email is required")
    .transform((val) => val.split(",").map((e) => e.trim()).filter(Boolean))
    .pipe(z.array(z.string().email("Invalid email address")).min(1)),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1, "API key name is required").max(50),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  expiresAt: z.string().datetime().optional().nullable(),
});

export const saveSlackWebhookSchema = z.object({
  webhookUrl: z
    .string()
    .url("Invalid URL")
    .startsWith("https://hooks.slack.com/", "Must be a valid Slack webhook URL"),
});

export const registerWebhookSchema = z.object({
  url: z.string().url("Invalid webhook URL").startsWith("https://", "Webhook URL must use HTTPS"),
  events: z.array(z.string()).min(1, "Select at least one event"),
});

export const addSocialProfileSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "linkedin"]),
  handle: z.string().min(1, "Handle is required").max(200),
  display_name: z.string().max(100).optional(),
  niche: z.string().max(100).optional(),
  country: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  followers_count: z.coerce.number().int().min(0).default(0),
  following_count: z.coerce.number().int().min(0).default(0),
  posts_count: z.coerce.number().int().min(0).default(0),
  engagement_rate: z.coerce.number().min(0).max(100).optional(),
});

export const addSocialCompetitorSchema = z.object({
  handle: z.string().min(1, "Handle is required").max(200),
  display_name: z.string().max(100).optional(),
  followers_count: z.coerce.number().int().min(0).optional(),
  engagement_rate: z.coerce.number().min(0).max(100).optional(),
  niche: z.string().max(100).optional(),
});
