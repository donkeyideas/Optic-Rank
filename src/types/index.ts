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
  timezone: string;
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
