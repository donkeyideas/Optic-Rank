-- Site content table — admin-editable marketing content
-- Each row = one section of one page, stored as JSONB
CREATE TABLE IF NOT EXISTS public.site_content (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page        TEXT NOT NULL,
  section     TEXT NOT NULL,
  content     JSONB NOT NULL DEFAULT '{}',
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(page, section)
);

-- ─── Homepage Seed ───────────────────────────────────────────────────────

INSERT INTO public.site_content (page, section, content, sort_order) VALUES
('homepage', 'hero', '{
  "dateline": "Breaking",
  "dateline_sub": "SEO Intelligence Reimagined",
  "headline": "Your Rankings,",
  "headline_highlight": "Decoded by AI",
  "subheadline": "Optic Rank transforms raw SEO data into editorial-grade intelligence briefs. Track keywords, surveil competitors, and receive AI-curated insights — all presented with newspaper clarity.",
  "cta_primary": {"text": "Start Free Trial", "href": "/signup"},
  "cta_secondary": {"text": "See How It Works", "href": "/#features"}
}', 0),

('homepage', 'stats', '[
  {"value": "2.5M+", "label": "Keywords Tracked"},
  {"value": "50K+", "label": "Sites Monitored"},
  {"value": "99.9%", "label": "Uptime SLA"},
  {"value": "< 2s", "label": "Avg. Report Time"}
]', 1),

('homepage', 'features_header', '{
  "label": "The Intelligence Suite",
  "title": "Every tool an SEO strategist needs, sharpened by artificial intelligence",
  "description": "Four pillars of SEO intelligence, unified in a single platform that thinks ahead and presents findings with editorial precision."
}', 2),

('homepage', 'features', '[
  {"icon": "Search", "title": "Keyword Intelligence", "description": "Track thousands of keywords across search engines with daily rank updates, SERP feature monitoring, and historical trend analysis."},
  {"icon": "Users", "title": "Competitor Surveillance", "description": "Monitor your competitors'' every move. See their ranking changes, new content, backlink acquisitions, and strategic shifts before they impact you."},
  {"icon": "Shield", "title": "Technical Site Audit", "description": "Comprehensive crawl-based audits that uncover critical issues: broken links, thin content, Core Web Vitals failures, and indexability problems."},
  {"icon": "Sparkles", "title": "AI-Powered Insights", "description": "Our AI analyzes your data continuously, surfacing actionable recommendations and predicting ranking opportunities before your competitors see them."}
]', 3),

('homepage', 'how_it_works_header', '{
  "label": "Trusted Intelligence",
  "title": "How Optic Rank works"
}', 4),

('homepage', 'how_it_works', '[
  {"icon": "Globe", "step": "Step 01", "title": "Connect Your Properties", "description": "Add your domains, connect Google Search Console, and import your keyword targets. Setup takes under 5 minutes."},
  {"icon": "BarChart3", "step": "Step 02", "title": "AI Analyzes Everything", "description": "Our AI continuously monitors rankings, crawls your site, watches competitors, and identifies patterns humans miss."},
  {"icon": "TrendingUp", "step": "Step 03", "title": "Act on Intelligence Briefs", "description": "Receive daily editorial-style briefings with prioritized actions. No data overload, just clear, actionable intelligence."}
]', 5),

('homepage', 'cta', '{
  "label": "Ready to Dominate Search?",
  "headline": "Start reading the SEO intelligence brief your competitors wish they had",
  "description": "Join thousands of SEO professionals who trust Optic Rank to keep them ahead. Free 14-day trial, no credit card required.",
  "cta_primary": {"text": "Start Your Free Trial", "href": "/signup"},
  "cta_secondary": {"text": "Talk to Sales", "href": "/contact"}
}', 6),

('homepage', 'meta', '{
  "title": "Optic Rank — AI-Powered SEO Intelligence Platform",
  "description": "Transform raw SEO data into editorial-grade intelligence briefs. Track keywords, surveil competitors, and receive AI-curated insights.",
  "og_title": "Optic Rank — Your Rankings, Decoded by AI",
  "og_description": "AI-powered SEO intelligence for modern teams. Track, analyze, and optimize your search presence."
}', 7)
ON CONFLICT (page, section) DO NOTHING;

-- ─── Features Page Seed ──────────────────────────────────────────────────

INSERT INTO public.site_content (page, section, content, sort_order) VALUES
('features', 'hero', '{
  "label": "Platform Overview",
  "headline": "The Complete SEO Intelligence Platform",
  "description": "From keyword tracking to AI-powered predictions, every tool you need to dominate search — unified in one editorial-grade dashboard.",
  "cta_primary": {"text": "Start Free Trial", "href": "/signup"},
  "cta_secondary": {"text": "View Pricing", "href": "/pricing"}
}', 0),

('features', 'sections', '[
  {"icon": "Search", "title": "Keyword Intelligence", "description": "Track thousands of keywords across Google, Bing, and regional search engines with real-time rank monitoring.", "badge": null, "capabilities": ["Daily & real-time rank tracking", "SERP feature monitoring", "Search volume & difficulty", "Keyword clustering & grouping", "Position history & trends", "Mobile vs. desktop tracking"]},
  {"icon": "Link2", "title": "Backlink Analysis", "description": "Comprehensive backlink profiling with toxic link detection, competitor gap analysis, and outreach tools.", "badge": null, "capabilities": ["Backlink discovery & monitoring", "Domain Authority scoring", "Trust Flow & Citation Flow", "Toxic link detection", "Competitor backlink gaps", "Link building outreach"]},
  {"icon": "Shield", "title": "Technical Site Audit", "description": "Deep crawl-based audits that surface every technical issue affecting your search performance.", "badge": null, "capabilities": ["Core Web Vitals monitoring", "Crawl error detection", "Internal link analysis", "Schema markup validation", "Mobile-friendliness checks", "Page speed optimization"]},
  {"icon": "Users", "title": "Competitor Intelligence", "description": "Know what your competitors are doing before they do it. Track their every strategic move.", "badge": null, "capabilities": ["Competitor rank tracking", "Content gap analysis", "Backlink gap analysis", "New content detection", "SERP overlap analysis", "Market share tracking"]},
  {"icon": "Sparkles", "title": "AI-Powered Insights", "description": "Machine learning models that continuously analyze your data to surface actionable recommendations.", "badge": null, "capabilities": ["Automated recommendations", "Trend detection & alerts", "Content optimization tips", "Keyword opportunity finder", "Risk & opportunity scoring", "Weekly intelligence briefs"]},
  {"icon": "Smartphone", "title": "App Store Optimization", "description": "Extend your visibility tracking to mobile app stores with keyword and ranking intelligence.", "badge": null, "capabilities": ["App keyword tracking", "App store rank monitoring", "Competitor app analysis", "Review sentiment analysis", "Download trend tracking", "ASO recommendations"]},
  {"icon": "FileText", "title": "Content Analysis", "description": "Evaluate your content portfolio for SEO effectiveness, freshness, and competitive positioning.", "badge": null, "capabilities": ["Content scoring engine", "Freshness decay detection", "Cannibalization detection", "Internal linking suggestions", "Entity coverage analysis", "Content gap identification"]},
  {"icon": "Eye", "title": "AI Visibility Tracking", "description": "Track how AI assistants like ChatGPT, Gemini, and Perplexity reference your brand and content.", "badge": "Exclusive", "capabilities": ["Multi-LLM monitoring", "Brand mention detection", "Citation tracking", "Sentiment analysis", "Competitor AI presence", "Visibility score trends"]},
  {"icon": "TrendingUp", "title": "Predictive SEO", "description": "AI-powered forecasting that predicts ranking movements before they happen.", "badge": null, "capabilities": ["Rank prediction models", "Traffic forecasting", "Seasonal trend analysis", "Algorithm update impact", "Opportunity scoring", "Confidence intervals"]}
]', 1),

('features', 'cta', '{
  "headline": "Ready to transform your SEO workflow?",
  "description": "Start your 14-day free trial and experience the full intelligence suite. No credit card required.",
  "cta_primary": {"text": "Start Your Free Trial", "href": "/signup"},
  "cta_secondary": {"text": "Compare Plans", "href": "/pricing"}
}', 2)
ON CONFLICT (page, section) DO NOTHING;

-- ─── Search & AI Page Seed ───────────────────────────────────────────────

INSERT INTO public.site_content (page, section, content, sort_order) VALUES
('search-ai', 'hero', '{
  "label": "The Modern Search Playbook",
  "headline": "Four Pillars of Search Visibility",
  "headline_highlight": "in the AI Era",
  "description": "Search has evolved beyond ten blue links. Today, winning requires mastery of four interconnected strategies: SEO for rankings, AEO for answer boxes, GEO for AI citations, and CRO for conversions. Optic Rank unifies all four."
}', 0),

('search-ai', 'pillars', '[
  {"key": "seo", "label": "SEO", "name": "Search Engine Optimization", "definition": "Drive organic traffic via search rankings"},
  {"key": "aeo", "label": "AEO", "name": "Answer Engine Optimization", "definition": "Win featured snippets & answer boxes"},
  {"key": "geo", "label": "GEO", "name": "Generative Engine Optimization", "definition": "Get cited by AI assistants"},
  {"key": "cro", "label": "CRO", "name": "Conversion Rate Optimization", "definition": "Turn visitors into customers"}
]', 1),

('search-ai', 'seo', '{
  "title": "Search Engine Optimization",
  "subtitle": "The Foundation of Organic Growth",
  "description": "SEO remains the bedrock of digital visibility. With 68% of online experiences beginning with a search engine, ranking on page one is not optional — it is essential. Optic Rank provides the intelligence layer that transforms SEO from guesswork into precision targeting.",
  "features": ["Real-time keyword rank tracking across Google, Bing, and regional engines", "Technical site audits covering Core Web Vitals, crawlability, and indexation", "Competitor surveillance with automatic alerts on ranking changes", "AI-generated content briefs optimized for search intent", "Historical trend analysis and seasonal pattern detection", "Backlink profile monitoring with toxic link detection"],
  "stat_value": "68%",
  "stat_label": "of online experiences begin with a search engine"
}', 2),

('search-ai', 'aeo', '{
  "title": "Answer Engine Optimization",
  "subtitle": "Own Position Zero",
  "description": "Featured snippets, People Also Ask boxes, and knowledge panels now dominate search results. AEO focuses on structuring your content to be the definitive answer. Optic Rank tracks your snippet presence and identifies opportunities to claim Position Zero.",
  "features": ["Entity tracking and knowledge panel monitoring", "Featured snippet opportunity identification", "People Also Ask coverage analysis", "Schema markup validation and recommendations", "FAQ content optimization for voice search", "SERP feature monitoring across all result types"],
  "stat_value": "40%",
  "stat_label": "of Google searches now include a featured snippet"
}', 3),

('search-ai', 'geo', '{
  "title": "Generative Engine Optimization",
  "subtitle": "Be Cited by AI",
  "description": "ChatGPT, Gemini, Perplexity, and Claude are reshaping how people discover information. GEO ensures your brand is mentioned and cited when AI assistants answer questions in your industry. Optic Rank is the only platform that tracks your AI visibility across all major LLMs.",
  "features": ["AI visibility tracking across ChatGPT, Gemini, Perplexity, Claude, and DeepSeek", "Brand mention detection and sentiment analysis", "URL citation monitoring — know when AI links to your content", "Competitor AI presence comparison", "Visibility score trends over time", "Actionable recommendations to improve AI citations"],
  "stat_value": "30%",
  "stat_label": "of searches will use AI-generated answers by 2027"
}', 4),

('search-ai', 'cro', '{
  "title": "Conversion Rate Optimization",
  "subtitle": "Traffic Without Conversion Is Vanity",
  "description": "Driving traffic is only half the battle. CRO ensures every visitor has the best possible experience, turning clicks into customers. Optic Rank connects your technical performance data to conversion insights, so you optimize for revenue — not just rankings.",
  "features": ["Core Web Vitals monitoring with actionable fix recommendations", "Page speed analysis with LCP, CLS, and INP tracking", "Content quality scoring that correlates with conversion rates", "Landing page performance benchmarking", "Mobile vs. desktop experience comparison", "Site health scores that predict user experience quality"],
  "stat_value": "53%",
  "stat_label": "of visitors leave if a page takes more than 3 seconds to load"
}', 5),

('search-ai', 'unified', '{
  "label": "The Unified Approach",
  "headline": "One Platform, Four Strategies",
  "description": "Most tools address one pillar. Optic Rank is built from the ground up to connect SEO, AEO, GEO, and CRO insights in a single editorial-grade dashboard. When your rankings improve, you see the impact on AI visibility. When your page speed improves, you see the impact on conversions. Everything is connected."
}', 6),

('search-ai', 'cta', '{
  "headline": "Ready to master all four pillars?",
  "description": "Start your 14-day free trial and see how Optic Rank unifies SEO, AEO, GEO, and CRO intelligence in one platform.",
  "cta_primary": {"text": "Start Free Trial", "href": "/signup"},
  "cta_secondary": {"text": "View Pricing", "href": "/pricing"}
}', 7),

('search-ai', 'meta', '{
  "title": "SEO, AEO, GEO & CRO — Complete Search Visibility | Optic Rank",
  "description": "Master all four pillars of modern search: SEO for rankings, AEO for answer snippets, GEO for AI citations, and CRO for conversions. One unified intelligence platform."
}', 8)
ON CONFLICT (page, section) DO NOTHING;
