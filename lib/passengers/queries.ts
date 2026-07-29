import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTimeLabel,
  getOpsTimezone,
} from "@/lib/dashboard/time";
import { displayPassengerName } from "@/lib/passengers/format";
import {
  isPassengerStatus,
  normalizePassengerStatus,
} from "@/lib/passengers/status";
import type {
  PassengerDetail,
  PassengerListItem,
  PassengerStatus,
  PassengerStatusFilter,
} from "@/lib/passengers/types";
import type { PassengersSnapshot } from "@/lib/passengers/api-types";

export type {
  PassengersSnapshot,
  PassengersResponse,
  PassengerDetailResponse,
  PassengerStatusUpdateResponse,
} from "@/lib/passengers/api-types";

const PASSENGER_SELECT =
  "id, phone, name, full_name, preferred_name, whatsapp_name, created_at, registered_at, status, registration_source";

type PassengerRow = {
  id: string;
  phone: string;
  name: string | null;
  full_name: string | null;
  preferred_name: string | null;
  whatsapp_name: string | null;
  created_at: string;
  registered_at: string | null;
  status: string;
  registration_source: string | null;
};

type SessionRow = {
  phone: string;
  updated_at: string | null;
};

type TripRow = {
  id: string;
  passenger_id: string | null;
  passenger_phone: string | null;
  status: string;
  pickup_label: string | null;
  dropoff_label: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function toListItem(
  row: PassengerRow,
  lastInteractionAt: string | null,
): PassengerListItem {
  return {
    id: row.id,
    name: displayPassengerName(row),
    phone: row.phone,
    status: normalizePassengerStatus(row.status),
    registeredAt: row.registered_at ?? row.created_at,
    lastInteractionAt,
  };
}

function matchesQuery(row: PassengerRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const name = displayPassengerName(row).toLowerCase();
  const full = (row.full_name ?? "").toLowerCase();
  const preferred = (row.preferred_name ?? row.name ?? "").toLowerCase();
  const phone = row.phone.toLowerCase();
  return (
    name.includes(q) ||
    full.includes(q) ||
    preferred.includes(q) ||
    phone.includes(q) ||
    (digits.length > 0 && row.phone.replace(/\D/g, "").includes(digits))
  );
}

function maxIso(a: string | null | undefined, b: string | null | undefined) {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

async function fetchLastInteractionMaps(
  supabase: ReturnType<typeof createAdminClient>,
  rows: PassengerRow[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (rows.length === 0) return map;

  const ids = rows.map((r) => r.id);
  const phones = Array.from(
    new Set(rows.map((r) => r.phone).filter(Boolean)),
  );

  const [tripsRes, sessionsRes] = await Promise.all([
    supabase
      .from("trips")
      .select("passenger_id, passenger_phone, updated_at, created_at")
      .in("passenger_id", ids)
      .order("updated_at", { ascending: false })
      .limit(1000),
    phones.length > 0
      ? supabase
          .from("conversation_sessions")
          .select("phone, updated_at")
          .in("phone", phones)
      : Promise.resolve({ data: [] as SessionRow[], error: null }),
  ]);

  for (const trip of (tripsRes.data ?? []) as Array<{
    passenger_id: string | null;
    updated_at: string | null;
    created_at: string | null;
  }>) {
    if (!trip.passenger_id) continue;
    const at = trip.updated_at || trip.created_at;
    if (!at) continue;
    const prev = map.get(trip.passenger_id) ?? null;
    const next = maxIso(prev, at);
    if (next) map.set(trip.passenger_id, next);
  }

  const phoneToId = new Map(rows.map((r) => [r.phone, r.id]));
  for (const session of (sessionsRes.data ?? []) as SessionRow[]) {
    const id = phoneToId.get(session.phone);
    if (!id || !session.updated_at) continue;
    const prev = map.get(id) ?? null;
    const next = maxIso(prev, session.updated_at);
    if (next) map.set(id, next);
  }

  return map;
}

export async function fetchPassengersSnapshot(options: {
  filter: PassengerStatusFilter;
  query?: string;
}): Promise<PassengersSnapshot> {
  const supabase = createAdminClient();
  const now = new Date();

  const { data, error } = await supabase
    .from("passengers")
    .select(PASSENGER_SELECT)
    .order("registered_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message || "Error al listar usuarios finales");
  }

  const rows = (data ?? []) as PassengerRow[];
  const interactionMap = await fetchLastInteractionMaps(supabase, rows);

  const counts: Record<PassengerStatus | "all", number> = {
    all: rows.length,
    PIONEER: 0,
    BETA: 0,
    ACTIVE: 0,
    BLOCKED: 0,
  };

  for (const row of rows) {
    const status = normalizePassengerStatus(row.status);
    counts[status] += 1;
  }

  let items = rows
    .filter((row) => matchesQuery(row, options.query ?? ""))
    .filter((row) => {
      if (options.filter === "all") return true;
      return normalizePassengerStatus(row.status) === options.filter;
    })
    .map((row) => toListItem(row, interactionMap.get(row.id) ?? null));

  return {
    passengers: items,
    total: items.length,
    counts,
    fetchedAt: now.toISOString(),
    fetchedAtLabel: formatDateTimeLabel(now.toISOString()),
    timezone: getOpsTimezone(),
  };
}

export async function fetchPassengerDetail(
  passengerId: string,
): Promise<PassengerDetail> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("passengers")
    .select(PASSENGER_SELECT)
    .eq("id", passengerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Error al consultar usuario");
  }
  if (!data) {
    throw new Error("Usuario no encontrado");
  }

  const row = data as PassengerRow;
  const interactionMap = await fetchLastInteractionMaps(supabase, [row]);

  const [{ data: session }, { data: trip }] = await Promise.all([
    supabase
      .from("conversation_sessions")
      .select("phone, updated_at")
      .eq("phone", row.phone)
      .maybeSingle(),
    supabase
      .from("trips")
      .select(
        "id, passenger_id, passenger_phone, status, pickup_label, dropoff_label, created_at, updated_at",
      )
      .eq("passenger_id", row.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const sessionAt = (session as SessionRow | null)?.updated_at ?? null;
  const lastTrip = (trip as TripRow | null) ?? null;
  const lastInteractionAt =
    maxIso(
      interactionMap.get(row.id) ?? null,
      maxIso(sessionAt, lastTrip?.updated_at || lastTrip?.created_at),
    ) ?? null;

  const base = toListItem(row, lastInteractionAt);

  return {
    ...base,
    preferredName: row.preferred_name,
    whatsappName: row.whatsapp_name,
    fullName: row.full_name,
    registrationSource: row.registration_source,
    lastConversationId: sessionAt ? row.phone : null,
    lastTrip: lastTrip
      ? {
          id: lastTrip.id,
          status: lastTrip.status,
          originText: lastTrip.pickup_label,
          destinationText: lastTrip.dropoff_label,
          createdAt: lastTrip.created_at,
        }
      : null,
  };
}

export async function updatePassengerStatusByAction(
  passengerId: string,
  nextStatus: PassengerStatus,
): Promise<PassengerDetail> {
  if (!isPassengerStatus(nextStatus)) {
    throw new Error("Estado inválido");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("passengers")
    .update({ status: nextStatus })
    .eq("id", passengerId)
    .select(PASSENGER_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Error al actualizar estado");
  }
  if (!data) {
    throw new Error("Usuario no encontrado");
  }

  return fetchPassengerDetail(passengerId);
}
