-- ============================================================
-- FIX: Enable RLS on tables missing it
-- Resolves Supabase security alert (April 2026)
-- Tables: platform_api_configs, api_call_log, pricing_plans
-- ============================================================

-- ============================================================
-- 1. platform_api_configs — CRITICAL
-- Contains API keys/secrets. NO user-facing policies.
-- Only service_role (server actions) bypasses RLS.
-- ============================================================
ALTER TABLE public.platform_api_configs ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies = invisible to all
-- authenticated users. Only service_role key bypasses RLS.

-- ============================================================
-- 2. api_call_log — HIGH
-- Users can view logs for their own projects.
-- Admins can view all logs in their org.
-- Service role can insert (from server actions).
-- ============================================================
ALTER TABLE public.api_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view API call logs for their projects"
  ON public.api_call_log FOR SELECT
  USING (
    project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = api_call_log.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Users can view their own API call logs"
  ON public.api_call_log FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- 3. pricing_plans — MEDIUM
-- Public read (marketing pages, signup flow).
-- Write restricted to service_role only (no user policy).
-- ============================================================
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing plans"
  ON public.pricing_plans FOR SELECT
  USING (true);
