-- Add Stripe as a platform API config for billing integration
INSERT INTO public.platform_api_configs (provider, display_name, api_key, api_secret, config) VALUES
  ('stripe', 'Stripe', NULL, NULL, '{"description": "Payment processing, subscriptions, and billing management", "docs_url": "https://stripe.com/docs/api", "cost_per_call": 0, "fields": ["api_key", "webhook_secret"]}')
ON CONFLICT (provider) DO NOTHING;
