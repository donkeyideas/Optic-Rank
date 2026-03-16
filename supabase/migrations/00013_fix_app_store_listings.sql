-- Fix app_store_listings table: add missing columns from the original migration
-- The table was created in a previous session with a different schema;
-- migration 00012's CREATE TABLE IF NOT EXISTS skipped it.

-- Add all potentially missing columns
ALTER TABLE public.app_store_listings
  ADD COLUMN IF NOT EXISTS app_id TEXT,
  ADD COLUMN IF NOT EXISTS app_name TEXT,
  ADD COLUMN IF NOT EXISTS app_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS developer TEXT,
  ADD COLUMN IF NOT EXISTS icon_url TEXT,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads_estimate INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_version TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS keywords_field TEXT,
  ADD COLUMN IF NOT EXISTS subtitle TEXT,
  ADD COLUMN IF NOT EXISTS aso_score INT,
  ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT now();

-- Make app_id and app_name NOT NULL (set defaults first for any existing rows)
UPDATE public.app_store_listings SET app_id = 'unknown' WHERE app_id IS NULL;
UPDATE public.app_store_listings SET app_name = 'Unknown App' WHERE app_name IS NULL;

ALTER TABLE public.app_store_listings ALTER COLUMN app_id SET NOT NULL;
ALTER TABLE public.app_store_listings ALTER COLUMN app_name SET NOT NULL;

-- Add unique constraint if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_store_listings_unique
  ON public.app_store_listings(project_id, store, app_id);

-- Also fix app_store_reviews: add missing columns
ALTER TABLE public.app_store_reviews
  ADD COLUMN IF NOT EXISTS store TEXT,
  ADD COLUMN IF NOT EXISTS review_id TEXT,
  ADD COLUMN IF NOT EXISTS author TEXT,
  ADD COLUMN IF NOT EXISTS rating INT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS text TEXT,
  ADD COLUMN IF NOT EXISTS sentiment TEXT,
  ADD COLUMN IF NOT EXISTS topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_reply TEXT,
  ADD COLUMN IF NOT EXISTS reply_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_date TIMESTAMPTZ;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
