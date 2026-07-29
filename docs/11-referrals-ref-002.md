# 11 — Panel de referidos (REF-002)

**Producto:** WhatXia Operations Center  
**Dependencia:** Sprint REF-001 (generación y asociación de referidos)  
**Principio:** Solo lectura. No genera códigos ni escribe atribuciones.

---

## Contrato de datos (REF-001)

Tablas compartidas (migración panel `007_driver_referrals.sql`):

### `driver_referral_links`
| Columna | Uso |
|---------|-----|
| `driver_id` | Conductor dueño (unique) |
| `code` | Código de referido |
| `invite_url` | Enlace completo de invitación |
| `created_at` | Fecha de creación |

### `driver_referrals`
| Columna | Uso |
|---------|-----|
| `driver_id` | Conductor referidor |
| `referral_code` | Código usado |
| `invitee_phone` / `invitee_name` | Datos previos al registro |
| `passenger_id` | Null = solo invitado; con valor = registrado |
| `invited_at` / `registered_at` | Timestamps |

REF-001 es responsable de insertar/actualizar estas filas. REF-002 solo consulta.

---

## Superficie del panel

1. **Ficha del conductor → pestaña Referidos**  
   - Código, enlace, fecha  
   - Botón **Compartir enlace** (copia al portapapeles + confirmación)  
   - WhatsApp preparado (`buildWhatsAppShareUrl`) pero deshabilitado en UI  
   - Stats: invitados, registrados, beta, activos, primer servicio completado  
   - Tabla con búsqueda, orden y paginación  

2. **API** `GET /api/drivers/[id]/referrals`  
   - Permiso módulo `drivers` ≥ `read`  
   - Query: `q`, `sort`, `page`, `pageSize`

3. **Dashboard**  
   - Total usuarios referidos  
   - Conductores con referidos  
   - Conversiones Invitados→Registrados y Registrados→Activos  
   - Ranking Top 10  

---

## Cálculos

| Indicador | Fórmula |
|-----------|---------|
| Personas invitadas | Filas en `driver_referrals` del conductor |
| Usuarios registrados | Filas con `passenger_id` |
| Usuarios Beta / Activos | Join `passengers.status` |
| Primer servicio | Existe `trips` con `status = COMPLETED` para ese `passenger_id` |
| Conversiones | `registered/invited`, `active/registered` |

---

## Aplicación

1. Ejecutar `supabase/migrations/007_driver_referrals.sql` en Supabase.  
2. REF-001 genera enlaces/atribuciones.  
3. Opcional: `NEXT_PUBLIC_REFERRAL_INVITE_BASE_URL` si `invite_url` viene vacío (fallback).

---

## Fuera de alcance

Bonos, recompensas, comisiones, gamificación, notificaciones, campañas.

---

## Pruebas

```bash
npm run test:referrals
npm run build
npx tsc --noEmit
```
