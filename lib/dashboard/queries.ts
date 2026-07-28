import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACTIVE_TRIP_STATUSES,
  CANCELLED_TRIP_STATUSES,
  labelForTripStatus,
} from "@/lib/dashboard/status";
import {
  formatDateTimeLabel,
  formatRelativeLabel,
  formatTimeLabel,
  getOpsTimezone,
  startOfTodayIso,
} from "@/lib/dashboard/time";
import type {
  DashboardRecentTrip,
  DashboardSnapshot,
  HealthStatus,
  TripStatus,
} from "@/lib/dashboard/types";

type TripRow = {
  id: string;
  status: TripStatus;
  driver_name: string | null;
  pickup_label: string | null;
  dropoff_label: string | null;
  pickup_neighborhood: string | null;
  created_at: string;
  updated_at: string | null;
  finished_at: string | null;
};

type SessionRow = {
  updated_at: string;
};

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function originOf(trip: TripRow) {
  return trip.pickup_label?.trim() || trip.pickup_neighborhood?.trim() || "—";
}

function destinationOf(trip: TripRow) {
  return trip.dropoff_label?.trim() || "—";
}

function inferBotHealth(lastActivityAt: string | null, now: Date): {
  status: HealthStatus;
  detail: string;
} {
  if (!lastActivityAt) {
    return {
      status: "unknown",
      detail: "Sin señales recientes de trips o sesiones",
    };
  }

  const ageMin = (now.getTime() - new Date(lastActivityAt).getTime()) / 60000;
  if (ageMin <= 30) {
    return {
      status: "ok",
      detail: `Actividad reciente ${formatRelativeLabel(lastActivityAt, now)}`,
    };
  }
  if (ageMin <= 24 * 60) {
    return {
      status: "degraded",
      detail: `Última actividad ${formatRelativeLabel(lastActivityAt, now)}`,
    };
  }
  return {
    status: "degraded",
    detail: `Sin actividad reciente (${formatRelativeLabel(lastActivityAt, now)})`,
  };
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStart = startOfTodayIso(now);
  const timezone = getOpsTimezone();

  const [
    createdTodayRes,
    activeRes,
    completedTodayRes,
    cancelledTodayRes,
    driversActiveRes,
    driversAvailableRes,
    recentRes,
    sessionsRes,
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .in("status", [...ACTIVE_TRIP_STATUSES]),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("status", "COMPLETED")
      .gte("created_at", todayStart),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .in("status", [...CANCELLED_TRIP_STATUSES])
      .gte("created_at", todayStart),
    supabase
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_available", true),
    supabase
      .from("trips")
      .select(
        "id, status, driver_name, pickup_label, dropoff_label, pickup_neighborhood, created_at, updated_at, finished_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("conversation_sessions")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const queryErrors = [
    createdTodayRes.error,
    activeRes.error,
    completedTodayRes.error,
    cancelledTodayRes.error,
    driversActiveRes.error,
    driversAvailableRes.error,
    recentRes.error,
  ].filter(Boolean);

  if (queryErrors.length > 0) {
    const message = queryErrors.map((e) => e?.message).join("; ");
    throw new Error(message || "Error al consultar Supabase");
  }

  const recentRows = (recentRes.data ?? []) as TripRow[];
  const sessionRows = (sessionsRes.data ?? []) as SessionRow[];

  // sessionsRes.error se ignora suavemente: la tabla puede faltar en algún entorno.
  const lastTripActivity =
    recentRows[0]?.updated_at || recentRows[0]?.created_at || null;
  const lastSessionActivity = sessionRows[0]?.updated_at ?? null;
  const lastActivityAt =
    [lastTripActivity, lastSessionActivity]
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ??
    null;

  const recentTrips: DashboardRecentTrip[] = recentRows.map((trip) => ({
    id: trip.id,
    shortId: shortId(trip.id),
    status: trip.status,
    statusLabel: labelForTripStatus(trip.status),
    driverName: trip.driver_name,
    origin: originOf(trip),
    destination: destinationOf(trip),
    createdAt: trip.created_at,
    timeLabel: formatTimeLabel(trip.created_at),
  }));

  const bot = inferBotHealth(lastActivityAt, now);
  const fetchedAt = now.toISOString();

  return {
    fetchedAt,
    fetchedAtLabel: formatDateTimeLabel(fetchedAt),
    timezone,
    counts: {
      createdToday: createdTodayRes.count ?? 0,
      active: activeRes.count ?? 0,
      completedToday: completedTodayRes.count ?? 0,
      cancelledToday: cancelledTodayRes.count ?? 0,
      driversActive: driversActiveRes.count ?? 0,
      driversAvailable: driversAvailableRes.count ?? 0,
    },
    recentTrips,
    system: {
      supabase: {
        status: "ok",
        detail: "Conexión y lecturas OK",
      },
      bot,
      lastSyncLabel: formatRelativeLabel(fetchedAt, now),
      lastActivityAt,
      lastActivityLabel: formatRelativeLabel(lastActivityAt, now),
    },
  };
}
