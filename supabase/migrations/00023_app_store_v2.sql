-- ============================================================
-- App Store V2: Competitors, Snapshots, Versions, Topics,
--               Keyword History, Localizations
-- ============================================================

-- 1. Competitor apps tracked alongside your own
CREATE TABLE IF NOT EXISTS public.app_store_competitors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  competitor_app_id     TEXT NOT NULL,
  competitor_store      TEXT NOT NULL CHECK (competitor_store IN ('apple', 'google')),
  competitor_name       TEXT NOT NULL,
  competitor_icon_url   TEXT,
  competitor_rating     DECIMAL(3,2),
  competitor_reviews_count INT DEFAULT 0,
  competitor_downloads  INT DEFAULT 0,
  competitor_version    TEXT,
  competitor_description TEXT,
  competitor_aso_score  INT,
  last_fetched          TIMESTAMPTZ DEFAULT now(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, competitor_store, competitor_app_id)
);

CREATE INDEX IF NOT EXISTS idx_app_competitors_listing ON public.app_store_competitors(listing_id);

-- 2. Daily snapshots for rating/review/download trend charts
CREATE TABLE IF NOT EXISTS public.app_store_snapshots (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  rating                DECIMAL(3,2),
  reviews_count         INT,
  downloads_estimate    INT,
  aso_score             INT,
  snapshot_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(listing_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_app_snapshots_listing ON public.app_store_snapshots(listing_id, snapshot_date);

-- 3. Version history for update impact tracking
CREATE TABLE IF NOT EXISTS public.app_store_versions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  version               TEXT NOT NULL,
  release_date          TIMESTAMPTZ,
  release_notes         TEXT,
  rating_at_release     DECIMAL(3,2),
  reviews_at_release    INT,
  downloads_at_release  INT,
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, version)
);

CREATE INDEX IF NOT EXISTS idx_app_versions_listing ON public.app_store_versions(listing_id);

-- 4. Keyword position history (daily snapshots for charts)
CREATE TABLE IF NOT EXISTS public.app_store_keyword_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ranking_id            UUID NOT NULL REFERENCES public.app_store_rankings(id) ON DELETE CASCADE,
  position              INT,
  checked_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_kw_history_ranking ON public.app_store_keyword_history(ranking_id, checked_at);

-- 5. Review topics extracted by AI (normalized)
CREATE TABLE IF NOT EXISTS public.app_store_review_topics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  topic                 TEXT NOT NULL,
  category              TEXT NOT NULL CHECK (category IN ('feature_request', 'bug', 'praise', 'complaint', 'competitor_mention')),
  mention_count         INT NOT NULL DEFAULT 1,
  sentiment_avg         DECIMAL(3,2),
  first_seen            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen             TIMESTAMPTZ NOT NULL DEFAULT now(),
  sample_review_ids     UUID[] DEFAULT '{}',
  UNIQUE(listing_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_app_topics_listing ON public.app_store_review_topics(listing_id);
CREATE INDEX IF NOT EXISTS idx_app_topics_category ON public.app_store_review_topics(listing_id, category);

-- 6. Localization metadata per country
CREATE TABLE IF NOT EXISTS public.app_store_localizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id            UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  country_code          TEXT NOT NULL,
  locale                TEXT NOT NULL,
  localized_title       TEXT,
  localized_subtitle    TEXT,
  localized_description TEXT,
  localized_keywords    TEXT,
  completeness_score    INT DEFAULT 0,
  opportunity_score     INT DEFAULT 0,
  ai_translated         BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, country_code)
);

CREATE INDEX IF NOT EXISTS idx_app_localizations_listing ON public.app_store_localizations(listing_id);

-- ============================================================
-- RLS Policies (all chain through listing_id → project → org)
-- ============================================================

ALTER TABLE public.app_store_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_keyword_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_review_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_localizations ENABLE ROW LEVEL SECURITY;

-- Competitors
CREATE POLICY "Users can view competitors for their org"
  ON public.app_store_competitors FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can manage competitors for their org"
  ON public.app_store_competitors FOR ALL
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Snapshots
CREATE POLICY "Users can view snapshots for their org"
  ON public.app_store_snapshots FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can manage snapshots for their org"
  ON public.app_store_snapshots FOR ALL
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Versions
CREATE POLICY "Users can view versions for their org"
  ON public.app_store_versions FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can manage versions for their org"
  ON public.app_store_versions FOR ALL
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Keyword History (chains through ranking_id → listing_id)
CREATE POLICY "Users can view keyword history for their org"
  ON public.app_store_keyword_history FOR SELECT
  USING (ranking_id IN (
    SELECT r.id FROM public.app_store_rankings r
    WHERE r.listing_id IN (
      SELECT l.id FROM public.app_store_listings l
      WHERE l.project_id IN (
        SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
      )
    )
  ));

CREATE POLICY "Users can manage keyword history for their org"
  ON public.app_store_keyword_history FOR ALL
  USING (ranking_id IN (
    SELECT r.id FROM public.app_store_rankings r
    WHERE r.listing_id IN (
      SELECT l.id FROM public.app_store_listings l
      WHERE l.project_id IN (
        SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
      )
    )
  ));

-- Review Topics
CREATE POLICY "Users can view review topics for their org"
  ON public.app_store_review_topics FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can manage review topics for their org"
  ON public.app_store_review_topics FOR ALL
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Localizations
CREATE POLICY "Users can view localizations for their org"
  ON public.app_store_localizations FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can manage localizations for their org"
  ON public.app_store_localizations FOR ALL
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));
