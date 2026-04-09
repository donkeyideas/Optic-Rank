-- ============================================================
-- Apple In-App Purchase support
-- Adds billing_provider tracking + Apple IAP fields
-- ============================================================

-- Organizations: track which billing system manages the subscription
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS billing_provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (billing_provider IN ('stripe', 'apple', 'none')),
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS apple_subscription_expires_at TIMESTAMPTZ;

-- Pricing plans: map to Apple product IDs
ALTER TABLE public.pricing_plans
  ADD COLUMN IF NOT EXISTS apple_product_id TEXT;

-- Update existing plans with Apple product IDs
UPDATE public.pricing_plans SET apple_product_id = 'com.opticrank.starter.monthly' WHERE plan_key = 'starter';
UPDATE public.pricing_plans SET apple_product_id = 'com.opticrank.pro.monthly'     WHERE plan_key = 'pro';
UPDATE public.pricing_plans SET apple_product_id = 'com.opticrank.business.monthly' WHERE plan_key = 'business';

-- Billing events: track source (stripe vs apple) + Apple notification dedup
ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS billing_source TEXT NOT NULL DEFAULT 'stripe'
    CHECK (billing_source IN ('stripe', 'apple', 'manual')),
  ADD COLUMN IF NOT EXISTS apple_notification_id TEXT UNIQUE;

-- Make stripe_event_id nullable (Apple events won't have one)
ALTER TABLE public.billing_events ALTER COLUMN stripe_event_id DROP NOT NULL;
