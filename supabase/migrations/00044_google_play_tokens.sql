-- Google Play Developer API OAuth tokens
-- Follows same pattern as ga4_oauth_tokens and gsc_tokens

CREATE TABLE IF NOT EXISTS google_play_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  google_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One token per user per project
CREATE UNIQUE INDEX IF NOT EXISTS google_play_tokens_user_project
  ON google_play_tokens(user_id, project_id);

-- RLS
ALTER TABLE google_play_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Google Play tokens"
  ON google_play_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add google_play_package_name to projects table for selected app
ALTER TABLE projects ADD COLUMN IF NOT EXISTS google_play_package_name TEXT;
