-- Add missing 'status' column to content_pages table
ALTER TABLE public.content_pages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'archived', 'needs_update'));
