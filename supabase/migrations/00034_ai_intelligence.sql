-- ============================================================
-- Migration 00034: AI Intelligence — Interactions + Platform Insights
-- Stores full AI prompts/responses for knowledge base & learning
-- Stores AI-generated platform insights for data intelligence
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ai_interactions — every AI call with full content
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.ai_interactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  feature           TEXT NOT NULL,
    -- e.g. 'content_generator', 'keyword_analysis', 'review_reply',
    --      'recommendations', 'aso_optimizer', 'competitor_gap',
    --      'store_intel', 'localization', 'site_audit', 'backlinks',
    --      'social_analysis', 'data_intelligence'
  sub_type          TEXT,
    -- more specific: 'hashtag_analysis', 'title_variant', '30_day_plan'
  prompt_text       TEXT NOT NULL,
  response_text     TEXT,
  prompt_tokens     INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens      INT NOT NULL DEFAULT 0,
  cost_usd          DECIMAL(10,6) NOT NULL DEFAULT 0,
  provider          TEXT NOT NULL,
  model             TEXT,
  response_time_ms  INT,
  is_success        BOOLEAN NOT NULL DEFAULT true,
  error_message     TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common access patterns
CREATE INDEX idx_ai_interactions_org      ON public.ai_interactions(organization_id, created_at DESC);
CREATE INDEX idx_ai_interactions_feature  ON public.ai_interactions(feature, created_at DESC);
CREATE INDEX idx_ai_interactions_project  ON public.ai_interactions(project_id, feature);
CREATE INDEX idx_ai_interactions_created  ON public.ai_interactions(created_at DESC);

-- RLS — admin read, service role full
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access ai_interactions"
  ON public.ai_interactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Recommended: set up a 90-day retention cron to truncate prompt_text/response_text
-- for rows older than 90 days to manage storage growth.

-- ────────────────────────────────────────────────────────────
-- 2. platform_insights — AI-generated data intelligence
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.platform_insights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type      TEXT NOT NULL
                      CHECK (insight_type IN (
                        'health_score','anomaly','trend',
                        'recommendation','prediction','summary'
                      )),
  category          TEXT NOT NULL
                      CHECK (category IN (
                        'revenue','engagement','growth','churn',
                        'feature_adoption','system','ai_usage','overall'
                      )),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'info'
                      CHECK (severity IN ('critical','warning','info','positive')),
  confidence        DECIMAL(3,2) DEFAULT 0.80,
  data_snapshot     JSONB DEFAULT '{}',
  recommendations   JSONB DEFAULT '[]',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_dismissed      BOOLEAN NOT NULL DEFAULT false,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ
);

CREATE INDEX idx_platform_insights_category ON public.platform_insights(category, generated_at DESC);
CREATE INDEX idx_platform_insights_active   ON public.platform_insights(is_active, generated_at DESC);

-- RLS — admin/service only
ALTER TABLE public.platform_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access platform_insights"
  ON public.platform_insights FOR ALL
  USING (true)
  WITH CHECK (true);
