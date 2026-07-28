/** Datos que hoy no existen en Supabase para el Conversation Inspector. */
export const CONVERSATION_INSPECTOR_GAPS = [
  {
    id: "bot_user_transcript",
    label: "Diálogo bot ↔ usuario (WhatsApp)",
    reason:
      "No existe tabla de mensajes del bot. Solo se persiste el estado actual en conversation_sessions.",
    futureNeed:
      "Tabla conversation_messages (o similar) con direction, role=bot|user, content, wamid, created_at.",
  },
  {
    id: "session_trip_fk",
    label: "Vínculo duro sesión ↔ servicio",
    reason:
      "conversation_sessions no tiene trip_id; el enlace es por teléfono (soft join).",
    futureNeed: "Columna trip_id (nullable) en conversation_sessions o tabla de enlace.",
  },
  {
    id: "fsm_history",
    label: "Historial de estados de conversación",
    reason:
      "conversation_sessions.state se sobrescribe; no hay log de transiciones.",
    futureNeed: "Tabla conversation_state_events (from_state, to_state, at).",
  },
  {
    id: "fare_event_time",
    label: "Timestamp de tarifa calculada / aceptación",
    reason:
      "trips.quoted_fare / final_fare existen sin marca de tiempo del evento.",
    futureNeed: "Eventos trip_events con type=FARE_QUOTED|FARE_ACCEPTED.",
  },
  {
    id: "wa_receipts_media",
    label: "Recibos WhatsApp y multimedia",
    reason: "No se almacenan wamid, delivered/read ni payloads de media/ubicación.",
    futureNeed: "Persistencia de webhooks WhatsApp con status y media_url.",
  },
] as const;

export const UNAVAILABLE = "Información no disponible";
