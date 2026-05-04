-- ============================================================
-- FIX: Enable RLS on remaining public content tables
-- Resolves Supabase security advisor alerts (May 2026)
-- Tables: posts, changelog_entries, roadmap_items,
--         job_listings, site_content, contact_submissions
-- ============================================================

-- ============================================================
-- 1. posts — PUBLIC READ (published only)
-- Blog posts & guides. Public can read published; drafts hidden.
-- Writes via service_role only (admin CMS).
-- ============================================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published posts"
  ON public.posts FOR SELECT
  USING (status = 'published');

-- ============================================================
-- 2. changelog_entries — PUBLIC READ
-- All changelog entries are public (no draft status).
-- Writes via service_role only.
-- ============================================================
ALTER TABLE public.changelog_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view changelog entries"
  ON public.changelog_entries FOR SELECT
  USING (true);

-- ============================================================
-- 3. roadmap_items — PUBLIC READ
-- Roadmap is public-facing. All items visible.
-- Writes via service_role only.
-- ============================================================
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roadmap items"
  ON public.roadmap_items FOR SELECT
  USING (true);

-- ============================================================
-- 4. job_listings — PUBLIC READ (active only)
-- Only show active job listings to the public.
-- Writes via service_role only.
-- ============================================================
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active job listings"
  ON public.job_listings FOR SELECT
  USING (is_active = true);

-- ============================================================
-- 5. site_content — PUBLIC READ
-- CMS content blocks (hero text, feature copy, etc.).
-- Writes via service_role only.
-- ============================================================
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site content"
  ON public.site_content FOR SELECT
  USING (true);

-- ============================================================
-- 6. contact_submissions — ENABLE RLS
-- Policies already exist from 00056_support_tickets.sql:
--   - "Authenticated users can create support tickets" (INSERT)
--   - "Users can view their own support tickets" (SELECT)
-- Just need to enable RLS so those policies are enforced.
-- ============================================================
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Add anonymous INSERT policy so unauthenticated visitors
-- can submit the contact form (public marketing page).
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  WITH CHECK (true);
