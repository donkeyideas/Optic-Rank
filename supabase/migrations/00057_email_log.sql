-- Email delivery tracking log
CREATE TABLE IF NOT EXISTS public.email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write (no user-facing policies)
CREATE INDEX IF NOT EXISTS idx_email_log_user ON public.email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_resend ON public.email_log(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON public.email_log(sent_at DESC);
