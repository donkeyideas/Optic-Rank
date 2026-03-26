-- ============================================================
-- GA4 Snapshots — daily analytics data for historical tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ga4_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_date        DATE NOT NULL,

  -- Overview metrics
  total_sessions       INTEGER NOT NULL DEFAULT 0,
  total_users          INTEGER NOT NULL DEFAULT 0,
  total_pageviews      INTEGER NOT NULL DEFAULT 0,
  bounce_rate          NUMERIC(5,2),
  avg_session_duration NUMERIC(8,2),
  new_users            INTEGER NOT NULL DEFAULT 0,

  -- Traffic sources (JSONB array of {source, medium, sessions, users, bounceRate})
  traffic_sources      JSONB NOT NULL DEFAULT '[]',

  -- Top pages (JSONB array of {path, title, pageviews, users, avgTimeOnPage, bounceRate})
  top_pages            JSONB NOT NULL DEFAULT '[]',

  -- Daily time-series for the period (JSONB array of {date, sessions, users, pageviews})
  daily_data           JSONB NOT NULL DEFAULT '[]',

  -- Period this snapshot covers
  period_days          INTEGER NOT NULL DEFAULT 30,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, snapshot_date, period_days)
);

CREATE INDEX IF NOT EXISTS idx_ga4_snapshots_project_date
  ON public.ga4_snapshots (project_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.ga4_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view GA4 snapshots for their org's projects
CREATE POLICY "Users can view GA4 snapshots for their org projects"
  ON public.ga4_snapshots
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

-- Allow inserts/updates via service role (server actions use admin client)
CREATE POLICY "Service role can manage GA4 snapshots"
  ON public.ga4_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);
