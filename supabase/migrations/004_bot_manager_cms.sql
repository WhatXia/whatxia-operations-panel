-- WhatXia Operations Center — Bot Manager CMS
-- Infraestructura administrativa. El bot (WhatXia Basic) AÚN NO consume estas tablas.

-- Categorías configurables
create table if not exists public.bot_message_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_message_categories_code_check
    check (code ~ '^[A-Z][A-Z0-9_]{1,63}$')
);

-- Mensajes del bot (contenido CMS)
create table if not exists public.bot_messages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category_id uuid references public.bot_message_categories (id) on delete set null,
  body text not null default '',
  available_variables jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT',
  version integer not null default 1,
  is_active boolean not null default true,
  created_by_email text,
  created_by_id uuid,
  updated_by_email text,
  updated_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_messages_code_check
    check (code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint bot_messages_status_check
    check (status in ('DRAFT', 'PUBLISHED'))
);

-- Historial de versiones
create table if not exists public.bot_message_versions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.bot_messages (id) on delete cascade,
  version integer not null,
  body text not null,
  name text not null,
  status text not null,
  available_variables jsonb not null default '[]'::jsonb,
  media_ids jsonb not null default '[]'::jsonb,
  category_id uuid,
  is_active boolean not null default true,
  changed_by_email text,
  changed_by_id uuid,
  change_note text,
  created_at timestamptz not null default now(),
  constraint bot_message_versions_unique unique (message_id, version)
);

-- Biblioteca multimedia
create table if not exists public.bot_media_assets (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  description text,
  media_type text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  public_url text,
  external_url text,
  tags text[] not null default '{}',
  status text not null default 'ACTIVE',
  created_by_email text,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_media_assets_type_check
    check (media_type in ('sticker', 'image', 'gif', 'video', 'audio', 'pdf')),
  constraint bot_media_assets_status_check
    check (status in ('ACTIVE', 'INACTIVE'))
);

-- Asociación mensaje ↔ multimedia
create table if not exists public.bot_message_media (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.bot_messages (id) on delete cascade,
  media_id uuid not null references public.bot_media_assets (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint bot_message_media_unique unique (message_id, media_id)
);

create index if not exists bot_messages_category_idx on public.bot_messages (category_id);
create index if not exists bot_messages_status_idx on public.bot_messages (status);
create index if not exists bot_messages_code_idx on public.bot_messages (code);
create index if not exists bot_message_versions_message_idx
  on public.bot_message_versions (message_id, version desc);
create index if not exists bot_media_assets_type_idx on public.bot_media_assets (media_type);
create index if not exists bot_media_assets_tags_idx on public.bot_media_assets using gin (tags);
create index if not exists bot_message_media_message_idx on public.bot_message_media (message_id);

alter table public.bot_message_categories enable row level security;
alter table public.bot_messages enable row level security;
alter table public.bot_message_versions enable row level security;
alter table public.bot_media_assets enable row level security;
alter table public.bot_message_media enable row level security;

drop policy if exists bot_message_categories_deny_all on public.bot_message_categories;
create policy bot_message_categories_deny_all
  on public.bot_message_categories for all to anon, authenticated
  using (false) with check (false);

drop policy if exists bot_messages_deny_all on public.bot_messages;
create policy bot_messages_deny_all
  on public.bot_messages for all to anon, authenticated
  using (false) with check (false);

drop policy if exists bot_message_versions_deny_all on public.bot_message_versions;
create policy bot_message_versions_deny_all
  on public.bot_message_versions for all to anon, authenticated
  using (false) with check (false);

drop policy if exists bot_media_assets_deny_all on public.bot_media_assets;
create policy bot_media_assets_deny_all
  on public.bot_media_assets for all to anon, authenticated
  using (false) with check (false);

drop policy if exists bot_message_media_deny_all on public.bot_message_media;
create policy bot_message_media_deny_all
  on public.bot_message_media for all to anon, authenticated
  using (false) with check (false);

-- Bucket Storage (privado; el panel usa service role)
insert into storage.buckets (id, name, public, file_size_limit)
values ('bot-cms-media', 'bot-cms-media', false, 52428800)
on conflict (id) do nothing;

-- Semilla categorías
insert into public.bot_message_categories (code, name, description, sort_order)
values
  ('BIENVENIDA', 'Bienvenida', 'Saludos y onboarding', 10),
  ('MOVILIDAD', 'Movilidad', 'Flujo de viaje / servicio', 20),
  ('CONDUCTORES', 'Conductores', 'Comunicación con conductores', 30),
  ('PAGOS', 'Pagos', 'Cobros y tarifas', 40),
  ('ERRORES', 'Errores', 'Mensajes de error y fallback', 50),
  ('PROMOCIONES', 'Promociones', 'Campañas y ofertas', 60),
  ('SEGURIDAD', 'Seguridad', 'Alertas y validaciones', 70),
  ('ADMINISTRACION', 'Administración', 'Mensajes internos / ops', 80)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Semilla IDs de mensajes (borrador) para consumo futuro por WhatXia Basic
insert into public.bot_messages (code, name, category_id, body, available_variables, status, version)
select
  m.code,
  m.name,
  c.id,
  m.body,
  m.vars::jsonb,
  'DRAFT',
  1
from (
  values
    (
      'WELCOME_MESSAGE',
      'Mensaje de bienvenida',
      'BIENVENIDA',
      'Hola {{nombre}}, bienvenido a WhatXia.',
      '["nombre"]'
    ),
    (
      'TRIP_CONFIRMED',
      'Servicio confirmado',
      'MOVILIDAD',
      'Tu viaje de {{origen}} a {{destino}} fue confirmado. Tarifa estimada: {{tarifa}}.',
      '["origen","destino","tarifa"]'
    ),
    (
      'NO_DRIVERS_AVAILABLE',
      'Sin conductores disponibles',
      'MOVILIDAD',
      'En este momento no hay conductores disponibles cerca de {{origen}}. Intenta de nuevo en unos minutos.',
      '["origen"]'
    ),
    (
      'TRIP_COMPLETED',
      'Servicio finalizado',
      'MOVILIDAD',
      'Viaje finalizado. Conductor {{conductor}} ({{placa}}). Gracias por viajar con WhatXia.',
      '["conductor","placa"]'
    )
) as m(code, name, cat_code, body, vars)
join public.bot_message_categories c on c.code = m.cat_code
on conflict (code) do nothing;

comment on table public.bot_messages is
  'CMS de mensajes del bot. Consumo futuro por WhatXia Basic vía code (ID único).';
comment on table public.bot_media_assets is
  'Biblioteca multimedia del Bot Manager CMS.';
comment on table public.bot_message_versions is
  'Historial de versiones de mensajes CMS.';
