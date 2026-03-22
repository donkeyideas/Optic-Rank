-- ============================================================
-- Migration 00032: Smart Recommendations
-- ============================================================

CREATE TABLE public.recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  category          TEXT NOT NULL
                      CHECK (category IN (
                        'quick_wins','content','technical','backlinks',
                        'ai_visibility','revenue','competitive','performance'
                      )),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  expected_result   TEXT,
  impact            TEXT NOT NULL DEFAULT 'medium'
                      CHECK (impact IN ('high','medium','low')),
  effort            TEXT NOT NULL DEFAULT 'medium'
                      CHECK (effort IN ('high','medium','low')),
  priority_score    INT NOT NULL DEFAULT 50,
  data_sources      TEXT[] NOT NULL DEFAULT '{}',
  linked_page       TEXT,
  linked_label      TEXT,
  metadata          JSONB DEFAULT '{}',
  is_ai_enhanced    BOOLEAN NOT NULL DEFAULT FALSE,
  ai_provider       TEXT,
  is_dismissed      BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed      BOOLEAN NOT NULL DEFAULT FALSE,
  batch_id          UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_project ON public.recommendations(project_id, created_at DESC);
CREATE INDEX idx_recommendations_batch ON public.recommendations(batch_id);
CREATE INDEX idx_recommendations_category ON public.recommendations(project_id, category);

-- RLS
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project recommendations"
  ON public.recommendations FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "Service role full access recommendations"
  ON public.recommendations FOR ALL
  USING (true)
  WITH CHECK (true);
