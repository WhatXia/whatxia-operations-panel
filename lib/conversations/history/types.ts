/**
 * Historial de conversaciones — modelo de lectura reutilizable
 * (Conductores / Usuarios / Servicios). BOT-CONVERSATIONS-001.
 *
 * conversationId === tripId (no hay tabla conversations duplicada).
 */

export type ConversationHistoryIndicator =
  | { kind: "completed"; label: string }
  | { kind: "cancelled"; label: string }
  | { kind: "active"; label: string }
  | { kind: "free_text"; label: string }
  | { kind: "other"; label: string };

export type ConversationHistoryListItem = {
  /** Igual a trip_id — ID estable para Conductores/Usuarios/Servicios. */
  conversationId: string;
  shortId: string;
  tripId: string;
  dateLabel: string;
  timeLabel: string;
  startedAt: string;
  serviceStatus: string;
  serviceStatusLabel: string;
  /** Línea compacta para la UI del operador. */
  summaryLine: string;
  hasFreeTextMessages: boolean;
  freeTextCount: number;
  indicator: ConversationHistoryIndicator;
  passengerName: string | null;
  driverName: string | null;
};

export type ConversationHistoryList = {
  generatedAt: string;
  timezone: string;
  items: ConversationHistoryListItem[];
  total: number;
  /** Notas de arquitectura para operadores técnicos (opcional en UI). */
  notes: string[];
};

export type ConversationTimelineItem = {
  id: string;
  at: string;
  dateLabel: string;
  timeLabel: string;
  kind: "system_event" | "free_message";
  title: string;
  body: string | null;
  actorLabel: string | null;
};

export type ConversationHistoryDetail = {
  conversationId: string;
  shortId: string;
  tripId: string;
  generatedAt: string;
  timezone: string;
  header: ConversationHistoryListItem;
  timeline: ConversationTimelineItem[];
  /** Enlace al Inspector completo (misma conversación, sin duplicar datos). */
  inspectorPath: string;
};
