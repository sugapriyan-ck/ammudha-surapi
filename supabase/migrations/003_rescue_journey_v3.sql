-- =============================================
-- Ammudha Surapi — Incremental migration (v3)
-- Run this in the Supabase SQL editor.
-- Goal: food safety declaration + 4-step statuses +
-- donor can confirm pickup (RLS fix).
-- Safe to re-run. Handles rows still in the old
-- 6-step "in progress" states.
-- =============================================

-- ---------- Food Listings: food safety ----------
alter table public.food_listings add column if not exists prepared_at timestamptz;
alter table public.food_listings add column if not exists storage_condition text;
alter table public.food_listings add column if not exists safety_confirmed boolean default false;

alter table public.food_listings drop constraint if exists food_listings_storage_condition_check;
alter table public.food_listings
  add constraint food_listings_storage_condition_check
  check (storage_condition is null or storage_condition in ('Refrigerated', 'Room Temperature', 'Frozen', 'Other'));

-- ---------- Migrate any interim "in progress" rows to "done" states ----------
update public.food_listings set status = 'picked_up'
  where status in ('pickup_in_progress', 'distribution_in_progress');
update public.claims set status = 'picked_up'
  where status in ('pickup_in_progress', 'distribution_in_progress');

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

-- ---------- RLS: donors may confirm pickup on their listing's claim ----------
drop policy if exists "claim participants can update claims" on public.claims;
create policy "claim participants can update claims"
  on public.claims for update using (
    auth.uid() = rescuer_id
    or exists (
      select 1 from public.food_listings fl
      where fl.id = public.claims.listing_id and fl.donor_id = auth.uid()
    )
  );