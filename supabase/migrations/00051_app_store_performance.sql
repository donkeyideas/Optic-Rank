-- ============================================================
-- App Store Performance: Core Web Vitals + Android Vitals
-- ============================================================

-- PageSpeed / Lighthouse test results history
CREATE TABLE IF NOT EXISTS public.app_store_cwv (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  strategy            TEXT NOT NULL DEFAULT 'mobile' CHECK (strategy IN ('mobile', 'desktop')),
  url_tested          TEXT NOT NULL,
  performance_score   INT,
  accessibility_score INT,
  lcp_ms              NUMERIC(10,2),
  fcp_ms              NUMERIC(10,2),
  cls                 NUMERIC(8,4),
  inp_ms              NUMERIC(10,2),
  ttfb_ms             NUMERIC(10,2),
  speed_index         NUMERIC(10,2),
  total_blocking_time NUMERIC(10,2),
  field_lcp_ms        NUMERIC(10,2),
  field_cls           NUMERIC(8,4),
  field_inp_ms        NUMERIC(10,2),
  field_fcp_ms        NUMERIC(10,2),
  field_ttfb_ms       NUMERIC(10,2),
  field_category      TEXT,
  tested_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_cwv_listing ON public.app_store_cwv(listing_id, tested_at DESC);

-- Google Play Android Vitals history
CREATE TABLE IF NOT EXISTS public.app_store_vitals (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                UUID NOT NULL REFERENCES public.app_store_listings(id) ON DELETE CASCADE,
  crash_rate                NUMERIC(8,4),
  anr_rate                  NUMERIC(8,4),
  user_perceived_crash_rate NUMERIC(8,4),
  user_perceived_anr_rate   NUMERIC(8,4),
  excessive_wakeup_rate     NUMERIC(8,4),
  stuck_wakelock_rate       NUMERIC(8,4),
  snapshot_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(listing_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_app_vitals_listing ON public.app_store_vitals(listing_id, snapshot_date DESC);

-- ============================================================
-- RLS (chain through listing_id → project → org)
-- ============================================================

ALTER TABLE public.app_store_cwv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_vitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CWV for their org"
  ON public.app_store_cwv FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can manage CWV for their org"
  ON public.app_store_cwv FOR ALL
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can view vitals for their org"
  ON public.app_store_vitals FOR SELECT
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

CREATE POLICY "Users can manage vitals for their org"
  ON public.app_store_vitals FOR ALL
  USING (listing_id IN (
    SELECT l.id FROM public.app_store_listings l
    WHERE l.project_id IN (
      SELECT p.id FROM public.projects p WHERE p.organization_id = public.get_user_org_id()
    )
  ));

-- Service role bypass
CREATE POLICY "Service role full access CWV"
  ON public.app_store_cwv FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access vitals"
  ON public.app_store_vitals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
