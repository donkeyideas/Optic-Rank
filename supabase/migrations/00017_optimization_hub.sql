-- ================================================================
-- 00017: Optimization Hub (GEO + CRO)
-- Tables for GEO readiness scores and conversion goals
-- ================================================================

-- geo_scores: per-page GEO readiness scores
CREATE TABLE IF NOT EXISTS public.geo_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_page_id  UUID NOT NULL REFERENCES public.content_pages(id) ON DELETE CASCADE,
  project_id       UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  geo_score        DECIMAL(5,2) NOT NULL DEFAULT 0,
  entity_score     DECIMAL(5,2) NOT NULL DEFAULT 0,
  structure_score  DECIMAL(5,2) NOT NULL DEFAULT 0,
  schema_score     DECIMAL(5,2) NOT NULL DEFAULT 0,
  ai_citation_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  recommendations  JSONB NOT NULL DEFAULT '[]'::jsonb,
  scored_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_page_id)
);

CREATE INDEX IF NOT EXISTS idx_geo_scores_project ON public.geo_scores(project_id);

-- conversion_goals: CRO goal tracking
CREATE TABLE IF NOT EXISTS public.conversion_goals (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  goal_type                 TEXT NOT NULL CHECK (goal_type IN ('page_visit','form_submit','purchase','signup','download','custom')),
  target_url                TEXT,
  estimated_value           DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_conversion_rate DECIMAL(5,4) NOT NULL DEFAULT 0.02,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversion_goals_project ON public.conversion_goals(project_id);

-- ================================================================
-- RLS Policies
-- ================================================================

ALTER TABLE public.geo_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_goals ENABLE ROW LEVEL SECURITY;

-- geo_scores: users can read/write if they belong to the project's org
CREATE POLICY "Users can view geo_scores for their org projects"
  ON public.geo_scores FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert geo_scores for their org projects"
  ON public.geo_scores FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "Users can update geo_scores for their org projects"
  ON public.geo_scores FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

-- conversion_goals: users can read/write if they belong to the project's org
CREATE POLICY "Users can view conversion_goals for their org projects"
  ON public.conversion_goals FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert conversion_goals for their org projects"
  ON public.conversion_goals FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversion_goals for their org projects"
  ON public.conversion_goals FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "Users can delete conversion_goals for their org projects"
  ON public.conversion_goals FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );
