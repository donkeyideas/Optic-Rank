-- Pricing plans table — admin-editable plan definitions
-- Replaces hardcoded PLAN_LIMITS in client.ts and pricing/page.tsx
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key        TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  price_monthly   INT NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  max_projects    INT NOT NULL DEFAULT 1,
  max_keywords    INT NOT NULL DEFAULT 50,
  max_pages_crawl INT NOT NULL DEFAULT 100,
  max_users       INT NOT NULL DEFAULT 1,
  features        JSONB DEFAULT '[]',
  comparison      JSONB DEFAULT '{}',
  display_order   INT DEFAULT 0,
  is_highlighted  BOOLEAN DEFAULT false,
  highlight_label TEXT,
  cta_text        TEXT DEFAULT 'Start Free Trial',
  cta_href        TEXT DEFAULT '/signup',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with current plan data
INSERT INTO public.pricing_plans (plan_key, name, description, price_monthly, max_projects, max_keywords, max_pages_crawl, max_users, features, comparison, display_order, is_highlighted, highlight_label, cta_text, cta_href) VALUES
(
  'free', 'Free',
  'Get started with basic SEO tracking. Perfect for personal projects and small blogs.',
  0, 1, 50, 100, 1,
  '["1 project", "50 keyword tracking", "Weekly rank updates", "Basic site audit (100 pages)", "Community support"]',
  '{"Projects": "1", "Keyword Tracking": "50", "Rank Update Frequency": "Weekly", "Site Audit Pages": "100", "Backlink Monitoring": false, "Backlink Outreach Tools": false, "Competitor Tracking": false, "AI-Powered Insights": false, "Predictive SEO": false, "Content Analysis": false, "App Store Optimization": false, "AI Visibility Tracking": false, "API Access": false, "Custom Reports": false, "Email Reports": false, "Support": "Community"}',
  0, false, NULL, 'Get Started Free', '/signup'
),
(
  'starter', 'Starter',
  'Essential SEO tools for freelancers and growing sites that need daily intelligence.',
  29, 3, 500, 5000, 3,
  '["3 projects", "500 keyword tracking", "Daily rank updates", "Full site audit (5,000 pages)", "Backlink monitoring", "Competitor tracking (3)", "Email reports", "Email support"]',
  '{"Projects": "3", "Keyword Tracking": "500", "Rank Update Frequency": "Daily", "Site Audit Pages": "5,000", "Backlink Monitoring": true, "Backlink Outreach Tools": false, "Competitor Tracking": "3", "AI-Powered Insights": false, "Predictive SEO": false, "Content Analysis": false, "App Store Optimization": false, "AI Visibility Tracking": false, "API Access": false, "Custom Reports": false, "Email Reports": true, "Support": "Email"}',
  1, false, NULL, 'Start Free Trial', '/signup?plan=starter'
),
(
  'pro', 'Pro',
  'Advanced intelligence for agencies and serious SEO professionals who demand more.',
  79, 10, 5000, 50000, 10,
  '["10 projects", "5,000 keyword tracking", "Real-time rank updates", "Full site audit (50,000 pages)", "Backlink analysis + outreach", "Competitor tracking (10)", "AI-powered insights", "Content analysis", "API access", "Priority support"]',
  '{"Projects": "10", "Keyword Tracking": "5,000", "Rank Update Frequency": "Real-time", "Site Audit Pages": "50,000", "Backlink Monitoring": true, "Backlink Outreach Tools": true, "Competitor Tracking": "10", "AI-Powered Insights": true, "Predictive SEO": false, "Content Analysis": true, "App Store Optimization": false, "AI Visibility Tracking": false, "API Access": true, "Custom Reports": false, "Email Reports": true, "Support": "Priority"}',
  2, true, 'Most Popular', 'Start Free Trial', '/signup?plan=pro'
),
(
  'business', 'Business',
  'Full-scale SEO command center for teams and enterprises with complex needs.',
  199, 100, 25000, 500000, 50,
  '["Unlimited projects", "25,000 keyword tracking", "Real-time rank updates", "Full site audit (unlimited pages)", "Backlink analysis + outreach", "Competitor tracking (25)", "AI-powered insights + predictions", "Content & ASO analysis", "Full API access", "AI visibility tracking", "Custom reports", "Dedicated account manager"]',
  '{"Projects": "Unlimited", "Keyword Tracking": "25,000", "Rank Update Frequency": "Real-time", "Site Audit Pages": "Unlimited", "Backlink Monitoring": true, "Backlink Outreach Tools": true, "Competitor Tracking": "25", "AI-Powered Insights": true, "Predictive SEO": true, "Content Analysis": true, "App Store Optimization": true, "AI Visibility Tracking": true, "API Access": true, "Custom Reports": true, "Email Reports": true, "Support": "Dedicated AM"}',
  3, false, NULL, 'Start Free Trial', '/signup?plan=business'
),
(
  'enterprise', 'Enterprise',
  'Custom solutions for organizations with advanced security, compliance, or scale requirements.',
  0, 1000, 100000, 1000000, 200,
  '["Custom keyword limits", "SSO & SAML", "Dedicated infrastructure", "99.99% uptime SLA", "Custom integrations", "Onboarding & training"]',
  '{}',
  4, false, NULL, 'Contact Sales', '/contact'
)
ON CONFLICT (plan_key) DO NOTHING;
