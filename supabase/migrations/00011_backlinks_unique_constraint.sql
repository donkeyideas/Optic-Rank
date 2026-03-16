-- Add unique constraint on backlinks for upsert support
-- Prevents duplicate backlink entries for the same source->target pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_backlinks_unique_link
  ON public.backlinks(project_id, source_url, target_url);
