# 10 — Historial de conversaciones (BOT-CONVERSATIONS-001)

**Producto:** WhatXia Operations Panel  
**Principio:** Aditivo. No modifica el bot ni flujos certificados.

---

## Fase 1 — Qué ya existe (reutilizar)

| Necesidad del sprint | Infraestructura existente | Decisión |
|----------------------|---------------------------|----------|
| Conversación ↔ servicio | `trips` (1 servicio = 1 unidad conversacional) + `conversation_tunnels.trip_id` UNIQUE | **No** crear tabla `conversations` duplicada. El `trip_id` es el ID de conversación del panel. |
| Mensajes libres P↔C | `tunnel_messages` (`sender_role` passenger\|driver, `content`) | **Reutilizar.** No crear `conversation_messages`. |
| Túnel | `conversation_tunnels` | Reutilizar. |
| Cancelaciones | `trip_cancellations` | Reutilizar como eventos de sistema. |
| Sesión FSM | `conversation_sessions` (snapshot por teléfono) | Solo lectura; sin historial FSM. |
| Diálogo bot↔usuario | — | **No** persistido hoy. Fuera de alcance (no inventar). |

---

## Fase 2 — Qué se añade (solo panel)

1. **Capa de lectura** `lib/conversations/history/`  
   - Lista por `driver_id` / (preparado) `passenger_id` / `trip_id`.  
   - Detalle: timeline unificada = **eventos de sistema derivados** + **mensajes libres** (`tunnel_messages`).

2. **Eventos de sistema**  
   Derivados en lectura (sin escrituras del bot) a partir de timestamps reales:
   - `trips.created_at` → Servicio solicitado  
   - `trips.started_at` → Servicio iniciado  
   - `trips.finished_at` → Servicio finalizado  
   - `trip_cancellations.created_at` → Servicio cancelado  
   - Apertura/cierre de túnel  
   - Mensajes libres del túnel  

   Sin timestamp dedicado **no** se inventan: ubicación recibida, destino recibido, tarifa calculada/aceptada, conductor asignado (valores pueden verse en el detalle del servicio).

3. **UI** — Ficha del Conductor → pestaña Conversaciones (lista + timeline).  
   Misma conversación abrible desde Inspector (`/conversaciones/[id]`) sin duplicar registros.

4. **Migraciones nuevas** — Ninguna obligatoria en este sprint.  
   Si en el futuro el bot persiste eventos con reloj propio, se podrá añadir `conversation_system_events` de forma aditiva sin romper esta capa.

---

## Reutilización

| Entrada | Filtro |
|---------|--------|
| Conductores | `trips.driver_id = :id` |
| Usuarios / pasajeros | `trips.passenger_id` o teléfono (API lista preparada) |
| Servicios | `trips.id = :tripId` (detalle) |

---

## No hacer (restricciones)

- No modificar Agent Zero, Mobility, Planner, Response Generator, Ride Flow, Tunnel Conversation, asignación.
- No almacenar mensajes automáticos del bot.
- No duplicar `tunnel_messages` ni espejar `trips` en una tabla `conversations`.
