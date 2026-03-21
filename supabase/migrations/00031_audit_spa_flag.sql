-- Add is_spa flag to site_audits so the UI can warn about JS-rendered site false positives
ALTER TABLE public.site_audits
  ADD COLUMN IF NOT EXISTS is_spa BOOLEAN NOT NULL DEFAULT FALSE;
