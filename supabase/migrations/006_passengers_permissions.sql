-- OPS-USER-001: permisos para módulo de usuarios finales (passengers)
-- No altera la tabla passengers (ya existe en el bot). Solo matriz de roles del panel.

insert into public.app_role_permissions (role_id, module, level)
select r.id, 'passengers', 'admin'
from public.app_roles r
where r.code = 'SUPERADMIN'
on conflict on constraint app_role_permissions_unique
do update set level = excluded.level, updated_at = now();

insert into public.app_role_permissions (role_id, module, level)
select r.id, 'passengers', 'read'
from public.app_roles r
where r.code = 'OPS_ADMIN'
on conflict on constraint app_role_permissions_unique
do update set level = excluded.level, updated_at = now();

insert into public.app_role_permissions (role_id, module, level)
select r.id, 'incidents', 'read'
from public.app_roles r
where r.code = 'OPS_ADMIN'
on conflict on constraint app_role_permissions_unique
do update set
  level = case
    when app_role_permissions.level = 'none' then excluded.level
    else app_role_permissions.level
  end,
  updated_at = now();
