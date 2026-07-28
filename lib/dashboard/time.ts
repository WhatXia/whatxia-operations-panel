const TIMEZONE = "America/Bogota";

export function getOpsTimezone() {
  return TIMEZONE;
}

function bogotaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((p) => p.type === "year")?.value ?? "1970",
    month: parts.find((p) => p.type === "month")?.value ?? "01",
    day: parts.find((p) => p.type === "day")?.value ?? "01",
  };
}

/** Inicio del día operativo en America/Bogota para una fecha, como ISO UTC. */
export function startOfBogotaDayIso(date: Date): string {
  const { year, month, day } = bogotaDateParts(date);
  // America/Bogota es UTC-5 sin DST.
  return `${year}-${month}-${day}T05:00:00.000Z`;
}

/** Inicio del día operativo en America/Bogota, como ISO UTC. */
export function startOfTodayIso(now = new Date()): string {
  return startOfBogotaDayIso(now);
}

export function addUtcDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function bogotaDayKey(iso: string): string {
  const { year, month, day } = bogotaDateParts(new Date(iso));
  return `${year}-${month}-${day}`;
}

export function bogotaHour(iso: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return Number(hour);
}

export function formatDayLabel(dayKey: string): string {
  const iso = `${dayKey}T12:00:00.000Z`;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

export function formatTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatRelativeLabel(
  iso: string | null | undefined,
  now = new Date(),
): string {
  if (!iso) return "Sin actividad registrada";
  const diffMs = now.getTime() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "—";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "hace instantes";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}
