# 12 — Programas de Lanzamiento (CFG-001)

**Producto:** WhatXia Operations Center + Bot Mobility  
**Ubicación UI:** Parámetros → Programas de Lanzamiento → Pioneros

---

## Objetivo

Administrar el programa **Pioneros** (y futuros programas) desde el panel, sin `PRE_LAUNCH_MODE` ni cupos/fechas hardcodeados en el bot.

---

## Migración

`supabase/migrations/008_launch_programs.sql`  
(Copia en bot: `042_launch_programs.sql`)

Tablas:

| Tabla | Uso |
|-------|-----|
| `launch_programs` | Config multi-programa (`code` único) |
| `launch_program_activation_runs` | Historial de activaciones masivas |
| `launch_program_outbound_messages` | Cola WhatsApp al desactivar |

RPC: `deactivate_launch_program(...)` — transacción:
1. `is_active = false` + `mass_activated_at`
2. `passengers.status` PIONEER → ACTIVE
3. Encola mensaje de activación si existe

Seed: `PIONEERS_USERS` (Pioneros), activo por defecto.

---

## API panel

| Método | Ruta | Permiso |
|--------|------|---------|
| GET | `/api/admin/launch-programs` | configuration read |
| GET/PATCH | `/api/admin/launch-programs/[code]` | read / edit |

`PATCH` con `isActive: false` o `deactivate: true` ejecuta la RPC.

---

## Bot

- `src/lib/launch-programs/config.ts` — lectura + cache 15s + auto-fin
- `defaultStatusForNewPassenger()` / `isPreLaunchMode()` → DB
- Mensaje bienvenida desde `welcome_message`
- Drena cola outbound en cada mensaje entrante

---

## Criterios

- Activar/desactivar desde el panel
- Activo → Inactivo: todos los PIONEER pasan a ACTIVE
- Bot sin env de fechas/cupos/estado
- Arquitectura lista para más programas (`code` distinto)

---

## Aplicar

Ver `scripts/apply-launch-programs-migration.md`.
