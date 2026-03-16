-- ============================================================
-- Fix: Add INSERT policies needed for the signup flow
-- ============================================================

-- Allow authenticated users to create organizations (needed during signup)
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow the profile trigger to insert profiles for new users
-- (The handle_new_user trigger runs as SECURITY DEFINER, but just in case)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Allow authenticated users to delete their own organizations (for cleanup)
CREATE POLICY "Owners can delete their organization"
  ON public.organizations FOR DELETE
  USING (
    id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
