-- ─── Social Goals Table ───────────────────────────────────────────────────
-- Stores user-defined goals/objectives per social profile.
-- Goals influence all AI analyses and content generation.

CREATE TABLE IF NOT EXISTS public.social_goals (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_profile_id       UUID NOT NULL REFERENCES public.social_profiles(id) ON DELETE CASCADE,
  primary_objective       TEXT NOT NULL DEFAULT 'grow_followers',
  target_metric           TEXT,
  target_value            NUMERIC,
  target_days             INT,
  content_niche           TEXT,
  monetization_goal       TEXT,
  posting_commitment      TEXT,
  target_audience         TEXT,
  competitive_aspiration  TEXT,
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(social_profile_id)
);

-- RLS
ALTER TABLE public.social_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "social_goals_select" ON public.social_goals
  FOR SELECT USING (true);

CREATE POLICY "social_goals_insert" ON public.social_goals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "social_goals_update" ON public.social_goals
  FOR UPDATE USING (true);

CREATE POLICY "social_goals_delete" ON public.social_goals
  FOR DELETE USING (true);
