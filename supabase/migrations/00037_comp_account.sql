-- ============================================================
-- Complimentary account flag — admin-granted unlimited free plan
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS comp_account BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.comp_account IS
  'When true the user gets unlimited plan access with no billing. Toggled by admins only.';
