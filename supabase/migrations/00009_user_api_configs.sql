-- ============================================================
-- User API Key Configuration
-- Allows users to add their own AI provider API keys
-- that override the system default (DeepSeek).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_api_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL
                CHECK (provider IN ('openai','anthropic','gemini','deepseek','perplexity')),
  api_key     TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_api_configs_user ON public.user_api_configs(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.user_api_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own API keys" ON public.user_api_configs;
DROP POLICY IF EXISTS "Users can insert their own API keys" ON public.user_api_configs;
DROP POLICY IF EXISTS "Users can update their own API keys" ON public.user_api_configs;
DROP POLICY IF EXISTS "Users can delete their own API keys" ON public.user_api_configs;

CREATE POLICY "Users can view their own API keys"
  ON public.user_api_configs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own API keys"
  ON public.user_api_configs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own API keys"
  ON public.user_api_configs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own API keys"
  ON public.user_api_configs FOR DELETE
  USING (user_id = auth.uid());
