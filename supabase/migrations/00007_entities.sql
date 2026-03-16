-- ============================================================
-- Phase 4: Entity SEO & Knowledge Graph
-- ============================================================

-- Entities extracted from content and keywords
CREATE TABLE IF NOT EXISTS public.entities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  entity_type         TEXT NOT NULL
                        CHECK (entity_type IN (
                          'person','organization','product','place','concept',
                          'technology','event','brand','other'
                        )),
  description         TEXT,
  relevance_score     DECIMAL(5,2),
  source              TEXT DEFAULT 'ai_extraction'
                        CHECK (source IN ('ai_extraction','manual','knowledge_graph','serp')),
  wikipedia_url       TEXT,
  knowledge_panel_data JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name, entity_type)
);

CREATE INDEX IF NOT EXISTS idx_entities_project ON public.entities(project_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON public.entities(project_id, entity_type);

-- Entity mentions in content pages
CREATE TABLE IF NOT EXISTS public.entity_mentions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id         UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  content_page_id   UUID NOT NULL REFERENCES public.content_pages(id) ON DELETE CASCADE,
  mention_count     INT NOT NULL DEFAULT 1,
  context_snippet   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, content_page_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON public.entity_mentions(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_page ON public.entity_mentions(content_page_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_mentions ENABLE ROW LEVEL SECURITY;

-- Entities: org-scoped via project
DROP POLICY IF EXISTS "Users can view entities for their org projects" ON public.entities;
DROP POLICY IF EXISTS "Users can insert entities for their org projects" ON public.entities;
DROP POLICY IF EXISTS "Users can update entities for their org projects" ON public.entities;
DROP POLICY IF EXISTS "Users can delete entities for their org projects" ON public.entities;
DROP POLICY IF EXISTS "Users can view entity mentions for their org" ON public.entity_mentions;
DROP POLICY IF EXISTS "Users can insert entity mentions for their org" ON public.entity_mentions;
DROP POLICY IF EXISTS "Users can delete entity mentions for their org" ON public.entity_mentions;

CREATE POLICY "Users can view entities for their org projects"
  ON public.entities FOR SELECT
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can insert entities for their org projects"
  ON public.entities FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can update entities for their org projects"
  ON public.entities FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can delete entities for their org projects"
  ON public.entities FOR DELETE
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.organization_id = public.get_user_org_id()
    )
  );

-- Entity mentions: org-scoped via entity -> project
CREATE POLICY "Users can view entity mentions for their org"
  ON public.entity_mentions FOR SELECT
  USING (
    entity_id IN (
      SELECT e.id FROM public.entities e
      WHERE e.project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.organization_id = public.get_user_org_id()
      )
    )
  );

CREATE POLICY "Users can insert entity mentions for their org"
  ON public.entity_mentions FOR INSERT
  WITH CHECK (
    entity_id IN (
      SELECT e.id FROM public.entities e
      WHERE e.project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.organization_id = public.get_user_org_id()
      )
    )
  );

CREATE POLICY "Users can delete entity mentions for their org"
  ON public.entity_mentions FOR DELETE
  USING (
    entity_id IN (
      SELECT e.id FROM public.entities e
      WHERE e.project_id IN (
        SELECT p.id FROM public.projects p
        WHERE p.organization_id = public.get_user_org_id()
      )
    )
  );
