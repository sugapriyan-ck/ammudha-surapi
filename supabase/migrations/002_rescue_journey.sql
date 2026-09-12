-- =============================================
-- Ammudha Surapi — Incremental migration (v2)
-- Run this in the Supabase SQL editor.
-- Adds: food safety declaration.
-- Statuses: available -> claimed -> picked_up -> distribution_completed
-- (no interim "in progress" states).
-- =============================================

-- ---------- Food Listings: food safety ----------
alter table public.food_listings add column if not exists prepared_at timestamptz;
alter table public.food_listings add column if not exists storage_condition text;
alter table public.food_listings add column if not exists safety_confirmed boolean default false;

alter table public.food_listings drop constraint if exists food_listings_storage_condition_check;
alter table public.food_listings
  add constraint food_listings_storage_condition_check
  check (storage_condition is null or storage_condition in ('Refrigerated', 'Room Temperature', 'Frozen', 'Other'));

-- ---------- Food Listings: 4-step statuses ----------
alter table public.food_listings drop constraint if exists food_listings_status_check;
alter table public.food_listings
  add constraint food_listings_status_check
  check (status in ('available', 'claimed', 'picked_up', 'distribution_completed'));

-- ---------- Claims: 3-step statuses, drop interim columns ----------
alter table public.claims drop constraint if exists claims_status_check;
alter table public.claims
  add constraint claims_status_check
  check (status in ('claimed', 'picked_up', 'distribution_completed'));

alter table public.claims drop column if exists pickup_in_progress_at;
alter table public.claims drop column if exists distribution_in_progress_at;