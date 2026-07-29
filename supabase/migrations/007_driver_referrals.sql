-- REF-001/REF-002 — Contrato de referidos de conductores (shared Supabase).
-- REF-001 escribe/genera; REF-002 (Operations Center) solo lee.
-- Idempotente: no altera tablas del bot existentes.

create table if not exists public.driver_referral_links (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  code text not null,
  invite_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driver_referral_links_driver_unique unique (driver_id),
  constraint driver_referral_links_code_unique unique (code),
  constraint driver_referral_links_code_format check (code ~ '^[A-Za-z0-9_-]{4,64}$')
);

create table if not exists public.driver_referrals (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  referral_code text not null,
  invitee_phone text,
  invitee_name text,
  passenger_id uuid references public.passengers (id) on delete set null,
  invited_at timestamptz not null default now(),
  registered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Un pasajero solo puede atribuirse a un referido (permite varios NULL).
create unique index if not exists driver_referrals_passenger_unique
  on public.driver_referrals (passenger_id)
  where passenger_id is not null;

create index if not exists driver_referral_links_driver_idx
  on public.driver_referral_links (driver_id);

create index if not exists driver_referrals_driver_idx
  on public.driver_referrals (driver_id);

create index if not exists driver_referrals_code_idx
  on public.driver_referrals (referral_code);

create index if not exists driver_referrals_invited_at_idx
  on public.driver_referrals (invited_at desc);

comment on table public.driver_referral_links is
  'REF-001: enlace/código de invitación por conductor. REF-002 solo lectura.';

comment on table public.driver_referrals is
  'REF-001: invitaciones/atribuciones. Sin passenger_id = invitado; con passenger_id = registrado.';

alter table public.driver_referral_links enable row level security;
alter table public.driver_referrals enable row level security;

drop policy if exists driver_referral_links_deny_all on public.driver_referral_links;
create policy driver_referral_links_deny_all
  on public.driver_referral_links
  for all
  using (false)
  with check (false);

drop policy if exists driver_referrals_deny_all on public.driver_referrals;
create policy driver_referrals_deny_all
  on public.driver_referrals
  for all
  using (false)
  with check (false);
