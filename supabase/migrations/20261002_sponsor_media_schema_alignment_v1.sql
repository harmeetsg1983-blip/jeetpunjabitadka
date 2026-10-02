-- JPT sponsor media schema alignment
-- Keeps Sponsor Manager V2 and existing renderers compatible with production tables.

alter table public.checkout_sponsor_ads
  add column if not exists video_url text,
  add column if not exists schedule_json jsonb not null default '{}'::jsonb;

alter table public.delivery_partner_sponsor_ads
  add column if not exists video_url text,
  add column if not exists schedule_json jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
