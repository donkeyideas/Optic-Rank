-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlink_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_visibility_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_store_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Get user's organization ID
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE POLICY "Members can view their organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_user_org_id());

CREATE POLICY "Owners can update their organization"
  ON public.organizations FOR UPDATE
  USING (
    id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- PROJECTS (org-scoped)
-- ============================================================
CREATE POLICY "Members can view projects in their org"
  ON public.projects FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Admins can update projects"
  ON public.projects FOR UPDATE
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners can delete projects"
  ON public.projects FOR DELETE
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================
-- KEYWORDS (via project -> org)
-- ============================================================
CREATE POLICY "Members can view keywords"
  ON public.keywords FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = keywords.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can manage keywords"
  ON public.keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = keywords.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- KEYWORD RANKS
-- ============================================================
CREATE POLICY "Members can view keyword ranks"
  ON public.keyword_ranks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.keywords k
      JOIN public.projects p ON p.id = k.project_id
      WHERE k.id = keyword_ranks.keyword_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- BACKLINKS (via project -> org)
-- ============================================================
CREATE POLICY "Members can view backlinks"
  ON public.backlinks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = backlinks.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- SITE AUDITS (via project -> org)
-- ============================================================
CREATE POLICY "Members can view audits"
  ON public.site_audits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = site_audits.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- AUDIT PAGES & ISSUES
-- ============================================================
CREATE POLICY "Members can view audit pages"
  ON public.audit_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.site_audits sa
      JOIN public.projects p ON p.id = sa.project_id
      WHERE sa.id = audit_pages.audit_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view audit issues"
  ON public.audit_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.site_audits sa
      JOIN public.projects p ON p.id = sa.project_id
      WHERE sa.id = audit_issues.audit_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- COMPETITORS (via project -> org)
-- ============================================================
CREATE POLICY "Members can view competitors"
  ON public.competitors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = competitors.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can manage competitors"
  ON public.competitors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = competitors.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- AI INSIGHTS (via project -> org)
-- ============================================================
CREATE POLICY "Members can view insights"
  ON public.ai_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = ai_insights.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can update insights (mark read)"
  ON public.ai_insights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = ai_insights.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- NOTIFICATIONS (user-scoped)
-- ============================================================
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================
-- CONTENT PAGES & BRIEFS (via project -> org)
-- ============================================================
CREATE POLICY "Members can view content pages"
  ON public.content_pages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = content_pages.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view content briefs"
  ON public.content_briefs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = content_briefs.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- APP STORE (via project -> org)
-- ============================================================
CREATE POLICY "Members can view app listings"
  ON public.app_store_listings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = app_store_listings.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view app rankings"
  ON public.app_store_rankings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_store_listings al
      JOIN public.projects p ON p.id = al.project_id
      WHERE al.id = app_store_rankings.listing_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view app reviews"
  ON public.app_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.app_store_listings al
      JOIN public.projects p ON p.id = al.project_id
      WHERE al.id = app_reviews.listing_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- BILLING & USAGE (org-scoped, admin only for write)
-- ============================================================
CREATE POLICY "Admins can view billing events"
  ON public.billing_events FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members can view usage"
  ON public.usage_tracking FOR SELECT
  USING (organization_id = public.get_user_org_id());

-- ============================================================
-- INVITES (org-scoped)
-- ============================================================
CREATE POLICY "Members can view invites"
  ON public.organization_invites FOR SELECT
  USING (organization_id = public.get_user_org_id());

CREATE POLICY "Admins can manage invites"
  ON public.organization_invites FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- AUDIT LOG (org-scoped, read-only for admins)
-- ============================================================
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- API KEYS (org-scoped)
-- ============================================================
CREATE POLICY "Admins can manage API keys"
  ON public.api_keys FOR ALL
  USING (
    organization_id = public.get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- SCHEDULED REPORTS (via project -> org)
-- ============================================================
CREATE POLICY "Members can view scheduled reports"
  ON public.scheduled_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = scheduled_reports.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

-- ============================================================
-- REMAINING TABLES (via project/keyword -> org)
-- ============================================================
CREATE POLICY "Members can view keyword clusters"
  ON public.keyword_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = keyword_clusters.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view backlink snapshots"
  ON public.backlink_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = backlink_snapshots.project_id
      AND organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view competitor snapshots"
  ON public.competitor_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.competitors c
      JOIN public.projects p ON p.id = c.project_id
      WHERE c.id = competitor_snapshots.competitor_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view AI visibility checks"
  ON public.ai_visibility_checks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.keywords k
      JOIN public.projects p ON p.id = k.project_id
      WHERE k.id = ai_visibility_checks.keyword_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Members can view rank predictions"
  ON public.rank_predictions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.keywords k
      JOIN public.projects p ON p.id = k.project_id
      WHERE k.id = rank_predictions.keyword_id
      AND p.organization_id = public.get_user_org_id()
    )
  );

-- Job queue: service role only (no user access)
-- No user-facing policies needed for job_queue
