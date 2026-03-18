-- ─── Add Social Intelligence to Marketing Pages ──────────────────────────
-- Adds Social Intelligence as a feature on the homepage (expands grid to 6)
-- and on the features page (adds as 10th feature section).

-- 1. Update Homepage Features Grid: Add Social Intelligence + App Store Optimization
--    This expands from 4 → 6 features in a 2×3 grid.
UPDATE public.site_content
SET content = '[
  {"icon": "Search", "title": "Keyword Intelligence", "description": "Track thousands of keywords across search engines with daily rank updates, SERP feature monitoring, and historical trend analysis."},
  {"icon": "Users", "title": "Competitor Surveillance", "description": "Monitor your competitors'' every move. See their ranking changes, new content, backlink acquisitions, and strategic shifts before they impact you."},
  {"icon": "Shield", "title": "Technical Site Audit", "description": "Comprehensive crawl-based audits that uncover critical issues: broken links, thin content, Core Web Vitals failures, and indexability problems."},
  {"icon": "Sparkles", "title": "AI-Powered Insights", "description": "Our AI analyzes your data continuously, surfacing actionable recommendations and predicting ranking opportunities before your competitors see them."},
  {"icon": "Share2", "title": "Social Intelligence", "description": "AI-powered analytics for Instagram, TikTok, YouTube, Twitter, and LinkedIn. Earnings forecasts, growth strategies, competitor benchmarking, and content optimization."},
  {"icon": "Smartphone", "title": "App Store Optimization", "description": "Track your app''s keyword rankings, monitor competitor apps, analyze reviews, and get AI-powered ASO recommendations for the App Store and Google Play."}
]'::jsonb,
    updated_at = now()
WHERE page = 'homepage' AND section = 'features';

-- 2. Update Homepage Features Header to reflect the expanded suite
UPDATE public.site_content
SET content = jsonb_set(
  jsonb_set(
    content,
    '{description}',
    '"Six pillars of search and social intelligence, unified in a single platform that thinks ahead and presents findings with editorial precision."'
  ),
  '{title}',
  '"Every tool a digital strategist needs — from search rankings to social media — sharpened by artificial intelligence"'
),
    updated_at = now()
WHERE page = 'homepage' AND section = 'features_header';

-- 3. Add Social Intelligence as 10th feature on Features Page
--    Append to the existing sections array using jsonb concatenation.
UPDATE public.site_content
SET content = content || '[
  {"icon": "Share2", "title": "Social Intelligence", "description": "AI-powered social media analytics across Instagram, TikTok, YouTube, Twitter, and LinkedIn. From audience growth to monetization — your complete social command center.", "badge": "New", "capabilities": ["Multi-platform profile tracking", "AI earnings forecasts & monetization readiness", "Competitor discovery & benchmarking", "Content strategy & posting optimization", "Growth tips with estimated impact", "Hashtag recommendations & trend analysis"]}
]'::jsonb,
    updated_at = now()
WHERE page = 'features' AND section = 'sections';

-- 4. Update Features Page Hero to mention social intelligence
UPDATE public.site_content
SET content = jsonb_set(
  content,
  '{description}',
  '"From keyword tracking to social media intelligence — every tool you need to dominate search and social, unified in one editorial-grade dashboard."'
),
    updated_at = now()
WHERE page = 'features' AND section = 'hero';
