-- ============================================================
-- Migration 00022: Fix audit_issues category CHECK constraint
-- ============================================================
-- The original CHECK only allows: seo, performance, accessibility, content, security
-- But AEO/GEO signal entries use: aeo-signal, geo-signal
-- This caused ALL audit_issues batch inserts to silently fail,
-- breaking AEO and GEO dashboard tabs.

-- Drop the old constraint and add an updated one
ALTER TABLE public.audit_issues
  DROP CONSTRAINT IF EXISTS audit_issues_category_check;

ALTER TABLE public.audit_issues
  ADD CONSTRAINT audit_issues_category_check
  CHECK (category IN (
    'seo',
    'performance',
    'accessibility',
    'content',
    'security',
    'aeo-signal',
    'geo-signal'
  ));
