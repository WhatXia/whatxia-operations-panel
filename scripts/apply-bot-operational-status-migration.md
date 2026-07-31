# Aplicar migración 012 — Estado operativo del bot (OPS-SYS-001)

Misma tabla que SYS-001 del MVP (`bot_operational_status`).

## Archivo

`supabase/migrations/012_bot_operational_status.sql`

## Cuándo aplicarla

- Si ya ejecutaste `043_bot_operational_status.sql` en el MVP (mismo proyecto Supabase), **no es obligatorio**: la 012 es idempotente (`create table if not exists` + seed `on conflict do nothing`).
- Si la tabla aún no existe en el proyecto del panel, ejecuta la 012.

## Pasos

1. SQL Editor de Supabase (mismo proyecto panel + bot).
2. Ejecutar `012_bot_operational_status.sql`.
3. Ir a **Parámetros → Sistema → Estado del Bot**.
4. Probar: Mantenimiento → Guardar → mensaje único en WhatsApp → Activo → Guardar → flujo normal.

## Notas

- El panel solo escribe `bot_operational_status` y sincroniza `bot_messages.SYS_BOT_MAINTENANCE`.
- El bot lee esa fila (cache ~3s, gate con bypass). Sin redeploy.
