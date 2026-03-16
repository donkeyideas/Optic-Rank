-- Migration 00014: Add missing columns to competitors table
-- The client code reads authority_score, organic_traffic, keywords_count
-- directly from the competitors table, but they only exist on competitor_snapshots.

ALTER TABLE public.competitors
  ADD COLUMN IF NOT EXISTS authority_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS organic_traffic BIGINT,
  ADD COLUMN IF NOT EXISTS keywords_count INT,
  ADD COLUMN IF NOT EXISTS backlinks_count BIGINT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
