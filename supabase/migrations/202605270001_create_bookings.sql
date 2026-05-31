-- Booking requests submitted from the public website and the fidelity app.
-- Run this in Supabase SQL editor before production deployment.

create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 120),
  phone text not null check (char_length(trim(phone)) between 7 and 40),
  email text,
  starts_at timestamptz not null,
  party_size integer not null default 2 check (party_size between 1 and 30),
  notes text not null default '',
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  source text not null default 'website'
    check (source in ('website', 'fidelity_app', 'admin', 'phone', 'walk_in')),
  admin_notes text not null default '',
  confirmed_at timestamptz,
  seated_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_starts_at_idx
  on public.bookings (starts_at desc);

create index if not exists bookings_status_starts_at_idx
  on public.bookings (status, starts_at);

create index if not exists bookings_phone_idx
  on public.bookings (phone);

create or replace function public.set_bookings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;

create trigger bookings_set_updated_at
before update on public.bookings
for each row
execute function public.set_bookings_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "Anyone can create booking requests" on public.bookings;
create policy "Anyone can create booking requests"
on public.bookings
for insert
to anon, authenticated
with check (
  status = 'requested'
  and source in ('website', 'fidelity_app')
);

drop policy if exists "Authenticated staff can read bookings" on public.bookings;
create policy "Authenticated staff can read bookings"
on public.bookings
for select
to authenticated
using (true);

drop policy if exists "Authenticated staff can update bookings" on public.bookings;
create policy "Authenticated staff can update bookings"
on public.bookings
for update
to authenticated
using (true)
with check (true);
