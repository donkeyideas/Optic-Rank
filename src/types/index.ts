// ================================================================
// Core Types for Optic Rank
// ================================================================

// --- Auth & Users ---
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: "free" | "starter" | "pro" | "business" | "enterprise";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "active" | "past_due" | "canceled" | "trialing" | "paused";
  trial_ends_at: string | null;
  max_projects: number;
  max_keywords: number;
  max_pages_crawl: number;
  max_users: number;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member" | "viewer";
  system_role: "user" | "admin" | "superadmin";
  onboarding_completed: boolean;
  comp_account: boolean;
  timezone: string;
  notification_prefs: Record<string, boolean> | null;
  created_at: string;
}

// --- Projects ---
export type ProjectType = "website" | "ios_app" | "android_app" | "both";

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  type: ProjectType;
  domain: string | null;
  url: string | null;
  app_store_id: string | null;
  play_store_id: string | null;
  target_countries: string[];
  target_languages: string[];
  search_engines: string[];
  is_active: boolean;
  authority_score: number | null;
  health_score: number | null;
  last_crawl_at: string | null;
  last_rank_check: string | null;
  created_at: string;
}

// --- Keywords ---
export interface Keyword {
  id: string;
  project_id: string;
  keyword: string;
  search_engine: string;
  device: "desktop" | "mobile";
  location: string;
  current_position: number | null;
  previous_position: number | null;
  best_position: number | null;
  search_volume: number | null;
  cpc: number | null;
  difficulty: number | null;
  intent: "informational" | "navigational" | "transactional" | "commercial" | null;
  ai_visibility_score: number | null;
  ai_visibility_count: string | null; // e.g. "4/6"
  serp_features?: string[];
  created_at: string;
}

export interface KeywordRank {
  id: string;
  keyword_id: string;
  position: number | null;
  url: string | null;
  serp_features: string[];
  checked_at: string;
}

// --- Backlinks ---
export interface Backlink {
  id: string;
  project_id: string;
  source_url: string;
  source_domain: string;
  target_url: string;
  anchor_text: string;
  link_type: "dofollow" | "nofollow" | "ugc" | "sponsored";
  domain_authority: number | null;
  trust_flow: number | null;
  citation_flow: number | null;
  is_toxic: boolean;
  first_seen: string;
  last_seen: string;
  status: "active" | "lost" | "new";
}

// --- Site Audit ---
export interface SiteAudit {
  id: string;
  project_id: string;
  status: "pending" | "crawling" | "analyzing" | "completed" | "failed";
  pages_crawled: number;
  issues_found: number;
  health_score: number | null;
  seo_score: number | null;
  performance_score: number | null;
  accessibility_score: number | null;
  started_at: string;
  completed_at: string | null;
  /** Whether the site was detected as a JS-heavy SPA (issues may be false positives) */
  is_spa?: boolean;
}

export type IssueSeverity = "critical" | "warning" | "info";
export type IssueCategory = "seo" | "performance" | "accessibility" | "content" | "security";

export interface AuditIssue {
  id: string;
  audit_id: string;
  rule_id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  description: string;
  affected_pages: number;
  recommendation: string | null;
}

// --- Competitors ---
export interface Competitor {
  id: string;
  project_id: string;
  name: string;
  domain: string;
  authority_score: number | null;
  organic_traffic: number | null;
  keywords_count: number | null;
  created_at: string;
}

// --- AI Insights ---
export type InsightType = "opportunity" | "alert" | "win" | "backlinks" | "prediction" | "content" | "technical";

export interface AIInsight {
  id: string;
  project_id: string;
  type: InsightType;
  title: string;
  description: string;
  action_label: string | null;
  action_url: string | null;
  priority: number;
  revenue_impact: number | null;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
}

// --- App Store ---
export interface AppStoreListing {
  id: string;
  project_id: string;
  store: "apple" | "google";
  app_id: string;
  app_name: string;
  app_url: string | null;
  category: string | null;
  developer: string | null;
  icon_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  downloads_estimate: number | null;
  current_version: string | null;
  description: string | null;
  keywords_field: string | null;
  subtitle: string | null;
  aso_score: number | null;
  visibility_score: number | null;
  last_updated: string;
}

// --- Dashboard Stats ---
export interface DashboardStats {
  authority_score: number;
  authority_delta: number;
  organic_traffic: number;
  traffic_delta_pct: number;
  keywords_ranked: number;
  keywords_new: number;
  ai_visibility_pct: number;
  ai_visibility_label: string;
  backlinks_total: number;
  backlinks_gained: number;
}

// --- Common ---
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

// --- AI Visibility ---
export interface AIVisibilityCheck {
  id: string;
  keyword_id: string;
  llm_provider: string;
  query_text: string;
  response_text: string | null;
  brand_mentioned: boolean;
  mention_position: number | null;
  url_cited: boolean;
  sentiment: "positive" | "neutral" | "negative" | null;
  competitor_mentions: Record<string, unknown> | null;
  checked_at: string;
}

// --- Rank Predictions ---
export interface RankPrediction {
  id: string;
  keyword_id: string;
  predicted_position: number;
  confidence: number;
  prediction_date: string;
  actual_position: number | null;
  features_used: Record<string, number> | null;
  model_version: string | null;
  created_at: string;
}

// --- Entities ---
export type EntityType =
  | "person"
  | "organization"
  | "product"
  | "place"
  | "concept"
  | "technology"
  | "event"
  | "brand"
  | "other";

export interface Entity {
  id: string;
  project_id: string;
  name: string;
  entity_type: EntityType;
  description: string | null;
  relevance_score: number | null;
  source: "ai_extraction" | "manual" | "knowledge_graph" | "serp";
  wikipedia_url: string | null;
  knowledge_panel_data: Record<string, unknown> | null;
  created_at: string;
}

export interface EntityMention {
  id: string;
  entity_id: string;
  content_page_id: string;
  mention_count: number;
  context_snippet: string | null;
}

// --- AI Briefs ---
export interface BriefSection {
  title: string;
  content: string;
  type:
    | "summary"
    | "keywords"
    | "rankings"
    | "backlinks"
    | "visibility"
    | "technical"
    | "competitors"
    | "predictions"
    | "entities"
    | "actions";
  priority: number;
}

export interface AIBrief {
  id: string;
  project_id: string;
  title: string;
  summary: string;
  sections: BriefSection[];
  brief_type: "daily" | "weekly" | "monthly" | "on_demand";
  data_snapshot: Record<string, unknown> | null;
  generated_by: string;
  created_at: string;
}

// --- GEO / Optimization ---
export interface GeoScore {
  id: string;
  content_page_id: string;
  project_id: string;
  geo_score: number;
  entity_score: number;
  structure_score: number;
  schema_score: number;
  ai_citation_score: number;
  recommendations: GeoRecommendation[];
  scored_at: string;
}

export interface GeoRecommendation {
  category: "entity" | "structure" | "schema" | "citation" | "general";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
}

// --- Social Intelligence ---
export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "twitter" | "linkedin";

export interface SocialProfile {
  id: string;
  project_id: string;
  platform: SocialPlatform;
  handle: string;
  platform_user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number | null;
  verified: boolean;
  niche: string | null;
  country: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialMetric {
  id: string;
  social_profile_id: string;
  date: string;
  followers: number | null;
  following: number | null;
  posts_count: number | null;
  avg_likes: number | null;
  avg_comments: number | null;
  avg_shares: number | null;
  avg_views: number | null;
  engagement_rate: number | null;
  top_post_url: string | null;
  top_post_likes: number | null;
  created_at: string;
}

export type SocialAnalysisType =
  | "growth"
  | "content_strategy"
  | "hashtags"
  | "competitors"
  | "insights"
  | "earnings_forecast"
  | "thirty_day_plan"
  | "generated_content";

export interface SocialAnalysis {
  id: string;
  social_profile_id: string;
  analysis_type: SocialAnalysisType;
  result: Record<string, unknown>;
  ai_provider: string | null;
  tokens_used: number | null;
  cost_cents: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface SocialCompetitor {
  id: string;
  social_profile_id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  followers_count: number | null;
  engagement_rate: number | null;
  avg_views: number | null;
  niche: string | null;
  last_synced_at: string | null;
  created_at: string;
}

// Earnings Forecast (JSONB structure stored in social_analyses.result)
export interface EarningsForecast {
  scenarios: {
    conservative: { monthly: number; annual: number };
    realistic: { monthly: number; annual: number };
    optimistic: { monthly: number; annual: number };
  };
  revenue_sources: {
    source: string;
    percentage: number;
    estimated_monthly: number;
  }[];
  monetization_factors: {
    factor: string;
    score: number;
    description: string;
  }[];
  unlock_actions: string[];
  disclaimer: string;
  generated_at: string;
}

// Growth Tip (JSONB structure in social_analyses.result for type=growth)
export interface SocialGrowthTip {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimated_impact: string;
  category: "content" | "engagement" | "timing" | "profile" | "collaboration";
}

// Content Strategy (JSONB structure in social_analyses.result for type=content_strategy)
export interface ContentStrategyDay {
  day: string;
  best_times: string[];
  content_types: string[];
  theme: string;
}

export interface ContentStrategy {
  posting_frequency: string;
  content_mix: { type: string; percentage: number }[];
  weekly_schedule: ContentStrategyDay[];
  tips: string[];
}

// Hashtag Recommendation (JSONB in social_analyses.result for type=hashtags)
export interface HashtagRecommendation {
  tag: string;
  volume: "high" | "medium" | "low";
  competition: "high" | "medium" | "low";
  relevance: number;
  category: string;
}

// Social Goals (stored in social_goals table)
export interface SocialGoal {
  id: string;
  social_profile_id: string;
  primary_objective: string;
  target_metric: string | null;
  target_value: number | null;
  target_days: number | null;
  content_niche: string | null;
  monetization_goal: string | null;
  posting_commitment: string | null;
  target_audience: string | null;
  competitive_aspiration: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Generated Content (stored in social_analyses.result for type=generated_content)
export interface GeneratedContent {
  type: string;
  title: string;
  content: string;
  hashtags?: string[];
  format?: string;
  hook?: string;
  cta?: string;
}

// --- Recommendations ---
export type RecommendationCategory =
  | "quick_wins"
  | "content"
  | "technical"
  | "backlinks"
  | "ai_visibility"
  | "revenue"
  | "competitive"
  | "performance";

export type ImpactLevel = "high" | "medium" | "low";
export type EffortLevel = "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  project_id: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  expected_result: string | null;
  impact: ImpactLevel;
  effort: EffortLevel;
  priority_score: number;
  data_sources: string[];
  linked_page: string | null;
  linked_label: string | null;
  metadata: Record<string, unknown>;
  is_ai_enhanced: boolean;
  ai_provider: string | null;
  is_dismissed: boolean;
  is_completed: boolean;
  batch_id: string | null;
  created_at: string;
}

// --- CRO ---
export type ConversionGoalType =
  | "page_visit"
  | "form_submit"
  | "purchase"
  | "signup"
  | "download"
  | "custom";

export interface ConversionGoal {
  id: string;
  project_id: string;
  name: string;
  goal_type: ConversionGoalType;
  target_url: string | null;
  estimated_value: number;
  estimated_conversion_rate: number;
  created_at: string;
  updated_at: string;
}
