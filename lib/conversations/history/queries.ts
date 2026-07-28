import {
  formatTimeLabel,
  getOpsTimezone,
} from "@/lib/dashboard/time";
import { labelForTripStatus } from "@/lib/dashboard/status";
import type { TripStatus } from "@/lib/dashboard/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { passengerDisplayName } from "@/lib/services/format";
import type {
  ConversationHistoryDetail,
  ConversationHistoryIndicator,
  ConversationHistoryList,
  ConversationHistoryListItem,
  ConversationTimelineItem,
} from "@/lib/conversations/history/types";

type TripRow = {
  id: string;
  status: TripStatus;
  passenger_phone: string | null;
  passenger_id: string | null;
  driver_id: string | null;
  driver_phone: string | null;
  driver_name: string | null;
  pickup_label: string | null;
  dropoff_label: string | null;
  quoted_fare: number | null;
  final_fare: number | null;
  currency: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  passengers: {
    preferred_name?: string | null;
    full_name?: string | null;
    name?: string | null;
    whatsapp_name?: string | null;
  } | null;
  drivers: {
    preferred_name?: string | null;
    full_name?: string | null;
    name?: string | null;
  } | null;
};

type TunnelMessageRow = {
  id: string;
  trip_id: string;
  sender_role: string;
  content: string | null;
  created_at: string;
};

type CancellationRow = {
  id: string;
  trip_id: string;
  cancelled_by: string | null;
  causal: string | null;
  created_at: string;
};

type TunnelRow = {
  id: string;
  trip_id: string;
  status: string;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getOpsTimezone(),
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

function dateLabelLong(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getOpsTimezone(),
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function driverName(trip: TripRow): string | null {
  return (
    trip.drivers?.preferred_name?.trim() ||
    trip.drivers?.full_name?.trim() ||
    trip.drivers?.name?.trim() ||
    trip.driver_name?.trim() ||
    null
  );
}

function indicatorFor(
  trip: TripRow,
  freeTextCount: number,
): ConversationHistoryIndicator {
  if (trip.status === "COMPLETED") {
    return { kind: "completed", label: "✅ Finalizado" };
  }
  if (trip.status === "CANCELLED" || trip.status === "cancelled_no_driver") {
    return { kind: "cancelled", label: "❌ Cancelado" };
  }
  if (freeTextCount > 0) {
    return {
      kind: "free_text",
      label: `💬 ${freeTextCount} mensaje${freeTextCount === 1 ? "" : "s"} libre${freeTextCount === 1 ? "" : "s"}`,
    };
  }
  if (
    trip.status === "IN_PROGRESS" ||
    trip.status === "ASSIGNED" ||
    trip.status === "ETA_INFORMED" ||
    trip.status === "DRIVER_ARRIVED" ||
    trip.status === "SEARCHING"
  ) {
    return {
      kind: "active",
      label: `🔄 ${labelForTripStatus(trip.status)}`,
    };
  }
  return {
    kind: "other",
    label: labelForTripStatus(trip.status),
  };
}

function toListItem(
  trip: TripRow,
  freeTextCount: number,
): ConversationHistoryListItem {
  const ind = indicatorFor(trip, freeTextCount);
  const date = dateLabel(trip.created_at);
  const time = formatTimeLabel(trip.created_at);
  return {
    conversationId: trip.id,
    shortId: shortId(trip.id),
    tripId: trip.id,
    dateLabel: date,
    timeLabel: time,
    startedAt: trip.created_at,
    serviceStatus: trip.status,
    serviceStatusLabel: labelForTripStatus(trip.status),
    summaryLine: `${date} · ${time} · Servicio #${shortId(trip.id)} · ${ind.label}`,
    hasFreeTextMessages: freeTextCount > 0,
    freeTextCount,
    indicator: ind,
    passengerName: passengerDisplayName(
      trip.passengers,
      trip.passenger_phone,
    ),
    driverName: driverName(trip),
  };
}

/**
 * Eventos de sistema derivados + mensajes libres (tunnel_messages).
 * No inventa timestamps ni mensajes del bot.
 */
export function buildOperatorTimeline(input: {
  trip: TripRow;
  tunnel: TunnelRow | null;
  messages: TunnelMessageRow[];
  cancellations: CancellationRow[];
}): ConversationTimelineItem[] {
  const items: ConversationTimelineItem[] = [];

  items.push({
    id: `evt-requested-${input.trip.id}`,
    at: input.trip.created_at,
    dateLabel: dateLabelLong(input.trip.created_at),
    timeLabel: formatTimeLabel(input.trip.created_at),
    kind: "system_event",
    title: "Servicio solicitado",
    body: [
      input.trip.pickup_label
        ? `Origen: ${input.trip.pickup_label}`
        : null,
      input.trip.dropoff_label
        ? `Destino: ${input.trip.dropoff_label}`
        : null,
      input.trip.quoted_fare != null
        ? `Tarifa cotizada (valor): ${input.trip.quoted_fare}${input.trip.currency ? ` ${input.trip.currency}` : ""}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || null,
    actorLabel: "Sistema",
  });

  if (input.tunnel?.opened_at || input.tunnel?.created_at) {
    const at = input.tunnel.opened_at || input.tunnel.created_at!;
    items.push({
      id: `evt-tunnel-open-${input.tunnel.id}`,
      at,
      dateLabel: dateLabelLong(at),
      timeLabel: formatTimeLabel(at),
      kind: "system_event",
      title: "Canal pasajero ↔ conductor abierto",
      body: `Estado del canal: ${input.tunnel.status}`,
      actorLabel: "Sistema",
    });
  }

  for (const msg of input.messages) {
    const isDriver = msg.sender_role === "driver";
    items.push({
      id: `msg-${msg.id}`,
      at: msg.created_at,
      dateLabel: dateLabelLong(msg.created_at),
      timeLabel: formatTimeLabel(msg.created_at),
      kind: "free_message",
      title: isDriver ? "Mensaje del conductor" : "Mensaje del pasajero",
      body: msg.content?.trim() || null,
      actorLabel: isDriver ? "Conductor" : "Pasajero",
    });
  }

  if (input.trip.started_at) {
    items.push({
      id: `evt-started-${input.trip.id}`,
      at: input.trip.started_at,
      dateLabel: dateLabelLong(input.trip.started_at),
      timeLabel: formatTimeLabel(input.trip.started_at),
      kind: "system_event",
      title: "Servicio iniciado",
      body: driverName(input.trip)
        ? `Conductor: ${driverName(input.trip)}`
        : null,
      actorLabel: "Sistema",
    });
  }

  if (input.trip.finished_at) {
    items.push({
      id: `evt-finished-${input.trip.id}`,
      at: input.trip.finished_at,
      dateLabel: dateLabelLong(input.trip.finished_at),
      timeLabel: formatTimeLabel(input.trip.finished_at),
      kind: "system_event",
      title: "Servicio finalizado",
      body:
        input.trip.final_fare != null
          ? `Tarifa final: ${input.trip.final_fare}${input.trip.currency ? ` ${input.trip.currency}` : ""}`
          : null,
      actorLabel: "Sistema",
    });
  }

  for (const cancel of input.cancellations) {
    items.push({
      id: `evt-cancel-${cancel.id}`,
      at: cancel.created_at,
      dateLabel: dateLabelLong(cancel.created_at),
      timeLabel: formatTimeLabel(cancel.created_at),
      kind: "system_event",
      title: "Servicio cancelado",
      body:
        [cancel.cancelled_by, cancel.causal].filter(Boolean).join(" · ") ||
        null,
      actorLabel: "Sistema",
    });
  }

  if (input.tunnel?.closed_at) {
    items.push({
      id: `evt-tunnel-close-${input.tunnel.id}`,
      at: input.tunnel.closed_at,
      dateLabel: dateLabelLong(input.tunnel.closed_at),
      timeLabel: formatTimeLabel(input.tunnel.closed_at),
      kind: "system_event",
      title: "Canal pasajero ↔ conductor cerrado",
      body: null,
      actorLabel: "Sistema",
    });
  }

  return items.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

const TRIP_SELECT = `
  id, status, passenger_phone, passenger_id, driver_id, driver_phone, driver_name,
  pickup_label, dropoff_label, quoted_fare, final_fare, currency,
  created_at, started_at, finished_at,
  passengers(preferred_name, full_name, name, whatsapp_name),
  drivers!trips_driver_id_fkey(preferred_name, full_name, name)
`;

async function freeTextCountsByTrip(
  supabase: ReturnType<typeof createAdminClient>,
  tripIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (tripIds.length === 0) return map;

  const { data } = await supabase
    .from("tunnel_messages")
    .select("trip_id")
    .in("trip_id", tripIds);

  for (const row of data ?? []) {
    const id = String((row as { trip_id: string }).trip_id);
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function listConversationsByDriver(
  driverId: string,
): Promise<ConversationHistoryList> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message || "Error al listar conversaciones");

  const trips = (data ?? []) as TripRow[];
  const counts = await freeTextCountsByTrip(
    supabase,
    trips.map((t) => t.id),
  );

  const items = trips.map((trip) =>
    toListItem(trip, counts.get(trip.id) ?? 0),
  );

  return {
    generatedAt: new Date().toISOString(),
    timezone: getOpsTimezone(),
    items,
    total: items.length,
    notes: [
      "conversationId = trip_id (sin tabla conversations duplicada).",
      "Mensajes libres = tunnel_messages (pasajero/conductor).",
      "Eventos de sistema = derivados de timestamps reales del servicio/túnel.",
    ],
  };
}

/** Preparado para Ficha de Usuario / Pasajero (misma capa, sin UI en este sprint). */
export async function listConversationsByPassenger(
  passengerId: string,
): Promise<ConversationHistoryList> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("passenger_id", passengerId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message || "Error al listar conversaciones");

  const trips = (data ?? []) as TripRow[];
  const counts = await freeTextCountsByTrip(
    supabase,
    trips.map((t) => t.id),
  );
  const items = trips.map((trip) =>
    toListItem(trip, counts.get(trip.id) ?? 0),
  );

  return {
    generatedAt: new Date().toISOString(),
    timezone: getOpsTimezone(),
    items,
    total: items.length,
    notes: [
      "Misma capa de lectura que conductores; conversationId = trip_id.",
    ],
  };
}

export async function fetchConversationHistoryDetail(
  conversationId: string,
): Promise<ConversationHistoryDetail> {
  const supabase = createAdminClient();
  const tripId = conversationId;

  const { data: tripData, error } = await supabase
    .from("trips")
    .select(TRIP_SELECT)
    .eq("id", tripId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Error al consultar conversación");
  if (!tripData) throw new Error("Conversación no encontrada");

  const trip = tripData as TripRow;

  const { data: tunnelData } = await supabase
    .from("conversation_tunnels")
    .select("id, trip_id, status, opened_at, closed_at, created_at")
    .eq("trip_id", tripId)
    .maybeSingle();
  const tunnel = (tunnelData as TunnelRow | null) ?? null;

  let messages: TunnelMessageRow[] = [];
  if (tunnel) {
    const { data: msgData } = await supabase
      .from("tunnel_messages")
      .select("id, trip_id, sender_role, content, created_at")
      .eq("tunnel_id", tunnel.id)
      .order("created_at", { ascending: true });
    messages = (msgData ?? []) as TunnelMessageRow[];
  }

  const { data: cancelData } = await supabase
    .from("trip_cancellations")
    .select("id, trip_id, cancelled_by, causal, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  const cancellations = (cancelData ?? []) as CancellationRow[];

  const header = toListItem(trip, messages.length);
  const timeline = buildOperatorTimeline({
    trip,
    tunnel,
    messages,
    cancellations,
  });

  return {
    conversationId: trip.id,
    shortId: shortId(trip.id),
    tripId: trip.id,
    generatedAt: new Date().toISOString(),
    timezone: getOpsTimezone(),
    header,
    timeline,
    inspectorPath: `/conversaciones/${trip.id}`,
  };
}
