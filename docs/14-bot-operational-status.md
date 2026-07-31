# 14 — Estado operativo del bot (OPS-SYS-001)

**Producto:** WhatXia Operations Panel  
**Depende de:** SYS-001 (MVP) — tabla `bot_operational_status`

---

## Propósito

Interfaz de administración para el estado operativo del bot WhatsApp:

- 🟢 **Activo** — flujos normales  
- 🟡 **Mantenimiento** — solo mensaje configurado  

Sin lógica nueva de runtime: el panel escribe la misma fila que el bot ya consulta.

---

## Ubicación UI

`Parámetros → Sistema → Estado del Bot`  
Ruta: `/admin/parametros/sistema/estado-bot`

---

## Base de datos

Tabla singleton `public.bot_operational_status` (`id = 1`):

| Campo | Valores |
|-------|---------|
| `status` | `ACTIVE` \| `MAINTENANCE` |
| `maintenance_message` | Texto enviado en mantenimiento |
| `cms_message_code` | `SYS_BOT_MAINTENANCE` |
| `updated_at` / `updated_by_email` / `updated_by_id` | Auditoría de cambio |

Migraciones:

- MVP: `043_bot_operational_status.sql`  
- Panel: `012_bot_operational_status.sql` (idempotente)

---

## API

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/api/admin/bot-operational-status` | `configuration` read |
| PATCH | `/api/admin/bot-operational-status` | `configuration` edit (+ reauth/audit) |

Body PATCH:

```json
{
  "status": "ACTIVE" | "MAINTENANCE",
  "maintenanceMessage": "…"
}
```

Al guardar se sincroniza `bot_messages` código `SYS_BOT_MAINTENANCE` (PUBLISHED).

---

## Criterios

- Cambiar a Mantenimiento → bot solo responde con el mensaje.  
- Volver a Activo → flujo normal de inmediato (sin redeploy).  
- Panel y MVP comparten la misma configuración en DB.
