-- ============================================================
-- Migration 00063: Durable signup rate limiting
-- The in-memory limiter doesn't work on Vercel serverless (each
-- instance has its own memory). This table lets us count signup
-- attempts per IP / per email across ALL instances.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip               TEXT,
  normalized_email TEXT,
  email_domain     TEXT,
  outcome          TEXT NOT NULL DEFAULT 'attempt'
                     CHECK (outcome IN ('attempt','blocked','created')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast windowed lookups by IP and by email.
CREATE INDEX IF NOT EXISTS signup_attempts_ip_time_idx
  ON public.signup_attempts (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS signup_attempts_email_time_idx
  ON public.signup_attempts (normalized_email, created_at DESC);

-- Not user-facing data; lock it down (service role bypasses RLS).
ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;
