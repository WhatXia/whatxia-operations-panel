import {
  formatDateTimeLabel,
  formatRelativeLabel,
  formatTimeLabel,
  getOpsTimezone,
} from "@/lib/dashboard/time";
import { labelForTripStatus } from "@/lib/dashboard/status";
import type { TripStatus } from "@/lib/dashboard/types";
import { formatElapsed, formatFare, passengerDisplayName } from "@/lib/services/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONVERSATION_INSPECTOR_GAPS, UNAVAILABLE } from "@/lib/conversations/gaps";
import { rangeBounds } from "@/lib/conversations/filters";
import type {
  ChatMessageView,
  ConversationDetail,
  ConversationListFilters,
  ConversationListItem,
  ConversationListSnapshot,
  SidePanelField,
  TimelineEventView,
} from "@/lib/conversations/types";

type PassengerEmbed = {
  preferred_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  whatsapp_name?: string | null;
  phone?: string | null;
} | null;

type DriverEmbed = {
  id?: string;
  name?: string | null;
  full_name?: string | null;
  preferred_name?: string | null;
  phone?: string | null;
  plate?: string | null;
  vehicle_brand?: string | null;
  vehicle_model?: string | null;
  vehicle_color?: string | null;
  status?: string | null;
  is_available?: boolean | null;
} | null;

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
  pickup_neighborhood: string | null;
  quoted_fare: number | null;
  final_fare: number | null;
  currency: string | null;
  eta_minutes: number | null;
  duration_seconds: number | null;
  wait_seconds: number | null;
  created_at: string;
  updated_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  passengers: PassengerEmbed;
  drivers: DriverEmbed;
};

type TunnelRow = {
  id: string;
  trip_id: string;
  status: string;
  opened_at: string | null;
  closes_at: string | null;
  closed_at: string | null;
  created_at: string | null;
};

type TunnelMessageRow = {
  id: string;
  tunnel_id: string;
  trip_id: string;
  sender_role: string;
  content: string | null;
  status: string | null;
  created_at: string;
  sender_phone: string | null;
  recipient_phone: string | null;
};

type SessionRow = {
  phone: string;
  name: string | null;
  state: string | null;
  updated_at: string | null;
};

type CancellationRow = {
  id: string;
  trip_id: string;
  cancelled_by: string | null;
  causal: string | null;
  created_at: string;
};

const NA = UNAVAILABLE;

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: getOpsTimezone(),
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function field(label: string, value: string | null | undefined): SidePanelField {
  const trimmed = value?.toString().trim();
  if (!trimmed) {
    return { label, value: NA, available: false };
  }
  return { label, value: trimmed, available: true };
}

function driverDisplayName(driver: DriverEmbed, fallback: string | null) {
  return (
    driver?.preferred_name?.trim() ||
    driver?.full_name?.trim() ||
    driver?.name?.trim() ||
    fallback?.trim() ||
    null
  );
}

function conversationStatusOf(
  tunnel: TunnelRow | null | undefined,
  session: SessionRow | null | undefined,
): { label: string; available: boolean } {
  if (tunnel?.status) {
    const map: Record<string, string> = {
      active: "Túnel activo",
      closing: "Túnel cerrando",
      closed: "Túnel cerrado",
    };
    return {
      label: map[tunnel.status] ?? `Túnel: ${tunnel.status}`,
      available: true,
    };
  }
  if (session?.state) {
    return { label: `Sesión: ${session.state}`, available: true };
  }
  return { label: NA, available: false };
}

function lastActivityIso(
  trip: TripRow,
  tunnel: TunnelRow | null | undefined,
  lastMessageAt: string | null,
  session: SessionRow | null | undefined,
) {
  const candidates = [
    trip.updated_at,
    trip.finished_at,
    trip.started_at,
    lastMessageAt,
    tunnel?.closed_at,
    tunnel?.opened_at,
    session?.updated_at,
    trip.created_at,
  ].filter(Boolean) as string[];
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )[0];
}

function toListItem(
  trip: TripRow,
  tunnel: TunnelRow | null | undefined,
  session: SessionRow | null | undefined,
  lastMessageAt: string | null,
  now: Date,
): ConversationListItem {
  const conv = conversationStatusOf(tunnel, session);
  const activity = lastActivityIso(trip, tunnel, lastMessageAt, session);
  return {
    id: trip.id,
    shortId: shortId(trip.id),
    dateLabel: dateLabel(trip.created_at),
    timeLabel: formatTimeLabel(trip.created_at),
    passengerName: passengerDisplayName(trip.passengers, trip.passenger_phone),
    passengerPhone: trip.passenger_phone,
    serviceStatus: trip.status,
    serviceStatusLabel: labelForTripStatus(trip.status),
    conversationStatus: conv.label,
    conversationStatusAvailable: conv.available,
    driverName: driverDisplayName(trip.drivers, trip.driver_name),
    lastActivityAt: activity,
    lastActivityLabel: formatRelativeLabel(activity, now),
    elapsedLabel: formatElapsed(
      trip.created_at,
      trip.updated_at,
      trip.finished_at,
      trip.status,
      now,
    ),
    createdAt: trip.created_at,
  };
}

function matchesFilters(
  item: ConversationListItem,
  trip: TripRow,
  filters: ConversationListFilters,
) {
  if (filters.status && trip.status !== filters.status) return false;
  if (filters.tripId) {
    const q = filters.tripId.toLowerCase();
    if (
      !trip.id.toLowerCase().includes(q) &&
      !item.shortId.toLowerCase().includes(q)
    ) {
      return false;
    }
  }
  if (filters.driver) {
    const q = filters.driver.toLowerCase();
    const hay = `${item.driverName ?? ""} ${trip.driver_phone ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.passenger) {
    const q = filters.passenger.toLowerCase();
    if (!item.passengerName.toLowerCase().includes(q)) return false;
  }
  if (filters.phone) {
    const digits = filters.phone.replace(/\D/g, "");
    const phones = `${trip.passenger_phone ?? ""}${trip.driver_phone ?? ""}`.replace(
      /\D/g,
      "",
    );
    if (digits && !phones.includes(digits)) return false;
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const blob = [
      item.passengerName,
      item.driverName,
      item.passengerPhone,
      trip.driver_phone,
      item.shortId,
      trip.id,
      item.serviceStatusLabel,
      item.conversationStatus,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!blob.includes(q)) return false;
  }
  return true;
}

export async function fetchConversationsList(
  filters: ConversationListFilters,
): Promise<ConversationListSnapshot> {
  const now = new Date();
  const supabase = createAdminClient();
  const { from, to } = rangeBounds(filters.preset, now);

  let builder = supabase
    .from("trips")
    .select(
      `
      id, status, passenger_phone, passenger_id, driver_id, driver_phone, driver_name,
      pickup_label, dropoff_label, pickup_neighborhood, quoted_fare, final_fare, currency,
      eta_minutes, duration_seconds, wait_seconds, created_at, updated_at, started_at, finished_at,
      passengers(preferred_name, full_name, name, whatsapp_name, phone),
      drivers!trips_driver_id_fkey(id, name, full_name, preferred_name, phone, plate, vehicle_brand, vehicle_model, vehicle_color, status, is_available)
    `,
    )
    .order("created_at", { ascending: filters.sort === "oldest" })
    .limit(400);

  if (from) builder = builder.gte("created_at", from);
  if (to) builder = builder.lt("created_at", to);
  if (filters.status) builder = builder.eq("status", filters.status);

  const { data, error } = await builder;
  if (error) throw new Error(error.message || "Error al consultar conversaciones");

  const trips = (data ?? []) as TripRow[];
  const tripIds = trips.map((t) => t.id);

  const tunnelsByTrip = new Map<string, TunnelRow>();
  const lastMsgByTrip = new Map<string, string>();
  const sessionsByPhone = new Map<string, SessionRow>();

  if (tripIds.length > 0) {
    const { data: tunnels } = await supabase
      .from("conversation_tunnels")
      .select("id, trip_id, status, opened_at, closes_at, closed_at, created_at")
      .in("trip_id", tripIds);

    for (const tunnel of (tunnels ?? []) as TunnelRow[]) {
      tunnelsByTrip.set(tunnel.trip_id, tunnel);
    }

    const tunnelIds = (tunnels ?? []).map((t) => (t as TunnelRow).id);
    if (tunnelIds.length > 0) {
      const { data: messages } = await supabase
        .from("tunnel_messages")
        .select("trip_id, created_at")
        .in("tunnel_id", tunnelIds)
        .order("created_at", { ascending: false })
        .limit(1000);

      for (const msg of (messages ?? []) as Array<{
        trip_id: string;
        created_at: string;
      }>) {
        if (!lastMsgByTrip.has(msg.trip_id)) {
          lastMsgByTrip.set(msg.trip_id, msg.created_at);
        }
      }
    }
  }

  const phones = Array.from(
    new Set(
      trips
        .flatMap((t) => [t.passenger_phone, t.driver_phone])
        .filter((p): p is string => Boolean(p)),
    ),
  );
  if (phones.length > 0) {
    const { data: sessions } = await supabase
      .from("conversation_sessions")
      .select("phone, name, state, updated_at")
      .in("phone", phones);
    for (const session of (sessions ?? []) as SessionRow[]) {
      sessionsByPhone.set(session.phone, session);
    }
  }

  let items = trips.map((trip) => {
    const tunnel = tunnelsByTrip.get(trip.id) ?? null;
    const session =
      (trip.passenger_phone && sessionsByPhone.get(trip.passenger_phone)) ||
      (trip.driver_phone && sessionsByPhone.get(trip.driver_phone)) ||
      null;
    return {
      trip,
      item: toListItem(
        trip,
        tunnel,
        session,
        lastMsgByTrip.get(trip.id) ?? null,
        now,
      ),
    };
  });

  items = items.filter(({ trip, item }) => matchesFilters(item, trip, filters));

  if (filters.sort === "activity") {
    items.sort((a, b) => {
      const aAt = a.item.lastActivityAt ?? a.item.createdAt;
      const bAt = b.item.lastActivityAt ?? b.item.createdAt;
      return new Date(bAt).getTime() - new Date(aAt).getTime();
    });
  }

  return {
    generatedAt: now.toISOString(),
    timezone: getOpsTimezone(),
    items: items.map((entry) => entry.item),
    total: items.length,
    gaps: CONVERSATION_INSPECTOR_GAPS.map(({ id, label, reason }) => ({
      id,
      label,
      reason,
    })),
  };
}

function buildTimeline(input: {
  trip: TripRow;
  tunnel: TunnelRow | null;
  messages: TunnelMessageRow[];
  cancellations: CancellationRow[];
  session: SessionRow | null;
}): TimelineEventView[] {
  const events: TimelineEventView[] = [];

  events.push({
    id: `trip-created-${input.trip.id}`,
    at: input.trip.created_at,
    timeLabel: formatTimeLabel(input.trip.created_at),
    title: "Servicio registrado",
    detail: `Estado inicial persistido: ${labelForTripStatus(input.trip.status)}`,
    source: "trip",
  });

  if (input.session?.updated_at) {
    events.push({
      id: `session-${input.session.phone}`,
      at: input.session.updated_at,
      timeLabel: formatTimeLabel(input.session.updated_at),
      title: "Sesión de conversación (estado actual)",
      detail: input.session.state
        ? `Estado FSM actual: ${input.session.state}`
        : NA,
      source: "session",
    });
  }

  if (input.tunnel?.opened_at || input.tunnel?.created_at) {
    const at = input.tunnel.opened_at || input.tunnel.created_at!;
    events.push({
      id: `tunnel-open-${input.tunnel.id}`,
      at,
      timeLabel: formatTimeLabel(at),
      title: "Túnel de comunicación abierto",
      detail: `Estado túnel: ${input.tunnel.status}`,
      source: "tunnel",
    });
  }

  for (const msg of input.messages) {
    events.push({
      id: `msg-${msg.id}`,
      at: msg.created_at,
      timeLabel: formatTimeLabel(msg.created_at),
      title:
        msg.sender_role === "driver"
          ? "Mensaje del conductor"
          : "Mensaje del pasajero",
      detail: msg.content?.slice(0, 120) || NA,
      source: "message",
    });
  }

  if (input.trip.started_at) {
    events.push({
      id: `trip-started-${input.trip.id}`,
      at: input.trip.started_at,
      timeLabel: formatTimeLabel(input.trip.started_at),
      title: "Servicio iniciado",
      detail: null,
      source: "trip",
    });
  }

  if (input.trip.finished_at) {
    events.push({
      id: `trip-finished-${input.trip.id}`,
      at: input.trip.finished_at,
      timeLabel: formatTimeLabel(input.trip.finished_at),
      title: "Servicio finalizado",
      detail: null,
      source: "trip",
    });
  }

  for (const cancel of input.cancellations) {
    events.push({
      id: `cancel-${cancel.id}`,
      at: cancel.created_at,
      timeLabel: formatTimeLabel(cancel.created_at),
      title: "Cancelación registrada",
      detail: [cancel.cancelled_by, cancel.causal].filter(Boolean).join(" · ") || NA,
      source: "cancellation",
    });
  }

  if (input.tunnel?.closed_at) {
    events.push({
      id: `tunnel-close-${input.tunnel.id}`,
      at: input.tunnel.closed_at,
      timeLabel: formatTimeLabel(input.tunnel.closed_at),
      title: "Túnel cerrado",
      detail: null,
      source: "tunnel",
    });
  }

  // Marcadores explícitos de gaps (sin inventar horarios de bot).
  events.push({
    id: `gap-bot-${input.trip.id}`,
    at: input.trip.created_at,
    timeLabel: "—",
    title: "Diálogo bot ↔ usuario",
    detail: `${NA}. ${CONVERSATION_INSPECTOR_GAPS[0].reason}`,
    source: "gap",
  });

  return events.sort((a, b) => {
    if (a.source === "gap" && b.source !== "gap") return 1;
    if (b.source === "gap" && a.source !== "gap") return -1;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });
}

function mapMessages(messages: TunnelMessageRow[]): ChatMessageView[] {
  return messages.map((msg) => {
    const origin =
      msg.sender_role === "driver"
        ? ("driver" as const)
        : ("passenger" as const);
    return {
      id: msg.id,
      origin,
      originLabel: origin === "driver" ? "Conductor" : "Pasajero",
      content: msg.content?.trim() || NA,
      status: msg.status || "unknown",
      statusLabel: msg.status || NA,
      createdAt: msg.created_at,
      timeLabel: formatTimeLabel(msg.created_at),
      dateLabel: dateLabel(msg.created_at),
      available: Boolean(msg.content?.trim()),
      note: null,
    };
  });
}

function acceptanceTimeLabel(trip: TripRow): string {
  // No hay timestamp de aceptación del conductor; solo podemos estimar
  // si hay ASSIGNED+ con updated_at — eso inventaría. Mejor N/A.
  void trip;
  return NA;
}

function tripDurationLabel(trip: TripRow): string {
  if (trip.duration_seconds != null && trip.duration_seconds >= 0) {
    const mins = Math.round(trip.duration_seconds / 60);
    return `${mins} min`;
  }
  if (trip.started_at && trip.finished_at) {
    const ms =
      new Date(trip.finished_at).getTime() - new Date(trip.started_at).getTime();
    if (ms >= 0) {
      const mins = Math.round(ms / 60000);
      return `${mins} min`;
    }
  }
  return NA;
}

export async function fetchConversationDetail(
  tripId: string,
): Promise<ConversationDetail> {
  const now = new Date();
  const supabase = createAdminClient();

  const { data: tripData, error } = await supabase
    .from("trips")
    .select(
      `
      id, status, passenger_phone, passenger_id, driver_id, driver_phone, driver_name,
      pickup_label, dropoff_label, pickup_neighborhood, quoted_fare, final_fare, currency,
      eta_minutes, duration_seconds, wait_seconds, created_at, updated_at, started_at, finished_at,
      passengers(preferred_name, full_name, name, whatsapp_name, phone),
      drivers!trips_driver_id_fkey(id, name, full_name, preferred_name, phone, plate, vehicle_brand, vehicle_model, vehicle_color, status, is_available)
    `,
    )
    .eq("id", tripId)
    .maybeSingle();

  if (error) throw new Error(error.message || "Error al consultar servicio");
  if (!tripData) throw new Error("Conversación / servicio no encontrado");

  const trip = tripData as TripRow;

  const { data: tunnelData } = await supabase
    .from("conversation_tunnels")
    .select("id, trip_id, status, opened_at, closes_at, closed_at, created_at")
    .eq("trip_id", tripId)
    .maybeSingle();
  const tunnel = (tunnelData as TunnelRow | null) ?? null;

  let messages: TunnelMessageRow[] = [];
  if (tunnel) {
    const { data: msgData } = await supabase
      .from("tunnel_messages")
      .select(
        "id, tunnel_id, trip_id, sender_role, content, status, created_at, sender_phone, recipient_phone",
      )
      .eq("tunnel_id", tunnel.id)
      .order("created_at", { ascending: true });
    messages = (msgData ?? []) as TunnelMessageRow[];
  }

  const phones = [trip.passenger_phone, trip.driver_phone].filter(
    (p): p is string => Boolean(p),
  );
  let session: SessionRow | null = null;
  if (phones.length > 0) {
    const { data: sessions } = await supabase
      .from("conversation_sessions")
      .select("phone, name, state, updated_at")
      .in("phone", phones);
    const list = (sessions ?? []) as SessionRow[];
    session =
      list.find((s) => s.phone === trip.passenger_phone) ||
      list[0] ||
      null;
  }

  const { data: cancelData } = await supabase
    .from("trip_cancellations")
    .select("id, trip_id, cancelled_by, causal, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  const cancellations = (cancelData ?? []) as CancellationRow[];

  const listItem = toListItem(
    trip,
    tunnel,
    session,
    messages.length ? messages[messages.length - 1].created_at : null,
    now,
  );

  const chatMessages = mapMessages(messages);
  // Placeholder explícito de mensajes bot (no inventados).
  const botPlaceholder: ChatMessageView = {
    id: `bot-gap-${trip.id}`,
    origin: "bot",
    originLabel: "Bot",
    content: NA,
    status: "unavailable",
    statusLabel: NA,
    createdAt: trip.created_at,
    timeLabel: "—",
    dateLabel: dateLabel(trip.created_at),
    available: false,
    note: CONVERSATION_INSPECTOR_GAPS[0].reason,
  };

  const fare = formatFare(trip.final_fare, trip.quoted_fare, trip.currency);
  const vehicle = [
    trip.drivers?.vehicle_brand,
    trip.drivers?.vehicle_model,
    trip.drivers?.vehicle_color,
  ]
    .filter(Boolean)
    .join(" ");

  const sidePanel = {
    passenger: [
      field("Nombre", listItem.passengerName),
      field("WhatsApp", trip.passenger_phone),
      field("ID pasajero", trip.passenger_id),
    ],
    driver: [
      field("Nombre", listItem.driverName),
      field("WhatsApp", trip.driver_phone),
      field("Vehículo", vehicle || null),
      field("Placa", trip.drivers?.plate),
      field(
        "Estado conductor",
        trip.drivers?.status
          ? `${trip.drivers.status}${
              trip.drivers.is_available == null
                ? ""
                : trip.drivers.is_available
                  ? " · disponible"
                  : " · no disponible"
            }`
          : null,
      ),
    ],
    service: [
      field("ID servicio", trip.id),
      field("Estado actual", listItem.serviceStatusLabel),
      field(
        "Estado conversación",
        listItem.conversationStatusAvailable ? listItem.conversationStatus : null,
      ),
      field(
        "Origen",
        trip.pickup_label || trip.pickup_neighborhood,
      ),
      field("Destino", trip.dropoff_label),
      field("Tarifa", fare.label === "—" ? null : fare.label),
      field("Tiempo de aceptación", acceptanceTimeLabel(trip)),
      field("Tiempo del viaje", tripDurationLabel(trip)),
      field(
        "Espera (seg)",
        trip.wait_seconds != null ? String(trip.wait_seconds) : null,
      ),
      field(
        "ETA (min)",
        trip.eta_minutes != null ? String(trip.eta_minutes) : null,
      ),
      field("Creado", formatDateTimeLabel(trip.created_at)),
      field("Última actividad", formatDateTimeLabel(listItem.lastActivityAt)),
    ],
  };

  // Auditoría relacionada (sin inventar vínculos).
  const { data: auditData } = await supabase
    .from("audit_logs")
    .select(
      "id, created_at, user_email, action, result, message, resource_id, path, resource",
    )
    .or(
      `resource_id.eq.${tripId},path.ilike.%${tripId}%,message.ilike.%${tripId}%,resource_id.eq.${shortId(tripId)}`,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const audit = ((auditData ?? []) as Array<{
    id: string;
    created_at: string;
    user_email: string | null;
    action: string;
    result: string;
    message: string | null;
  }>).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    dateLabel: dateLabel(row.created_at),
    timeLabel: formatTimeLabel(row.created_at),
    userEmail: row.user_email,
    action: row.action,
    result: row.result,
    message: row.message,
  }));

  const exportBlockers: string[] = CONVERSATION_INSPECTOR_GAPS.map((g) => g.label);
  if (messages.length === 0) {
    exportBlockers.push("Sin mensajes de túnel (pasajero↔conductor) persistidos");
  }

  return {
    id: trip.id,
    shortId: shortId(trip.id),
    generatedAt: now.toISOString(),
    timezone: getOpsTimezone(),
    list: listItem,
    messages: [botPlaceholder, ...chatMessages],
    timeline: buildTimeline({
      trip,
      tunnel,
      messages,
      cancellations,
      session,
    }),
    sidePanel,
    audit,
    gaps: CONVERSATION_INSPECTOR_GAPS.map((g) => ({
      id: g.id,
      label: g.label,
      reason: g.reason,
      futureNeed: g.futureNeed,
    })),
    exportReady: false,
    exportBlockers,
  };
}
