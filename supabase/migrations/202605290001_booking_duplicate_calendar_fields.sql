-- Prevent duplicate active reservations from the same customer/contact.
-- Also adds calendar sync fields for the n8n/Google Calendar workflow.

alter table public.bookings
  add column if not exists normalized_phone text
    generated always as (regexp_replace(coalesce(phone, ''), '[^0-9]+', '', 'g')) stored,
  add column if not exists normalized_email text
    generated always as (lower(trim(coalesce(email, '')))) stored,
  add column if not exists calendar_event_id text,
  add column if not exists calendar_sync_status text not null default 'pending'
    check (calendar_sync_status in ('pending', 'synced', 'failed', 'skipped')),
  add column if not exists calendar_synced_at timestamptz,
  add column if not exists calendar_sync_error text not null default '';

create unique index if not exists bookings_unique_active_phone_slot_idx
  on public.bookings (starts_at, normalized_phone)
  where normalized_phone <> ''
    and status not in ('cancelled', 'no_show');

create unique index if not exists bookings_unique_active_email_slot_idx
  on public.bookings (starts_at, normalized_email)
  where normalized_email <> ''
    and status not in ('cancelled', 'no_show');

create index if not exists bookings_calendar_sync_status_idx
  on public.bookings (calendar_sync_status, starts_at);
