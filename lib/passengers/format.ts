import {
  formatDateTimeLabel,
  formatRelativeLabel,
} from "@/lib/dashboard/time";
import type { PassengerStatus } from "@/lib/passengers/types";

export function displayPassengerName(row: {
  preferred_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  whatsapp_name?: string | null;
  phone?: string | null;
}): string {
  const preferred = row.preferred_name?.trim();
  if (preferred) return preferred;
  const full = row.full_name?.trim();
  if (full) return full;
  const name = row.name?.trim();
  if (name) return name;
  const wa = row.whatsapp_name?.trim();
  if (wa) return wa;
  return row.phone?.trim() || "Sin nombre";
}

export function formatPassengerPhone(phone: string | null | undefined): string {
  const raw = phone?.trim() ?? "";
  if (!raw) return "—";
  return raw.startsWith("+") ? raw : `+${raw}`;
}

export const PASSENGER_STATUS_LABELS: Record<PassengerStatus, string> = {
  PIONEER: "PIONEER",
  BETA: "BETA",
  ACTIVE: "ACTIVE",
  BLOCKED: "BLOCKED",
};

export const PASSENGER_STATUS_BADGE_CLASS: Record<PassengerStatus, string> = {
  PIONEER: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/35",
  BETA: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/35",
  ACTIVE: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/35",
  BLOCKED: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/35",
};

export const PASSENGER_STATUS_EMOJI: Record<PassengerStatus, string> = {
  PIONEER: "🟡",
  BETA: "🟢",
  ACTIVE: "🔵",
  BLOCKED: "🔴",
};

export function formatPassengerRegisteredLabel(iso: string | null) {
  return formatDateTimeLabel(iso);
}

export function formatPassengerInteractionLabel(iso: string | null) {
  if (!iso) return "Sin interacción";
  return `${formatRelativeLabel(iso)} · ${formatDateTimeLabel(iso)}`;
}
