-- ============================================================
-- RPC function for mobile project creation
-- Runs as SECURITY DEFINER to bypass RLS issues with
-- organizations INSERT from the client SDK.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_project_with_org(
  p_name TEXT,
  p_type TEXT,
  p_domain TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_app_store_id TEXT DEFAULT NULL,
  p_play_store_id TEXT DEFAULT NULL,
  p_target_countries TEXT[] DEFAULT '{US}',
  p_target_languages TEXT[] DEFAULT '{en}',
  p_search_engines TEXT[] DEFAULT '{google}'
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_project_id UUID;
  v_user_name TEXT;
  v_slug TEXT;
  v_trial_ends TIMESTAMPTZ;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user already has an organization
  SELECT organization_id INTO v_org_id
  FROM public.profiles
  WHERE id = v_user_id;

  -- Create organization if user doesn't have one
  IF v_org_id IS NULL THEN
    -- Get user name for org naming
    SELECT COALESCE(full_name, 'User') INTO v_user_name
    FROM public.profiles
    WHERE id = v_user_id;

    v_slug := lower(regexp_replace(v_user_name, '[^a-z0-9]+', '-', 'gi'));
    v_slug := trim(BOTH '-' FROM v_slug) || '-' || to_hex(extract(epoch FROM now())::INT);
    v_trial_ends := now() + INTERVAL '14 days';

    INSERT INTO public.organizations (name, slug, plan, subscription_status, trial_ends_at, max_projects, max_keywords, max_pages_crawl, max_users)
    VALUES (v_user_name || '''s Organization', v_slug, 'free', 'trialing', v_trial_ends, 1, 50, 100, 1)
    RETURNING id INTO v_org_id;

    -- Link profile to new organization
    UPDATE public.profiles
    SET organization_id = v_org_id, role = 'owner'
    WHERE id = v_user_id;
  END IF;

  -- Deactivate existing projects
  UPDATE public.projects
  SET is_active = false
  WHERE organization_id = v_org_id;

  -- Create the project
  INSERT INTO public.projects (organization_id, name, type, domain, url, app_store_id, play_store_id, target_countries, target_languages, search_engines, is_active)
  VALUES (v_org_id, p_name, p_type, p_domain, p_url, p_app_store_id, p_play_store_id, p_target_countries, p_target_languages, p_search_engines, true)
  RETURNING id INTO v_project_id;

  RETURN json_build_object(
    'id', v_project_id,
    'organization_id', v_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
