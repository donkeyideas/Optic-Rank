-- Social Media Posts & Admin Settings tables
-- Used by the Social Posts admin page for AI-generated social media management

-- ============================================================
-- Table: social_media_posts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.social_media_posts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      text        NOT NULL CHECK (platform IN ('TWITTER','LINKEDIN','FACEBOOK','INSTAGRAM','TIKTOK')),
  content       text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SCHEDULED','PUBLISHED','FAILED','CANCELLED')),
  hashtags      text[]      DEFAULT '{}',
  image_prompt  text,
  scheduled_at  timestamptz,
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_social_media_posts_status   ON public.social_media_posts (status);
CREATE INDEX idx_social_media_posts_platform ON public.social_media_posts (platform);

ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

-- Only service_role (admin client) can access
CREATE POLICY "Service role full access on social_media_posts"
  ON public.social_media_posts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Table: admin_settings (key-value store)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text  UNIQUE NOT NULL,
  value       text  NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on admin_settings"
  ON public.admin_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- Triggers: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create triggers if they don't exist (the function may already exist from earlier migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_social_media_posts_updated_at'
  ) THEN
    CREATE TRIGGER trg_social_media_posts_updated_at
      BEFORE UPDATE ON public.social_media_posts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_admin_settings_updated_at'
  ) THEN
    CREATE TRIGGER trg_admin_settings_updated_at
      BEFORE UPDATE ON public.admin_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;
