# 09 — Centro de Administración del Bot (BOT-ADMIN-001)

**Producto:** WhatXia Operations Panel  
**Estado:** Infraestructura administrativa lista (WhatXia Basic aún NO consume esta configuración en runtime)

---

## Propósito

Administrar el comportamiento y contenido del bot desde el Operations Center **sin modificar código**:

- Mensajes (texto/emoji, imagen, sticker, audio, video, documento, ubicación, interactivo)
- Componentes WhatsApp (botones, listas, opciones, variables, orden)
- Biblioteca multimedia
- Configuración por mensaje (activo, categoría, módulo, ambiente, versión, borrador/publicado)
- Historial con quién/cuándo y restauración
- Vista previa estilo WhatsApp

Acceso exclusivo vía permiso `bot_cms` (rol **Desarrollador** / SUPERADMIN). Los operadores (`OPS_ADMIN`) no pueden modificar mensajes ni flujos.

---

## Migraciones

1. `supabase/migrations/004_bot_manager_cms.sql` — esquema base CMS  
2. `supabase/migrations/009_bot_admin_center.sql` — extensión BOT-ADMIN-001 + rol DEVELOPER  

Guía: `scripts/apply-bot-admin-center-migration.md`

---

## Campos de mensaje (009)

| Campo | Valores / notas |
|--------|------------------|
| `content_type` | `text` \| `image` \| `sticker` \| `audio` \| `video` \| `document` \| `location` \| `interactive` |
| `module` | Catálogo libre (ONBOARDING, MOVILIDAD, …) |
| `environment` | `PRODUCTION` \| `TEST` |
| `location_payload` | jsonb `{ latitude, longitude, name?, address? }` |
| `interactive_payload` | jsonb botones / listas / opciones + orden |
| `status` | `DRAFT` \| `PUBLISHED` |
| `is_active` | Activo / inactivo |
| `version` | Incrementa en cada edición |

Las versiones guardan snapshot de body, media, content_type, module, environment, location e interactive.

### Media

Tipos: `sticker`, `image`, `gif`, `video`, `audio`, `pdf`, `document`.

---

## Seguridad

| Rol | `bot_cms` |
|-----|-----------|
| SUPERADMIN | admin |
| DEVELOPER | admin |
| OPS_ADMIN | none |

APIs bajo `/api/admin/bot/*` exigen módulo `bot_cms`. Mutaciones: reautenticación + auditoría.

---

## APIs (admin)

| Método | Ruta | Acción |
|--------|------|--------|
| GET/POST | `/api/admin/bot/categories` | Listar / crear |
| PATCH/DELETE | `/api/admin/bot/categories/[id]` | Editar / eliminar |
| GET/POST | `/api/admin/bot/messages` | Listar (q, category, status, tag, environment, module) / crear |
| GET/PATCH/DELETE | `/api/admin/bot/messages/[id]` | Detalle / editar / eliminar |
| GET/POST | `/api/admin/bot/messages/[id]/versions` | Historial / restaurar |
| GET/POST | `/api/admin/bot/media` | Listar / upload multipart o URL JSON |
| PATCH/DELETE | `/api/admin/bot/media/[id]` | Editar / eliminar |

---

## UI

Ruta: `/admin/bot` — **Centro de Administración del Bot**

Pestañas: Mensajes · Multimedia · Categorías

Incluye editor de componentes WA, emojis rápidos, variables (`{{nombre}}`, …) y preview tipo WhatsApp.

---

## Integración futura

WhatXia Basic deberá resolver contenido por `code` donde `status = 'PUBLISHED'` (y opcionalmente `is_active` / `environment`).  
Este panel no escribe ni lee el runtime del bot hoy.
