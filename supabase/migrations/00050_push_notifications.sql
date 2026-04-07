-- ============================================================
-- PUSH TOKENS — stores FCM tokens and Web Push subscriptions
-- ============================================================
CREATE TABLE public.push_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  device_type  TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_user ON public.push_tokens(user_id);

-- RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
  ON public.push_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push tokens"
  ON public.push_tokens FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access push_tokens"
  ON public.push_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- PUSH NOTIFICATION LOG — tracks every push sent
-- ============================================================
CREATE TABLE public.push_notification_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  message         TEXT,
  type            TEXT NOT NULL DEFAULT 'system',
  action_url      TEXT,
  target          TEXT NOT NULL DEFAULT 'all',
  tokens_targeted INT NOT NULL DEFAULT 0,
  tokens_success  INT NOT NULL DEFAULT 0,
  tokens_failed   INT NOT NULL DEFAULT 0,
  errors          JSONB,
  sent_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_log_created ON public.push_notification_log(created_at DESC);
CREATE INDEX idx_push_log_user    ON public.push_notification_log(user_id, is_read);
CREATE INDEX idx_push_log_type    ON public.push_notification_log(type);

-- RLS
ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access push_notification_log"
  ON public.push_notification_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view own push notifications"
  ON public.push_notification_log FOR SELECT
  USING (user_id = auth.uid());
