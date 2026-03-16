-- ============================================================
-- Phase 4: AI Intelligence Briefs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_briefs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL,
  sections        JSONB NOT NULL,
  brief_type      TEXT NOT NULL DEFAULT 'on_demand'
                    CHECK (brief_type IN ('daily','weekly','monthly','on_demand')),
  data_snapshot   JSONB,
  generated_by    TEXT DEFAULT 'deepseek',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_briefs_project ON public.ai_briefs(project_id, created_at DESC);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view briefs for their org projects" ON public.ai_briefs;
DROP POLICY IF EXISTS "Users can insert briefs for their org projects" ON public.ai_briefs;
DROP POLICY IF EXISTS "Users can delete briefs for their org projects" ON public.ai_briefs;

CREATE POLICY "Users can view briefs for their org projects"
  ON public.ai_briefs FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can insert briefs for their org projects"
  ON public.ai_briefs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can delete briefs for their org projects"
  ON public.ai_briefs FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id = public.get_user_org_id()
    )
  );
