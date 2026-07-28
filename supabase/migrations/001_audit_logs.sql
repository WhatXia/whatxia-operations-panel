-- WhatXia Operations Center — Auditoría de producción
-- Solo lectura/escritura vía service role del panel (no modifica el bot).

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_email text,
  user_id uuid,
  role text,
  session_id text,
  ip_address text,
  browser text,
  os text,
  device text,
  path text,
  module text,
  action text not null,
  resource text,
  resource_id text,
  old_values jsonb,
  new_values jsonb,
  result text not null,
  message text,
  duration_ms integer,
  constraint audit_logs_result_check
    check (result in ('OK', 'ERROR'))
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_user_id_idx
  on public.audit_logs (user_id);

create index if not exists audit_logs_user_email_idx
  on public.audit_logs (user_email);

create index if not exists audit_logs_module_idx
  on public.audit_logs (module);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

create index if not exists audit_logs_result_idx
  on public.audit_logs (result);

create index if not exists audit_logs_module_action_created_idx
  on public.audit_logs (module, action, created_at desc);

alter table public.audit_logs enable row level security;

-- El anon/authenticated no lee ni escribe auditoríaamente.
-- El panel escribe/lee con service role (bypass RLS).

drop policy if exists audit_logs_deny_all on public.audit_logs;
create policy audit_logs_deny_all
  on public.audit_logs
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.audit_logs is
  'Auditoría total del WhatXia Operations Center. Escritura solo vía service role del panel.';
