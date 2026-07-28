import { createAdminClient } from "@/lib/supabase/admin";
import { labelForTripStatus } from "@/lib/dashboard/status";
import {
  formatDateTimeLabel,
  getOpsTimezone,
} from "@/lib/dashboard/time";
import type { TripStatus } from "@/lib/dashboard/types";
import { FILTER_STATUSES } from "@/lib/services/filters";
import {
  formatElapsed,
  formatFare,
  formatServiceTime,
  passengerDisplayName,
} from "@/lib/services/format";
import type {
  ServiceFilter,
  ServiceRow,
  ServiceSort,
  ServicesSnapshot,
} from "@/lib/services/types";

type PassengerEmbed = {
  preferred_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  whatsapp_name?: string | null;
} | null;

type TripRow = {
  id: string;
  status: TripStatus;
  driver_name: string | null;
  passenger_phone: string | null;
  passenger_id: string | null;
  pickup_label: string | null;
  dropoff_label: string | null;
  pickup_neighborhood: string | null;
  quoted_fare: number | null;
  final_fare: number | null;
  currency: string | null;
  created_at: string;
  updated_at: string | null;
  finished_at: string | null;
  started_at: string | null;
  passengers: PassengerEmbed;
};

function originOf(trip: TripRow) {
  return trip.pickup_label?.trim() || trip.pickup_neighborhood?.trim() || "—";
}

function destinationOf(trip: TripRow) {
  return trip.dropoff_label?.trim() || "—";
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function matchesQuery(row: ServiceRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.passengerName.toLowerCase().includes(q) ||
    (row.driverName?.toLowerCase().includes(q) ?? false) ||
    row.origin.toLowerCase().includes(q) ||
    row.destination.toLowerCase().includes(q)
  );
}

function toServiceRow(trip: TripRow, now: Date): ServiceRow {
  const fare = formatFare(trip.final_fare, trip.quoted_fare, trip.currency);
  return {
    id: trip.id,
    shortId: shortId(trip.id),
    status: trip.status,
    statusLabel: labelForTripStatus(trip.status),
    passengerName: passengerDisplayName(trip.passengers, trip.passenger_phone),
    driverName: trip.driver_name?.trim() || null,
    origin: originOf(trip),
    destination: destinationOf(trip),
    fareLabel: fare.label,
    fareValue: fare.value,
    currency: trip.currency?.trim() || "COP",
    createdAt: trip.created_at,
    timeLabel: formatServiceTime(trip.created_at),
    elapsedLabel: formatElapsed(
      trip.created_at,
      trip.updated_at,
      trip.finished_at,
      trip.status,
      now,
    ),
    updatedAt: trip.updated_at,
  };
}

export async function fetchServicesSnapshot(options: {
  filter?: ServiceFilter;
  sort?: ServiceSort;
  query?: string;
  limit?: number;
}): Promise<ServicesSnapshot> {
  const filter = options.filter ?? "all";
  const sort = options.sort ?? "newest";
  const query = options.query?.trim() ?? "";
  const limit = options.limit ?? 200;
  const now = new Date();
  const supabase = createAdminClient();

  let builder = supabase
    .from("trips")
    .select(
      "id, status, driver_name, passenger_phone, passenger_id, pickup_label, dropoff_label, pickup_neighborhood, quoted_fare, final_fare, currency, created_at, updated_at, finished_at, started_at, passengers(preferred_name, full_name, name, whatsapp_name)",
    )
    .order("created_at", { ascending: sort === "oldest" })
    .limit(limit);

  const statuses = FILTER_STATUSES[filter];
  if (statuses) {
    builder = builder.in("status", statuses);
  }

  const { data, error } = await builder;

  if (error) {
    throw new Error(error.message || "Error al consultar servicios");
  }

  const rows = ((data ?? []) as TripRow[]).map((trip) =>
    toServiceRow(trip, now),
  );
  const services = query ? rows.filter((row) => matchesQuery(row, query)) : rows;
  const fetchedAt = now.toISOString();

  return {
    fetchedAt,
    fetchedAtLabel: formatDateTimeLabel(fetchedAt),
    timezone: getOpsTimezone(),
    filter,
    sort,
    query,
    total: services.length,
    services,
  };
}
