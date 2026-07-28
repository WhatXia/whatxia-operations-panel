import {
  addUtcDays,
  startOfBogotaDayIso,
  startOfTodayIso,
} from "@/lib/dashboard/time";
import type {
  ConversationListFilters,
  ConversationRangePreset,
  ConversationSort,
} from "@/lib/conversations/types";

export const RANGE_OPTIONS: Array<{
  value: ConversationRangePreset;
  label: string;
}> = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last7", label: "Últimos 7 días" },
  { value: "last30", label: "Últimos 30 días" },
  { value: "all", label: "Todos" },
];

export function parseRangePreset(value: string | null): ConversationRangePreset {
  if (
    value === "yesterday" ||
    value === "last7" ||
    value === "last30" ||
    value === "all" ||
    value === "today"
  ) {
    return value;
  }
  return "today";
}

export function parseSort(value: string | null): ConversationSort {
  if (value === "oldest" || value === "activity") return value;
  return "newest";
}

export function rangeBounds(preset: ConversationRangePreset, now = new Date()) {
  if (preset === "all") {
    return { from: null as string | null, to: null as string | null };
  }

  const todayStart = startOfTodayIso(now);
  if (preset === "today") {
    return { from: todayStart, to: addUtcDays(todayStart, 1) };
  }
  if (preset === "yesterday") {
    const yesterday = startOfBogotaDayIso(
      new Date(new Date(todayStart).getTime() - 24 * 60 * 60 * 1000),
    );
    return { from: yesterday, to: todayStart };
  }
  if (preset === "last7") {
    return { from: addUtcDays(todayStart, -6), to: addUtcDays(todayStart, 1) };
  }
  return { from: addUtcDays(todayStart, -29), to: addUtcDays(todayStart, 1) };
}

export function filtersFromSearchParams(
  params: URLSearchParams,
): ConversationListFilters {
  return {
    preset: parseRangePreset(params.get("preset")),
    status: params.get("status")?.trim() ?? "",
    driver: params.get("driver")?.trim() ?? "",
    passenger: params.get("passenger")?.trim() ?? "",
    phone: params.get("phone")?.trim() ?? "",
    tripId: params.get("tripId")?.trim() ?? "",
    query: params.get("q")?.trim() ?? "",
    sort: parseSort(params.get("sort")),
  };
}
