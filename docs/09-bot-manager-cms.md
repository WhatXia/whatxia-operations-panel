# 09 — Bot Manager CMS

**Producto:** WhatXia Operations Panel  
**Sprint:** 11  
**Estado:** Infraestructura administrativa lista (WhatXia Basic aún NO consume esta configuración)

---

## Propósito

Centro de administración de contenido del bot: mensajes, variables, multimedia, categorías, versiones y publicación.

- No modifica el runtime del bot ni WhatsApp Cloud API.
- No cambia prompts ni flujo conversacional.
- El consumo futuro por WhatXia Basic será por **IDs únicos** (`code`), nunca por texto fijo.

---

## Migración

Archivo: `supabase/migrations/004_bot_manager_cms.sql`

Aplicar en el SQL Editor de Supabase (mismo proyecto que el panel).

---

## Tablas nuevas

### `bot_message_categories`

Categorías configurables (Bienvenida, Movilidad, etc.).

| Columna | Tipo | Notas |
|--------|------|--------|
| `id` | uuid PK | |
| `code` | text unique | Ej. `BIENVENIDA` |
| `name` | text | |
| `description` | text | |
| `is_active` | boolean | |
| `sort_order` | integer | |
| `created_at` / `updated_at` | timestamptz | |

### `bot_messages`

Mensajes CMS consumibles a futuro por `code`.

| Columna | Tipo | Notas |
|--------|------|--------|
| `id` | uuid PK | |
| `code` | text unique | Ej. `WELCOME_MESSAGE` |
| `name` | text | |
| `category_id` | uuid FK nullable | → categorías |
| `body` | text | Soporta `{{variable}}` |
| `available_variables` | jsonb | Detectadas del body |
| `status` | text | `DRAFT` \| `PUBLISHED` |
| `version` | integer | Incrementa en cada edición |
| `is_active` | boolean | Soft enable |
| `created_by_*` / `updated_by_*` | email/id | Responsable |
| `created_at` / `updated_at` | timestamptz | |

Solo mensajes `PUBLISHED` deberán usarse cuando Basic se integre.

### `bot_message_versions`

Historial completo (quién, cuándo, snapshot de body/name/status/media).

| Columna | Tipo | Notas |
|--------|------|--------|
| `id` | uuid PK | |
| `message_id` | uuid FK | cascade delete |
| `version` | integer | unique por mensaje |
| `body`, `name`, `status`, … | snapshot | |
| `media_ids` | jsonb | IDs asociados en ese momento |
| `changed_by_email` / `changed_by_id` | | |
| `change_note` | text | |
| `created_at` | timestamptz | |

Restaurar = aplicar snapshot y generar nueva versión.

### `bot_media_assets`

Biblioteca: sticker, image, gif, video, audio, pdf.

| Columna | Tipo | Notas |
|--------|------|--------|
| `id` | uuid PK | |
| `code` | text unique nullable | Opcional |
| `name`, `description` | text | |
| `media_type` | text | tipos cerrados |
| `mime_type`, `size_bytes` | | |
| `storage_path` | text | bucket `bot-cms-media` |
| `public_url` / `external_url` | text | preview / URL externa |
| `tags` | text[] | |
| `status` | `ACTIVE` \| `INACTIVE` | |
| timestamps / created_by | | |

### `bot_message_media`

N:M mensaje ↔ media con `sort_order`.

---

## Storage

Bucket privado: `bot-cms-media` (límite 50 MB).  
El panel accede con **service role**; RLS deniega `anon`/`authenticated` en tablas CMS.

---

## APIs (admin)

| Método | Ruta | Acción |
|--------|------|--------|
| GET/POST | `/api/admin/bot/categories` | Listar / crear |
| PATCH/DELETE | `/api/admin/bot/categories/[id]` | Editar / eliminar |
| GET/POST | `/api/admin/bot/messages` | Listar (q, category, status, tag) / crear |
| GET/PATCH/DELETE | `/api/admin/bot/messages/[id]` | Detalle / editar / eliminar |
| GET/POST | `/api/admin/bot/messages/[id]/versions` | Historial / restaurar |
| GET/POST | `/api/admin/bot/media` | Listar / upload multipart o URL JSON |
| PATCH/DELETE | `/api/admin/bot/media/[id]` | Editar / eliminar |

Permiso: módulo `configuration`.  
Mutaciones: reautenticación + auditoría (`BOT_MESSAGE_*`, `BOT_MEDIA_*`, `BOT_CATEGORY_*`).

---

## UI

Ruta: `/admin/bot` — **Bot Manager CMS**

Pestañas: Mensajes · Multimedia · Categorías

Incluye preview de variables con datos de ejemplo del catálogo (`nombre`, `origen`, `destino`, `tarifa`, `conductor`, `placa`, `tiempo_llegada`).

---

## Semillas

Categorías ejemplo + mensajes borrador:

- `WELCOME_MESSAGE`
- `TRIP_CONFIRMED`
- `NO_DRIVERS_AVAILABLE`
- `TRIP_COMPLETED`

---

## Integración futura (fuera de este sprint)

WhatXia Basic deberá resolver contenido por `code` donde `status = 'PUBLISHED'` (y opcionalmente `is_active`), incluyendo media asociada.  
Este panel no escribe ni lee el runtime del bot hoy.
