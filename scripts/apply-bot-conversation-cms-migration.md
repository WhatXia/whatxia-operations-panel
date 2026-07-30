# Aplicar migración 010 — Centro Conversacional (BOT-CMS-001)

## Requisitos

- Migraciones `004` (Bot Manager) y `009` (Centro Admin Bot) aplicadas.

## Archivo

`supabase/migrations/010_bot_conversation_cms.sql`

## Pasos

1. SQL Editor de Supabase (mismo proyecto panel + bot).
2. Ejecutar el contenido de `010_bot_conversation_cms.sql`.
3. En el panel: `/admin/bot` → pestaña **Conversaciones**.
4. Revisar árboles sembrados:
   - `PASSENGER_CONVERSATIONS` (Usuarios)
   - `DRIVER_CONVERSATIONS` (Conductores)
5. Editar nodos → **Publicar** cuando esté listo.
6. Opcional: definir `BOT_CMS_CONSUMER_SECRET` en `.env.local` del panel para `GET /api/bot-cms/published`.
7. En el bot: publicar mensajes (`NO_DRIVERS_AVAILABLE`, etc.) para que `resolvePublishedBody` los consuma; si no hay publicado, usa fallback de código.

## Nota

El bot **solo** debe usar árboles/mensajes con `status = 'PUBLISHED'` e `is_active = true`.
