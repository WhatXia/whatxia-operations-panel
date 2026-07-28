# Conversation Inspector — datos faltantes (Sprint 10)

Este módulo **no inventa datos**. Consume `trips`, `passengers`, `drivers`, `conversation_tunnels`, `tunnel_messages`, `conversation_sessions`, `trip_cancellations` y `audit_logs`.

## Disponible hoy

| Capacidad | Fuente |
|---|---|
| Lista de servicios/conversaciones | `trips` + embeds |
| Mensajes pasajero ↔ conductor | `tunnel_messages` |
| Estado de túnel | `conversation_tunnels` |
| Snapshot FSM actual | `conversation_sessions` (soft join por teléfono) |
| Cronología técnica parcial | timestamps de trip/túnel/mensajes/cancelaciones |
| Panel lateral | campos reales de trip/passenger/driver |
| Auditoría relacionada | `audit_logs` filtrados por ID de servicio |

## No disponible (mostrar “Información no disponible”)

1. **Diálogo bot ↔ usuario** — no hay tabla de mensajes del bot.
2. **Historial de estados FSM** — `conversation_sessions.state` se sobrescribe.
3. **FK sesión ↔ trip** — solo soft join por teléfono.
4. **Timestamps de tarifa / aceptación** — existen montos, no eventos temporales.
5. **Recibos WhatsApp / media** — wamid, delivered/read, multimedia.

## Exportación PDF

`POST /api/conversations/[id]/export` prepara el payload estructurado (resumen, mensajes reales, timeline, auditoría, gaps). La descarga binaria queda pendiente hasta completar el transcript bot↔usuario.

Detalle en código: `lib/conversations/gaps.ts`.
