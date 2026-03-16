-- ============================================================
-- Phase 3: App Store Optimization (ASO) Tables
-- ============================================================

-- App Store Listings
CREATE TABLE IF NOT EXISTS public.app_store_listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  store               TEXT NOT NULL CHECK (store IN ('apple', 'google')),
  app_id              TEXT NOT NULL,
  app_name            TEXT NOT NULL,
  app_url             TEXT,
  category            TEXT,
  developer           TEXT,
  icon_url            TEXT,
  rating              DECIMAL(3,2),
  reviews_count       INT DEFAULT 0,
  downloads_estimate  INT DEFAULT 0,
  current_version     TEXT,
  description         TEXT,
  keywords_field      TEXT,
  subtitle            TEXT,
  aso_score           INT,
  last_updated        TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, store, app_id)
);

CREATE INDEX IF NOT EXISTS idx_app_store_listings_project ON public.app_store_listings(project_id);

-- App Store Keyword Rankings
CREATE TABLE IF NOT EXISTS public.app_store_rankings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  keyword           TEXT NOT NULL,
  position          INT,
  country           TEXT NOT NULL DEFAULT 'US',
  difficulty        INT,
  search_volume     INT,
  checked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, keyword, country, checked_at)
);

CREATE INDEX IF NOT EXISTS idx_app_rankings_listing ON public.app_store_rankings(listing_id);
CREATE INDEX IF NOT EXISTS idx_app_rankings_keyword ON public.app_store_rankings(keyword);

-- App Store Reviews
CREATE TABLE IF NOT EXISTS public.app_store_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id        UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  store             TEXT NOT NULL CHECK (store IN ('apple', 'google')),
  review_id         TEXT,
  author            TEXT,
  rating            INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title             TEXT,
  text              TEXT,
  sentiment         TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  topics            TEXT[] DEFAULT '{}',
  ai_reply          TEXT,
  reply_sent        BOOLEAN DEFAULT false,
  review_date       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, review_id)
);

CREATE INDEX IF NOT EXISTS idx_app_reviews_listing ON public.app_store_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_sentiment ON public.app_store_reviews(listing_id, sentiment);

-- ============================================================
-- Content Intelligence: Decay & Cannibalization
-- ============================================================

-- Add columns for content intelligence features
ALTER TABLE public.content_pages
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS target_keywords TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS readability_score INT,
  ADD COLUMN IF NOT EXISTS freshness_score INT,
  ADD COLUMN IF NOT EXISTS decay_risk TEXT CHECK (decay_risk IN ('none', 'low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS last_traffic INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prev_traffic INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cannibalization_group TEXT,
  ADD COLUMN IF NOT EXISTS internal_links_in INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS internal_links_out INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suggested_internal_links JSONB;

-- Content Calendar
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  target_keyword    TEXT,
  target_date       DATE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'review', 'published', 'postponed')),
  assigned_to       UUID REFERENCES auth.users(id),
  brief_id          UUID REFERENCES public.ai_briefs(id),
  content_page_id   UUID REFERENCES public.content_pages(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_calendar_project ON public.content_calendar(project_id, target_date);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.app_store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;

-- App Store Listings: org-scoped via project
DROP POLICY IF EXISTS "Users can view app listings for their org projects" ON public.app_store_listings;
CREATE POLICY "Users can view app listings for their org projects"
  ON public.app_store_listings FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ));

DROP POLICY IF EXISTS "Users can insert app listings for their org projects" ON public.app_store_listings;
CREATE POLICY "Users can insert app listings for their org projects"
  ON public.app_store_listings FOR INSERT
  WITH CHECK (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ));

DROP POLICY IF EXISTS "Users can update app listings for their org projects" ON public.app_store_listings;
CREATE POLICY "Users can update app listings for their org projects"
  ON public.app_store_listings FOR UPDATE
  USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ));

DROP POLICY IF EXISTS "Users can delete app listings for their org projects" ON public.app_store_listings;
CREATE POLICY "Users can delete app listings for their org projects"
  ON public.app_store_listings FOR DELETE
  USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ));

-- App Store Rankings: via listing -> project
DROP POLICY IF EXISTS "Users can view app rankings for their org" ON public.app_store_rankings;
CREATE POLICY "Users can view app rankings for their org"
  ON public.app_store_rankings FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- App Store Reviews: via listing -> project
DROP POLICY IF EXISTS "Users can view app reviews for their org" ON public.app_store_reviews;
CREATE POLICY "Users can view app reviews for their org"
  ON public.app_store_reviews FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Content Calendar: org-scoped via project
DROP POLICY IF EXISTS "Users can view content calendar for their org" ON public.content_calendar;
CREATE POLICY "Users can view content calendar for their org"
  ON public.content_calendar FOR SELECT
  USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ));

DROP POLICY IF EXISTS "Users can manage content calendar for their org" ON public.content_calendar;
CREATE POLICY "Users can manage content calendar for their org"
  ON public.content_calendar FOR ALL
  USING (project_id IN (
    SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
  ));
