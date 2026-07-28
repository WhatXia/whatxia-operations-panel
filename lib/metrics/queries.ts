import { createAdminClient } from "@/lib/supabase/admin";
import { labelForTripStatus } from "@/lib/dashboard/status";
import {
  addUtcDays,
  bogotaDayKey,
  bogotaHour,
  formatDateTimeLabel,
  formatDayLabel,
  getOpsTimezone,
  startOfTodayIso,
} from "@/lib/dashboard/time";
import { resolveMetricsRange } from "@/lib/metrics/ranges";
import type {
  MetricsCharts,
  MetricsKpis,
  MetricsPoint,
  MetricsRangePreset,
  MetricsSnapshot,
} from "@/lib/metrics/types";

type TripRow = {
  id: string;
  status: string;
  driver_id: string | null;
  driver_name: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
};

const CANCELLED = new Set(["CANCELLED", "cancelled_no_driver"]);

function inRange(iso: string, from: string, to: string) {
  const t = new Date(iso).getTime();
  return t >= new Date(from).getTime() && t < new Date(to).getTime();
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function formatMinutes(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value < 1) return "< 1 min";
  return `${value.toFixed(1)} min`;
}

function formatRate(completedOrCancelled: number, total: number): {
  rate: number | null;
  label: string;
} {
  if (total <= 0) return { rate: null, label: "—" };
  const rate = (completedOrCancelled / total) * 100;
  return { rate, label: `${rate.toFixed(1)}%` };
}

function buildHourSeries(trips: TripRow[]): MetricsPoint[] {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    label: `${String(hour).padStart(2, "0")}:00`,
    value: 0,
  }));
  for (const trip of trips) {
    const hour = bogotaHour(trip.created_at);
    if (hour >= 0 && hour < 24) buckets[hour].value += 1;
  }
  return buckets;
}

function buildDaySeries(
  trips: TripRow[],
  fromIso: string,
  days: number,
): MetricsPoint[] {
  const points: MetricsPoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const dayStart = addUtcDays(fromIso, i);
    const key = bogotaDayKey(dayStart);
    points.push({
      key,
      label: formatDayLabel(key),
      value: 0,
    });
  }
  const index = new Map(points.map((p, i) => [p.key, i]));
  for (const trip of trips) {
    const key = bogotaDayKey(trip.created_at);
    const idx = index.get(key);
    if (idx != null) points[idx].value += 1;
  }
  return points;
}

function buildStatusSeries(trips: TripRow[]): MetricsPoint[] {
  const counts = new Map<string, number>();
  for (const trip of trips) {
    counts.set(trip.status, (counts.get(trip.status) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([status, value]) => ({
      key: status,
      label: labelForTripStatus(status),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildTopDrivers(trips: TripRow[], limit = 8): MetricsPoint[] {
  const counts = new Map<string, { name: string; value: number }>();
  for (const trip of trips) {
    if (!trip.driver_id && !trip.driver_name) continue;
    const key = trip.driver_id || trip.driver_name || "unknown";
    const name = trip.driver_name?.trim() || "Conductor";
    const current = counts.get(key) ?? { name, value: 0 };
    current.value += 1;
    counts.set(key, current);
  }
  return [...counts.entries()]
    .map(([key, item]) => ({
      key,
      label: item.name,
      value: item.value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function computeAcceptanceMinutes(trips: TripRow[]): number | null {
  const samples: number[] = [];
  for (const trip of trips) {
    if (!trip.started_at || !trip.created_at) continue;
    if (!trip.driver_id && !trip.driver_name) continue;
    const mins =
      (new Date(trip.started_at).getTime() -
        new Date(trip.created_at).getTime()) /
      60000;
    if (mins >= 0 && mins < 24 * 60) samples.push(mins);
  }
  return average(samples);
}

function computeDurationMinutes(trips: TripRow[]): number | null {
  const samples: number[] = [];
  for (const trip of trips) {
    if (trip.status !== "COMPLETED") continue;
    if (!trip.started_at || !trip.finished_at) continue;
    const mins =
      (new Date(trip.finished_at).getTime() -
        new Date(trip.started_at).getTime()) /
      60000;
    if (mins >= 0 && mins < 24 * 60) samples.push(mins);
  }
  return average(samples);
}

export async function fetchMetricsSnapshot(options: {
  preset?: MetricsRangePreset;
  from?: string | null;
  to?: string | null;
}): Promise<MetricsSnapshot> {
  const now = new Date();
  const preset = options.preset ?? "today";
  const range = resolveMetricsRange({
    preset,
    from: options.from,
    to: options.to,
    now,
  });

  const todayStart = startOfTodayIso(now);
  const tomorrowStart = addUtcDays(todayStart, 1);
  const weekStart = addUtcDays(todayStart, -6);
  const monthStart = addUtcDays(todayStart, -29);
  const chart30Start = monthStart;

  // Cubrimos el máximo entre rango elegido y ventanas fijas de charts/KPIs.
  const fetchFrom =
    new Date(range.from) < new Date(chart30Start) ? range.from : chart30Start;

  const supabase = createAdminClient();

  const [tripsRes, driversActiveRes, driversAvailableRes] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id, status, driver_id, driver_name, created_at, started_at, finished_at, updated_at",
      )
      .gte("created_at", fetchFrom)
      .lt("created_at", tomorrowStart)
      .order("created_at", { ascending: true })
      .limit(5000),
    supabase
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("drivers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_available", true),
  ]);

  if (tripsRes.error) {
    throw new Error(tripsRes.error.message || "Error al consultar métricas");
  }

  const allTrips = (tripsRes.data ?? []) as TripRow[];
  const todayTrips = allTrips.filter((t) =>
    inRange(t.created_at, todayStart, tomorrowStart),
  );
  const weekTrips = allTrips.filter((t) =>
    inRange(t.created_at, weekStart, tomorrowStart),
  );
  const monthTrips = allTrips.filter((t) =>
    inRange(t.created_at, monthStart, tomorrowStart),
  );
  const rangeTrips = allTrips.filter((t) =>
    inRange(t.created_at, range.from, range.to),
  );
  const last30Trips = allTrips.filter((t) =>
    inRange(t.created_at, chart30Start, tomorrowStart),
  );

  const completedInRange = rangeTrips.filter((t) => t.status === "COMPLETED");
  const cancelledInRange = rangeTrips.filter((t) => CANCELLED.has(t.status));
  const completion = formatRate(completedInRange.length, rangeTrips.length);
  const cancellation = formatRate(cancelledInRange.length, rangeTrips.length);

  const avgAcceptance = computeAcceptanceMinutes(rangeTrips);
  const avgDuration = computeDurationMinutes(rangeTrips);

  const kpis: MetricsKpis = {
    servicesToday: todayTrips.length,
    servicesWeek: weekTrips.length,
    servicesMonth: monthTrips.length,
    completionRate: completion.rate,
    completionRateLabel: completion.label,
    cancellationRate: cancellation.rate,
    cancellationRateLabel: cancellation.label,
    driversActive: driversActiveRes.count ?? 0,
    driversAvailable: driversAvailableRes.count ?? 0,
    avgAcceptanceMinutes: avgAcceptance,
    avgAcceptanceLabel: formatMinutes(avgAcceptance),
    avgDurationMinutes: avgDuration,
    avgDurationLabel: formatMinutes(avgDuration),
    hasAcceptanceData: avgAcceptance != null,
    hasDurationData: avgDuration != null,
  };

  const charts: MetricsCharts = {
    byHourToday: buildHourSeries(todayTrips),
    byDay30: buildDaySeries(last30Trips, chart30Start, 30),
    byStatus: buildStatusSeries(rangeTrips),
    topDrivers: buildTopDrivers(rangeTrips),
    growthTrend: buildDaySeries(last30Trips, chart30Start, 30),
  };

  const fetchedAt = now.toISOString();

  return {
    fetchedAt,
    fetchedAtLabel: formatDateTimeLabel(fetchedAt),
    timezone: getOpsTimezone(),
    range: {
      preset: range.preset,
      label: range.label,
      from: range.from,
      to: range.to,
    },
    kpis,
    charts,
    totalsInRange: {
      created: rangeTrips.length,
      completed: completedInRange.length,
      cancelled: cancelledInRange.length,
    },
  };
}
