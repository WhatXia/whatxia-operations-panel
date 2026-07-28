# Aplicar migración 004 — Bot Manager CMS

1. Abre el **SQL Editor** del proyecto Supabase compartido.
2. Pega el contenido de `supabase/migrations/004_bot_manager_cms.sql`.
3. Ejecuta el script.
4. Verifica:
   - Tablas: `bot_message_categories`, `bot_messages`, `bot_message_versions`, `bot_media_assets`, `bot_message_media`
   - Bucket Storage: `bot-cms-media`
   - Semillas: categorías + mensajes `WELCOME_MESSAGE`, `TRIP_CONFIRMED`, etc.
5. Recarga `/admin/bot` en el Operations Panel.

Documentación: `docs/09-bot-manager-cms.md`
