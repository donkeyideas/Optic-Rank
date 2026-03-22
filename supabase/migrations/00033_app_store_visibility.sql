-- ============================================================
-- Migration 00033: App Store Organic Visibility
-- Adds visibility_score to snapshots (history) and listings (cached current)
-- ============================================================

ALTER TABLE public.app_store_snapshots
  ADD COLUMN IF NOT EXISTS visibility_score INT;

ALTER TABLE public.app_store_listings
  ADD COLUMN IF NOT EXISTS visibility_score INT;
