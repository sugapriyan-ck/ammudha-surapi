-- =============================================
-- Ammudha Surapi — Incremental migration (v4)
-- Visual phase: food photos on listings.
-- Run in the Supabase SQL editor. Safe to re-run.
-- =============================================

-- ---------- Food photo on listings ----------
alter table public.food_listings add column if not exists photo_url text;

-- ---------- Storage bucket for food photos ----------
insert into storage.buckets (id, name, public) values ('food-photos', 'food-photos', true)
on conflict (id) do nothing;

drop policy if exists "anyone can read food photos" on storage.objects;
create policy "anyone can read food photos"
  on storage.objects for select using (bucket_id = 'food-photos');
drop policy if exists "authenticated users can upload food photos" on storage.objects;
create policy "authenticated users can upload food photos"
  on storage.objects for insert with check (bucket_id = 'food-photos' and auth.role() = 'authenticated');