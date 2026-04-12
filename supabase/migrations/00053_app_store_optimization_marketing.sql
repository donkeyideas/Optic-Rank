-- App Store Optimization marketing page content seed
-- Editable via admin /admin/content

INSERT INTO public.site_content (page, section, content, sort_order) VALUES

('app-store-optimization', 'hero', '{
  "label": "App Store Optimization",
  "headline": "Your App''s Visibility,",
  "headline_highlight": "Decoded by AI",
  "description": "Track keyword rankings, monitor competitor apps, analyze reviews, and get AI-powered ASO recommendations for the Apple App Store and Google Play — all from one intelligence platform."
}', 0),

('app-store-optimization', 'stores', '[
  {"key": "apple", "label": "Apple App Store", "description": "iOS keyword rankings, ratings, category positions, and App Store Connect insights"},
  {"key": "google_play", "label": "Google Play Store", "description": "Android app visibility, keyword tracking, install trends, and Play Console analytics"}
]', 1),

('app-store-optimization', 'features', '[
  {
    "key": "keyword_tracking",
    "title": "App Keyword Tracking",
    "subtitle": "Know Exactly Where You Rank",
    "description": "Track your app''s keyword rankings across both the Apple App Store and Google Play. Monitor daily position changes, discover high-volume opportunities, and understand which keywords drive the most installs.",
    "features": ["Daily keyword rank monitoring across both stores", "Search volume and difficulty scoring", "Keyword suggestion engine with AI recommendations", "Position history with trend visualization", "Competitor keyword overlap analysis", "Localized tracking across 60+ countries"],
    "stat_value": "60+",
    "stat_label": "Countries tracked with localized keyword intelligence"
  },
  {
    "key": "visibility_score",
    "title": "Organic Visibility Score",
    "subtitle": "Your App''s Discoverability, Quantified",
    "description": "A single aggregate score (0–100) measuring your app''s total discoverability across all tracked keywords, weighted by search volume and position. Track how optimization efforts translate into real visibility improvements.",
    "features": ["Aggregate visibility score weighted by search volume", "Position-based weighting with exponential decay", "Per-keyword visibility breakdown", "Tier distribution analysis (Top 3, Top 10, Top 50)", "Historical trend tracking with daily snapshots", "Organization-level visibility overview"],
    "stat_value": "0–100",
    "stat_label": "Single score quantifying your app''s total discoverability"
  },
  {
    "key": "competitor_analysis",
    "title": "Competitor App Intelligence",
    "subtitle": "See How You Stack Up",
    "description": "Identify and monitor your top competitors in both app stores. Compare keyword rankings, ratings, download trends, and visibility scores side by side. Discover gaps in their strategies that you can exploit.",
    "features": ["Automated competitor discovery in your category", "Side-by-side keyword ranking comparisons", "Rating and review volume benchmarking", "Visibility score comparisons", "New keyword and update detection alerts", "Category ranking overlap analysis"],
    "stat_value": "vs",
    "stat_label": "Head-to-head competitor benchmarking across both stores"
  },
  {
    "key": "review_intelligence",
    "title": "Review & Sentiment Analysis",
    "subtitle": "Turn Feedback Into Features",
    "description": "AI analyzes thousands of app reviews to surface sentiment trends, feature requests, and pain points. Understand what users love, what frustrates them, and what your competitors'' users are asking for.",
    "features": ["AI-powered sentiment classification (positive, negative, neutral)", "Feature request extraction and clustering", "Bug report detection and severity scoring", "Competitor review analysis and comparison", "Rating trend monitoring with anomaly alerts", "Review response recommendations"],
    "stat_value": "AI",
    "stat_label": "Powered sentiment analysis across thousands of reviews"
  },
  {
    "key": "performance_analytics",
    "title": "Performance Analytics",
    "subtitle": "Downloads, Revenue, Retention",
    "description": "Connect your App Store Connect and Google Play Console data for unified performance analytics. Track downloads, revenue, conversion rates, and retention metrics alongside your ASO efforts to measure real impact.",
    "features": ["Download and install trend tracking", "Revenue analytics with source attribution", "Conversion rate monitoring (impressions → installs)", "Retention and uninstall rate analysis", "Update impact measurement on key metrics", "Custom date range comparisons"],
    "stat_value": "360°",
    "stat_label": "Full-funnel analytics from impression to retention"
  },
  {
    "key": "ai_recommendations",
    "title": "AI-Powered ASO Recommendations",
    "subtitle": "Optimization on Autopilot",
    "description": "Our AI continuously analyzes your app''s metadata, keywords, ratings, and competitor landscape to generate prioritized optimization recommendations. Each suggestion includes estimated impact and step-by-step implementation guidance.",
    "features": ["Title and subtitle optimization suggestions", "Keyword field recommendations with volume data", "Screenshot and preview video best practices", "Localization priority recommendations", "A/B test hypotheses for listing elements", "Weekly ASO intelligence briefs"],
    "stat_value": "24/7",
    "stat_label": "AI continuously monitors and generates optimization recommendations"
  }
]', 2),

('app-store-optimization', 'how_it_works', '[
  {"icon": "Smartphone", "step": "Step 01", "title": "Add Your Apps", "description": "Enter your app name or bundle ID for iOS and Android. We''ll pull in your listings, keywords, ratings, and competitor data automatically."},
  {"icon": "Sparkles", "step": "Step 02", "title": "AI Analyzes Everything", "description": "Our AI tracks keyword rankings daily, monitors competitors, analyzes review sentiment, and calculates your organic visibility score across both stores."},
  {"icon": "TrendingUp", "step": "Step 03", "title": "Optimize & Grow", "description": "Receive prioritized ASO recommendations, track visibility improvements over time, and benchmark against competitors with actionable intelligence briefs."}
]', 3),

('app-store-optimization', 'cta', '{
  "headline": "Ready to dominate the app stores?",
  "description": "Start your 14-day free trial and let AI optimize your app''s visibility across the Apple App Store and Google Play. No credit card required.",
  "cta_primary": {"text": "Start Free Trial", "href": "/signup"},
  "cta_secondary": {"text": "View Pricing", "href": "/pricing"}
}', 4),

('app-store-optimization', 'meta', '{
  "title": "App Store Optimization (ASO) — AI-Powered Mobile Visibility | Optic Rank",
  "description": "Track app keyword rankings, monitor competitor apps, analyze reviews, and get AI-powered ASO recommendations for the Apple App Store and Google Play."
}', 5)

ON CONFLICT (page, section) DO NOTHING;
