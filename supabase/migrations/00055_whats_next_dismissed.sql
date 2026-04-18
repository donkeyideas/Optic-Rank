-- ============================================================
-- Add whats_next_dismissed to profiles
-- Controls visibility of the "What's Next" guidance card
-- shown after onboarding completes
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whats_next_dismissed BOOLEAN DEFAULT false;
