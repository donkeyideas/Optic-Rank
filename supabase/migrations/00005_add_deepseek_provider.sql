-- Add DeepSeek AI provider
INSERT INTO public.platform_api_configs (provider, display_name, config) VALUES
  ('deepseek', 'DeepSeek AI', '{"description": "Cost-effective AI for keyword analysis, content scoring, and insights", "docs_url": "https://platform.deepseek.com/api-docs", "cost_per_call": 0.0003, "model": "deepseek-chat"}')
ON CONFLICT (provider) DO NOTHING;
