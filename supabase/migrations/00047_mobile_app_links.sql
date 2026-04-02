-- Mobile app download links (global site content)
INSERT INTO public.site_content (page, section, content, sort_order, is_active)
VALUES (
  'global',
  'mobile_app',
  '{
    "enabled": true,
    "headline": "Take Optic Rank On The Go",
    "description": "Track your SEO intelligence from anywhere with our mobile app.",
    "app_store_url": "https://apps.apple.com/us/app/optic-rank/id6760938335",
    "app_store_enabled": true,
    "google_play_url": "",
    "google_play_enabled": false
  }'::jsonb,
  0,
  true
)
ON CONFLICT (page, section) DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = now();
