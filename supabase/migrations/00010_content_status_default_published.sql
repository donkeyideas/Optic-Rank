-- Change content_pages default status from 'draft' to 'published'
ALTER TABLE public.content_pages
  ALTER COLUMN status SET DEFAULT 'published';

-- Update existing draft pages to published (user doesn't want draft as default)
UPDATE public.content_pages
  SET status = 'published'
  WHERE status = 'draft';

-- Update CHECK constraint to include needs_update (underscore, matching code)
ALTER TABLE public.content_pages
  DROP CONSTRAINT IF EXISTS content_pages_status_check;

ALTER TABLE public.content_pages
  ADD CONSTRAINT content_pages_status_check
  CHECK (status IN ('draft', 'published', 'archived', 'needs_update'));
