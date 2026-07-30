# Aplicar migración 009 — Centro de Administración del Bot

Extiende el Bot Manager CMS (`004`) con tipos de contenido, ambiente, componentes WhatsApp, rol **DEVELOPER** y módulo de permiso `bot_cms`.

## Archivo

`supabase/migrations/009_bot_admin_center.sql`

## Pasos

1. Abre el **SQL Editor** de Supabase (mismo proyecto que el panel / bot).
2. Confirma que ya aplicaste `004_bot_manager_cms.sql` (tablas `bot_messages`, etc.).
3. Pega y ejecuta el contenido de `009_bot_admin_center.sql`.
4. En el panel: **Admin → Roles** y verifica que exista el rol **Desarrollador** (`DEVELOPER`) con `bot_cms = admin`.
5. Asigna el rol **Desarrollador** al usuario correspondiente (o deja SUPERADMIN).
6. El usuario debe **cerrar sesión y volver a entrar** para refrescar el JWT de permisos.
7. OPS_ADMIN no debe ver ni editar `/admin/bot` (`bot_cms = none`).

## Qué agrega

- Columnas en `bot_messages`: `content_type`, `module`, `environment`, `location_payload`, `interactive_payload`
- Snapshots ampliados en `bot_message_versions`
- Tipo de media `document`
- Rol sistema `DEVELOPER`
- Permiso módulo `bot_cms` (SUPERADMIN/DEVELOPER: admin; OPS_ADMIN: none)

## UI

Ruta: `/admin/bot` — **Centro de Administración del Bot**
