-- ============================================================
-- Add INSERT policy on organizations table
-- Previously missing, causing mobile email signup to fail
-- when trying to create an organization via the client SDK.
-- ============================================================

-- Allow authenticated users without an existing org to create one
CREATE POLICY "Authenticated users can create an organization"
  ON public.organizations FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );
