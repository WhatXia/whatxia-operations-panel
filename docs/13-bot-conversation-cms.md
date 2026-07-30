# 13 — Centro de Administración Conversacional (BOT-CMS-001)

**Producto:** WhatXia Operations Panel  
**Depende de:** BOT-ADMIN-001 (`004`, `009`)

---

## Propósito

CMS para administrar **todo el contenido conversacional** del bot sin modificar código:

- Árboles de **Usuarios** y **Conductores**
- Nodos editables (texto, emoji, media, ubicación, botones, listas, variables)
- Conexiones navegables (edges)
- Borrador / Publicado / historial / restaurar
- Vista previa WhatsApp
- Acceso solo **Desarrollador** (`bot_cms`)
- Runtime del bot: **solo configuración PUBLISHED**

---

## Migración

`supabase/migrations/010_bot_conversation_cms.sql`

Guía: `scripts/apply-bot-conversation-cms-migration.md`

### Tablas

| Tabla | Rol |
|-------|-----|
| `bot_conversation_trees` | Árbol (audience PASSENGER\|DRIVER, status, version, environment) |
| `bot_conversation_nodes` | Nodos de contenido |
| `bot_conversation_edges` | Conexiones (button/list/default/…) |
| `bot_conversation_node_media` | Media por nodo |
| `bot_conversation_tree_versions` | Snapshots versionados |

Semillas: `PASSENGER_CONVERSATIONS`, `DRIVER_CONVERSATIONS` con etapas y edges.

---

## UI

`/admin/bot` → pestaña **Conversaciones**

- Lista de árboles (Usuarios / Conductores)
- Navegación y búsqueda de nodos
- Editor de nodo + preview WA
- Mapa de conexiones + CRUD de edges
- Publicar / borrador / historial / restaurar

Pestañas heredadas: Mensajes · Multimedia · Categorías

---

## APIs admin (`bot_cms`)

| Ruta | Uso |
|------|-----|
| `/api/admin/bot/conversations` | Listar / crear árboles |
| `/api/admin/bot/conversations/[id]` | Detalle / patch / publish / delete |
| `/api/admin/bot/conversations/[id]/nodes` | Crear nodo |
| `/api/admin/bot/conversations/[id]/nodes/[nodeId]` | Editar / eliminar |
| `/api/admin/bot/conversations/[id]/edges` | Upsert / delete edge |
| `/api/admin/bot/conversations/[id]/versions` | Historial / restaurar |

## Consumo publicado (bot)

| Ruta | Auth |
|------|------|
| `GET /api/bot-cms/published` | Header `x-bot-cms-secret` = `BOT_CMS_CONSUMER_SECRET` |

Query:

- `?tree=PASSENGER_CONVERSATIONS`
- `?message=NO_DRIVERS_AVAILABLE`
- `?audience=DRIVER&environment=PRODUCTION`

WhatXia Basic también puede leer tablas directamente con service role filtrando `status = 'PUBLISHED'`.  
Módulo de referencia en el bot: `src/lib/bot-cms/resolve.ts` (fallback a copy hardcodeada si no hay publicado).

---

## Seguridad

Solo rol **Desarrollador** / SUPERADMIN vía permiso `bot_cms`. OPS no edita flujos.
