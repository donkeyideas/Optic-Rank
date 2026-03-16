-- 00021_content_pages.sql
-- Tables for blog, guides, changelog, roadmap, careers, and contact submissions

-- Posts (blog + guides, distinguished by type)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'blog',
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  author_name TEXT,
  author_avatar TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  tags JSONB DEFAULT '[]',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_type_status ON posts(type, status);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

-- Changelog entries
CREATE TABLE IF NOT EXISTS changelog_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  version TEXT,
  type TEXT DEFAULT 'improvement',
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Roadmap items
CREATE TABLE IF NOT EXISTS roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned',
  quarter TEXT,
  category TEXT DEFAULT 'feature',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Job listings
CREATE TABLE IF NOT EXISTS job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT DEFAULT 'Remote',
  type TEXT DEFAULT 'full-time',
  description TEXT NOT NULL DEFAULT '',
  requirements JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed data: Blog posts
INSERT INTO posts (type, title, slug, excerpt, content, author_name, status, tags, published_at) VALUES
('blog', 'Introducing Optic Rank: AI-Powered SEO Intelligence', 'introducing-optic-rank', 'Meet the next generation of SEO tools — combining traditional ranking data with AI visibility tracking across ChatGPT, Perplexity, and Gemini.', E'## The Future of Search is Here\n\nSearch is no longer just about Google. With the rise of AI-powered search engines like ChatGPT, Perplexity, and Gemini, brands need a new approach to visibility.\n\nOptic Rank was built from the ground up to track your presence across **every surface** where people find information.\n\n### What Makes Optic Rank Different?\n\n- **SEO + AEO + GEO + CRO** — We track all four pillars of modern search visibility\n- **AI Citation Tracking** — Know when AI models mention your brand\n- **Real-time Monitoring** — Instant alerts when rankings change\n- **Actionable Insights** — Not just data, but recommendations you can act on\n\n### Get Started Today\n\nSign up for free and start tracking your search presence in minutes.', 'Optic Rank Team', 'published', '["announcement", "product"]', now() - interval '3 days'),
('blog', 'Understanding AEO: Answer Engine Optimization in 2026', 'understanding-aeo-2026', 'Answer Engine Optimization is the new frontier. Learn how to ensure your content appears in AI-generated answers.', E'## What is AEO?\n\nAnswer Engine Optimization (AEO) is the practice of optimizing your content to appear in AI-generated answers from platforms like ChatGPT, Perplexity, Google SGE, and others.\n\n### Why AEO Matters\n\nOver 40% of search queries now trigger AI-generated responses. If your content isn''t optimized for these systems, you''re missing a massive audience.\n\n### Key AEO Strategies\n\n1. **Structured Content** — Use clear headings, lists, and tables\n2. **Entity Optimization** — Build your brand''s knowledge graph presence\n3. **Citation Building** — Get mentioned in authoritative sources AI models train on\n4. **Freshness Signals** — Keep content updated regularly\n\n### Measuring AEO Success\n\nOptic Rank tracks your AI visibility score across major platforms, giving you concrete metrics to optimize against.', 'Optic Rank Team', 'published', '["seo", "aeo", "strategy"]', now() - interval '7 days'),
('blog', 'Core Web Vitals: Why Speed Still Matters for SEO', 'core-web-vitals-speed-seo', 'Page speed remains a critical ranking factor. Here''s how to audit and improve your Core Web Vitals with Optic Rank.', E'## Speed is a Ranking Factor\n\nGoogle''s Core Web Vitals — LCP, FID, and CLS — directly impact your search rankings. Poor performance means lower visibility.\n\n### The Three Pillars\n\n- **LCP (Largest Contentful Paint)** — How fast your main content loads. Aim for under 2.5 seconds.\n- **FID (First Input Delay)** — How responsive your page is. Aim for under 100ms.\n- **CLS (Cumulative Layout Shift)** — How stable your layout is. Aim for under 0.1.\n\n### How Optic Rank Helps\n\nOur technical audit tool checks every page on your site for Core Web Vitals issues and provides actionable fix recommendations prioritized by impact.\n\n### Quick Wins\n\n1. Optimize images with modern formats (WebP, AVIF)\n2. Lazy-load below-the-fold content\n3. Preload critical fonts and stylesheets\n4. Minimize JavaScript bundle sizes', 'Optic Rank Team', 'published', '["technical-seo", "performance"]', now() - interval '14 days');

-- Seed data: Guides
INSERT INTO posts (type, title, slug, excerpt, content, author_name, status, tags, published_at) VALUES
('guide', 'Complete Guide to Keyword Research with Optic Rank', 'keyword-research-guide', 'A step-by-step guide to finding high-impact keywords, analyzing competition, and building a winning keyword strategy.', E'## Getting Started with Keyword Research\n\nKeyword research is the foundation of any SEO strategy. This guide walks you through the complete process using Optic Rank.\n\n### Step 1: Seed Keywords\n\nStart by brainstorming seed keywords related to your business. Think about:\n- What products/services do you offer?\n- What problems do you solve?\n- What questions do your customers ask?\n\n### Step 2: Expand Your List\n\nUse Optic Rank''s keyword explorer to expand your seed list with:\n- Related keywords\n- Long-tail variations\n- Question-based queries\n- Competitor keywords\n\n### Step 3: Analyze Metrics\n\nFor each keyword, evaluate:\n- **Search Volume** — Monthly search demand\n- **Difficulty** — How hard it is to rank\n- **CPC** — Commercial value indicator\n- **Trend** — Rising or declining interest\n\n### Step 4: Prioritize\n\nFocus on keywords with high volume, low difficulty, and strong commercial intent. Optic Rank''s AI automatically suggests priority targets.', 'Optic Rank Team', 'published', '["keywords", "strategy", "beginner"]', now() - interval '5 days'),
('guide', 'Setting Up Competitor Monitoring in Optic Rank', 'competitor-monitoring-setup', 'Learn how to track your competitors'' rankings, content strategies, and backlink profiles to stay one step ahead.', E'## Why Monitor Competitors?\n\nUnderstanding what your competitors are doing helps you find opportunities they''re missing and defend against their advances.\n\n### Adding Competitors\n\n1. Navigate to your project dashboard\n2. Click "Competitors" in the sidebar\n3. Enter competitor domain URLs\n4. Optic Rank will automatically discover their top keywords\n\n### What We Track\n\n- **Keyword Overlap** — Keywords you both rank for\n- **Content Gaps** — Keywords they rank for that you don''t\n- **Backlink Comparison** — Their link profile vs yours\n- **SERP Feature Ownership** — Who wins featured snippets, PAA, etc.\n\n### Setting Up Alerts\n\nConfigure alerts to notify you when:\n- A competitor outranks you for a tracked keyword\n- They publish new content targeting your keywords\n- Their domain authority changes significantly\n\n### Using Insights\n\nThe competitive intelligence dashboard highlights your biggest opportunities and threats, making it easy to prioritize your next moves.', 'Optic Rank Team', 'published', '["competitors", "monitoring", "setup"]', now() - interval '10 days');

-- Seed data: Changelog entries
INSERT INTO changelog_entries (title, slug, content, version, type, published_at) VALUES
('AI Visibility Dashboard Launch', 'ai-visibility-dashboard', 'Track your brand presence across ChatGPT, Perplexity, Gemini, and other AI platforms. See citation counts, sentiment analysis, and visibility trends over time.', 'v2.4.0', 'feature', now() - interval '2 days'),
('Improved Keyword Clustering', 'improved-keyword-clustering', 'Our keyword clustering algorithm now groups semantically related keywords with 40% better accuracy. Clusters automatically update as you add new keywords.', 'v2.3.2', 'improvement', now() - interval '1 week'),
('Fixed Backlink Export CSV Format', 'fixed-backlink-export-csv', 'Resolved an issue where exported CSV files had incorrect column headers for domain authority and anchor text fields.', 'v2.3.1', 'fix', now() - interval '2 weeks'),
('Competitor Content Gap Analysis', 'competitor-content-gap', 'New feature: Automatically discover keywords your competitors rank for that you don''t. Includes difficulty estimates and content recommendations.', 'v2.3.0', 'feature', now() - interval '3 weeks'),
('Performance Optimizations', 'performance-optimizations-march', 'Dashboard load times reduced by 35%. Charts now render incrementally for a smoother experience on large datasets.', 'v2.2.5', 'improvement', now() - interval '1 month');

-- Seed data: Roadmap items
INSERT INTO roadmap_items (title, description, status, quarter, category, sort_order) VALUES
('Google Search Console Integration', 'Connect your GSC account for direct keyword and click data import. Admin integration complete — user-facing OAuth and keyword import coming next.', 'in_progress', 'Q2 2026', 'integration', 1),
('Custom Report Builder', 'PDF report generation with 5 templates. Email delivery and drag-and-drop customization coming next.', 'in_progress', 'Q2 2026', 'feature', 2),
('Slack & Teams Notifications', 'Receive ranking alerts, audit results, and backlink notifications in Slack and Microsoft Teams.', 'completed', 'Q1 2026', 'integration', 3),
('Multi-Language SERP Tracking', 'Track keyword rankings across multiple languages and regions. Backend ready — UI for location/language selection coming next.', 'in_progress', 'Q2 2026', 'feature', 4),
('AI Content Brief Generator', 'Generate SEO-optimized content briefs from 8 real data sources with AI analysis across 10 sections.', 'completed', 'Q1 2026', 'feature', 5),
('Site Audit Scheduler', 'Full site audits with health, SEO, performance, and accessibility scoring. Automated scheduling coming next.', 'in_progress', 'Q2 2026', 'feature', 6),
('Backlink Monitoring Alerts', 'Discover, monitor, and score backlinks with toxic detection. Alerts via Slack, Teams, and webhooks.', 'completed', 'Q1 2026', 'improvement', 7),
('API v2 with Webhooks', 'REST API v1 live with 7 endpoints, API key auth, rate limiting, and HMAC-signed webhooks. v2 with write endpoints and docs planned.', 'in_progress', 'Q3 2026', 'feature', 8),
('Email Notification Channel', 'Send report PDFs and alert notifications via email using Resend or Sendgrid.', 'planned', 'Q2 2026', 'feature', 9),
('Public API Documentation', 'Interactive API docs with OpenAPI spec, code examples, and developer portal.', 'planned', 'Q3 2026', 'feature', 10);

-- Seed data: Job listings
INSERT INTO job_listings (title, department, location, type, description, requirements, is_active) VALUES
('Senior Full-Stack Engineer', 'Engineering', 'Remote (US/EU)', 'full-time', E'## About the Role\n\nWe''re looking for a senior full-stack engineer to help build the next generation of SEO intelligence tools.\n\n### What You''ll Do\n\n- Design and implement new features across our Next.js frontend and Supabase backend\n- Optimize performance for data-intensive dashboards\n- Collaborate with the product team on technical architecture\n- Mentor junior engineers and establish best practices\n\n### Why Join Us?\n\nWe''re a small, fast-moving team building tools that thousands of marketers rely on daily. You''ll have significant ownership and impact.', '["5+ years of full-stack development experience", "Strong TypeScript and React skills", "Experience with Next.js App Router", "Familiarity with PostgreSQL and Supabase", "Understanding of SEO concepts is a plus"]', true),
('Product Designer', 'Design', 'Remote', 'full-time', E'## About the Role\n\nJoin us as a product designer to shape the user experience of our SEO intelligence platform.\n\n### What You''ll Do\n\n- Design intuitive interfaces for complex data visualization\n- Create and maintain our design system\n- Conduct user research and usability testing\n- Collaborate closely with engineering on implementation\n\n### What We Value\n\n- Clean, editorial-inspired design sensibility\n- Data-dense interfaces that remain scannable\n- Accessibility-first approach', '["3+ years of product design experience", "Strong Figma skills", "Experience designing data-heavy dashboards", "Understanding of accessibility best practices", "Portfolio demonstrating complex interface design"]', true),
('Content Marketing Manager', 'Marketing', 'Remote', 'full-time', E'## About the Role\n\nOwn our content strategy and help establish Optic Rank as a thought leader in the SEO industry.\n\n### What You''ll Do\n\n- Develop and execute content strategy across blog, guides, and social\n- Write in-depth articles about SEO, AEO, and search trends\n- Manage our editorial calendar\n- Optimize content for search visibility (practice what we preach!)\n\n### Requirements\n\n- Deep understanding of SEO and content marketing\n- Excellent writing and editing skills\n- Experience with B2B SaaS content', '["3+ years of content marketing experience", "Strong SEO knowledge and writing skills", "Experience with B2B SaaS content strategy", "Familiarity with analytics and content performance tools", "Self-motivated and able to work independently"]', true);
