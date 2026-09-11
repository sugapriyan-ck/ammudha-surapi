-- =============================================
-- Ammudha Surapi — Supabase Schema (MVP)
-- Run this in the Supabase SQL editor.
-- =============================================

-- Extensions
create extension if not exists "uuid-ossp";

-- PostGIS is optional; skip if not available on your plan
do $$
begin
  create extension if not exists "postgis" schema extensions;
exception when others then
  -- PostGIS not available, continue without it
  null;
end $$;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  organization text not null,
  email text not null unique,
  role text not null check (role in ('donor', 'rescuer')),
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

-- ---------- Food Listings ----------
create table public.food_listings (
  id uuid primary key default uuid_generate_v4(),
  donor_id uuid not null references public.profiles(id) on delete cascade,
  food_name text not null,
  category text not null check (category in ('Prepared Meal', 'Bakery', 'Produce', 'Packaged Food', 'Other')),
  quantity numeric not null check (quantity > 0),
  unit text not null check (unit in ('Meals', 'Packs', 'Kg', 'Boxes')),
  dietary_type text not null check (dietary_type in ('Vegetarian', 'Non-Vegetarian', 'Vegan', 'Other')),
  description text,
  pickup_deadline timestamptz not null,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'available' check (status in ('available', 'claimed', 'picked_up', 'distribution_completed')),
  created_at timestamptz not null default now()
);

create index idx_food_listings_status on public.food_listings(status);
create index idx_food_listings_donor on public.food_listings(donor_id);
create index idx_food_listings_deadline on public.food_listings(pickup_deadline);

-- ---------- Claims ----------
create table public.claims (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null unique references public.food_listings(id) on delete cascade,
  rescuer_id uuid not null references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  picked_up_at timestamptz,
  completed_at timestamptz,
  status text not null default 'claimed' check (status in ('claimed', 'picked_up', 'distribution_completed'))
);

create index idx_claims_rescuer on public.claims(rescuer_id);
create index idx_claims_status on public.claims(status);

-- ---------- Distribution Proofs ----------
create table public.distribution_proofs (
  id uuid primary key default uuid_generate_v4(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  rescue_id uuid not null references public.food_listings(id) on delete cascade,
  organization_id uuid not null references public.profiles(id) on delete cascade,
  photos text[] not null default '{}',
  people_served integer not null check (people_served >= 0),
  distribution_location text,
  note text,
  submitted_at timestamptz not null default now()
);

create index idx_distribution_proofs_rescue on public.distribution_proofs(rescue_id);

-- ---------- Notifications ----------
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id);

-- =============================================
-- Storage: distribution proof photos
-- =============================================
insert into storage.buckets (id, name, public) values ('distribution-proofs', 'distribution-proofs', true)
on conflict (id) do nothing;

create policy "anyone can read proof photos"
  on storage.objects for select using (bucket_id = 'distribution-proofs');
create policy "authenticated users can upload proof photos"
  on storage.objects for insert with check (bucket_id = 'distribution-proofs' and auth.role() = 'authenticated');

-- =============================================
-- Helper functions
-- =============================================

-- Haversine distance in kilometers
create or replace function public.distance_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision language sql immutable as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- =============================================
-- Row Level Security
-- =============================================
alter table public.profiles enable row level security;
alter table public.food_listings enable row level security;
alter table public.claims enable row level security;
alter table public.distribution_proofs enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy "profiles are readable by everyone"
  on public.profiles for select using (true);
create policy "users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Food listings
create policy "listings are readable by everyone"
  on public.food_listings for select using (true);
create policy "donors can create listings"
  on public.food_listings for insert with check (auth.uid() = donor_id);
create policy "donors can update their own listings"
  on public.food_listings for update using (auth.uid() = donor_id);
create policy "any authenticated rescuer can update listing status"
  on public.food_listings for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'rescuer')
  );

-- Claims
create policy "claims are readable by everyone"
  on public.claims for select using (true);
create policy "rescuers can create claims"
  on public.claims for insert with check (auth.uid() = rescuer_id);
create policy "claim participants can update claims"
  on public.claims for update using (auth.uid() = rescuer_id);

-- Distribution proofs
create policy "proofs are readable by everyone"
  on public.distribution_proofs for select using (true);
create policy "rescuers can create proofs"
  on public.distribution_proofs for insert with check (auth.uid() = organization_id);

-- Notifications
create policy "users can read own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "system can insert notifications"
  on public.notifications for insert with check (true);
create policy "users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- =============================================
-- Trigger: create profile on auth signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, organization, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'organization', 'Home'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'rescuer')
  )
  on conflict (id) do update set
    name = excluded.name,
    organization = excluded.organization,
    role = excluded.role;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();