-- ============================================================
-- Migration 00061: Page Optimizations History
-- Tracks before/after SEO optimization snapshots for pages
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_optimizations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page_url          TEXT NOT NULL,
  score_before      INT NOT NULL DEFAULT 0,
  score_after       INT NOT NULL DEFAULT 0,
  original_title    TEXT,
  original_meta     TEXT,
  original_h1       TEXT,
  optimized_title   TEXT,
  optimized_meta    TEXT,
  optimized_h1      TEXT,
  optimization_goal TEXT NOT NULL DEFAULT 'balanced',
  content_brief     TEXT,
  recommendations   JSONB DEFAULT '[]',
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_optimizations_project
  ON public.page_optimizations(project_id, page_url, created_at DESC);

-- RLS
ALTER TABLE public.page_optimizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org page optimizations"
  ON public.page_optimizations FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own org page optimizations"
  ON public.page_optimizations FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );
