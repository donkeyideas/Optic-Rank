-- ============================================================
-- GSC Snapshots — daily search console data for dashboard caching
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gsc_snapshots (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  snapshot_date        DATE NOT NULL,

  -- Overview metrics
  total_clicks         INTEGER NOT NULL DEFAULT 0,
  total_impressions    INTEGER NOT NULL DEFAULT 0,
  avg_ctr              NUMERIC(8,6),
  avg_position         NUMERIC(6,2),

  -- Top queries (JSONB array of {query, clicks, impressions, ctr, position})
  top_queries          JSONB NOT NULL DEFAULT '[]',

  -- Top pages (JSONB array of {page, clicks, impressions, ctr, position})
  top_pages            JSONB NOT NULL DEFAULT '[]',

  -- Daily time-series (JSONB array of {date, clicks, impressions, ctr, position})
  daily_data           JSONB NOT NULL DEFAULT '[]',

  -- Device breakdown (JSONB array of {device, clicks, impressions, ctr, position})
  devices              JSONB NOT NULL DEFAULT '[]',

  -- Country breakdown (JSONB array of {country, clicks, impressions, ctr, position})
  countries            JSONB NOT NULL DEFAULT '[]',

  -- Period this snapshot covers
  period_days          INTEGER NOT NULL DEFAULT 28,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, snapshot_date, period_days)
);

CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_project_date
  ON public.gsc_snapshots (project_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.gsc_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view GSC snapshots for their org's projects
CREATE POLICY "Users can view GSC snapshots for their org projects"
  ON public.gsc_snapshots
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

-- Allow inserts/updates via service role (server actions use admin client)
CREATE POLICY "Service role can manage GSC snapshots"
  ON public.gsc_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);
