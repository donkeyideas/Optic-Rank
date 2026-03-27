-- ============================================================
-- CrUX Field Data — real-user metrics from PageSpeed API
-- Added as columns on audit_pages for Lab vs Field comparison
-- ============================================================

-- Page-level CrUX field data (p75 values)
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS field_lcp_ms NUMERIC(10,2);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS field_cls NUMERIC(8,4);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS field_inp_ms NUMERIC(10,2);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS field_fcp_ms NUMERIC(10,2);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS field_ttfb_ms NUMERIC(10,2);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS field_category TEXT; -- FAST, AVERAGE, SLOW

-- Origin-level CrUX data (site-wide aggregate)
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS origin_lcp_ms NUMERIC(10,2);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS origin_cls NUMERIC(8,4);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS origin_inp_ms NUMERIC(10,2);
ALTER TABLE public.audit_pages ADD COLUMN IF NOT EXISTS origin_category TEXT;
