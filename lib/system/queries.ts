import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTimeLabel,
  formatRelativeLabel,
  formatTimeLabel,
  getOpsTimezone,
  startOfTodayIso,
} from "@/lib/dashboard/time";
import { BOT_VERSION, OPS_VERSION } from "@/lib/system/constants";
import {
  healthStatusLabel,
  worstHealth,
} from "@/lib/system/format";
import type {
  ComponentHealth,
  SystemComponent,
  SystemEvent,
  SystemStatusSnapshot,
} from "@/lib/system/types";

type TripEventRow = {
  id: string;
  status: string;
  driver_name: string | null;
  created_at: string;
  updated_at: string | null;
  finished_at: string | null;
};

type SessionRow = {
  phone: string;
  name: string | null;
  state: string;
  updated_at: string;
};

type DriverAuthRow = {
  phone: string;
  driver_id: string;
  created_at: string;
};

type TunnelRow = {
  id: string;
  status: string;
  opened_at: string;
};

function ageMinutes(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / 60000;
}

function botHealthFromActivity(
  lastActivityAt: string | null,
  now: Date,
): { status: ComponentHealth; detail: string } {
  const age = ageMinutes(lastActivityAt, now);
  if (age == null) {
    return {
      status: "unknown",
      detail: "Sin señales recientes de conversación o viajes",
    };
  }
  if (age <= 30) {
    return {
      status: "ok",
      detail: `Actividad reciente ${formatRelativeLabel(lastActivityAt, now)}`,
    };
  }
  if (age <= 24 * 60) {
    return {
      status: "warning",
      detail: `Última actividad ${formatRelativeLabel(lastActivityAt, now)}`,
    };
  }
  return {
    status: "warning",
    detail: `Sin actividad prolongada (${formatRelativeLabel(lastActivityAt, now)})`,
  };
}

function buildTripEvents(trips: TripEventRow[]): SystemEvent[] {
  const events: SystemEvent[] = [];

  for (const trip of trips) {
    const short = trip.id.slice(0, 8).toUpperCase();

    if (trip.status === "COMPLETED") {
      const at = trip.finished_at || trip.updated_at || trip.created_at;
      events.push({
        id: `trip-completed-${trip.id}`,
        type: "service.completed",
        title: "Servicio completado",
        detail: `${short}${trip.driver_name ? ` · ${trip.driver_name}` : ""}`,
        severity: "success",
        at,
        timeLabel: formatTimeLabel(at),
      });
    } else if (
      trip.status === "CANCELLED" ||
      trip.status === "cancelled_no_driver"
    ) {
      const at = trip.updated_at || trip.created_at;
      events.push({
        id: `trip-cancelled-${trip.id}`,
        type: "service.cancelled",
        title: "Servicio cancelado",
        detail: short,
        severity: "warning",
        at,
        timeLabel: formatTimeLabel(at),
      });
    } else {
      events.push({
        id: `trip-created-${trip.id}`,
        type: "service.created",
        title: "Servicio creado",
        detail: `${short} · ${trip.status}`,
        severity: "info",
        at: trip.created_at,
        timeLabel: formatTimeLabel(trip.created_at),
      });
    }
  }

  return events;
}

export async function fetchSystemStatusSnapshot(): Promise<SystemStatusSnapshot> {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStart = startOfTodayIso(now);
  const recentSessionCutoff = new Date(
    now.getTime() - 30 * 60 * 1000,
  ).toISOString();

  const probeStarted = Date.now();

  const [
    tripsProbe,
    servicesTodayRes,
    driversActiveRes,
    recentTripsRes,
    sessionsRes,
    activeSessionsRes,
    activeTunnelsRes,
    driverAuthRes,
  ] = await Promise.all([
    supabase.from("trips").select("id", { count: "exact", head: true }).limit(1),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabase
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("trips")
      .select("id, status, driver_name, created_at, updated_at, finished_at")
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("conversation_sessions")
      .select("phone, name, state, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("conversation_sessions")
      .select("phone", { count: "exact", head: true })
      .gte("updated_at", recentSessionCutoff),
    supabase
      .from("conversation_tunnels")
      .select("id, status, opened_at", { count: "exact" })
      .eq("status", "active")
      .limit(20),
    supabase
      .from("driver_auth_sessions")
      .select("phone, driver_id, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const probeMs = Date.now() - probeStarted;

  const dbOk = !tripsProbe.error;
  const supabaseStatus: ComponentHealth = dbOk
    ? probeMs > 2500
      ? "warning"
      : "ok"
    : "error";
  const databaseStatus: ComponentHealth = dbOk
    ? probeMs > 2500
      ? "warning"
      : "ok"
    : "error";

  let authStatus: ComponentHealth = "unknown";
  let authDetail = "No se pudo verificar Auth";
  let authenticatedUsers = 0;

  try {
    const { data: authData, error: authError } =
      await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (authError) {
      authStatus = "warning";
      authDetail = authError.message;
    } else {
      authenticatedUsers = authData.users?.length ?? 0;
      authStatus = "ok";
      authDetail = `${authenticatedUsers} usuario(s) Auth visibles`;
    }
  } catch (error) {
    authStatus = "error";
    authDetail =
      error instanceof Error
        ? error.message
        : "Auth admin no disponible con la clave actual";
  }

  const sessionRows = (sessionsRes.data ?? []) as SessionRow[];
  const lastSessionAt = sessionRows[0]?.updated_at ?? null;
  const tripRows = (recentTripsRes.data ?? []) as TripEventRow[];
  const lastTripAt =
    tripRows[0]?.updated_at || tripRows[0]?.created_at || null;
  const lastBotActivity =
    [lastSessionAt, lastTripAt]
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ??
    null;

  const bot = botHealthFromActivity(
    sessionsRes.error && !lastTripAt ? null : lastBotActivity,
    now,
  );

  const apiStatus: ComponentHealth = "ok";

  const components: SystemComponent[] = [
    {
      id: "bot",
      label: "Bot Conversacional",
      status: bot.status,
      statusLabel: healthStatusLabel(bot.status),
      detail: bot.detail,
    },
    {
      id: "supabase",
      label: "Supabase",
      status: supabaseStatus,
      statusLabel: healthStatusLabel(supabaseStatus),
      detail: dbOk
        ? `API reachable · latencia lectura ${probeMs} ms`
        : tripsProbe.error?.message || "Sin respuesta de Supabase",
    },
    {
      id: "api",
      label: "API",
      status: apiStatus,
      statusLabel: healthStatusLabel(apiStatus),
      detail: "Operations Center API respondiendo",
    },
    {
      id: "database",
      label: "Base de datos",
      status: databaseStatus,
      statusLabel: healthStatusLabel(databaseStatus),
      detail: dbOk
        ? "Consultas a trips/drivers OK"
        : tripsProbe.error?.message || "Error de lectura",
    },
    {
      id: "auth",
      label: "Autenticación",
      status: authStatus,
      statusLabel: healthStatusLabel(authStatus),
      detail: authDetail,
    },
  ];

  const events: SystemEvent[] = [];

  events.push(...buildTripEvents(tripRows));

  for (const session of sessionRows.slice(0, 5)) {
    events.push({
      id: `session-${session.phone}-${session.updated_at}`,
      type: "bot.session",
      title: "Actividad del bot",
      detail: `${session.name || session.phone} · ${session.state}`,
      severity: "info",
      at: session.updated_at,
      timeLabel: formatTimeLabel(session.updated_at),
    });
  }

  const driverAuthRows = (driverAuthRes.data ?? []) as DriverAuthRow[];
  for (const auth of driverAuthRows.slice(0, 5)) {
    events.push({
      id: `driver-auth-${auth.driver_id}-${auth.created_at}`,
      type: "auth.driver_login",
      title: "Inicio de sesión (conductor)",
      detail: auth.phone,
      severity: "info",
      at: auth.created_at,
      timeLabel: formatTimeLabel(auth.created_at),
    });
  }

  if (tripsProbe.error) {
    events.unshift({
      id: `db-error-${now.toISOString()}`,
      type: "system.error",
      title: "Error de base de datos",
      detail: tripsProbe.error.message,
      severity: "error",
      at: now.toISOString(),
      timeLabel: formatTimeLabel(now.toISOString()),
    });
  }

  if (authStatus === "warning" || authStatus === "error") {
    events.unshift({
      id: `auth-warn-${now.toISOString()}`,
      type: "auth.error",
      title: "Advertencia de autenticación",
      detail: authDetail,
      severity: authStatus === "error" ? "error" : "warning",
      at: now.toISOString(),
      timeLabel: formatTimeLabel(now.toISOString()),
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const limitedEvents = events.slice(0, 25);

  const activeTunnels = (activeTunnelsRes.count ??
    ((activeTunnelsRes.data ?? []) as TunnelRow[]).length) as number;
  const activeSessions = activeSessionsRes.count ?? 0;
  const activeConnections = activeTunnels + activeSessions;

  const fetchedAt = now.toISOString();
  const overall = worstHealth(components.map((c) => c.status));

  // Si fallan lecturas críticas, elevar error.
  if (
    tripsProbe.error &&
    recentTripsRes.error &&
    servicesTodayRes.error
  ) {
    throw new Error(
      tripsProbe.error.message || "No se pudo leer el estado del sistema",
    );
  }

  return {
    fetchedAt,
    fetchedAtLabel: formatDateTimeLabel(fetchedAt),
    overall,
    overallLabel: healthStatusLabel(overall),
    components,
    events: limitedEvents,
    tech: {
      lastSyncAt: fetchedAt,
      lastSyncLabel: formatRelativeLabel(fetchedAt, now),
      serverTimeAt: fetchedAt,
      serverTimeLabel: formatDateTimeLabel(fetchedAt),
      opsVersion: OPS_VERSION,
      botVersion: BOT_VERSION,
      sinceLastUpdateLabel: formatRelativeLabel(fetchedAt, now),
      timezone: getOpsTimezone(),
    },
    indicators: {
      servicesToday: servicesTodayRes.count ?? 0,
      driversActive: driversActiveRes.count ?? 0,
      authenticatedUsers,
      activeConnections,
    },
  };
}
