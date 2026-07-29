import type {
  DriverReferralListItem,
  DriverReferralStats,
  ReferralListSort,
  ReferralRankingItem,
} from "./types";

/** Ratio 0–1; null si el denominador es 0. */
export function conversionRate(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function formatConversionPercent(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

export function computeReferralStats(input: {
  invited: number;
  registered: number;
  beta: number;
  active: number;
  firstServiceCompleted: number;
}): DriverReferralStats {
  return {
    invited: Math.max(0, input.invited),
    registered: Math.max(0, input.registered),
    beta: Math.max(0, input.beta),
    active: Math.max(0, input.active),
    firstServiceCompleted: Math.max(0, input.firstServiceCompleted),
  };
}

export function sortReferralItems(
  items: DriverReferralListItem[],
  sort: ReferralListSort,
): DriverReferralListItem[] {
  const copy = [...items];
  switch (sort) {
    case "name_asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "name_desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name, "es"));
    case "status_asc":
      return copy.sort((a, b) => a.status.localeCompare(b.status, "es"));
    case "registered_asc":
      return copy.sort(
        (a, b) =>
          (a.registeredAt ? new Date(a.registeredAt).getTime() : 0) -
          (b.registeredAt ? new Date(b.registeredAt).getTime() : 0),
      );
    case "registered_desc":
    default:
      return copy.sort(
        (a, b) =>
          (b.registeredAt ? new Date(b.registeredAt).getTime() : 0) -
          (a.registeredAt ? new Date(a.registeredAt).getTime() : 0),
      );
  }
}

export function filterReferralItems(
  items: DriverReferralListItem[],
  query: string,
): DriverReferralListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.status.toLowerCase().includes(q) ||
      item.statusLabel.toLowerCase().includes(q),
  );
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; page: number; pageSize: number; totalPages: number; total: number } {
  const size = Math.min(100, Math.max(1, pageSize));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: safePage,
    pageSize: size,
    totalPages,
    total,
  };
}

export function rankDriversByRegistered(
  rows: Array<{
    driverId: string;
    driverName: string;
    invited: number;
    registered: number;
    active: number;
  }>,
  limit = 10,
): ReferralRankingItem[] {
  return [...rows]
    .filter((row) => row.invited > 0 || row.registered > 0)
    .sort((a, b) => {
      if (b.registered !== a.registered) return b.registered - a.registered;
      if (b.active !== a.active) return b.active - a.active;
      return b.invited - a.invited;
    })
    .slice(0, limit);
}

/** Preparado para compartir por WhatsApp (UI futura). */
export function buildWhatsAppShareUrl(
  inviteUrl: string,
  driverName?: string | null,
): string {
  const who = driverName?.trim() ? ` de ${driverName.trim()}` : "";
  const text = `Únete a WhatXia con esta invitación${who}: ${inviteUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function isMissingRelationError(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  );
}
