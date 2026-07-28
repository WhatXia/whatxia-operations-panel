import { formatRelativeLabel, formatTimeLabel } from "@/lib/dashboard/time";

type PassengerEmbed = {
  preferred_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  whatsapp_name?: string | null;
} | null;

export function passengerDisplayName(
  passengers: PassengerEmbed,
  phone: string | null,
): string {
  const preferred = passengers?.preferred_name?.trim();
  if (preferred) return preferred;
  const full = passengers?.full_name?.trim();
  if (full) return full;
  const legacy = passengers?.name?.trim();
  if (legacy) return legacy;
  const wa = passengers?.whatsapp_name?.trim();
  if (wa) return wa;
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 4) return `•••• ${digits.slice(-4)}`;
  }
  return "Pasajero";
}

export function formatFare(
  finalFare: number | null,
  quotedFare: number | null,
  currency: string | null,
): { label: string; value: number | null } {
  const value = finalFare ?? quotedFare;
  if (value == null || Number.isNaN(Number(value))) {
    return { label: "—", value: null };
  }
  const code = currency?.trim() || "COP";
  const label = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(Number(value));
  return { label, value: Number(value) };
}

const TERMINAL = new Set([
  "COMPLETED",
  "CANCELLED",
  "cancelled_no_driver",
]);

export function formatElapsed(
  createdAt: string,
  updatedAt: string | null,
  finishedAt: string | null,
  status: string,
  now = new Date(),
): string {
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) return "—";

  const end = TERMINAL.has(status)
    ? new Date(finishedAt || updatedAt || createdAt).getTime()
    : now.getTime();

  if (Number.isNaN(end) || end < start) return "—";

  const totalMin = Math.floor((end - start) / 60000);
  if (totalMin < 1) return "< 1 min";
  if (totalMin < 60) return `${totalMin} min`;
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours < 24) return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function formatServiceTime(iso: string) {
  return formatTimeLabel(iso);
}

export function formatSyncLabel(iso: string, now = new Date()) {
  return formatRelativeLabel(iso, now);
}
