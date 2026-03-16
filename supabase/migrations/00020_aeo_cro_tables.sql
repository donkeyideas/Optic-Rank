-- ============================================================
-- Migration 00020: AEO Tracking + CRO A/B Tests
-- ============================================================

-- ── aeo_tracking ──────────────────────────────────────────────
-- Tracks AI/Answer Engine mentions of your site across LLMs
CREATE TABLE IF NOT EXISTS public.aeo_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  ai_engine TEXT NOT NULL CHECK (ai_engine IN ('chatgpt','perplexity','gemini','claude','google_ai_overview')),
  mention_type TEXT NOT NULL DEFAULT 'mention' CHECK (mention_type IN ('mention','featured_snippet','knowledge_panel','people_also_ask','direct_answer')),
  url_cited TEXT,
  position INT,
  snippet_text TEXT,
  confidence DECIMAL(5,4) DEFAULT 0,
  tracked_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aeo_tracking_project ON public.aeo_tracking(project_id);
CREATE INDEX idx_aeo_tracking_engine ON public.aeo_tracking(ai_engine, tracked_date DESC);
CREATE INDEX idx_aeo_tracking_date ON public.aeo_tracking(tracked_date DESC);

-- ── cro_ab_tests ──────────────────────────────────────────────
-- A/B test tracking for conversion rate optimization
CREATE TABLE IF NOT EXISTS public.cro_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  page_url TEXT NOT NULL,
  variant_a_name TEXT NOT NULL DEFAULT 'Control',
  variant_a_conversions INT NOT NULL DEFAULT 0,
  variant_a_visitors INT NOT NULL DEFAULT 0,
  variant_b_name TEXT NOT NULL DEFAULT 'Variant B',
  variant_b_conversions INT NOT NULL DEFAULT 0,
  variant_b_visitors INT NOT NULL DEFAULT 0,
  metric_name TEXT NOT NULL DEFAULT 'Conversion Rate',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','paused')),
  winner TEXT CHECK (winner IN ('a','b','none')),
  statistical_significance DECIMAL(5,2) DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cro_ab_tests_project ON public.cro_ab_tests(project_id);
CREATE INDEX idx_cro_ab_tests_status ON public.cro_ab_tests(status);

-- ── RLS Policies ──────────────────────────────────────────────
ALTER TABLE public.aeo_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cro_ab_tests ENABLE ROW LEVEL SECURITY;

-- aeo_tracking: org-scoped via project
CREATE POLICY "aeo_tracking_select" ON public.aeo_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = aeo_tracking.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "aeo_tracking_insert" ON public.aeo_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = aeo_tracking.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "aeo_tracking_update" ON public.aeo_tracking
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = aeo_tracking.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "aeo_tracking_delete" ON public.aeo_tracking
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = aeo_tracking.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

-- cro_ab_tests: org-scoped via project
CREATE POLICY "cro_ab_tests_select" ON public.cro_ab_tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = cro_ab_tests.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "cro_ab_tests_insert" ON public.cro_ab_tests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = cro_ab_tests.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "cro_ab_tests_update" ON public.cro_ab_tests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = cro_ab_tests.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "cro_ab_tests_delete" ON public.cro_ab_tests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = cro_ab_tests.project_id
      AND p.organization_id = public.get_user_org_id()
    )
  );
