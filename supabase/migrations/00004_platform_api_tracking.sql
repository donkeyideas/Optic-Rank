-- Platform API configuration table
-- Stores API keys/configs for external services the platform uses (not user API keys)
CREATE TABLE IF NOT EXISTS public.platform_api_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL UNIQUE,        -- e.g. 'gemini', 'pagespeed', 'dataforseo', 'openai'
  display_name    TEXT NOT NULL,               -- e.g. 'Google Gemini'
  api_key         TEXT,                        -- encrypted/hashed in production
  api_secret      TEXT,                        -- optional secondary key
  base_url        TEXT,                        -- optional custom base URL
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB DEFAULT '{}',          -- extra configuration
  last_tested_at  TIMESTAMPTZ,
  test_status     TEXT DEFAULT 'untested',     -- 'untested', 'success', 'failed'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API call log - tracks every external API call for cost/usage monitoring
CREATE TABLE IF NOT EXISTS public.api_call_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL,               -- matches platform_api_configs.provider
  endpoint        TEXT NOT NULL,               -- API endpoint called
  method          TEXT NOT NULL DEFAULT 'GET', -- HTTP method
  status_code     INT,                         -- HTTP response code
  response_time_ms INT,                        -- Round-trip time
  tokens_used     INT DEFAULT 0,               -- For LLM APIs
  prompt_tokens   INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost_usd        DECIMAL(10, 6) DEFAULT 0,   -- Estimated cost
  is_cached       BOOLEAN DEFAULT false,
  is_success      BOOLEAN DEFAULT true,
  error_message   TEXT,
  metadata        JSONB DEFAULT '{}',          -- Extra context
  project_id      UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_call_log_provider ON public.api_call_log(provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_log_created ON public.api_call_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_log_project ON public.api_call_log(project_id) WHERE project_id IS NOT NULL;

-- Seed default provider configs
INSERT INTO public.platform_api_configs (provider, display_name, config) VALUES
  ('pagespeed', 'Google PageSpeed Insights', '{"description": "Core Web Vitals and performance auditing", "docs_url": "https://developers.google.com/speed/docs/insights/v5/get-started", "cost_per_call": 0}'),
  ('gemini', 'Google Gemini AI', '{"description": "AI keyword generation and competitor discovery", "docs_url": "https://ai.google.dev/docs", "cost_per_call": 0, "model": "gemini-2.0-flash"}'),
  ('dataforseo', 'DataForSEO', '{"description": "SERP tracking, keyword data, and traffic analytics", "docs_url": "https://docs.dataforseo.com", "cost_per_call": 0.002}'),
  ('openai', 'OpenAI', '{"description": "Advanced AI content analysis and insights", "docs_url": "https://platform.openai.com/docs", "cost_per_call": 0.003}'),
  ('anthropic', 'Anthropic Claude', '{"description": "AI-powered SEO recommendations", "docs_url": "https://docs.anthropic.com", "cost_per_call": 0.003}'),
  ('majestic', 'Majestic SEO', '{"description": "Backlink analysis and Trust/Citation Flow", "docs_url": "https://developer-support.majestic.com", "cost_per_call": 0.001}'),
  ('scrapingbee', 'ScrapingBee', '{"description": "Web scraping and site crawling proxy", "docs_url": "https://www.scrapingbee.com/documentation", "cost_per_call": 0.001}'),
  ('moz', 'Moz', '{"description": "Domain Authority and backlink metrics", "docs_url": "https://moz.com/products/api", "cost_per_call": 0.001}')
ON CONFLICT (provider) DO NOTHING;
