-- ============================================================
-- Patch: Add 'linkedin' to social_profiles platform constraint
-- This fixes the check constraint for databases that were
-- created before linkedin was added to the platform list.
-- ============================================================

-- Drop old constraint and re-create with linkedin included
ALTER TABLE public.social_profiles
  DROP CONSTRAINT IF EXISTS social_profiles_platform_check;

ALTER TABLE public.social_profiles
  ADD CONSTRAINT social_profiles_platform_check
  CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin'));
