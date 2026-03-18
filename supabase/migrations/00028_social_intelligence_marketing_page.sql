-- ─── Social Intelligence Marketing Page Content ──────────────────────────
-- Seed content for the /social-intelligence marketing page.

INSERT INTO public.site_content (page, section, content, sort_order) VALUES
('social-intelligence', 'hero', '{
  "label": "Social Media Intelligence",
  "headline": "Your Social Presence,",
  "headline_highlight": "Decoded by AI",
  "description": "Track your social media performance across Instagram, TikTok, YouTube, Twitter, and LinkedIn. AI-powered earnings forecasts, growth strategies, competitor benchmarking, and content optimization — all in one command center."
}', 0),

('social-intelligence', 'platforms', '[
  {"key": "instagram", "label": "Instagram", "description": "Reels, Stories, carousel analytics and engagement tracking"},
  {"key": "tiktok", "label": "TikTok", "description": "Short-form video performance, virality metrics, and trend analysis"},
  {"key": "youtube", "label": "YouTube", "description": "Subscriber growth, watch time analytics, and revenue projections"},
  {"key": "twitter", "label": "X (Twitter)", "description": "Tweet performance, follower growth, and conversation analytics"},
  {"key": "linkedin", "label": "LinkedIn", "description": "Professional network growth, post engagement, and B2B visibility"}
]', 1),

('social-intelligence', 'features', '[
  {"key": "audience", "title": "Audience Analytics", "subtitle": "Know Your Audience Inside Out", "description": "Track follower growth, engagement trends, and audience demographics across all your social platforms. AI identifies patterns, detects growth spurts, and alerts you to engagement drops before they become problems.", "features": ["Real-time follower tracking & growth trends", "Engagement rate monitoring with historical comparisons", "Average likes, comments, views, and shares per post", "Growth trajectory analysis with AI predictions", "Platform-specific metric dashboards", "Daily metric snapshots with trend arrows"], "stat_value": "5", "stat_label": "Platforms tracked simultaneously with unified analytics"},
  {"key": "earnings", "title": "AI Earnings Forecast", "subtitle": "Your Monetization Potential, Quantified", "description": "AI-powered income projections based on your audience size, engagement quality, niche CPM rates, and growth trajectory. Three-scenario forecasting gives you conservative, realistic, and optimistic revenue targets.", "features": ["Three-scenario earnings projections (conservative, realistic, optimistic)", "Monetization readiness score with factor breakdown", "Revenue source analysis (sponsorships, affiliate, digital products)", "Niche CPM rate benchmarking", "Audience geography impact on earnings", "Growth trajectory income forecasting"], "stat_value": "$", "stat_label": "Personalized earnings projections based on real industry benchmarks"},
  {"key": "content", "title": "Content Strategy Engine", "subtitle": "Post Smarter, Not Harder", "description": "AI analyzes your content performance to recommend optimal posting frequency, content mix, best posting times, and trending hashtags. Stop guessing what to post and when — let data drive your content calendar.", "features": ["Optimal posting frequency recommendations", "Content mix analysis (photos, videos, carousels, stories)", "Best posting times by day of week", "AI-curated hashtag recommendations with volume & competition", "Content calendar generation", "Platform-specific content format suggestions"], "stat_value": "24/7", "stat_label": "AI continuously analyzes your content performance to refine recommendations"},
  {"key": "competitors", "title": "Competitor Benchmarking", "subtitle": "See How You Stack Up", "description": "AI discovers your top competitors and benchmarks your performance against theirs. Track follower gaps, engagement differences, and strategic opportunities your competitors are missing.", "features": ["AI-powered competitor discovery in your niche", "Follower count & engagement rate comparisons", "Content strategy gap analysis", "Growth rate benchmarking", "Competitive positioning insights", "Automated competitor monitoring"], "stat_value": "vs", "stat_label": "Head-to-head benchmarking against your top competitors"},
  {"key": "growth", "title": "Growth Intelligence", "subtitle": "Actionable Steps to Scale", "description": "Receive prioritized, actionable growth tips tailored to your specific profile, niche, and audience. Each tip includes estimated impact so you can focus on the highest-ROI activities first.", "features": ["Prioritized growth tips (high/medium/low impact)", "30-day action plans with daily tasks", "AI strategic insights and trend analysis", "Estimated follower impact per recommendation", "Niche-specific growth strategies", "Weekly intelligence briefs with progress tracking"], "stat_value": "30", "stat_label": "Day AI-generated action plans tailored to your goals"}
]', 2),

('social-intelligence', 'how_it_works', '[
  {"icon": "Share2", "step": "Step 01", "title": "Connect Your Profiles", "description": "Add your Instagram, TikTok, YouTube, Twitter, or LinkedIn handle. We''ll pull in your metrics automatically."},
  {"icon": "Sparkles", "step": "Step 02", "title": "AI Analyzes Everything", "description": "Our AI runs 7 analysis types: growth tips, content strategy, hashtags, competitors, earnings forecast, 30-day plan, and strategic insights."},
  {"icon": "TrendingUp", "step": "Step 03", "title": "Act on Intelligence", "description": "Receive prioritized recommendations, generate content, track progress toward goals, and benchmark against competitors."}
]', 3),

('social-intelligence', 'cta', '{
  "headline": "Ready to decode your social presence?",
  "description": "Start your 14-day free trial and let AI analyze your social profiles. No credit card required.",
  "cta_primary": {"text": "Start Free Trial", "href": "/signup"},
  "cta_secondary": {"text": "View All Features", "href": "/features"}
}', 4)

ON CONFLICT (page, section) DO NOTHING;
