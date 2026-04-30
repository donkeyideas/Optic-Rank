-- Keyword opportunities discovered by AI for website SEO
CREATE TABLE IF NOT EXISTS public.keyword_opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword         TEXT NOT NULL,
  estimated_volume TEXT NOT NULL DEFAULT 'medium',
  estimated_searches INT,
  competition     TEXT NOT NULL DEFAULT 'medium',
  opportunity_score INT NOT NULL DEFAULT 50,
  reason          TEXT,
  intent          TEXT DEFAULT 'informational',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, keyword)
);

-- RLS
ALTER TABLE public.keyword_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org keyword opportunities"
  ON public.keyword_opportunities FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );
