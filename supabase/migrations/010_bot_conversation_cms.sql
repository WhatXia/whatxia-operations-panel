-- BOT-CMS-001 — Centro de Administración Conversacional
-- Árboles, nodos, conexiones, versionado. El bot solo debe consumir árboles PUBLISHED.

-- ─── Árboles ────────────────────────────────────────────────────────────────

create table if not exists public.bot_conversation_trees (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  audience text not null,
  status text not null default 'DRAFT',
  version integer not null default 1,
  is_active boolean not null default true,
  environment text not null default 'PRODUCTION',
  root_node_id uuid,
  created_by_email text,
  created_by_id uuid,
  updated_by_email text,
  updated_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_conversation_trees_code_check
    check (code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint bot_conversation_trees_audience_check
    check (audience in ('PASSENGER', 'DRIVER')),
  constraint bot_conversation_trees_status_check
    check (status in ('DRAFT', 'PUBLISHED')),
  constraint bot_conversation_trees_environment_check
    check (environment in ('PRODUCTION', 'TEST'))
);

create index if not exists bot_conversation_trees_audience_idx
  on public.bot_conversation_trees (audience);

create index if not exists bot_conversation_trees_status_idx
  on public.bot_conversation_trees (status);

-- ─── Nodos ──────────────────────────────────────────────────────────────────

create table if not exists public.bot_conversation_nodes (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.bot_conversation_trees (id) on delete cascade,
  code text not null,
  name text not null,
  stage text,
  content_type text not null default 'text',
  body text not null default '',
  available_variables jsonb not null default '[]'::jsonb,
  location_payload jsonb,
  interactive_payload jsonb not null default '{}'::jsonb,
  message_code text,
  is_entry boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  position_x integer not null default 0,
  position_y integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bot_conversation_nodes_code_check
    check (code ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint bot_conversation_nodes_tree_code_unique unique (tree_id, code),
  constraint bot_conversation_nodes_content_type_check
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
    )
);

create index if not exists bot_conversation_nodes_tree_idx
  on public.bot_conversation_nodes (tree_id);

create index if not exists bot_conversation_nodes_stage_idx
  on public.bot_conversation_nodes (tree_id, stage);

-- ─── Edges (conexiones) ─────────────────────────────────────────────────────

create table if not exists public.bot_conversation_edges (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.bot_conversation_trees (id) on delete cascade,
  from_node_id uuid not null references public.bot_conversation_nodes (id) on delete cascade,
  to_node_id uuid not null references public.bot_conversation_nodes (id) on delete cascade,
  label text not null default '',
  trigger_type text not null default 'button',
  trigger_value text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint bot_conversation_edges_trigger_check
    check (trigger_type in ('button', 'list', 'option', 'text', 'default', 'variable')),
  constraint bot_conversation_edges_no_self check (from_node_id <> to_node_id)
);

create index if not exists bot_conversation_edges_tree_idx
  on public.bot_conversation_edges (tree_id);

create index if not exists bot_conversation_edges_from_idx
  on public.bot_conversation_edges (from_node_id);

-- ─── Media por nodo ─────────────────────────────────────────────────────────

create table if not exists public.bot_conversation_node_media (
  node_id uuid not null references public.bot_conversation_nodes (id) on delete cascade,
  media_id uuid not null references public.bot_media_assets (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (node_id, media_id)
);

-- FK root_node opcional (tras crear nodos)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'bot_conversation_trees_root_fk'
  ) then
    alter table public.bot_conversation_trees
      add constraint bot_conversation_trees_root_fk
      foreign key (root_node_id)
      references public.bot_conversation_nodes (id)
      on delete set null;
  end if;
end $$;

-- ─── Versiones (snapshot completo del árbol) ────────────────────────────────

create table if not exists public.bot_conversation_tree_versions (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.bot_conversation_trees (id) on delete cascade,
  version integer not null,
  status text not null,
  snapshot jsonb not null,
  change_note text,
  changed_by_email text,
  changed_by_id uuid,
  created_at timestamptz not null default now(),
  constraint bot_conversation_tree_versions_unique unique (tree_id, version)
);

-- ─── RLS (service role only desde panel / bot) ──────────────────────────────

alter table public.bot_conversation_trees enable row level security;
alter table public.bot_conversation_nodes enable row level security;
alter table public.bot_conversation_edges enable row level security;
alter table public.bot_conversation_node_media enable row level security;
alter table public.bot_conversation_tree_versions enable row level security;

drop policy if exists bot_conversation_trees_deny_all on public.bot_conversation_trees;
create policy bot_conversation_trees_deny_all
  on public.bot_conversation_trees for all using (false) with check (false);

drop policy if exists bot_conversation_nodes_deny_all on public.bot_conversation_nodes;
create policy bot_conversation_nodes_deny_all
  on public.bot_conversation_nodes for all using (false) with check (false);

drop policy if exists bot_conversation_edges_deny_all on public.bot_conversation_edges;
create policy bot_conversation_edges_deny_all
  on public.bot_conversation_edges for all using (false) with check (false);

drop policy if exists bot_conversation_node_media_deny_all on public.bot_conversation_node_media;
create policy bot_conversation_node_media_deny_all
  on public.bot_conversation_node_media for all using (false) with check (false);

drop policy if exists bot_conversation_tree_versions_deny_all on public.bot_conversation_tree_versions;
create policy bot_conversation_tree_versions_deny_all
  on public.bot_conversation_tree_versions for all using (false) with check (false);

-- ─── Semillas: Usuarios (pasajeros) ─────────────────────────────────────────

insert into public.bot_conversation_trees (
  code, name, description, audience, status, environment
)
values (
  'PASSENGER_CONVERSATIONS',
  'Conversaciones de Usuarios',
  'Flujo conversacional completo de pasajeros / pioneros.',
  'PASSENGER',
  'DRAFT',
  'PRODUCTION'
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

insert into public.bot_conversation_trees (
  code, name, description, audience, status, environment
)
values (
  'DRIVER_CONVERSATIONS',
  'Conversaciones de Conductores',
  'Registro, activación, ofertas, viajes, incidencias, suspensiones y finalización.',
  'DRIVER',
  'DRAFT',
  'PRODUCTION'
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();

-- Nodos pasajero
with tree as (
  select id from public.bot_conversation_trees where code = 'PASSENGER_CONVERSATIONS'
),
upserted as (
  insert into public.bot_conversation_nodes (
    tree_id, code, name, stage, content_type, body, interactive_payload,
    message_code, is_entry, sort_order, position_x, position_y
  )
  select
    tree.id,
    n.code,
    n.name,
    n.stage,
    n.content_type,
    n.body,
    n.interactive_payload::jsonb,
    n.message_code,
    n.is_entry,
    n.sort_order,
    n.position_x,
    n.position_y
  from tree
  cross join (
    values
      (
        'P_WELCOME',
        'Bienvenida',
        'ONBOARDING',
        'interactive',
        E'¡Hola {{nombre}}! 👋\nSoy WhatXia. ¿En qué te ayudo?',
        '{"kind":"buttons","buttons":[{"id":"solicitar_servicio","title":"Solicitar viaje","sort_order":0},{"id":"menu_ayuda","title":"Ayuda","sort_order":1}]}',
        'WELCOME_MESSAGE',
        true,
        0,
        80,
        40
      ),
      (
        'P_REQUEST_PICKUP',
        'Pedir origen',
        'MOVILIDAD',
        'text',
        E'📍 Indica tu punto de recogida (comparte ubicación o escribe la dirección).',
        '{}',
        null,
        false,
        1,
        80,
        180
      ),
      (
        'P_REQUEST_DROPOFF',
        'Pedir destino',
        'MOVILIDAD',
        'text',
        E'🎯 ¿A dónde vas? Escribe el destino o comparte la ubicación.',
        '{}',
        null,
        false,
        2,
        80,
        320
      ),
      (
        'P_QUOTE_CONFIRM',
        'Confirmar tarifa',
        'MOVILIDAD',
        'interactive',
        E'Viaje {{origen}} → {{destino}}\nTarifa estimada: {{tarifa}}\n¿Confirmas?',
        '{"kind":"buttons","buttons":[{"id":"booking_confirm","title":"Confirmar","sort_order":0},{"id":"booking_cancel","title":"Cancelar","sort_order":1}]}',
        'TRIP_CONFIRMED',
        false,
        3,
        80,
        460
      ),
      (
        'P_SEARCHING',
        'Buscando conductor',
        'MOVILIDAD',
        'interactive',
        E'🔎 Buscando conductor cercano…\nTe avisamos en cuanto haya oferta.',
        '{"kind":"buttons","buttons":[{"id":"search_continue","title":"Seguir buscando","sort_order":0},{"id":"search_cancel","title":"Cancelar","sort_order":1}]}',
        null,
        false,
        4,
        320,
        460
      ),
      (
        'P_NO_DRIVERS',
        'Sin conductores',
        'MOVILIDAD',
        'interactive',
        E'Por ahora no hay conductores disponibles cerca. ¿Quieres que sigamos buscando?',
        '{"kind":"buttons","buttons":[{"id":"search_continue","title":"Seguir","sort_order":0},{"id":"search_cancel","title":"Cancelar","sort_order":1}]}',
        'NO_DRIVERS_AVAILABLE',
        false,
        5,
        560,
        460
      ),
      (
        'P_TRIP_ACTIVE',
        'Viaje en curso',
        'MOVILIDAD',
        'text',
        E'🚗 Conductor {{conductor}} · Placa {{placa}}\nLlegada estimada: {{tiempo_llegada}}',
        '{}',
        null,
        false,
        6,
        320,
        600
      ),
      (
        'P_TRIP_COMPLETED',
        'Viaje finalizado',
        'MOVILIDAD',
        'interactive',
        E'✅ Viaje completado. ¡Gracias por viajar con WhatXia!\n¿Cómo calificas el servicio?',
        '{"kind":"buttons","buttons":[{"id":"rating_5","title":"⭐⭐⭐⭐⭐","sort_order":0},{"id":"rating_4","title":"⭐⭐⭐⭐","sort_order":1},{"id":"rating_3","title":"⭐⭐⭐","sort_order":2}]}',
        'TRIP_COMPLETED',
        false,
        7,
        320,
        740
      ),
      (
        'P_SUPPORT',
        'Soporte',
        'SOPORTE',
        'text',
        E'Estamos aquí para ayudarte. Describe tu incidencia y un operador te contactará.',
        '{}',
        null,
        false,
        8,
        560,
        180
      )
  ) as n(code, name, stage, content_type, body, interactive_payload, message_code, is_entry, sort_order, position_x, position_y)
  on conflict (tree_id, code) do update set
    name = excluded.name,
    stage = excluded.stage,
    body = excluded.body,
    content_type = excluded.content_type,
    interactive_payload = excluded.interactive_payload,
    message_code = excluded.message_code,
    is_entry = excluded.is_entry,
    sort_order = excluded.sort_order,
    position_x = excluded.position_x,
    position_y = excluded.position_y,
    updated_at = now()
  returning id, code, tree_id
)
select 1;

-- Nodos conductor
with tree as (
  select id from public.bot_conversation_trees where code = 'DRIVER_CONVERSATIONS'
)
insert into public.bot_conversation_nodes (
  tree_id, code, name, stage, content_type, body, interactive_payload,
  message_code, is_entry, sort_order, position_x, position_y
)
select
  tree.id,
  n.code,
  n.name,
  n.stage,
  n.content_type,
  n.body,
  n.interactive_payload::jsonb,
  n.message_code,
  n.is_entry,
  n.sort_order,
  n.position_x,
  n.position_y
from tree
cross join (
  values
    (
      'D_ENTRY',
      'Entrada conductor',
      'ACTIVACION',
      'interactive',
      E'🚕 Modo conductor WhatXia.\nElige una opción para continuar.',
      '{"kind":"buttons","buttons":[{"id":"driver_login","title":"Ingresar","sort_order":0},{"id":"driver_reg_start","title":"Registrarme","sort_order":1}]}',
      null,
      true,
      0,
      80,
      40
    ),
    (
      'D_REGISTRATION',
      'Registro',
      'REGISTRO',
      'text',
      E'📝 Vamos a registrar tu perfil de conductor. Responde cada dato cuando te lo pidamos.',
      '{}',
      null,
      false,
      1,
      80,
      180
    ),
    (
      'D_ACTIVATION',
      'Activación / menú',
      'ACTIVACION',
      'interactive',
      E'✅ Cuenta activa. ¿Qué deseas hacer?',
      '{"kind":"buttons","buttons":[{"id":"menu_disponible","title":"Disponible","sort_order":0},{"id":"menu_mi_cuenta","title":"Mi cuenta","sort_order":1},{"id":"menu_referidos","title":"Referidos","sort_order":2}]}',
      null,
      false,
      2,
      320,
      180
    ),
    (
      'D_OFFER',
      'Oferta de viaje',
      'OFERTAS',
      'interactive',
      E'🔔 Nueva oferta\n{{origen}} → {{destino}}\nTarifa: {{tarifa}}\n¿Aceptas?',
      '{"kind":"buttons","buttons":[{"id":"aceptar_servicio","title":"Aceptar","sort_order":0},{"id":"rechazar_servicio","title":"Rechazar","sort_order":1}]}',
      null,
      false,
      3,
      320,
      320
    ),
    (
      'D_TRIP_ACTIVE',
      'Viaje activo',
      'VIAJES',
      'interactive',
      E'🚗 Viaje en curso hacia {{destino}}.\nUsa los botones para actualizar el estado.',
      '{"kind":"buttons","buttons":[{"id":"llegue_recogida","title":"Llegué","sort_order":0},{"id":"iniciar_viaje","title":"Iniciar","sort_order":1},{"id":"finalizar_viaje","title":"Finalizar","sort_order":2}]}',
      null,
      false,
      4,
      320,
      460
    ),
    (
      'D_INCIDENT',
      'Incidencias',
      'INCIDENCIAS',
      'interactive',
      E'⚠️ Reportar incidencia. Selecciona el tipo o escribe el detalle.',
      '{"kind":"list","listButtonText":"Tipos","header":"Incidencia","sections":[{"title":"Tipos","rows":[{"id":"inc_pasajero","title":"Con pasajero","sort_order":0},{"id":"inc_vehiculo","title":"Vehículo","sort_order":1},{"id":"inc_otro","title":"Otro","sort_order":2}]}]}',
      null,
      false,
      5,
      560,
      320
    ),
    (
      'D_SUSPENSION',
      'Suspensión',
      'SUSPENSIONES',
      'text',
      E'⛔ Tu cuenta está temporalmente suspendida. Contacta a operaciones para más información.',
      '{}',
      null,
      false,
      6,
      560,
      460
    ),
    (
      'D_TRIP_FINISH',
      'Finalización',
      'FINALIZACION',
      'text',
      E'✅ Viaje finalizado. ¡Buen trabajo!\nResumen disponible en tu menú de cuenta.',
      '{}',
      null,
      false,
      7,
      320,
      600
    )
) as n(code, name, stage, content_type, body, interactive_payload, message_code, is_entry, sort_order, position_x, position_y)
on conflict (tree_id, code) do update set
  name = excluded.name,
  stage = excluded.stage,
  body = excluded.body,
  content_type = excluded.content_type,
  interactive_payload = excluded.interactive_payload,
  is_entry = excluded.is_entry,
  sort_order = excluded.sort_order,
  position_x = excluded.position_x,
  position_y = excluded.position_y,
  updated_at = now();

-- Root nodes
update public.bot_conversation_trees t
set root_node_id = n.id
from public.bot_conversation_nodes n
where t.code = 'PASSENGER_CONVERSATIONS'
  and n.tree_id = t.id
  and n.code = 'P_WELCOME';

update public.bot_conversation_trees t
set root_node_id = n.id
from public.bot_conversation_nodes n
where t.code = 'DRIVER_CONVERSATIONS'
  and n.tree_id = t.id
  and n.code = 'D_ENTRY';

-- Edges pasajero (idempotente: borrar y recrear semillas por árbol)
delete from public.bot_conversation_edges e
using public.bot_conversation_trees t
where e.tree_id = t.id
  and t.code in ('PASSENGER_CONVERSATIONS', 'DRIVER_CONVERSATIONS');

insert into public.bot_conversation_edges (
  tree_id, from_node_id, to_node_id, label, trigger_type, trigger_value, sort_order
)
select
  t.id,
  f.id,
  dest.id,
  e.label,
  e.trigger_type,
  e.trigger_value,
  e.sort_order
from public.bot_conversation_trees t
join (
  values
    ('PASSENGER_CONVERSATIONS', 'P_WELCOME', 'P_REQUEST_PICKUP', 'Solicitar viaje', 'button', 'solicitar_servicio', 0),
    ('PASSENGER_CONVERSATIONS', 'P_WELCOME', 'P_SUPPORT', 'Ayuda', 'button', 'menu_ayuda', 1),
    ('PASSENGER_CONVERSATIONS', 'P_REQUEST_PICKUP', 'P_REQUEST_DROPOFF', 'Origen recibido', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_REQUEST_DROPOFF', 'P_QUOTE_CONFIRM', 'Destino recibido', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_QUOTE_CONFIRM', 'P_SEARCHING', 'Confirmar', 'button', 'booking_confirm', 0),
    ('PASSENGER_CONVERSATIONS', 'P_SEARCHING', 'P_TRIP_ACTIVE', 'Conductor asignado', 'default', '', 0),
    ('PASSENGER_CONVERSATIONS', 'P_SEARCHING', 'P_NO_DRIVERS', 'Sin oferta', 'default', 'no_drivers', 1),
    ('PASSENGER_CONVERSATIONS', 'P_NO_DRIVERS', 'P_SEARCHING', 'Seguir', 'button', 'search_continue', 0),
    ('PASSENGER_CONVERSATIONS', 'P_TRIP_ACTIVE', 'P_TRIP_COMPLETED', 'Finalizar', 'default', '', 0),
    ('DRIVER_CONVERSATIONS', 'D_ENTRY', 'D_REGISTRATION', 'Registrarme', 'button', 'driver_reg_start', 0),
    ('DRIVER_CONVERSATIONS', 'D_ENTRY', 'D_ACTIVATION', 'Ingresar', 'button', 'driver_login', 1),
    ('DRIVER_CONVERSATIONS', 'D_REGISTRATION', 'D_ACTIVATION', 'Registro completo', 'default', '', 0),
    ('DRIVER_CONVERSATIONS', 'D_ACTIVATION', 'D_OFFER', 'Disponible', 'button', 'menu_disponible', 0),
    ('DRIVER_CONVERSATIONS', 'D_OFFER', 'D_TRIP_ACTIVE', 'Aceptar', 'button', 'aceptar_servicio', 0),
    ('DRIVER_CONVERSATIONS', 'D_TRIP_ACTIVE', 'D_TRIP_FINISH', 'Finalizar', 'button', 'finalizar_viaje', 0),
    ('DRIVER_CONVERSATIONS', 'D_ACTIVATION', 'D_INCIDENT', 'Incidencia', 'button', 'menu_reportar', 1),
    ('DRIVER_CONVERSATIONS', 'D_ACTIVATION', 'D_SUSPENSION', 'Suspendido', 'default', 'suspended', 2)
) as e(tree_code, from_code, to_code, label, trigger_type, trigger_value, sort_order)
  on t.code = e.tree_code
join public.bot_conversation_nodes f
  on f.tree_id = t.id and f.code = e.from_code
join public.bot_conversation_nodes dest
  on dest.tree_id = t.id and dest.code = e.to_code;

comment on table public.bot_conversation_trees is
  'BOT-CMS-001: árboles conversacionales (pasajero/conductor). Solo PUBLISHED debe consumirse en runtime.';

comment on table public.bot_conversation_nodes is
  'BOT-CMS-001: nodos editables del flujo (texto, media, botones, listas, variables).';

comment on table public.bot_conversation_edges is
  'BOT-CMS-001: conexiones entre nodos (botón/lista/default).';
