-- ============================================================
-- RankPulse AI - Initial Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TRIGGER FUNCTION: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  plan            TEXT NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free','starter','pro','business','enterprise')),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status    TEXT DEFAULT 'active'
                    CHECK (subscription_status IN ('active','past_due','canceled','trialing','paused')),
  trial_ends_at   TIMESTAMPTZ,
  max_projects    INT NOT NULL DEFAULT 1,
  max_keywords    INT NOT NULL DEFAULT 100,
  max_pages_crawl INT NOT NULL DEFAULT 500,
  max_users       INT NOT NULL DEFAULT 1,
  features        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- PROFILES (linked to auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner','admin','member','viewer')),
  system_role     TEXT NOT NULL DEFAULT 'user'
                    CHECK (system_role IN ('user','admin','superadmin')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notification_prefs   JSONB NOT NULL DEFAULT '{"email":true,"push":true,"weekly_digest":true}',
  timezone        TEXT DEFAULT 'UTC',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ORGANIZATION INVITES
-- ============================================================
CREATE TABLE public.organization_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member',
  invited_by      UUID REFERENCES public.profiles(id),
  accepted_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BILLING EVENTS
-- ============================================================
CREATE TABLE public.billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_event_id TEXT UNIQUE,
  event_type      TEXT NOT NULL,
  amount_cents    INT,
  currency        TEXT DEFAULT 'usd',
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USAGE TRACKING
-- ============================================================
CREATE TABLE public.usage_tracking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  metric          TEXT NOT NULL,
  value           BIGINT NOT NULL DEFAULT 0,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, metric, period_start)
);

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE public.api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL UNIQUE,
  key_prefix      TEXT NOT NULL,
  scopes          TEXT[] NOT NULL DEFAULT '{}',
  last_used_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('website','ios_app','android_app','both')),
  domain          TEXT,
  url             TEXT,
  app_store_id    TEXT,
  play_store_id   TEXT,
  target_countries TEXT[] NOT NULL DEFAULT '{US}',
  target_languages TEXT[] NOT NULL DEFAULT '{en}',
  search_engines   TEXT[] NOT NULL DEFAULT '{google}',
  gsc_property_url TEXT,
  ga4_property_id  TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_crawl_at   TIMESTAMPTZ,
  last_rank_check TIMESTAMPTZ,
  authority_score DECIMAL(5,2),
  health_score    DECIMAL(5,2),
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- KEYWORDS
-- ============================================================
CREATE TABLE public.keywords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword         TEXT NOT NULL,
  search_engine   TEXT NOT NULL DEFAULT 'google',
  device          TEXT NOT NULL DEFAULT 'desktop' CHECK (device IN ('desktop','mobile')),
  location        TEXT NOT NULL DEFAULT 'US',
  current_position INT,
  previous_position INT,
  best_position   INT,
  search_volume   INT,
  cpc             DECIMAL(8,2),
  difficulty      DECIMAL(5,2),
  intent          TEXT CHECK (intent IN ('informational','navigational','transactional','commercial')),
  ai_visibility_score DECIMAL(5,2),
  ai_visibility_count TEXT,
  tags            TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, keyword, search_engine, device, location)
);

CREATE TRIGGER keywords_updated_at
  BEFORE UPDATE ON public.keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_keywords_project ON public.keywords(project_id);
CREATE INDEX idx_keywords_position ON public.keywords(current_position) WHERE current_position IS NOT NULL;

-- ============================================================
-- KEYWORD RANKS (time-series)
-- ============================================================
CREATE TABLE public.keyword_ranks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id      UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  position        INT,
  url             TEXT,
  serp_features   TEXT[] DEFAULT '{}',
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_keyword_ranks_keyword ON public.keyword_ranks(keyword_id, checked_at DESC);

-- ============================================================
-- KEYWORD CLUSTERS
-- ============================================================
CREATE TABLE public.keyword_clusters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  keywords        UUID[] NOT NULL DEFAULT '{}',
  topic           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BACKLINKS
-- ============================================================
CREATE TABLE public.backlinks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_url      TEXT NOT NULL,
  source_domain   TEXT NOT NULL,
  target_url      TEXT NOT NULL,
  anchor_text     TEXT,
  link_type       TEXT DEFAULT 'dofollow'
                    CHECK (link_type IN ('dofollow','nofollow','ugc','sponsored')),
  domain_authority DECIMAL(5,2),
  trust_flow      DECIMAL(5,2),
  citation_flow   DECIMAL(5,2),
  is_toxic        BOOLEAN NOT NULL DEFAULT FALSE,
  toxic_score     DECIMAL(5,2),
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','lost','new')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_backlinks_project ON public.backlinks(project_id);
CREATE INDEX idx_backlinks_domain ON public.backlinks(source_domain);
CREATE INDEX idx_backlinks_status ON public.backlinks(project_id, status);

-- ============================================================
-- BACKLINK SNAPSHOTS (periodic summaries)
-- ============================================================
CREATE TABLE public.backlink_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_backlinks INT NOT NULL DEFAULT 0,
  referring_domains INT NOT NULL DEFAULT 0,
  new_backlinks   INT NOT NULL DEFAULT 0,
  lost_backlinks  INT NOT NULL DEFAULT 0,
  avg_domain_authority DECIMAL(5,2),
  snapshot_date   DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, snapshot_date)
);

-- ============================================================
-- SITE AUDITS
-- ============================================================
CREATE TABLE public.site_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','crawling','analyzing','completed','failed')),
  pages_crawled   INT NOT NULL DEFAULT 0,
  pages_total     INT,
  issues_found    INT NOT NULL DEFAULT 0,
  health_score    DECIMAL(5,2),
  seo_score       DECIMAL(5,2),
  performance_score DECIMAL(5,2),
  accessibility_score DECIMAL(5,2),
  content_score   DECIMAL(5,2),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUDIT PAGES
-- ============================================================
CREATE TABLE public.audit_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id        UUID NOT NULL REFERENCES public.site_audits(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  status_code     INT,
  title           TEXT,
  meta_description TEXT,
  h1              TEXT,
  word_count      INT,
  load_time_ms    INT,
  lcp_ms          DECIMAL(8,2),
  cls             DECIMAL(8,4),
  inp_ms          DECIMAL(8,2),
  has_schema      BOOLEAN DEFAULT FALSE,
  canonical_url   TEXT,
  robots          TEXT,
  issues_count    INT NOT NULL DEFAULT 0,
  crawled_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_pages_audit ON public.audit_pages(audit_id);

-- ============================================================
-- AUDIT ISSUES
-- ============================================================
CREATE TABLE public.audit_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id        UUID NOT NULL REFERENCES public.site_audits(id) ON DELETE CASCADE,
  page_id         UUID REFERENCES public.audit_pages(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
                    CHECK (category IN ('seo','performance','accessibility','content','security')),
  severity        TEXT NOT NULL
                    CHECK (severity IN ('critical','warning','info')),
  rule_id         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  affected_url    TEXT,
  recommendation  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_issues_audit ON public.audit_issues(audit_id, severity);

-- ============================================================
-- COMPETITORS
-- ============================================================
CREATE TABLE public.competitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  domain          TEXT NOT NULL,
  url             TEXT,
  is_auto_discovered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, domain)
);

CREATE TRIGGER competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- COMPETITOR SNAPSHOTS
-- ============================================================
CREATE TABLE public.competitor_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id   UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  authority_score DECIMAL(5,2),
  organic_traffic BIGINT,
  keywords_count  INT,
  backlinks_count BIGINT,
  snapshot_date   DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(competitor_id, snapshot_date)
);

-- ============================================================
-- CONTENT PAGES
-- ============================================================
CREATE TABLE public.content_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  title           TEXT,
  word_count      INT,
  content_score   DECIMAL(5,2),
  readability_score DECIMAL(5,2),
  freshness_score DECIMAL(5,2),
  entity_coverage DECIMAL(5,2),
  last_modified   TIMESTAMPTZ,
  organic_traffic INT,
  traffic_trend   TEXT CHECK (traffic_trend IN ('growing','stable','declining')),
  primary_keyword TEXT,
  target_keywords TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER content_pages_updated_at
  BEFORE UPDATE ON public.content_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CONTENT BRIEFS
-- ============================================================
CREATE TABLE public.content_briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_keyword  TEXT NOT NULL,
  title_suggestions TEXT[],
  outline         JSONB,
  target_word_count INT,
  target_entities TEXT[],
  serp_intent     TEXT,
  competing_urls  TEXT[],
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','in_progress','published','archived')),
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AI INSIGHTS
-- ============================================================
CREATE TABLE public.ai_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type            TEXT NOT NULL
                    CHECK (type IN ('opportunity','alert','win','backlinks','prediction','content','technical')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  action_label    TEXT,
  action_url      TEXT,
  priority        INT NOT NULL DEFAULT 50,
  revenue_impact  DECIMAL(12,2),
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  is_dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_insights_project ON public.ai_insights(project_id, created_at DESC);

-- ============================================================
-- AI VISIBILITY CHECKS
-- ============================================================
CREATE TABLE public.ai_visibility_checks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id      UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  llm_provider    TEXT NOT NULL,
  query_text      TEXT NOT NULL,
  response_text   TEXT,
  brand_mentioned BOOLEAN NOT NULL DEFAULT FALSE,
  mention_position INT,
  url_cited       BOOLEAN NOT NULL DEFAULT FALSE,
  sentiment       TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  competitor_mentions JSONB,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_visibility_keyword ON public.ai_visibility_checks(keyword_id, checked_at DESC);

-- ============================================================
-- RANK PREDICTIONS
-- ============================================================
CREATE TABLE public.rank_predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id      UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  predicted_position INT NOT NULL,
  confidence      DECIMAL(5,4),
  prediction_date DATE NOT NULL,
  actual_position INT,
  features_used   JSONB,
  model_version   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(keyword_id, prediction_date)
);

-- ============================================================
-- APP STORE LISTINGS
-- ============================================================
CREATE TABLE public.app_store_listings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  store           TEXT NOT NULL CHECK (store IN ('apple','google')),
  app_name        TEXT NOT NULL,
  developer       TEXT,
  category        TEXT,
  rating          DECIMAL(3,2),
  reviews_count   INT,
  downloads_estimate BIGINT,
  current_version TEXT,
  icon_url        TEXT,
  last_updated    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- APP STORE RANKINGS
-- ============================================================
CREATE TABLE public.app_store_rankings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  keyword         TEXT NOT NULL,
  position        INT,
  country         TEXT NOT NULL DEFAULT 'US',
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_rankings_listing ON public.app_store_rankings(listing_id, checked_at DESC);

-- ============================================================
-- APP REVIEWS
-- ============================================================
CREATE TABLE public.app_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  review_id       TEXT,
  author          TEXT,
  rating          INT NOT NULL,
  title           TEXT,
  body            TEXT,
  sentiment       TEXT CHECK (sentiment IN ('positive','neutral','negative')),
  topics          TEXT[],
  reply           TEXT,
  review_date     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  action_url      TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- SCHEDULED REPORTS
-- ============================================================
CREATE TABLE public.scheduled_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  schedule        TEXT NOT NULL DEFAULT 'weekly',
  recipients      TEXT[] NOT NULL DEFAULT '{}',
  sections        JSONB NOT NULL DEFAULT '[]',
  last_sent_at    TIMESTAMPTZ,
  next_send_at    TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- JOB QUEUE
-- ============================================================
CREATE TABLE public.job_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type        TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','completed','failed','cancelled')),
  priority        INT NOT NULL DEFAULT 0,
  attempts        INT NOT NULL DEFAULT 0,
  max_attempts    INT NOT NULL DEFAULT 3,
  last_error      TEXT,
  locked_by       TEXT,
  locked_at       TIMESTAMPTZ,
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_queue_status ON public.job_queue(status, priority DESC, scheduled_for);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE public.audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     UUID,
  metadata        JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_org ON public.audit_log(organization_id, created_at DESC);
