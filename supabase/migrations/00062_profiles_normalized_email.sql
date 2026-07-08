-- ============================================================
-- Migration 00062: Normalized email for signup anti-spam
-- Adds a canonical email column to profiles so we can dedupe
-- Gmail dot/alias abuse (j.o.y+x@gmail.com == joy@gmail.com).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS normalized_email TEXT;

-- Canonicalize an email the same way lib/auth/anti-spam.ts does:
--   * lowercase + trim
--   * googlemail.com -> gmail.com
--   * strip +tag sub-addressing (all providers)
--   * strip dots in the local part for gmail/googlemail
CREATE OR REPLACE FUNCTION public.normalize_email(raw TEXT)
RETURNS TEXT AS $$
DECLARE
  e      TEXT := lower(btrim(raw));
  local  TEXT;
  domain TEXT;
BEGIN
  IF e IS NULL OR position('@' IN e) = 0 THEN
    RETURN NULL;
  END IF;

  local  := split_part(e, '@', 1);
  domain := split_part(e, '@', 2);

  IF local = '' OR domain = '' OR position('.' IN domain) = 0 THEN
    RETURN NULL;
  END IF;

  -- Domain aliases
  IF domain = 'googlemail.com' THEN
    domain := 'gmail.com';
  END IF;

  -- Strip +tag
  IF position('+' IN local) > 0 THEN
    local := split_part(local, '+', 1);
  END IF;

  -- Strip dots for dot-insensitive providers
  IF domain IN ('gmail.com') THEN
    local := replace(local, '.', '');
  END IF;

  IF local = '' THEN
    RETURN NULL;
  END IF;

  RETURN local || '@' || domain;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing profiles from their auth.users email.
UPDATE public.profiles p
SET normalized_email = public.normalize_email(u.email)
FROM auth.users u
WHERE u.id = p.id
  AND p.normalized_email IS DISTINCT FROM public.normalize_email(u.email);

-- Enforce uniqueness on the canonical form going forward.
-- Partial index so legacy rows with a NULL normalized_email don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_normalized_email_key
  ON public.profiles (normalized_email)
  WHERE normalized_email IS NOT NULL;
