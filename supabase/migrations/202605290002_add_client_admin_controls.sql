alter table public.client_profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text,
  add column if not exists admin_notes text,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_client_profiles_is_blocked
  on public.client_profiles (is_blocked);

create index if not exists idx_client_profiles_deleted_at
  on public.client_profiles (deleted_at);
