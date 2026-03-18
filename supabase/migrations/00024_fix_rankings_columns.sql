-- Add missing columns to app_store_rankings that were defined in migration 00012
-- but never applied to the actual database
ALTER TABLE public.app_store_rankings
  ADD COLUMN IF NOT EXISTS difficulty INT,
  ADD COLUMN IF NOT EXISTS search_volume INT;
