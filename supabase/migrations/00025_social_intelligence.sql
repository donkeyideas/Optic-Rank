-- ============================================================
-- Social Intelligence Module
-- Tables for social media profile tracking, metrics,
-- AI analyses, and competitor benchmarking
-- ============================================================

-- 1. Social profiles tracked by users
CREATE TABLE IF NOT EXISTS public.social_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin')),
  handle            TEXT NOT NULL,
  platform_user_id  TEXT,
  display_name      TEXT,
  avatar_url        TEXT,
  bio               TEXT,
  followers_count   INTEGER DEFAULT 0,
  following_count   INTEGER DEFAULT 0,
  posts_count       INTEGER DEFAULT 0,
  engagement_rate   NUMERIC(5,2),
  verified          BOOLEAN DEFAULT false,
  niche             TEXT,
  country           TEXT,
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, platform, handle)
);

CREATE INDEX IF NOT EXISTS idx_social_profiles_project ON public.social_profiles(project_id);
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform ON public.social_profiles(platform);

-- 2. Daily metric snapshots for trend tracking
CREATE TABLE IF NOT EXISTS public.social_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id   UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  followers           INTEGER,
  following           INTEGER,
  posts_count         INTEGER,
  avg_likes           NUMERIC(10,2),
  avg_comments        NUMERIC(10,2),
  avg_shares          NUMERIC(10,2),
  avg_views           NUMERIC(12,2),
  engagement_rate     NUMERIC(5,2),
  top_post_url        TEXT,
  top_post_likes      INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(social_profile_id, date)
);

CREATE INDEX IF NOT EXISTS idx_social_metrics_profile ON public.social_metrics(social_profile_id, date);

-- 3. AI-generated analysis results (cached)
CREATE TABLE IF NOT EXISTS public.social_analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id   UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  analysis_type       TEXT NOT NULL CHECK (analysis_type IN ('growth', 'content_strategy', 'hashtags', 'competitors', 'insights', 'earnings_forecast', 'thirty_day_plan')),
  result              JSONB NOT NULL,
  ai_provider         TEXT,
  tokens_used         INTEGER,
  cost_cents          NUMERIC(8,4),
  expires_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_analyses_profile ON public.social_analyses(social_profile_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_social_analyses_expires ON public.social_analyses(expires_at);

-- 4. Competitor accounts for benchmarking
CREATE TABLE IF NOT EXISTS public.social_competitors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id   UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  platform            TEXT NOT NULL,
  handle              TEXT NOT NULL,
  display_name        TEXT,
  followers_count     INTEGER,
  engagement_rate     NUMERIC(5,2),
  avg_views           NUMERIC(12,2),
  niche               TEXT,
  last_synced_at      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(social_profile_id, handle)
);

CREATE INDEX IF NOT EXISTS idx_social_competitors_profile ON public.social_competitors(social_profile_id);

-- ============================================================
-- Add max_social_profiles to organizations for plan gating
-- ============================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS max_social_profiles INTEGER DEFAULT 1;

-- Update pricing_plans table with social profile limits
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS max_social_profiles INTEGER DEFAULT 1;

-- Set default limits per plan
UPDATE public.pricing_plans SET max_social_profiles = 1  WHERE plan_key = 'free';
UPDATE public.pricing_plans SET max_social_profiles = 3  WHERE plan_key = 'starter';
UPDATE public.pricing_plans SET max_social_profiles = 10 WHERE plan_key = 'pro';
UPDATE public.pricing_plans SET max_social_profiles = 25 WHERE plan_key = 'business';
UPDATE public.pricing_plans SET max_social_profiles = 999 WHERE plan_key = 'enterprise';

-- ============================================================
-- RLS Policies (chain through project_id → organization_id)
-- ============================================================

ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_competitors ENABLE ROW LEVEL SECURITY;

-- Social Profiles (FOR ALL covers SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Users can manage social profiles for their org" ON public.social_profiles;
CREATE POLICY "Users can manage social profiles for their org"
  ON public.social_profiles FOR ALL
  USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ))
  WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ));

-- Social Metrics (chain through social_profile_id → project → org)
DROP POLICY IF EXISTS "Users can manage social metrics for their org" ON public.social_metrics;
CREATE POLICY "Users can manage social metrics for their org"
  ON public.social_metrics FOR ALL
  USING (social_profile_id IN (
    SELECT sp.id FROM public.social_profiles sp
    WHERE sp.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ))
  WITH CHECK (social_profile_id IN (
    SELECT sp.id FROM public.social_profiles sp
    WHERE sp.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Social Analyses
DROP POLICY IF EXISTS "Users can manage social analyses for their org" ON public.social_analyses;
CREATE POLICY "Users can manage social analyses for their org"
  ON public.social_analyses FOR ALL
  USING (social_profile_id IN (
    SELECT sp.id FROM public.social_profiles sp
    WHERE sp.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ))
  WITH CHECK (social_profile_id IN (
    SELECT sp.id FROM public.social_profiles sp
    WHERE sp.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Social Competitors
DROP POLICY IF EXISTS "Users can manage social competitors for their org" ON public.social_competitors;
CREATE POLICY "Users can manage social competitors for their org"
  ON public.social_competitors FOR ALL
  USING (social_profile_id IN (
    SELECT sp.id FROM public.social_profiles sp
    WHERE sp.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ))
  WITH CHECK (social_profile_id IN (
    SELECT sp.id FROM public.social_profiles sp
    WHERE sp.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));
