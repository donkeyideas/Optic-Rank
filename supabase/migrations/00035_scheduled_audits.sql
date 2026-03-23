-- ============================================================
-- Scheduled site audits — run audits on a recurring schedule
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduled_audits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  frequency       TEXT NOT NULL DEFAULT 'weekly'
                    CHECK (frequency IN ('daily','weekly','biweekly','monthly')),
  next_run_at     TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active schedule per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_audits_project
  ON public.scheduled_audits (project_id) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.scheduled_audits ENABLE ROW LEVEL SECURITY;

-- Users can view/manage schedules for their own projects
CREATE POLICY "Users can manage their project audit schedules"
  ON public.scheduled_audits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.profiles pr ON pr.organization_id = p.organization_id
      WHERE p.id = scheduled_audits.project_id
        AND pr.id = auth.uid()
    )
  );
