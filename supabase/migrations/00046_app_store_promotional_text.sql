-- Add promotional_text column to app_store_listings (Apple App Store only, 170 chars max)
alter table public.app_store_listings
  add column if not exists promotional_text text not null default '';
