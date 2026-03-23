-- ============================================================
-- Google Search Console OAuth tokens — per-user/project
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gsc_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  gsc_property_url TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One token per user per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_gsc_tokens_user_project
  ON public.gsc_tokens (user_id, project_id);

-- Enable RLS
ALTER TABLE public.gsc_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can manage their own GSC tokens"
  ON public.gsc_tokens FOR ALL
  USING (user_id = auth.uid());
