-- WhatXia Operations Center — Campos de reautenticación en auditoría

alter table public.audit_logs
  add column if not exists requires_reauthentication boolean not null default false;

alter table public.audit_logs
  add column if not exists reauthentication_result text;

alter table public.audit_logs
  drop constraint if exists audit_logs_reauth_result_check;

alter table public.audit_logs
  add constraint audit_logs_reauth_result_check
  check (
    reauthentication_result is null
    or reauthentication_result in ('SUCCESS', 'FAILED')
  );

create index if not exists audit_logs_reauth_result_idx
  on public.audit_logs (reauthentication_result)
  where reauthentication_result is not null;

comment on column public.audit_logs.requires_reauthentication is
  'Indica si la acción exigió reautenticación por contraseña.';
comment on column public.audit_logs.reauthentication_result is
  'Resultado de la reautenticación: SUCCESS | FAILED.';
