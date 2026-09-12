-- =============================================
-- Ammudha Surapi — Incremental migration (v2)
-- Run this in the Supabase SQL editor.
-- Adds: food safety declaration + 6-step rescue journey.
-- =============================================

-- ---------- Food Listings: food safety ----------
alter table public.food_listings add column if not exists prepared_at timestamptz;
alter table public.food_listings add column if not exists storage_condition text;
alter table public.food_listings add column if not exists safety_confirmed boolean default false;

alter table public.food_listings drop constraint if exists food_listings_storage_condition_check;
alter table public.food_listings
  add constraint food_listings_storage_condition_check
  check (storage_condition is null or storage_condition in ('Refrigerated', 'Room Temperature', 'Frozen', 'Other'));

-- ---------- Food Listings: 6-step statuses ----------
alter table public.food_listings drop constraint if exists food_listings_status_check;
alter table public.food_listings
  add constraint food_listings_status_check
  check (status in ('available', 'claimed', 'pickup_in_progress', 'picked_up', 'distribution_in_progress', 'distribution_completed'));

-- ---------- Claims: 6-step statuses + custody timestamps ----------
alter table public.claims drop constraint if exists claims_status_check;
alter table public.claims
  add constraint claims_status_check
  check (status in ('claimed', 'pickup_in_progress', 'picked_up', 'distribution_in_progress', 'distribution_completed'));

alter table public.claims add column if not exists pickup_in_progress_at timestamptz;
alter table public.claims add column if not exists distribution_in_progress_at timestamptz;