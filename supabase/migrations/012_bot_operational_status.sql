-- OPS-SYS-001 — Estado operativo del bot (panel)
-- Misma tabla SYS-001 del MVP: public.bot_operational_status
-- Idempotente: si ya existe (migración 043 del bot), no altera datos.

create table if not exists public.bot_operational_status (
  id smallint primary key default 1 check (id = 1),
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'MAINTENANCE')),
  maintenance_message text not null default
    E'👋 Hola. En este momento estamos realizando una actualización programada. En unos minutos volveremos a estar disponibles. Gracias por tu comprensión.',
  cms_message_code text not null default 'SYS_BOT_MAINTENANCE',
  updated_at timestamptz not null default now(),
  updated_by_email text,
  updated_by_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.bot_operational_status is
  'SYS-001 / OPS-SYS-001: estado operativo global del bot (ACTIVE | MAINTENANCE). Ops escribe; bot lee.';

alter table public.bot_operational_status enable row level security;

drop policy if exists bot_operational_status_deny_all on public.bot_operational_status;
create policy bot_operational_status_deny_all
  on public.bot_operational_status for all using (false) with check (false);

insert into public.bot_operational_status (
  id,
  status,
  maintenance_message,
  cms_message_code
)
values (
  1,
  'ACTIVE',
  E'👋 Hola. En este momento estamos realizando una actualización programada. En unos minutos volveremos a estar disponibles. Gracias por tu comprensión.',
  'SYS_BOT_MAINTENANCE'
)
on conflict (id) do nothing;

-- Sincronizar / sembrar SYS_BOT_MAINTENANCE en CMS (esquema panel: category_id, module, …)
do $$
declare
  v_cat uuid;
  v_body text;
begin
  if to_regclass('public.bot_messages') is null then
    return;
  end if;

  select maintenance_message into v_body
  from public.bot_operational_status
  where id = 1;

  if v_body is null or length(trim(v_body)) = 0 then
    v_body := E'👋 Hola. En este momento estamos realizando una actualización programada. En unos minutos volveremos a estar disponibles. Gracias por tu comprensión.';
  end if;

  select id into v_cat
  from public.bot_message_categories
  where code = 'SYSTEM'
  limit 1;

  insert into public.bot_messages (
    code,
    name,
    category_id,
    body,
    available_variables,
    status,
    version,
    is_active,
    content_type,
    module,
    environment,
    interactive_payload
  )
  values (
    'SYS_BOT_MAINTENANCE',
    'Bot en mantenimiento',
    v_cat,
    v_body,
    '[]'::jsonb,
    'PUBLISHED',
    1,
    true,
    'text',
    'SYSTEM',
    'PRODUCTION',
    '{}'::jsonb
  )
  on conflict (code) do update set
    name = excluded.name,
    body = case
      when public.bot_messages.body is null
        or length(trim(public.bot_messages.body)) = 0
      then excluded.body
      else public.bot_messages.body
    end,
    status = 'PUBLISHED',
    is_active = true,
    module = coalesce(public.bot_messages.module, 'SYSTEM'),
    updated_at = now();
exception
  when undefined_column then
    null;
  when others then
    raise notice 'OPS-SYS-001: no se pudo sembrar SYS_BOT_MAINTENANCE: %', sqlerrm;
end $$;
