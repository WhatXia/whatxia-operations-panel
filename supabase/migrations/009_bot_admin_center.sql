-- BOT-ADMIN-001 — Centro de Administración del Bot
-- Extiende Bot Manager CMS: content_type, módulo, ambiente, interactive, location, document.
-- Rol DEVELOPER + módulo de permiso bot_cms.

-- ─── Mensajes ───────────────────────────────────────────────────────────────

alter table public.bot_messages
  add column if not exists content_type text;

alter table public.bot_messages
  add column if not exists module text;

alter table public.bot_messages
  add column if not exists environment text;

alter table public.bot_messages
  add column if not exists location_payload jsonb;

alter table public.bot_messages
  add column if not exists interactive_payload jsonb;

update public.bot_messages
set content_type = coalesce(content_type, 'text')
where content_type is null;

update public.bot_messages
set environment = coalesce(environment, 'PRODUCTION')
where environment is null;

update public.bot_messages
set interactive_payload = coalesce(interactive_payload, '{}'::jsonb)
where interactive_payload is null;

alter table public.bot_messages
  alter column content_type set default 'text';

alter table public.bot_messages
  alter column environment set default 'PRODUCTION';

alter table public.bot_messages
  alter column interactive_payload set default '{}'::jsonb;

alter table public.bot_messages
  alter column content_type set not null;

alter table public.bot_messages
  alter column environment set not null;

alter table public.bot_messages
  alter column interactive_payload set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bot_messages_content_type_check'
  ) then
    alter table public.bot_messages
      add constraint bot_messages_content_type_check
      check (
        content_type in (
          'text',
          'image',
          'sticker',
          'audio',
          'video',
          'document',
          'location',
          'interactive'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bot_messages_environment_check'
  ) then
    alter table public.bot_messages
      add constraint bot_messages_environment_check
      check (environment in ('PRODUCTION', 'TEST'));
  end if;
end $$;

-- ─── Versiones (snapshot ampliado) ──────────────────────────────────────────

alter table public.bot_message_versions
  add column if not exists content_type text;

alter table public.bot_message_versions
  add column if not exists module text;

alter table public.bot_message_versions
  add column if not exists environment text;

alter table public.bot_message_versions
  add column if not exists location_payload jsonb;

alter table public.bot_message_versions
  add column if not exists interactive_payload jsonb;

-- ─── Media: document genérico ───────────────────────────────────────────────

alter table public.bot_media_assets
  drop constraint if exists bot_media_assets_type_check;

alter table public.bot_media_assets
  add constraint bot_media_assets_type_check
  check (
    media_type in (
      'sticker',
      'image',
      'gif',
      'video',
      'audio',
      'pdf',
      'document'
    )
  );

-- ─── Permisos: módulo bot_cms + rol DEVELOPER ───────────────────────────────

insert into public.app_roles (
  code, name, description, is_active, is_system, is_superadmin
)
values (
  'DEVELOPER',
  'Desarrollador',
  'Acceso al Centro de Administración del Bot. Sin operación diaria.',
  true,
  true,
  false
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  is_system = true,
  updated_at = now();

insert into public.app_role_permissions (role_id, module, level)
select r.id, 'bot_cms', 'admin'
from public.app_roles r
where r.code = 'SUPERADMIN'
on conflict on constraint app_role_permissions_unique
do update set level = excluded.level, updated_at = now();

insert into public.app_role_permissions (role_id, module, level)
select r.id, m.module, m.level
from public.app_roles r
cross join (
  values
    ('bot_cms', 'admin'),
    ('dashboard', 'read'),
    ('configuration', 'read'),
    ('audit', 'read'),
    ('services', 'none'),
    ('drivers', 'none'),
    ('passengers', 'none'),
    ('metrics', 'none'),
    ('system_status', 'none'),
    ('incidents', 'none'),
    ('conversations', 'none'),
    ('users', 'none'),
    ('roles', 'none'),
    ('ai', 'none'),
    ('integrations', 'none'),
    ('exports', 'none')
) as m(module, level)
where r.code = 'DEVELOPER'
on conflict on constraint app_role_permissions_unique
do update set level = excluded.level, updated_at = now();

insert into public.app_role_permissions (role_id, module, level)
select r.id, 'bot_cms', 'none'
from public.app_roles r
where r.code = 'OPS_ADMIN'
on conflict on constraint app_role_permissions_unique
do update set level = 'none', updated_at = now();

comment on column public.bot_messages.content_type is
  'BOT-ADMIN-001: text|image|sticker|audio|video|document|location|interactive';

comment on column public.bot_messages.environment is
  'PRODUCTION | TEST';

comment on column public.bot_messages.interactive_payload is
  'Botones / listas / opciones WhatsApp (jsonb).';
