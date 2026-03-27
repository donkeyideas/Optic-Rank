-- ============================================================
-- Indexing Submissions — track Google Indexing API requests
-- ============================================================

CREATE TABLE IF NOT EXISTS public.indexing_submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url            TEXT NOT NULL,
  action         TEXT NOT NULL DEFAULT 'URL_UPDATED', -- URL_UPDATED or URL_DELETED
  status         TEXT NOT NULL DEFAULT 'pending',     -- pending, submitted, error
  error_message  TEXT,
  notify_time    TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by   UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_indexing_submissions_project
  ON public.indexing_submissions (project_id, submitted_at DESC);

-- Enable RLS
ALTER TABLE public.indexing_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view indexing submissions for their org's projects
CREATE POLICY "Users can view indexing submissions for their org projects"
  ON public.indexing_submissions
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE pr.id = auth.uid()
    )
  );

-- Allow inserts/updates via service role
CREATE POLICY "Service role can manage indexing submissions"
  ON public.indexing_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);
