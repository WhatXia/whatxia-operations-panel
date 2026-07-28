-- WhatXia Operations Center — Roles y permisos configurables
-- Compatibilidad: códigos SUPERADMIN / OPS_ADMIN se mantienen como roles de sistema.

create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  is_system boolean not null default false,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_roles_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,63}$')
);

create table if not exists public.app_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.app_roles (id) on delete cascade,
  module text not null,
  level text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_role_permissions_level_check
    check (level in ('none', 'read', 'create', 'edit', 'delete', 'admin')),
  constraint app_role_permissions_unique unique (role_id, module)
);

create index if not exists app_roles_active_idx on public.app_roles (is_active);
create index if not exists app_roles_superadmin_idx on public.app_roles (is_superadmin);
create index if not exists app_role_permissions_role_idx on public.app_role_permissions (role_id);
create index if not exists app_role_permissions_module_idx on public.app_role_permissions (module);

alter table public.app_roles enable row level security;
alter table public.app_role_permissions enable row level security;

drop policy if exists app_roles_deny_all on public.app_roles;
create policy app_roles_deny_all
  on public.app_roles
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists app_role_permissions_deny_all on public.app_role_permissions;
create policy app_role_permissions_deny_all
  on public.app_role_permissions
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Semilla: Superadministrador
insert into public.app_roles (code, name, description, is_active, is_system, is_superadmin)
values (
  'SUPERADMIN',
  'Superadministrador',
  'Acceso completo al Operations Center. No se puede eliminar.',
  true,
  true,
  true
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = true,
  is_superadmin = true,
  is_active = true,
  updated_at = now();

-- Semilla: Administrador de Operaciones
insert into public.app_roles (code, name, description, is_active, is_system, is_superadmin)
values (
  'OPS_ADMIN',
  'Administrador de Operaciones',
  'Acceso al entorno operativo. Sin administración del sistema.',
  true,
  true,
  false
)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = true,
  is_superadmin = false,
  updated_at = now();

-- Permisos SUPERADMIN (todos admin)
insert into public.app_role_permissions (role_id, module, level)
select r.id, m.module, 'admin'
from public.app_roles r
cross join (
  values
    ('dashboard'),
    ('services'),
    ('drivers'),
    ('metrics'),
    ('system_status'),
    ('incidents'),
    ('conversations'),
    ('users'),
    ('roles'),
    ('configuration'),
    ('ai'),
    ('integrations'),
    ('audit'),
    ('exports')
) as m(module)
where r.code = 'SUPERADMIN'
on conflict (role_id, module) do update set
  level = excluded.level,
  updated_at = now();

-- Permisos OPS_ADMIN (solo operativo)
insert into public.app_role_permissions (role_id, module, level)
select r.id, m.module, m.level
from public.app_roles r
cross join (
  values
    ('dashboard', 'read'),
    ('services', 'edit'),
    ('drivers', 'edit'),
    ('metrics', 'read'),
    ('system_status', 'read'),
    ('incidents', 'edit'),
    ('conversations', 'read'),
    ('users', 'none'),
    ('roles', 'none'),
    ('configuration', 'none'),
    ('ai', 'none'),
    ('integrations', 'none'),
    ('audit', 'none'),
    ('exports', 'read')
) as m(module, level)
where r.code = 'OPS_ADMIN'
on conflict (role_id, module) do update set
  level = excluded.level,
  updated_at = now();

comment on table public.app_roles is
  'Roles configurables del WhatXia Operations Center.';
comment on table public.app_role_permissions is
  'Matriz de permisos por rol y módulo.';
