-- ============================================================
-- Dashboard Volumes — weekly newspaper-style edition snapshots
-- ============================================================

CREATE TABLE public.dashboard_volumes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  volume_number  INTEGER NOT NULL,
  week_start     DATE NOT NULL,
  week_end       DATE NOT NULL,

  -- Denormalized key metrics for fast list queries
  authority_score    INTEGER,
  organic_traffic    INTEGER,
  keywords_ranked    INTEGER,
  backlinks_total    INTEGER,
  health_score       INTEGER,
  ai_visibility_avg  NUMERIC(5,2),

  -- Full dashboard state as JSONB
  snapshot       JSONB NOT NULL DEFAULT '{}',

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (project_id, volume_number),
  UNIQUE (project_id, week_start)
);

CREATE INDEX idx_dashboard_volumes_project_vol
  ON public.dashboard_volumes (project_id, volume_number DESC);

ALTER TABLE public.dashboard_volumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view volumes for their org projects"
  ON public.dashboard_volumes
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );
