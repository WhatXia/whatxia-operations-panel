# 11 — Panel de referidos (REF-002 / REF-006)

**Producto:** WhatXia Operations Center  
**Fuente de verdad:** Bot WhatXia Mobility (migraciones `040_driver_referrals.sql`, `041_referral_events_ref004.sql`)  
**Principio:** Solo lectura. No genera códigos ni escribe eventos.

---

## Tablas reales (bot)

| Tabla / columna | Uso |
|-----------------|-----|
| `drivers.referral_code` | Código `DRV-XXXXX` del conductor |
| `referral_events` | Auditoría: `link_opened`, `passenger_registered`, `conversion`, … |
| `referral_attributions` | Atribución definitiva (`referrer_driver_id`, `passenger_id`) |
| `passengers.referred_by_driver_id` | Referente (una sola vez) |

> La migración panel `007_driver_referrals.sql` (`driver_referral_links` / `driver_referrals`) es **obsoleta** y no debe usarse. REF-006 lee el esquema del bot.

---

## Eventos → métricas del panel

| Métrica UI | Origen |
|------------|--------|
| Personas invitadas | `referral_events` donde `event_type = link_opened` y `referrer_driver_id = :driverId` (únicos por `meta.phone` cuando existe) |
| Usuarios registrados | `passenger_registered` (o `referral_attributions` como fallback) |
| Usuarios Beta / Activos | Pasajeros atribuidos con `passengers.status` |
| Primer servicio completado | `referral_events` donde `event_type = conversion` |
| Enlace | `buildReferralInviteUrl(code)` → `https://wa.me/<phone>?text=REF%20DRV-XXXXX` |

Filtro de conductor: siempre **`referrer_driver_id`** (= `drivers.id` de la ficha).

---

## Superficie del panel

1. **Conductores → Ficha → pestaña Referidos** — `GET /api/drivers/[id]/referrals`
2. **Dashboard** — bloque Referidos (totales, conversiones, Top 10)

El bot tiene `/ops/referrals` (ops legacy del MVP). El Operations Center no usa esa ruta; consume las mismas tablas vía Dashboard + ficha.

---

## Criterio REF-006 (recorrido completo wa.me)

Tras `link_opened` → `passenger_registered` → pasajero `ACTIVE` → `conversion`:

- Personas invitadas: **1**
- Usuarios registrados: **1**
- Usuarios activos: **1**
- Primer servicio completado: **1**

---

## Pruebas

```bash
npm run test:referrals
npx tsc --noEmit
npm run build
```
